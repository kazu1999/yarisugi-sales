import json
import os
import boto3
import openai
from typing import Dict, Any, List
from decimal import Decimal

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
faqs_table = dynamodb.Table(os.environ.get('FAQS_TABLE', 'yarisugi-sales-faqs-dev'))

# OpenAI設定
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

# OpenAI APIキーを設定
openai_api_key = get_openai_api_key()
if openai_api_key:
    openai.api_key = openai_api_key
else:
    print("Warning: OpenAI API key not found")

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """レスポンスを作成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, default=str)
    }

def get_user_id_from_token(event: Dict[str, Any]) -> str:
    """JWTトークンからユーザーIDを取得"""
    try:
        # Cognito JWTトークンからユーザーIDを抽出
        claims = event['requestContext']['authorizer']['claims']
        return claims['sub']
    except Exception as e:
        print(f"Error extracting user ID: {str(e)}")
        raise Exception("Invalid token")

def get_faqs_for_user(user_id: str) -> List[Dict[str, Any]]:
    """ユーザーのFAQデータを取得"""
    try:
        response = faqs_table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}'
            }
        )
        
        faqs = []
        for item in response.get('Items', []):
            # Decimal型を文字列に変換
            faq = {
                'question': str(item.get('question', '')),
                'answer': str(item.get('answer', '')),
                'category': str(item.get('category', '')),
                'tags': item.get('tags', [])
            }
            faqs.append(faq)
        
        print(f"Found {len(faqs)} FAQs for user {user_id}")
        return faqs
    except Exception as e:
        print(f"Error fetching FAQs: {str(e)}")
        return []

def generate_ai_reply(email_content: str, faqs: List[Dict[str, Any]], user_context: str = "") -> str:
    """AIを使用してメール返信を生成"""
    try:
        # FAQデータを文字列に変換
        faqs_text = ""
        for i, faq in enumerate(faqs, 1):
            faqs_text += f"FAQ{i}:\n質問: {faq['question']}\n回答: {faq['answer']}\n\n"
        
        # プロンプトを作成
        prompt = f"""
あなたは営業担当者のアシスタントです。以下の情報を基に、顧客からのメールに対する適切な返信を生成してください。

## 顧客からのメール内容:
{email_content}

## 参考となるFAQ情報:
{faqs_text if faqs_text else "FAQ情報はありません"}

## ユーザーコンテキスト:
{user_context if user_context else "特に指定なし"}

## 返信作成のガイドライン:
1. 丁寧で親しみやすい口調を使用
2. 顧客の質問や要望に適切に回答
3. FAQ情報を活用して正確な情報を提供
4. 営業的な要素を含めつつ、押し付けがましくならない
5. 具体的で実用的な内容にする
6. 返信は200-400文字程度で作成

## 返信例:
「いつもお世話になっております。
[具体的な回答内容]
今後ともよろしくお願いいたします。」

上記のガイドラインに従って、適切な返信を作成してください。
"""

        # OpenAI APIを呼び出し
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "あなたは営業担当者のアシスタントです。顧客からのメールに対して、FAQ情報を活用して適切な返信を生成します。"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        ai_reply = response.choices[0].message.content.strip()
        print(f"Generated AI reply: {len(ai_reply)} characters")
        return ai_reply
        
    except Exception as e:
        print(f"Error generating AI reply: {str(e)}")
        return "申し訳ございませんが、AI返信の生成中にエラーが発生しました。手動で返信を作成してください。"

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda関数のメインハンドラー"""
    try:
        # CORS preflight request
        if event['httpMethod'] == 'OPTIONS':
            return create_response(200, {'message': 'OK'})
        
        # メソッドとパスの確認
        method = event['httpMethod']
        path = event['path']
        
        print(f"Request: {method} {path}")
        
        # 認証確認
        if 'requestContext' not in event or 'authorizer' not in event['requestContext']:
            return create_response(401, {'error': '認証が必要です'})
        
        user_id = get_user_id_from_token(event)
        
        if method == 'POST' and path == '/email/ai-reply':
            # リクエストボディを解析（Noneの場合を適切に処理）
            body_str = event.get('body')
            if body_str is None:
                return create_response(400, {'error': 'リクエストボディが必要です'})
            
            try:
                body = json.loads(body_str)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {str(e)}, body: {body_str}")
                return create_response(400, {'error': '無効なJSON形式です'})
            
            email_content = body.get('emailContent', '')
            user_context = body.get('userContext', '')
            
            if not email_content:
                return create_response(400, {'error': 'メール内容が必要です'})
            
            print(f"Processing email content: {len(email_content)} characters")
            
            # FAQデータを取得
            faqs = get_faqs_for_user(user_id)
            
            # AI返信を生成
            ai_reply = generate_ai_reply(email_content, faqs, user_context)
            
            return create_response(200, {
                'success': True,
                'aiReply': ai_reply,
                'faqsUsed': len(faqs),
                'generatedAt': context.get_remaining_time_in_millis()
            })
        
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})
