import json
import boto3
from datetime import datetime
from typing import Dict, Any, List
import os
import uuid
import requests
import re
import math
from boto3.dynamodb.conditions import Key, Attr

# DynamoDBクライアント
dynamodb = boto3.resource('dynamodb')
knowledge_table = dynamodb.Table(os.environ.get('KNOWLEDGE_TABLE', 'yarisugi-sales-knowledge-dev'))
knowledge_vectors_table = dynamodb.Table(os.environ.get('KNOWLEDGE_VECTORS_TABLE', 'yarisugi-sales-knowledge-vectors-dev'))
knowledge_chats_table = dynamodb.Table(os.environ.get('KNOWLEDGE_CHATS_TABLE', 'yarisugi-sales-knowledge-chats-dev'))

# AWS Secrets Managerクライアント（必要に応じて動的に作成）

# ベクトル検索設定
EMBED_MODEL = 'text-embedding-3-small'
OPENAI_TIMEOUT = 20
TOP_K = 5
MAX_VECTORS = 3000

def get_openai_api_key():
    """OpenAI API keyを取得（環境変数優先、Secrets Managerフォールバック）"""
    # まず環境変数から取得を試行
    env_key = os.environ.get('OPENAI_API_KEY')
    if env_key:
        print("✅ 環境変数からOpenAI API keyを取得")
        return env_key
    
    # 環境変数がない場合はSecrets Managerから取得
    print("🔍 Secrets ManagerからOpenAI API keyを取得")
    try:
        secrets_client = boto3.client('secretsmanager')
        response = secrets_client.get_secret_value(
            SecretId=os.environ.get('OPENAI_API_KEY_SECRET_NAME', 'yarisugi-sales-openai-api-key-dev')
        )
        secret_data = json.loads(response['SecretString'])
        api_key = secret_data.get('openai_api_key')
        if api_key:
            print("✅ Secrets ManagerからOpenAI API keyを取得")
            return api_key
        else:
            raise Exception("OpenAI API key not found in secret")
    except Exception as e:
        print(f"❌ OpenAI API key取得エラー: {e}")
        raise Exception("OpenAI API key could not be retrieved from AWS Secrets Manager")

def _cosine(a, b):
    """コサイン類似度を計算"""
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / ((na**0.5) * (nb**0.5))

def _embed(text: str):
    """テキストをベクトル化"""
    api_key = get_openai_api_key()
    headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
    payload = {'input': text[:4000], 'model': EMBED_MODEL}
    r = requests.post('https://api.openai.com/v1/embeddings', headers=headers, json=payload, timeout=OPENAI_TIMEOUT)
    if r.status_code != 200:
        raise RuntimeError(f'Embedding error {r.status_code}: {r.text[:300]}')
    return r.json()['data'][0]['embedding']

def _iter_all_vectors_by_kid(knowledge_id: str, limit=MAX_VECTORS):
    """指定されたknowledge_idの全ベクトルを取得（ページネーション対応）"""
    items = []
    resp = knowledge_vectors_table.query(KeyConditionExpression=Key('knowledgeId').eq(knowledge_id))
    items += resp.get('Items', [])
    while 'LastEvaluatedKey' in resp and len(items) < limit:
        resp = knowledge_vectors_table.query(
            KeyConditionExpression=Key('knowledgeId').eq(knowledge_id),
            ExclusiveStartKey=resp['LastEvaluatedKey']
        )
        items += resp.get('Items', [])
    return items[:limit]

def _fetch_all_knowledge_for_user(user_id: str):
    """ユーザーの全ナレッジを取得（保存スキーマに合わせる：PK='KNOWLEDGE#{user_id}'）"""
    print(f"🔍 ナレッジ取得開始: PK=KNOWLEDGE#{user_id}")
    items = []
    resp = knowledge_table.query(
        KeyConditionExpression=Key('PK').eq(f'KNOWLEDGE#{user_id}') & Key('SK').begins_with('KNOWLEDGE#')
    )
    items += resp.get('Items', [])
    print(f"📚 初回取得アイテム数: {len(resp.get('Items', []))}")
    while 'LastEvaluatedKey' in resp:
        resp = knowledge_table.query(
            KeyConditionExpression=Key('PK').eq(f'KNOWLEDGE#{user_id}') & Key('SK').begins_with('KNOWLEDGE#'),
            ExclusiveStartKey=resp['LastEvaluatedKey']
        )
        items += resp.get('Items', [])
        print(f"📚 追加取得アイテム数: {len(resp.get('Items', []))}")
    print(f"📊 総取得アイテム数: {len(items)}")
    return items

def _topk_by_cosine(query_text: str, vector_items: List[dict], k=TOP_K):
    """クエリテキストとベクトルアイテムのコサイン類似度でTop-Kを取得"""
    print(f"🔍 ベクトル検索開始: クエリ='{query_text[:50]}...', ベクトル数={len(vector_items)}")
    q = _embed(query_text)
    print(f"📊 クエリベクトル次元: {len(q)}")
    scored = []
    valid_embeddings = 0
    for v in vector_items:
        emb = v.get('embedding')
        if isinstance(emb, str):
            try:
                emb = json.loads(emb)
            except Exception as e:
                print(f"⚠️ embedding JSON解析エラー: {e}")
                continue
        if not isinstance(emb, list):  # 無効
            print(f"⚠️ 無効なembedding: {type(emb)}")
            continue
        valid_embeddings += 1
        sim = _cosine(q, emb)
        scored.append({'chunk': v, 'similarity': sim})
        if len(scored) <= 5:  # 最初の5件の類似度をログ出力
            print(f"📊 類似度: {sim:.3f}")
    
    print(f"📊 有効なembedding数: {valid_embeddings}")
    scored.sort(key=lambda x: x['similarity'], reverse=True)
    result = scored[:k]
    print(f"🎯 Top-{k}結果: {[(r['similarity'], r['chunk'].get('knowledgeId', 'unknown')) for r in result]}")
    return result

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    ナレッジチャット機能のLambda関数
    """
    try:
        # ログのPII配慮（event全体をダンプしない）
        print(f"📚 Knowledge Chat Lambda開始")
        
        # リクエストボディの解析
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        action = body.get('action')
        user_id = get_user_id_from_event(event)
        
        print(f"🔍 アクション: {action}, ユーザーID: {user_id[:8]}...")
        
        if not user_id:
            return create_error_response(401, '認証が必要です')
        
        # アクション別の処理
        if action == 'send_message':
            return send_chat_message(body, user_id)
        elif action == 'get_chat_history':
            return get_chat_history(body, user_id)
        elif action == 'search_knowledge':
            return search_knowledge(body, user_id)
        else:
            return create_error_response(400, '無効なアクションです')
        
    except Exception as e:
        print(f"❌ Knowledge Chat error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return create_error_response(500, f'サーバーエラーが発生しました: {str(e)}')

def send_chat_message(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """チャットメッセージを送信"""
    try:
        message = body.get('message')
        chat_id = body.get('chatId')
        if not chat_id:
            chat_id = str(uuid.uuid4())
        knowledge_ids = body.get('knowledgeIds', [])
        
        if not message:
            return create_error_response(400, 'メッセージが必要です')
        
        print(f"💬 チャットメッセージ送信: {message}")
        
        # ナレッジ検索
        if knowledge_ids:
            # 指定されたナレッジから検索
            relevant_knowledge = search_specific_knowledge(knowledge_ids, message, user_id)
        else:
            # 全ナレッジから検索
            relevant_knowledge = search_all_knowledge(message, user_id)
        
        # AI回答生成
        ai_response = generate_ai_response(message, relevant_knowledge)
        
        # チャット履歴を保存
        chat_item = {
            'PK': f'USER#{user_id}',
            'SK': f'CHAT#{chat_id}#{int(datetime.utcnow().timestamp())}',
            'userId': user_id,
            'chatId': chat_id,
            'message': message,
            'response': ai_response,
            'knowledgeIds': [k['knowledgeId'] for k in relevant_knowledge],
            'timestamp': datetime.utcnow().isoformat(),
            'createdAt': datetime.utcnow().isoformat()
        }
        
        knowledge_chats_table.put_item(Item=chat_item)
        
        return create_success_response({
            'chatId': chat_id,
            'message': message,
            'response': ai_response,
            'knowledgeIds': [k['knowledgeId'] for k in relevant_knowledge],
            'relevantKnowledge': relevant_knowledge
        })
        
    except Exception as e:
        print(f"❌ チャットメッセージ送信エラー: {e}")
        return create_error_response(500, f'チャットメッセージの送信に失敗しました: {str(e)}')

def search_specific_knowledge(knowledge_ids: List[str], message: str, user_id: str) -> List[Dict[str, Any]]:
    """指定されたナレッジからベクトル検索"""
    try:
        results = []
        for kid in knowledge_ids:
            kid_vectors = _iter_all_vectors_by_kid(kid)
            topk = _topk_by_cosine(message, kid_vectors, k=TOP_K)
            # タイトル取得（保存スキーマに合わせる）
            kresp = knowledge_table.query(
                KeyConditionExpression=Key('PK').eq(f'KNOWLEDGE#{user_id}') & Key('SK').eq(f'KNOWLEDGE#{kid}')
            )
            title = (kresp.get('Items') or [{}])[0].get('title', '')
            for r in topk:
                chunk_text = r['chunk'].get('chunk') or r['chunk'].get('chunkText') or ''
                results.append({
                    'knowledgeId': kid,
                    'title': title,
                    'chunkText': chunk_text,
                    'relevanceScore': float(r['similarity'])
                })
        results.sort(key=lambda x: x['relevanceScore'], reverse=True)
        return results[:TOP_K]
    except Exception as e:
        print('❌ 指定ナレッジ検索エラー:', e)
        return []

def search_all_knowledge(message: str, user_id: str) -> List[Dict[str, Any]]:
    """全ナレッジからベクトル検索"""
    try:
        print(f"🔍 全ナレッジ検索開始 user={user_id[:8]}...")
        kitems = _fetch_all_knowledge_for_user(user_id)
        print(f"📚 取得したナレッジアイテム数: {len(kitems)}")
        
        agg_vectors = []
        meta_by_id = {}
        for it in kitems:
            kid = it.get('knowledgeId')
            if not kid:  # SK から復元するフォールバック
                sk = it.get('SK', '')
                if sk.startswith('KNOWLEDGE#'):
                    kid = sk.split('#', 1)[1]
            if not kid: 
                print(f"⚠️ knowledgeIdが見つからないアイテム: {it}")
                continue
            print(f"🔍 ナレッジID: {kid}")
            meta_by_id[kid] = it
            vectors = _iter_all_vectors_by_kid(kid, limit=MAX_VECTORS)
            print(f"📝 ベクトル数: {len(vectors)}")
            agg_vectors.extend(vectors)
        
        print(f"📊 総ベクトル数: {len(agg_vectors)}")
        
        if not agg_vectors:
            print("❌ ベクトルが見つかりません")
            return []
            
        # Top-K by cosine over all candidates
        topk = _topk_by_cosine(message, agg_vectors, k=TOP_K)
        print(f"🎯 Top-K結果数: {len(topk)}")
        
        results = []
        for r in topk:
            kid = r['chunk']['knowledgeId']
            title = meta_by_id.get(kid, {}).get('title', '')
            chunk_text = r['chunk'].get('chunk') or r['chunk'].get('chunkText') or ''
            print(f"✅ 関連ナレッジ発見: {kid}, 類似度: {r['similarity']:.3f}")
            results.append({
                'knowledgeId': kid,
                'title': title,
                'chunkText': chunk_text,
                'relevanceScore': float(r['similarity'])
            })
        return results
    except Exception as e:
        print('❌ 全ナレッジ検索エラー:', e)
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return []

def generate_ai_response(message: str, relevant_knowledge: List[Dict[str, Any]]) -> str:
    """AI回答を生成"""
    try:
        if not relevant_knowledge:
            return "申し訳ございませんが、関連するナレッジが見つかりませんでした。"
        
        # コンテキストを構築
        context = "\n\n".join([
            f"【{k['title']}】\n{k['chunkText']}"
            for k in relevant_knowledge
        ])
        
        # OpenAI API keyを取得
        api_key = get_openai_api_key()
        
        # OpenAI APIで回答生成
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": "あなたは営業支援AIです。提供されたナレッジデータを基に、ユーザーの質問に正確で有用な回答を提供してください。回答は簡潔で分かりやすく、営業活動に役立つ内容にしてください。"
                },
                {
                    "role": "user",
                    "content": f"質問: {message}\n\n参考ナレッジ:\n{context}"
                }
            ],
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content']
        else:
            print(f"❌ OpenAI API error: {response.status_code} - {response.text}")
            return "申し訳ございませんが、回答の生成に失敗しました。"
        
    except Exception as e:
        print(f"❌ AI回答生成エラー: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return "申し訳ございませんが、回答の生成に失敗しました。"

def get_chat_history(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """チャット履歴を取得"""
    try:
        chat_id = body.get('chatId')
        
        if chat_id:
            # 特定のチャットの履歴を取得
            response = knowledge_chats_table.query(
                KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') & Key('SK').begins_with(f'CHAT#{chat_id}')
            )
        else:
            # ユーザーの全チャット履歴を取得（GSIフォールバック対応）
            try:
                # まずGSIを使用して取得を試行
                response = knowledge_chats_table.query(
                    IndexName='UserIdIndex',
                    KeyConditionExpression=Key('userId').eq(user_id)
                )
            except Exception as gsi_error:
                print(f"⚠️ GSI UserIdIndex not available, falling back to PK scan: {gsi_error}")
                # GSIが利用できない場合はPKベースでスキャン
                response = knowledge_chats_table.query(
                    KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') & Key('SK').begins_with('CHAT#')
                )
        
        # ページネーション対応で全チャットを取得
        all_chats = []
        last_evaluated_key = None
        
        while True:
            query_params = {
                'KeyConditionExpression': Key('PK').eq(f'USER#{user_id}') & Key('SK').begins_with('CHAT#')
            }
            if last_evaluated_key:
                query_params['ExclusiveStartKey'] = last_evaluated_key
                
            response = knowledge_chats_table.query(**query_params)
            all_chats.extend(response.get('Items', []))
            
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break
        
        # チャットID別にグループ化
        chat_groups = {}
        for chat in all_chats:
            chat_id = chat.get('chatId')
            if chat_id not in chat_groups:
                chat_groups[chat_id] = []
            chat_groups[chat_id].append(chat)
        
        # 各チャットを時系列でソート
        for chat_id in chat_groups:
            chat_groups[chat_id].sort(key=lambda x: x.get('timestamp', ''))
        
        return create_success_response({
            'chats': chat_groups
        })
        
    except Exception as e:
        print(f"❌ チャット履歴取得エラー: {e}")
        return create_error_response(500, f'チャット履歴の取得に失敗しました: {str(e)}')

def search_knowledge(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """ナレッジ検索"""
    try:
        query = body.get('query', '')
        knowledge_ids = body.get('knowledgeIds', [])
        
        if knowledge_ids:
            relevant_knowledge = search_specific_knowledge(knowledge_ids, query, user_id)
        else:
            relevant_knowledge = search_all_knowledge(query, user_id)
        
        return create_success_response({
            'knowledge': relevant_knowledge
        })
        
    except Exception as e:
        print(f"❌ ナレッジ検索エラー: {e}")
        return create_error_response(500, f'ナレッジ検索に失敗しました: {str(e)}')

def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """イベントからユーザーIDを取得（REST API v1 / HTTP API v2両対応）"""
    try:
        # REST API v1 (requestContext.authorizer.claims.sub)
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            claims = event['requestContext']['authorizer'].get('claims', {})
            if claims.get('sub'):
                return claims.get('sub')
        
        # HTTP API v2 (requestContext.authorizer.jwt.claims.sub)
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            jwt_claims = event['requestContext']['authorizer'].get('jwt', {}).get('claims', {})
            if jwt_claims.get('sub'):
                return jwt_claims.get('sub')
        
        # 直接的な認証情報の場合
        if 'user_id' in event:
            return event['user_id']
            
        return ''
    except Exception as e:
        print(f"❌ ユーザーID取得エラー: {e}")
        return ''

def create_success_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """成功レスポンスを作成"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps({
            'success': True,
            'data': data
        }, ensure_ascii=False)
    }

def create_error_response(status_code: int, message: str) -> Dict[str, Any]:
    """エラーレスポンスを作成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps({
            'success': False,
            'error': message
        }, ensure_ascii=False)
    }
