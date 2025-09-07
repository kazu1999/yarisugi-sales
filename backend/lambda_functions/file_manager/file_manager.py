import json
import boto3
import os
import uuid
from datetime import datetime
import base64
from typing import Dict, Any, List
import PyPDF2
import io
import requests
import openai
from decimal import Decimal

# AWS クライアントの初期化
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
secretsmanager = boto3.client('secretsmanager')

# 環境変数
CUSTOMER_FILES_TABLE = os.environ.get('CUSTOMER_FILES_TABLE')
S3_BUCKET = os.environ.get('S3_BUCKET')
OPENAI_API_KEY_SECRET = os.environ.get('OPENAI_API_KEY_SECRET')

# Decimal型を処理するヘルパー関数
def convert_decimals(obj):
    """DynamoDBのDecimal型を通常の数値に変換"""
    if isinstance(obj, Decimal):
        return float(obj) if obj % 1 != 0 else int(obj)
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    else:
        return obj

# OpenAI クライアントの初期化
def get_openai_client():
    try:
        # Secrets ManagerからAPIキーを取得
        response = secretsmanager.get_secret_value(SecretId=OPENAI_API_KEY_SECRET)
        api_key = json.loads(response['SecretString'])['openai_api_key']
        openai.api_key = api_key
        return openai
    except Exception as e:
        print(f"Error getting OpenAI API key: {e}")
        return None

def extract_text_from_pdf(pdf_content: bytes) -> str:
    """PDFファイルからテキストを抽出"""
    try:
        pdf_file = io.BytesIO(pdf_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def transcribe_audio(audio_content: bytes, file_extension: str) -> str:
    """音声ファイルをテキストに変換（OpenAI Whisper使用）"""
    try:
        openai_client = get_openai_client()
        if not openai_client:
            return "音声変換に失敗しました"
        
        # 音声ファイルを一時的に保存
        temp_file_path = f"/tmp/audio.{file_extension}"
        with open(temp_file_path, "wb") as f:
            f.write(audio_content)
        
        # OpenAI Whisperで音声変換
        with open(temp_file_path, "rb") as audio_file:
            transcript = openai_client.Audio.transcribe("whisper-1", audio_file)
        
        # 一時ファイルを削除
        os.remove(temp_file_path)
        return transcript.text
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        return "音声変換に失敗しました"

def generate_summary(text: str, file_type: str) -> str:
    """テキストの要約を生成"""
    try:
        openai_client = get_openai_client()
        if not openai_client:
            return "要約の生成に失敗しました"
        
        # ファイルの長さに応じて要約の長さを調整
        if len(text) < 1000:
            summary_length = "2-3行"
        elif len(text) < 5000:
            summary_length = "段落単位"
        else:
            summary_length = "セクション単位"
        
        prompt = f"""
以下の{file_type}ファイルの内容を{summary_length}で要約してください。
内容を簡潔にまとめ、重要なポイントを抽出してください。

内容:
{text}

要約:
"""
        
        response = openai_client.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "あなたは優秀な要約作成者です。与えられた内容を簡潔で分かりやすく要約してください。"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "要約の生成に失敗しました"

def save_file_to_s3(file_content: bytes, file_name: str, customer_id: str) -> str:
    """ファイルをS3に保存"""
    try:
        file_id = str(uuid.uuid4())
        s3_key = f"customers/{customer_id}/files/{file_id}/{file_name}"
        
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType='application/octet-stream'
        )
        
        return file_id, s3_key
    except Exception as e:
        print(f"Error saving file to S3: {e}")
        raise e

def save_file_metadata(file_id: str, customer_id: str, file_name: str, file_type: str, 
                      file_size: int, s3_key: str, summary: str, user_id: str) -> Dict[str, Any]:
    """ファイルのメタデータをDynamoDBに保存"""
    try:
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        
        item = {
            'PK': f'CUSTOMER#{customer_id}',
            'SK': f'FILE#{file_id}',
            'fileId': file_id,
            'customerId': customer_id,
            'fileName': file_name,
            'fileType': file_type,
            'fileSize': file_size,
            's3Key': s3_key,
            'summary': summary,
            'userId': user_id,
            'uploadedAt': datetime.utcnow().isoformat(),
            'status': 'active'
        }
        
        table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error saving file metadata: {e}")
        raise e

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """メインのLambda関数"""
    try:
        print(f"Event: {json.dumps(event)}")
        
        # リクエストの解析
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        if http_method == 'POST' and '/files/upload' in path:
            return handle_file_upload(event)
        elif http_method == 'GET' and '/files/' in path and path != '/files':
            return handle_file_detail(event)
        elif http_method == 'GET' and '/files' in path:
            return handle_file_list(event)
        elif http_method == 'DELETE' and '/files/' in path:
            return handle_file_delete(event)
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'Invalid endpoint'})
            }
            
    except Exception as e:
        print(f"Error in lambda_handler: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }

def handle_file_upload(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイルアップロード処理"""
    try:
        # リクエストボディの解析
        body = json.loads(event.get('body', '{}'))
        customer_id = body.get('customerId')
        file_name = body.get('fileName')
        file_type = body.get('fileType')
        file_content_base64 = body.get('fileContent')
        user_id = body.get('userId')
        
        if not all([customer_id, file_name, file_type, file_content_base64, user_id]):
                    return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'Missing required parameters'})
        }
        
        # Base64デコード
        file_content = base64.b64decode(file_content_base64)
        file_size = len(file_content)
        
        # ファイルサイズチェック（10MB制限）
        if file_size > 10 * 1024 * 1024:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'File size exceeds 10MB limit'})
            }
        
        # ファイルをS3に保存
        file_id, s3_key = save_file_to_s3(file_content, file_name, customer_id)
        
        # ファイル内容の処理と要約生成
        summary = ""
        if file_type.lower() == 'pdf':
            text = extract_text_from_pdf(file_content)
            if text:
                summary = generate_summary(text, "PDF")
        elif file_type.lower() in ['mp3', 'wav', 'm4a', 'aac']:
            text = transcribe_audio(file_content, file_type.lower())
            if text and "失敗" not in text:
                summary = generate_summary(text, "音声")
        
        # メタデータをDynamoDBに保存
        file_metadata = save_file_metadata(
            file_id, customer_id, file_name, file_type, 
            file_size, s3_key, summary, user_id
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'fileId': file_id,
                'summary': summary,
                'message': 'ファイルが正常にアップロードされました'
            })
        }
        
    except Exception as e:
        print(f"Error in handle_file_upload: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'File upload failed: {str(e)}'})
        }

def handle_file_list(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイル一覧取得"""
    try:
        # クエリパラメータの解析
        query_params = event.get('queryStringParameters', {}) or {}
        customer_id = query_params.get('customerId')
        
        if not customer_id:
                    return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'customerId is required'})
        }
        
        # DynamoDBからファイル一覧を取得
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.query(
            IndexName='CustomerIdIndex',
            KeyConditionExpression='customerId = :customerId',
            ExpressionAttributeValues={
                ':customerId': customer_id
            }
        )
        
        files = []
        for item in response.get('Items', []):
            # Decimal型を変換
            converted_item = convert_decimals(item)
            files.append({
                'fileId': converted_item.get('fileId'),
                'fileName': converted_item.get('fileName'),
                'fileType': converted_item.get('fileType'),
                'fileSize': converted_item.get('fileSize'),
                'uploadedAt': converted_item.get('uploadedAt'),
                'summary': converted_item.get('summary', '')[:100] + '...' if converted_item.get('summary') and len(converted_item.get('summary', '')) > 100 else converted_item.get('summary', '')
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'files': files
            })
        }
        
    except Exception as e:
        print(f"Error in handle_file_list: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'Failed to get file list: {str(e)}'})
        }

def handle_file_detail(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイル詳細取得"""
    try:
        # パスパラメータの解析
        path_params = event.get('pathParameters', {}) or {}
        file_id = path_params.get('fileId')
        
        if not file_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'fileId is required'})
            }
        
        # DynamoDBからファイル詳細を取得
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.scan(
            FilterExpression='fileId = :fileId',
            ExpressionAttributeValues={
                ':fileId': file_id
            }
        )
        
        if not response.get('Items'):
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'File not found'})
            }
        
        file_item = response['Items'][0]
        
        # Decimal型を変換
        converted_item = convert_decimals(file_item)
        
        # S3からファイルのダウンロードURLを生成
        s3_key = converted_item.get('s3Key')
        download_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=3600  # 1時間有効
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'file': {
                    'fileId': converted_item.get('fileId'),
                    'fileName': converted_item.get('fileName'),
                    'fileType': converted_item.get('fileType'),
                    'fileSize': converted_item.get('fileSize'),
                    'uploadedAt': converted_item.get('uploadedAt'),
                    'summary': converted_item.get('summary'),
                    'downloadUrl': download_url
                }
            })
        }
        
    except Exception as e:
        print(f"Error in handle_file_detail: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'Failed to get file detail: {str(e)}'})
        }

def handle_file_delete(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイル削除"""
    try:
        # パスパラメータの解析
        path_params = event.get('pathParameters', {}) or {}
        file_id = path_params.get('fileId')
        
        if not file_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'fileId is required'})
            }
        
        # DynamoDBからファイル情報を取得
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.scan(
            FilterExpression='fileId = :fileId',
            ExpressionAttributeValues={
                ':fileId': file_id
            }
        )
        
        if not response.get('Items'):
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'File not found'})
            }
        
        file_item = response['Items'][0]
        s3_key = file_item.get('s3Key')
        
        # S3からファイルを削除
        s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        
        # DynamoDBからファイル情報を削除
        table.delete_item(
            Key={
                'PK': file_item.get('PK'),
                'SK': file_item.get('SK')
            }
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'message': 'ファイルが正常に削除されました'
            })
        }
        
    except Exception as e:
        print(f"Error in handle_file_delete: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'Failed to delete file: {str(e)}'})
        }
