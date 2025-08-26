import json
import boto3
import os
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from decimal import Decimal
import uuid

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
email_connections_table = dynamodb.Table(os.environ.get('EMAIL_CONNECTIONS_TABLE', 'EmailConnections'))

def create_response(status_code, body):
    """API Gatewayレスポンスを作成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, default=str)
    }

def convert_decimals(obj):
    """Decimal型をJSONシリアライズ可能な型に変換"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(v) for v in obj]
    return obj

def test_imap_connection(email_address, password, imap_server, imap_port, use_ssl):
    """IMAP接続をテスト"""
    try:
        # パスワードの文字エンコーディングを修正
        if isinstance(password, str):
            # 非改行スペース（\xa0）を通常のスペースに変換
            password = password.replace('\xa0', ' ')
            # 前後の空白を削除
            password = password.strip()
        
        if use_ssl:
            mail = imaplib.IMAP4_SSL(imap_server, int(imap_port))
        else:
            mail = imaplib.IMAP4(imap_server, int(imap_port))
        
        mail.login(email_address, password)
        mail.logout()
        return True, None
    except Exception as e:
        return False, str(e)

def save_email_connection(user_id, email_address, password, imap_server, imap_port, use_ssl):
    """メール接続情報をDynamoDBに保存"""
    try:
        connection_id = str(uuid.uuid4())
        current_time = datetime.utcnow().isoformat()
        
        item = {
            'PK': f'USER#{user_id}',
            'SK': f'EMAIL_CONNECTION#{connection_id}',
            'connectionId': connection_id,
            'userId': user_id,
            'emailAddress': email_address,
            'password': password,  # 注意: 本番環境では暗号化が必要
            'imapServer': imap_server,
            'imapPort': imap_port,
            'useSSL': use_ssl,
            'createdAt': current_time,
            'updatedAt': current_time,
            'isActive': True
        }
        
        email_connections_table.put_item(Item=item)
        return connection_id
    except Exception as e:
        raise Exception(f"接続情報の保存に失敗しました: {str(e)}")

def get_user_email_connections(user_id):
    """ユーザーのメール接続一覧を取得"""
    try:
        response = email_connections_table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'EMAIL_CONNECTION#'
            }
        )
        
        connections = []
        for item in response.get('Items', []):
            # パスワードは除外
            safe_item = {k: v for k, v in item.items() if k != 'password'}
            connections.append(convert_decimals(safe_item))
        
        return connections
    except Exception as e:
        raise Exception(f"接続一覧の取得に失敗しました: {str(e)}")

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    try:
        # CORS preflight request
        if event['httpMethod'] == 'OPTIONS':
            return create_response(200, {})
        
        # ユーザーIDを取得（認証トークンから）
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        if not user_id:
            return create_response(401, {'error': '認証が必要です'})
        
        path = event.get('path', '')
        method = event.get('httpMethod', '')
        
        # パスパラメータを取得
        path_parameters = event.get('pathParameters', {})
        
        if method == 'POST' and '/email/test-connection' in path:
            # 接続テスト
            body = json.loads(event.get('body', '{}'))
            email_address = body.get('email')
            password = body.get('password')
            imap_server = body.get('imapServer')
            imap_port = body.get('imapPort', 993)
            use_ssl = body.get('useSSL', True)
            
            if not all([email_address, password, imap_server]):
                return create_response(400, {'error': '必要なパラメータが不足しています'})
            
            success, error_message = test_imap_connection(email_address, password, imap_server, imap_port, use_ssl)
            
            if success:
                return create_response(200, {'success': True})
            else:
                return create_response(400, {'success': False, 'error': error_message})
        
        elif method == 'POST' and '/email/save-connection' in path:
            # 接続保存
            body = json.loads(event.get('body', '{}'))
            email_address = body.get('email')
            password = body.get('password')
            imap_server = body.get('imapServer')
            imap_port = body.get('imapPort', 993)
            use_ssl = body.get('useSSL', True)
            
            if not all([email_address, password, imap_server]):
                return create_response(400, {'error': '必要なパラメータが不足しています'})
            
            # まず接続テスト
            success, error_message = test_imap_connection(email_address, password, imap_server, imap_port, use_ssl)
            if not success:
                return create_response(400, {'success': False, 'error': f'接続テストに失敗しました: {error_message}'})
            
            # 接続情報を保存
            connection_id = save_email_connection(user_id, email_address, password, imap_server, imap_port, use_ssl)
            
            return create_response(200, {
                'success': True,
                'connectionId': connection_id
            })
        
        elif method == 'GET' and '/email/connections' in path:
            # 接続一覧取得
            connections = get_user_email_connections(user_id)
            return create_response(200, {
                'success': True,
                'connections': connections
            })
        
        elif method == 'DELETE' and '/email/connections/' in path:
            # 接続削除
            connection_id = path_parameters.get('connectionId')
            if not connection_id:
                return create_response(400, {'error': '接続IDが必要です'})
            
            try:
                email_connections_table.delete_item(
                    Key={
                        'PK': f'USER#{user_id}',
                        'SK': f'EMAIL_CONNECTION#{connection_id}'
                    }
                )
                return create_response(200, {'success': True})
            except Exception as e:
                return create_response(500, {'error': f'接続の削除に失敗しました: {str(e)}'})
        
        else:
            return create_response(404, {'error': 'エンドポイントが見つかりません'})
    
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return create_response(500, {'error': f'内部サーバーエラー: {str(e)}'})
