import json
import boto3
import os
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

# S3クライアント
s3_client = boto3.client('s3')

def lambda_handler(event, context):
    """S3署名付きURLを生成するLambda関数"""
    
    print(f"🔍 署名付きURL生成Lambda開始: {json.dumps(event, default=str)}")
    
    # CORSヘッダー
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    # OPTIONSリクエスト（CORS preflight）
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight response'})
        }
    
    try:
        # ユーザーIDを取得（Cognito経由）
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub') or claims.get('cognito:username')
        
        print(f"👤 ユーザーID: {user_id}")
        print(f"🔑 クレーム: {claims}")
        
        if not user_id:
            print("❌ ユーザーIDが見つかりません")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized - No valid user ID found'})
            }
        
        # リクエストボディを解析
        body = json.loads(event.get('body', '{}'))
        key = body.get('key')
        content_type = body.get('contentType', 'application/octet-stream')
        bucket = body.get('bucket', 'yarisugi-sales-uploads-dev')
        
        if not key:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Key is required'})
            }
        
        # 署名付きURLを生成
        print(f"🔧 署名付きURL生成パラメータ: bucket={bucket}, key={key}, contentType={content_type}")
        
        signed_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket,
                'Key': key,
                'ContentType': content_type,
                'ACL': 'private'
            },
            ExpiresIn=3600  # 1時間有効
        )
        
        print(f"✅ 署名付きURL生成完了: {key}")
        print(f"🔗 署名付きURL: {signed_url[:100]}...")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'signedUrl': signed_url,
                'key': key,
                'bucket': bucket
            })
        }
        
    except Exception as e:
        print(f"❌ 署名付きURL生成エラー: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }
