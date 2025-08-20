import json
import boto3
import os
import math
import requests
from datetime import datetime
from botocore.exceptions import ClientError

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
knowledge_table = dynamodb.Table(os.environ['KNOWLEDGE_TABLE'])
vectors_table = dynamodb.Table(os.environ['KNOWLEDGE_VECTORS_TABLE'])

# OpenAI設定
secrets_client = boto3.client('secretsmanager')

def get_openai_api_key():
    """OpenAI APIキーを取得（環境変数またはSecrets Managerから）"""
    try:
        # まず環境変数から取得を試行
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            return api_key
        
        # Secrets Managerから取得を試行
        secret_arn = os.environ.get('OPENAI_API_SECRET_ARN')
        if secret_arn:
            response = secrets_client.get_secret_value(SecretId=secret_arn)
            secret_dict = json.loads(response['SecretString'])
            return secret_dict['openai_api_key']
        
        raise ValueError("OpenAI API key not configured (neither OPENAI_API_KEY nor OPENAI_API_SECRET_ARN is set)")
    except Exception as e:
        print(f"Failed to get OpenAI API key: {str(e)}")
        raise

def cosine_similarity(vec1, vec2):
    """コサイン類似度を計算（numpy不使用版）"""
    # ドット積を計算
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    
    # ベクトルの大きさを計算
    norm_vec1 = math.sqrt(sum(a * a for a in vec1))
    norm_vec2 = math.sqrt(sum(b * b for b in vec2))
    
    if norm_vec1 == 0 or norm_vec2 == 0:
        return 0
    
    return dot_product / (norm_vec1 * norm_vec2)

def generate_query_embedding(query):
    """クエリの埋め込みを生成（OpenAI API使用）"""
    try:
        api_key = get_openai_api_key()
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'input': query,
            'model': 'text-embedding-3-small'
        }
        
        response = requests.post(
            'https://api.openai.com/v1/embeddings',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            embedding = result['data'][0]['embedding']
            print(f"✅ Query embedding generated successfully: {len(embedding)} dimensions")
            return embedding
        else:
            print(f"❌ OpenAI API error: {response.status_code} - {response.text}")
            raise Exception(f"OpenAI API error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error generating query embedding: {str(e)}")
        raise

def search_similar_chunks(user_id, query_embedding, top_k=5):
    """類似度検索でトップKのチャンクを取得"""
    try:
        # ユーザーのすべてのベクトルを取得
        response = vectors_table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression='userId = :uid',
            ExpressionAttributeValues={
                ':uid': user_id
            }
        )
        
        chunks = response.get('Items', [])
        print(f"🔍 Found {len(chunks)} chunks for user {user_id}")
        
        # 類似度を計算
        similarities = []
        for chunk in chunks:
            if 'embedding' in chunk and chunk['embedding']:
                try:
                    # string形式のベクトルをパース
                    if isinstance(chunk['embedding'], str):
                        embedding = json.loads(chunk['embedding'])
                    else:
                        embedding = chunk['embedding']
                    
                    similarity = cosine_similarity(query_embedding, embedding)
                    similarities.append({
                        'chunk': chunk,
                        'similarity': similarity
                    })
                except Exception as e:
                    print(f"Error parsing embedding: {e}")
                    continue
        
        # 類似度でソート
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        # トップKを返す
        top_chunks = similarities[:top_k]
        print(f"📊 Top {len(top_chunks)} chunks selected with similarities: {[round(s['similarity'], 3) for s in top_chunks]}")
        
        return top_chunks
        
    except ClientError as e:
        print(f"Error searching similar chunks: {e}")
        return []

def get_knowledge_context(knowledge_ids):
    """ナレッジIDから詳細情報を取得"""
    context_items = []
    
    for knowledge_id in knowledge_ids:
        try:
            response = knowledge_table.scan(
                FilterExpression='knowledgeId = :kid',
                ExpressionAttributeValues={
                    ':kid': knowledge_id
                }
            )
            
            items = response.get('Items', [])
            if items:
                context_items.append(items[0])
                
        except ClientError as e:
            print(f"Error getting knowledge context: {e}")
    
    return context_items

def generate_rag_response(query, similar_chunks, context_items):
    """RAGを使用して回答を生成（OpenAI API使用）"""
    try:
        api_key = get_openai_api_key()
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        # コンテキストを構築
        context_text = "\n\n".join([
            f"【ナレッジ: {item.get('title', 'Unknown')}】\n{chunk['chunk']['chunk']}"
            for item in context_items
            for chunk in similar_chunks
            if chunk['chunk']['knowledgeId'] == item['knowledgeId']
        ])
        
        # 参考になったナレッジのタイトルを収集
        referenced_knowledge = [
            {
                'knowledgeId': item['knowledgeId'],
                'title': item.get('title', 'Unknown'),
                'category': item.get('category', 'general')
            }
            for item in context_items
        ]
        
        data = {
            'model': 'gpt-4o-mini',
            'messages': [
                {
                    'role': 'system',
                    'content': """あなたは専門的なナレッジベース検索アシスタントです。
以下のルールに従って回答してください：

1. 提供されたナレッジベースの情報のみを使用して回答する
2. 回答は日本語で、丁寧で分かりやすく説明する
3. 情報が不足している場合は、「提供されたナレッジベースには十分な情報がありません」と伝える
4. 回答には具体的な根拠を示す
5. 関連する追加情報があれば提案する"""
                },
                {
                    'role': 'user',
                    'content': f"""質問: {query}

参考ナレッジベース:
{context_text}

上記のナレッジベースを参考に、質問に回答してください。"""
                }
            ],
            'max_tokens': 1000,
            'temperature': 0.3
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            answer = result['choices'][0]['message']['content']
            
            print(f"✅ RAG response generated successfully")
            
            return {
                'answer': answer,
                'referencedKnowledge': referenced_knowledge,
                'similarityScores': [chunk.get('similarity', 0.8) for chunk in similar_chunks]
            }
        else:
            print(f"❌ OpenAI API error: {response.status_code} - {response.text}")
            raise Exception(f"OpenAI API error: {response.status_code}")
        
    except Exception as e:
        print(f"❌ Error generating RAG response: {str(e)}")
        raise e

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    print(f"Event: {json.dumps(event)}")
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
    
    try:
        http_method = event['httpMethod']
        
        # OPTIONSリクエスト（CORS preflight）
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight response'})
            }
        
        # ユーザーIDを取得（Cognito経由）
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        # 一時的にテスト用user_idを使用
        if not user_id:
            user_id = 'test-user-123'
            print("⚠️ Using test user_id for testing")
        
        if http_method == 'POST':
            # RAG検索を実行
            body = json.loads(event.get('body', '{}'))
            query = body.get('query')
            top_k = body.get('top_k', 5)
            
            if not query:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Query is required'})
                }
            
            print(f"🔍 Searching for query: {query}")
            
            # 1. クエリの埋め込みを生成
            query_embedding = generate_query_embedding(query)
            
            # 2. 類似チャンクを検索
            similar_chunks = search_similar_chunks(user_id, query_embedding, top_k)
            
            if not similar_chunks:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'answer': 'ナレッジベースに関連する情報が見つかりませんでした。',
                        'referencedKnowledge': [],
                        'similarityScores': []
                    })
                }
            
            # 3. ナレッジの詳細情報を取得
            knowledge_ids = list(set([chunk['chunk']['knowledgeId'] for chunk in similar_chunks]))
            context_items = get_knowledge_context(knowledge_ids)
            
            # 4. RAG応答を生成
            rag_result = generate_rag_response(query, similar_chunks, context_items)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(rag_result)
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
