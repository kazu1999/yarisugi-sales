import json
import boto3
import os
import imaplib
import email
from email.header import decode_header
from datetime import datetime
from decimal import Decimal
import base64
import quopri

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

def get_connection_info(user_id, connection_id):
    """接続情報を取得"""
    try:
        response = email_connections_table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': f'EMAIL_CONNECTION#{connection_id}'
            }
        )
        
        if 'Item' not in response:
            raise Exception('接続情報が見つかりません')
        
        return response['Item']
    except Exception as e:
        raise Exception(f"接続情報の取得に失敗しました: {str(e)}")

def decode_email_header(header_value):
    """メールヘッダーをデコード"""
    if not header_value:
        return ''
    
    try:
        decoded_parts = decode_header(header_value)
        decoded_string = ''
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                if encoding:
                    decoded_string += part.decode(encoding)
                else:
                    decoded_string += part.decode('utf-8', errors='ignore')
            else:
                decoded_string += str(part)
        return decoded_string
    except Exception:
        return str(header_value)

def get_email_body(msg):
    """メール本文を取得"""
    body = ""
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            
            # 添付ファイルはスキップ
            if "attachment" in content_disposition:
                continue
            
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or 'utf-8'
                        body += payload.decode(charset, errors='ignore')
                except Exception:
                    pass
            elif content_type == "text/html" and "attachment" not in content_disposition:
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or 'utf-8'
                        body += payload.decode(charset, errors='ignore')
                except Exception:
                    pass
    else:
        try:
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or 'utf-8'
                body = payload.decode(charset, errors='ignore')
        except Exception:
            body = str(msg.get_payload())
    
    return body

def fetch_email_list(connection_info, folder='INBOX', limit=50):
    """メール一覧を取得"""
    try:
        # IMAP接続
        if connection_info['useSSL']:
            mail = imaplib.IMAP4_SSL(connection_info['imapServer'], int(connection_info['imapPort']))
        else:
            mail = imaplib.IMAP4(connection_info['imapServer'], int(connection_info['imapPort']))
        
        mail.login(connection_info['emailAddress'], connection_info['password'])
        mail.select(folder)
        
        # メール一覧を取得
        _, message_numbers = mail.search(None, 'ALL')
        email_list = []
        
        # 最新のメールから取得
        message_list = message_numbers[0].split()
        message_list.reverse()  # 最新順
        
        for i, num in enumerate(message_list[:limit]):
            try:
                _, msg_data = mail.fetch(num, '(RFC822)')
                email_body = msg_data[0][1]
                msg = email.message_from_bytes(email_body)
                
                # メール情報を抽出
                subject = decode_email_header(msg.get('Subject', ''))
                from_addr = decode_email_header(msg.get('From', ''))
                to_addr = decode_email_header(msg.get('To', ''))
                date_str = msg.get('Date', '')
                
                # 日付をパース
                try:
                    date_tuple = email.utils.parsedate_tz(date_str)
                    if date_tuple:
                        date_obj = datetime.fromtimestamp(email.utils.mktime_tz(date_tuple))
                        formatted_date = date_obj.isoformat()
                    else:
                        formatted_date = date_str
                except Exception:
                    formatted_date = date_str
                
                email_info = {
                    'messageId': num.decode(),
                    'subject': subject,
                    'from': from_addr,
                    'to': to_addr,
                    'date': formatted_date,
                    'hasAttachments': msg.get_content_maintype() == 'multipart'
                }
                
                email_list.append(email_info)
                
            except Exception as e:
                print(f"メール {num} の処理中にエラー: {str(e)}")
                continue
        
        mail.logout()
        return email_list
        
    except Exception as e:
        raise Exception(f"メール一覧の取得に失敗しました: {str(e)}")

def fetch_email_detail(connection_info, message_id, folder='INBOX'):
    """メール詳細を取得"""
    try:
        # IMAP接続
        if connection_info['useSSL']:
            mail = imaplib.IMAP4_SSL(connection_info['imapServer'], int(connection_info['imapPort']))
        else:
            mail = imaplib.IMAP4(connection_info['imapServer'], int(connection_info['imapPort']))
        
        mail.login(connection_info['emailAddress'], connection_info['password'])
        mail.select(folder)
        
        # メール詳細を取得
        _, msg_data = mail.fetch(message_id.encode(), '(RFC822)')
        email_body = msg_data[0][1]
        msg = email.message_from_bytes(email_body)
        
        # メール情報を抽出
        subject = decode_email_header(msg.get('Subject', ''))
        from_addr = decode_email_header(msg.get('From', ''))
        to_addr = decode_email_header(msg.get('To', ''))
        cc_addr = decode_email_header(msg.get('Cc', ''))
        date_str = msg.get('Date', '')
        
        # 日付をパース
        try:
            date_tuple = email.utils.parsedate_tz(date_str)
            if date_tuple:
                date_obj = datetime.fromtimestamp(email.utils.mktime_tz(date_tuple))
                formatted_date = date_obj.isoformat()
            else:
                formatted_date = date_str
        except Exception:
            formatted_date = date_str
        
        # 本文を取得
        body = get_email_body(msg)
        
        # 添付ファイル情報を取得
        attachments = []
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_maintype() == 'multipart':
                    continue
                if part.get('Content-Disposition') is None:
                    continue
                
                filename = part.get_filename()
                if filename:
                    filename = decode_email_header(filename)
                    attachments.append({
                        'filename': filename,
                        'contentType': part.get_content_type(),
                        'size': len(part.get_payload(decode=True)) if part.get_payload(decode=True) else 0
                    })
        
        email_detail = {
            'messageId': message_id,
            'subject': subject,
            'from': from_addr,
            'to': to_addr,
            'cc': cc_addr,
            'date': formatted_date,
            'body': body,
            'attachments': attachments
        }
        
        mail.logout()
        return email_detail
        
    except Exception as e:
        raise Exception(f"メール詳細の取得に失敗しました: {str(e)}")

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    try:
        print(f"Event: {json.dumps(event, default=str)}")  # デバッグ用
        
        # CORS preflight request
        if event['httpMethod'] == 'OPTIONS':
            return create_response(200, {})
        
        # ユーザーIDを取得（認証トークンから）
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        if not user_id:
            return create_response(401, {'error': '認証が必要です'})
        
        path = event.get('path', '')
        method = event.get('httpMethod', '')
        resource = event.get('resource', '')  # API Gatewayの定義パス
        
        print(f"Path: {path}, Method: {method}, Resource: {resource}")  # デバッグ用
        
        # クエリパラメータを取得
        query_params = event.get('queryStringParameters', {}) or {}
        print(f"Query params: {query_params}")  # デバッグ用
        
        # 詳細APIを先に判定（より具体的なパス）
        if method == 'GET' and resource == '/email/messages/{messageId}':
            # メール詳細取得
            path_params = event.get('pathParameters', {})
            message_id = path_params.get('messageId')
            connection_id = query_params.get('connectionId')
            folder = query_params.get('folder', 'INBOX')
            
            print(f"Message ID: {message_id}")  # デバッグ用
            print(f"Connection ID: {connection_id}")  # デバッグ用
            print(f"Folder: {folder}")  # デバッグ用
            
            if not connection_id or not message_id:
                return create_response(400, {'error': '接続IDとメッセージIDが必要です'})
            
            try:
                connection_info = get_connection_info(user_id, connection_id)
                email_detail = fetch_email_detail(connection_info, message_id, folder)
                
                return create_response(200, {
                    'success': True,
                    'email': email_detail
                })
            except Exception as e:
                return create_response(500, {'error': str(e)})
        
        elif method == 'GET' and resource == '/email/messages':
            # メール一覧取得
            connection_id = query_params.get('connectionId')
            folder = query_params.get('folder', 'INBOX')
            limit = int(query_params.get('limit', 10))
            
            print(f"Connection ID: {connection_id}")  # デバッグ用
            print(f"Folder: {folder}")  # デバッグ用
            print(f"Limit: {limit}")  # デバッグ用
            
            if not connection_id:
                return create_response(400, {'error': '接続IDが必要です'})
            
            try:
                connection_info = get_connection_info(user_id, connection_id)
                email_list = fetch_email_list(connection_info, folder, limit)
                
                return create_response(200, {
                    'success': True,
                    'emails': email_list
                })
            except Exception as e:
                return create_response(500, {'error': str(e)})
        
        else:
            return create_response(404, {'error': 'エンドポイントが見つかりません'})
    
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return create_response(500, {'error': f'内部サーバーエラー: {str(e)}'})
