import json
import os
import boto3
from datetime import datetime
from typing import Dict, List, Any, Optional
import openai

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
FAQS_TABLE = os.environ.get('FAQS_TABLE', 'yarisugi-sales-faqs-dev')

def get_openai_api_key():
    """AWS Secrets ManagerからOpenAI APIキーを取得"""
    try:
        secrets_client = boto3.client('secretsmanager')
        response = secrets_client.get_secret_value(
            SecretId=os.environ.get('OPENAI_API_KEY_SECRET_NAME', 'yarisugi-sales-openai-api-key-dev')
        )
        secret_data = json.loads(response['SecretString'])
        return secret_data.get('openai_api_key')
    except Exception as e:
        print(f"Error getting OpenAI API key: {str(e)}")
        return None

def create_response(status_code: int, body: Dict[str, Any], event: Optional[Dict] = None) -> Dict[str, Any]:
    """API Gateway用のレスポンスを作成"""
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, ensure_ascii=False, default=str)
    }

def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """イベントからユーザーIDを取得"""
    try:
        # Cognito認証からユーザーIDを取得
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        if not user_id:
            # デバッグ用のフォールバック
            user_id = event.get('requestContext', {}).get('authorizer', {}).get('user_id', 'debug-user')
        
        return user_id
    except Exception as e:
        print(f"❌ ユーザーID取得エラー: {str(e)}")
        return 'debug-user'

def get_all_faqs(user_id: str) -> List[Dict[str, Any]]:
    """ユーザーの全FAQを取得"""
    try:
        table = dynamodb.Table(FAQS_TABLE)
        
        response = table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}'
            }
        )
        
        faqs = []
        for item in response.get('Items', []):
            if item.get('SK', '').startswith('FAQ#'):
                faqs.append({
                    'id': item.get('id'),
                    'question': item.get('question', ''),
                    'answer': item.get('answer', ''),
                    'category': item.get('category', ''),
                    'tags': item.get('tags', [])
                })
        
        print(f"📋 取得したFAQ数: {len(faqs)}")
        return faqs
        
    except Exception as e:
        print(f"❌ FAQ取得エラー: {str(e)}")
        return []

def format_faqs_for_prompt(faqs: List[Dict[str, Any]]) -> str:
    """FAQをプロンプト用にフォーマット"""
    if not faqs:
        return ""
    
    formatted_faqs = []
    for faq in faqs:
        formatted_faqs.append(f"Q: {faq['question']}\nA: {faq['answer']}")
    
    return "\n\n".join(formatted_faqs)

def estimate_tokens(text: str) -> int:
    """テキストのトークン数を概算（日本語は1文字≈1トークン）"""
    return len(text)

def truncate_faqs_if_needed(faqs: List[Dict[str, Any]], max_tokens: int = 8000) -> List[Dict[str, Any]]:
    """FAQが多すぎる場合にトークン数制限内で切り詰める"""
    if not faqs:
        return faqs
    
    # プロンプトのベース部分のトークン数を概算
    base_prompt = """
あなたはFAQアシスタントです。以下のFAQ情報を基に、ユーザーの質問に答えてください。

FAQ情報:
"""
    base_tokens = estimate_tokens(base_prompt)
    
    # 使用可能なトークン数
    available_tokens = max_tokens - base_tokens - 500  # 余裕を持たせる
    
    selected_faqs = []
    current_tokens = 0
    
    for faq in faqs:
        faq_text = f"Q: {faq['question']}\nA: {faq['answer']}\n\n"
        faq_tokens = estimate_tokens(faq_text)
        
        if current_tokens + faq_tokens <= available_tokens:
            selected_faqs.append(faq)
            current_tokens += faq_tokens
        else:
            break
    
    print(f"📊 トークン制限: {max_tokens}, 使用トークン: {current_tokens}, 選択FAQ数: {len(selected_faqs)}/{len(faqs)}")
    return selected_faqs

def generate_chat_response(user_question: str, faqs: List[Dict[str, Any]]) -> str:
    """OpenAI APIを使用してチャット応答を生成"""
    try:
        if not faqs:
            return "申し訳ございませんが、現在FAQが登録されていません。FAQを登録してから再度お試しください。"
        
        # OpenAI APIキーを取得
        api_key = get_openai_api_key()
        if not api_key:
            return "申し訳ございませんが、AI機能の設定に問題があります。管理者にお問い合わせください。"
        
        # OpenAI APIキーを設定
        openai.api_key = api_key
        
        # トークン数制限を考慮してFAQを選択
        selected_faqs = truncate_faqs_if_needed(faqs)
        
        # FAQをプロンプト用にフォーマット
        faq_text = format_faqs_for_prompt(selected_faqs)
        
        # プロンプトを構築
        prompt = f"""あなたはFAQアシスタントです。以下のFAQ情報を基に、ユーザーの質問に答えてください。

FAQ情報:
{faq_text}

ユーザーの質問: {user_question}

回答する際の注意点:
- FAQの内容を基に回答してください
- FAQにない内容については「FAQに該当する情報が見つかりませんでした」と回答してください
- 丁寧で親しみやすい口調で回答してください
- 必要に応じて関連するFAQも紹介してください
"""

        # OpenAI APIを呼び出し
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "あなたはFAQアシスタントです。FAQの内容を基に、ユーザーの質問に丁寧に答えてください。"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"❌ OpenAI API呼び出しエラー: {str(e)}")
        return f"申し訳ございませんが、回答の生成中にエラーが発生しました: {str(e)}"

def handle_faq_chat(event: Dict[str, Any]) -> Dict[str, Any]:
    """FAQチャット処理"""
    try:
        # ユーザーIDを取得
        user_id = get_user_id_from_event(event)
        print(f"👤 ユーザーID: {user_id}")
        
        # リクエストボディを解析
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)
        
        user_question = body.get('question', '').strip()
        if not user_question:
            return create_response(400, {
                'success': False,
                'error': '質問が入力されていません'
            }, event)
        
        print(f"❓ ユーザーの質問: {user_question}")
        
        # 全FAQを取得
        faqs = get_all_faqs(user_id)
        
        # チャット応答を生成
        chat_response = generate_chat_response(user_question, faqs)
        
        print(f"💬 生成された回答: {chat_response[:100]}...")
        
        return create_response(200, {
            'success': True,
            'response': chat_response,
            'faq_count': len(faqs)
        }, event)
        
    except json.JSONDecodeError:
        return create_response(400, {
            'success': False,
            'error': '無効なJSON形式です'
        }, event)
    except Exception as e:
        print(f"❌ FAQチャット処理エラー: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': f'チャット処理中にエラーが発生しました: {str(e)}'
        }, event)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """メインハンドラー"""
    try:
        print(f"🚀 FAQチャット Lambda開始")
        print(f"📋 イベント: {json.dumps(event, default=str)}")
        
        # HTTPメソッドを取得
        http_method = event.get('httpMethod', 'POST')
        
        if http_method == 'OPTIONS':
            # CORS preflight request
            return create_response(200, {}, event)
        elif http_method == 'POST':
            # FAQチャット処理
            return handle_faq_chat(event)
        else:
            return create_response(405, {
                'success': False,
                'error': 'Method not allowed'
            }, event)
            
    except Exception as e:
        print(f"❌ Lambda エラー: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': f'サーバーエラーが発生しました: {str(e)}'
        }, event)
