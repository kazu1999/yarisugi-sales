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
import time

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
email_connections_table = dynamodb.Table(os.environ.get('EMAIL_CONNECTIONS_TABLE', 'yarisugi-sales-email-connections-dev'))
customers_table = dynamodb.Table(os.environ.get('CUSTOMERS_TABLE', 'yarisugi-sales-customers-dev'))

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

def get_customer_emails(user_id):
    """顧客テーブルからメールアドレスのリストを取得"""
    try:
        response = customers_table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}'
            }
        )
        
        customer_emails = []
        for item in response.get('Items', []):
            # 顧客のメールアドレスを取得
            email = item.get('email', '')
            if email:
                customer_emails.append(email.lower().strip())
        
        print(f"DEBUG: Found {len(customer_emails)} customer emails: {customer_emails}")
        print(f"DEBUG: Raw customer data: {response.get('Items', [])}")
        return customer_emails
    except Exception as e:
        print(f"DEBUG: Error getting customer emails: {str(e)}")
        return []

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

def extract_email_address(email_string):
    """メールアドレス文字列からメールアドレスのみを抽出"""
    if not email_string:
        return ''
    
    # メールアドレスを抽出する正規表現的な処理
    import re
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    matches = re.findall(email_pattern, email_string)
    return matches[0] if matches else ''

def is_customer_email(from_addr, customer_emails):
    """送信者が顧客テーブルに登録されているかチェック"""
    if not from_addr or not customer_emails:
        return False
    
    sender_email = extract_email_address(from_addr)
    
    print(f"DEBUG: is_customer_email - sender_email: {sender_email}, customer_emails: {customer_emails}")
    
    # 送信者が顧客テーブルに登録されているかチェック
    is_customer = sender_email.lower() in customer_emails
    print(f"DEBUG: is_customer_email - result: {is_customer}")
    return is_customer

def fetch_email_list_optimized(connection_info, customer_emails, folder='INBOX', limit=15, offset=0):
    """メール一覧を取得（最適化版）"""
    try:
        start_time = time.time()
        
        # IMAP接続
        if connection_info['useSSL']:
            mail = imaplib.IMAP4_SSL(connection_info['imapServer'], int(connection_info['imapPort']))
        else:
            mail = imaplib.IMAP4(connection_info['imapServer'], int(connection_info['imapPort']))
        
        mail.login(connection_info['emailAddress'], connection_info['password'])
        mail.select(folder)
        
        # 顧客メールアドレスをセットに変換（高速化）
        customer_emails_set = set(customer_emails)
        
        # 顧客メールアドレスごとに検索して、メッセージIDを収集
        all_customer_message_ids = set()
        
        for customer_email in customer_emails:
            try:
                # 特定の送信者からのメールを検索
                search_criteria = f'FROM "{customer_email}"'
                _, message_numbers = mail.search(None, search_criteria)
                
                if message_numbers[0]:
                    message_ids = message_numbers[0].split()
                    all_customer_message_ids.update(message_ids)
                    
            except Exception as e:
                print(f"顧客 {customer_email} のメール検索中にエラー: {str(e)}")
                continue
        
        # メッセージIDを数値に変換してソート
        message_list = []
        for msg_id in all_customer_message_ids:
            try:
                message_list.append(int(msg_id))
            except ValueError:
                continue
        
        # 最新順にソート
        message_list.sort(reverse=True)
        
        # オフセットを適用
        start_index = offset
        end_index = min(len(message_list), start_index + limit)
        message_list = message_list[start_index:end_index]
        
        email_list = []
        processed_count = 0
        
        # 顧客メールのみを処理
        for num in message_list:
            if len(email_list) >= limit:
                break
            
            try:
                # ヘッダー情報のみを取得（高速化）
                _, msg_data = mail.fetch(str(num).encode(), '(BODY.PEEK[HEADER])')
                email_header = msg_data[0][1]
                msg = email.message_from_bytes(email_header)
                
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
                
                # 添付ファイルの有無を確認（Content-Typeヘッダーから判定）
                has_attachments = False
                content_type = msg.get('Content-Type', '')
                if 'multipart' in content_type.lower():
                    has_attachments = True
                
                email_info = {
                    'messageId': str(num),
                    'subject': subject,
                    'from': from_addr,
                    'to': to_addr,
                    'date': formatted_date,
                    'hasAttachments': has_attachments
                }
                
                email_list.append(email_info)
                processed_count += 1
                
            except Exception as e:
                print(f"メール {num} の処理中にエラー: {str(e)}")
                processed_count += 1
                continue
        
        mail.logout()
        
        end_time = time.time()
        print(f"DEBUG: Email fetch completed in {end_time - start_time:.2f} seconds")
        print(f"DEBUG: Found {len(email_list)} customer emails from {processed_count} processed emails")
        print(f"DEBUG: Total customer emails available: {len(all_customer_message_ids)}")
        print(f"DEBUG: Offset: {offset}, Limit: {limit}, Has more: {start_index + limit < len(all_customer_message_ids)}")
        
        # 次のページがあるかどうかを判定
        has_more = (start_index + limit) < len(all_customer_message_ids)
        
        print(f"DEBUG: Pagination info - start_index: {start_index}, limit: {limit}, total_customer_emails: {len(all_customer_message_ids)}")
        print(f"DEBUG: Pagination info - has_more: {has_more}, next_offset: {start_index + limit if has_more else None}")
        
        return {
            'emails': email_list,
            'has_more': has_more,
            'next_offset': start_index + limit if has_more else None,
            'total_processed': processed_count
        }
        
    except Exception as e:
        raise Exception(f"メール一覧の取得に失敗しました: {str(e)}")

def fetch_email_detail_optimized(connection_info, message_id, customer_emails, folder='INBOX'):
    """メール詳細を取得（最適化版）"""
    try:
        start_time = time.time()
        
        # IMAP接続
        if connection_info['useSSL']:
            mail = imaplib.IMAP4_SSL(connection_info['imapServer'], int(connection_info['imapPort']))
        else:
            mail = imaplib.IMAP4(connection_info['imapServer'], int(connection_info['imapPort']))
        
        mail.login(connection_info['emailAddress'], connection_info['password'])
        mail.select(folder)
        
        # メール詳細を取得（RFC822で完全なメールを取得）
        _, msg_data = mail.fetch(message_id.encode(), '(RFC822)')
        email_body = msg_data[0][1]
        msg = email.message_from_bytes(email_body)
        
        # メール情報を抽出
        subject = decode_email_header(msg.get('Subject', ''))
        from_addr = decode_email_header(msg.get('From', ''))
        to_addr = decode_email_header(msg.get('To', ''))
        cc_addr = decode_email_header(msg.get('Cc', ''))
        date_str = msg.get('Date', '')
        
        # 顧客からのメールかどうかを確認
        customer_emails_set = set(customer_emails)
        if not is_customer_email(from_addr, customer_emails_set):
            mail.logout()
            raise Exception('このメールは顧客からのメールではありません')
        
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
        
        mail.logout()
        
        end_time = time.time()
        print(f"DEBUG: Email detail fetch completed in {end_time - start_time:.2f} seconds")
        
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
                customer_emails = get_customer_emails(user_id)
                email_detail = fetch_email_detail_optimized(connection_info, message_id, customer_emails, folder)
                
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
            offset = int(query_params.get('offset', 0))
            
            print(f"Connection ID: {connection_id}")  # デバッグ用
            print(f"Folder: {folder}")  # デバッグ用
            print(f"Limit: {limit}")  # デバッグ用
            print(f"Offset: {offset}")  # デバッグ用
            
            if not connection_id:
                return create_response(400, {'error': '接続IDが必要です'})
            
            try:
                connection_info = get_connection_info(user_id, connection_id)
                customer_emails = get_customer_emails(user_id)
                email_list_result = fetch_email_list_optimized(connection_info, customer_emails, folder, limit, offset)
                
                return create_response(200, {
                    'success': True,
                    'emails': email_list_result['emails'],
                    'has_more': email_list_result['has_more'],
                    'next_offset': email_list_result['next_offset'],
                    'total_processed': email_list_result['total_processed'],
                    'filtered': True,
                    'filter_description': '顧客テーブルに登録されている顧客からのメールのみを表示しています'
                })
            except Exception as e:
                return create_response(500, {'error': str(e)})
        
        else:
            return create_response(404, {'error': 'エンドポイントが見つかりません'})
    
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return create_response(500, {'error': f'内部サーバーエラー: {str(e)}'})
