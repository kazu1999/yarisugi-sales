import json
import os
import boto3
import base64
from datetime import datetime
from typing import Dict, Any, List
import requests
from botocore.exceptions import ClientError

# 共通ライブラリをインポート
from common.dynamodb import DynamoDBClient

# === 環境変数 ===
FAQS_TABLE = os.environ.get('FAQS_TABLE', 'yarisugi-sales-faqs-dev')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
OPENAI_API_SECRET_ARN = os.environ.get('OPENAI_API_SECRET_ARN', '')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')

# === Secrets Manager クライアント ===
secrets_client = boto3.client('secretsmanager')

# === DynamoDBクライアント ===
dynamodb_client = DynamoDBClient()

def get_openai_api_key() -> str:
    """OpenAI APIキーを取得（環境変数またはSecrets Managerから）"""
    try:
        # まず環境変数から取得を試行
        if OPENAI_API_KEY:
            return OPENAI_API_KEY
        
        # Secrets Managerから取得を試行
        if OPENAI_API_SECRET_ARN:
            response = secrets_client.get_secret_value(SecretId=OPENAI_API_SECRET_ARN)
            # Secrets Managerに直接APIキーが保存されている場合
            if 'SecretString' in response:
                return response['SecretString']
            # JSON形式で保存されている場合
            elif 'SecretBinary' in response:
                secret_dict = json.loads(response['SecretBinary'].decode('utf-8'))
                return secret_dict.get('openai_api_key', secret_dict.get('api_key', ''))
            else:
                raise ValueError("No secret value found in Secrets Manager")
        
        raise ValueError("OpenAI API key not configured in environment variables or Secrets Manager")
    except Exception as e:
        print(f"Failed to get OpenAI API key: {str(e)}")
        raise

def create_response(status_code: int, body: Dict[str, Any], extra_headers: Dict[str, str] = None) -> Dict[str, Any]:
    """CORS対応のレスポンス作成"""
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'false',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
        'Access-Control-Expose-Headers': 'Content-Type,ETag,Location',
        'Access-Control-Max-Age': '600',
    }
    
    if extra_headers:
        headers.update(extra_headers)

    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, ensure_ascii=False, default=str)
    }

def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """イベントからユーザーIDを取得"""
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub') or claims.get('cognito:username')
        if user_id:
            return user_id
        return 'test-user-123'  # テスト用
    except Exception:
        return 'test-user-123'

def extract_text_from_pdf(pdf_content: bytes) -> str:
    """PDFからテキストを抽出（簡易版）"""
    try:
        # 実際の実装では、PyPDF2やpdfplumberを使用
        # ここでは簡易的にbase64デコードのみ
        return "PDF content extracted (simplified implementation)"
    except Exception as e:
        print(f"PDF抽出エラー: {str(e)}")
        return ""

def generate_faqs_with_openai(content: str, user_id: str) -> List[Dict[str, Any]]:
    """OpenAI APIを使用してFAQを生成"""
    try:
        openai_api_key = get_openai_api_key()
    except Exception as e:
        return [{"error": "OpenAI API key not configured"}]
    
    try:
        # OpenAI APIに送信するプロンプト
        prompt = f"""
以下のテキストから、よくある質問（FAQ）を抽出して、JSON形式で返してください。
各FAQには以下の情報を含めてください：
- question: 質問
- answer: 回答
- category: カテゴリ（料金、サポート、契約、機能、その他から選択）
- tags: 関連タグ（配列形式）

テキスト内容：
{content[:4000]}  # 長すぎる場合は切り詰め

以下のJSON形式で返してください：
[
  {{
    "question": "質問内容",
    "answer": "回答内容",
    "category": "カテゴリ",
    "tags": ["タグ1", "タグ2"]
  }}
]
"""

        headers = {
            'Authorization': f'Bearer {openai_api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': OPENAI_MODEL,
            'messages': [
                {
                    'role': 'system',
                    'content': 'あなたはFAQ抽出の専門家です。与えられたテキストから適切なFAQを抽出し、指定されたJSON形式で返してください。'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': 0.3,
            'max_tokens': 2000
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # JSONを抽出（```json```で囲まれている場合がある）
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0]
            elif '```' in content:
                content = content.split('```')[1]
            
            faqs = json.loads(content.strip())
            
            # 生成されたFAQにIDとタイムスタンプを追加
            now_iso = datetime.utcnow().isoformat()
            for faq in faqs:
                faq_id = f"faq_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"
                faq.update({
                    'id': faq_id,
                    'userId': user_id,
                    'isPublic': True,
                    'createdAt': now_iso,
                    'updatedAt': now_iso
                })
            
            return faqs
        else:
            print(f"OpenAI API エラー: {response.status_code} - {response.text}")
            return [{"error": f"OpenAI API error: {response.status_code}"}]
            
    except Exception as e:
        print(f"FAQ生成エラー: {str(e)}")
        return [{"error": f"Generation error: {str(e)}"}]

def save_faqs_to_dynamodb(faqs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """生成されたFAQをDynamoDBに保存"""
    try:
        saved_count = 0
        errors = []
        
        for faq in faqs:
            if 'error' in faq:
                errors.append(faq['error'])
                continue
                
            try:
                # DynamoDBに保存
                item = {
                    'PK': f"USER#{faq['userId']}",
                    'SK': f"FAQ#{faq['id']}",
                    'id': faq['id'],
                    'userId': faq['userId'],
                    'question': faq['question'],
                    'answer': faq['answer'],
                    'category': faq['category'],
                    'tags': faq.get('tags', []),
                    'isPublic': faq.get('isPublic', True),
                    'createdAt': faq['createdAt'],
                    'updatedAt': faq['updatedAt'],
                }
                
                result = dynamodb_client.put_item(FAQS_TABLE, item)
                if result['success']:
                    saved_count += 1
                else:
                    errors.append(f"Failed to save FAQ {faq['id']}: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                errors.append(f"Error saving FAQ {faq.get('id', 'unknown')}: {str(e)}")
        
        return {
            'success': True,
            'saved_count': saved_count,
            'total_count': len(faqs),
            'errors': errors
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def lambda_handler(event, context):
    """メインのLambda関数"""
    try:
        print(f"🚀 AI Generator Lambda開始")
        print(f"📋 イベント: {json.dumps(event, ensure_ascii=False, default=str)[:2000]}")

        http_method = event.get('httpMethod', 'POST')
        
        if http_method == 'OPTIONS':
            return create_response(200, {})
        
        if http_method != 'POST':
            return create_response(405, {'error': 'Method not allowed'})
        
        # ユーザーID取得
        user_id = get_user_id_from_event(event)
        print(f"👤 ユーザーID: {user_id}")
        
        # リクエストボディ解析
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)
        
        content_type = body.get('contentType', 'text')
        content = body.get('content', '')
        
        if not content:
            return create_response(400, {'error': 'Content is required'})
        
        print(f"📝 コンテンツタイプ: {content_type}")
        print(f"📝 コンテンツ長: {len(content)} characters")
        
        # PDFの場合、テキスト抽出
        if content_type == 'pdf' and content.startswith('data:application/pdf'):
            try:
                # Base64デコード
                pdf_data = base64.b64decode(content.split(',')[1])
                content = extract_text_from_pdf(pdf_data)
            except Exception as e:
                print(f"PDF処理エラー: {str(e)}")
                return create_response(400, {'error': f'PDF processing error: {str(e)}'})
        
        # FAQ生成
        print("🤖 FAQ生成開始")
        generated_faqs = generate_faqs_with_openai(content, user_id)
        
        if not generated_faqs or (len(generated_faqs) == 1 and 'error' in generated_faqs[0]):
            error_msg = generated_faqs[0]['error'] if generated_faqs else 'No FAQs generated'
            return create_response(500, {'error': error_msg})
        
        print(f"✅ {len(generated_faqs)}個のFAQを生成")
        
        # 保存オプション
        save_to_db = body.get('saveToDb', False)
        
        if save_to_db:
            print("💾 DynamoDBに保存開始")
            save_result = save_faqs_to_dynamodb(generated_faqs)
            
            if save_result['success']:
                return create_response(200, {
                    'message': 'FAQs generated and saved successfully',
                    'faqs': generated_faqs,
                    'saved_count': save_result['saved_count'],
                    'total_count': save_result['total_count'],
                    'errors': save_result['errors']
                })
            else:
                return create_response(500, {
                    'error': 'Failed to save FAQs',
                    'faqs': generated_faqs,
                    'save_error': save_result['error']
                })
        else:
            # 保存せずに生成結果のみ返す
            return create_response(200, {
                'message': 'FAQs generated successfully',
                'faqs': generated_faqs
            })
            
    except Exception as e:
        print(f"❌ Lambda エラー: {str(e)}")
        return create_response(500, {'error': f'Internal server error: {str(e)}'}) 