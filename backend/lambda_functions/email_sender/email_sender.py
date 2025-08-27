import json
import boto3
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime
import os

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
email_connections_table = dynamodb.Table('yarisugi-sales-email-connections-dev')

def create_response(status_code, body):
    """レスポンスを作成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, ensure_ascii=False, default=str)
    }

def get_connection_info(user_id, connection_id):
    """メール接続情報を取得"""
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
        print(f"Error getting connection info: {str(e)}")
        raise

def send_email(connection_info, to_email, cc_email, subject, body):
    """メールを送信"""
    try:
        # メールメッセージを作成
        msg = MIMEMultipart()
        msg['From'] = formataddr(('', connection_info['emailAddress']))
        msg['To'] = to_email
        if cc_email:
            msg['Cc'] = cc_email
        msg['Subject'] = subject
        
        # 本文を追加
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # SMTP接続設定
        smtp_server = connection_info['imapServer'].replace('imap.', 'smtp.')
        smtp_port = 587 if connection_info['imapPort'] == 993 else 25
        
        # SMTP接続
        if connection_info.get('useSSL', True):
            context = ssl.create_default_context()
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls(context=context)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port)
        
        # 認証
        server.login(connection_info['emailAddress'], connection_info['password'])
        
        # メール送信
        recipients = [to_email]
        if cc_email:
            recipients.extend(cc_email.split(','))
        
        server.send_message(msg, from_addr=connection_info['emailAddress'], to_addrs=recipients)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        raise

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    try:
        print(f"Event: {json.dumps(event, default=str)}")
        
        # OPTIONSリクエストの処理
        if event['httpMethod'] == 'OPTIONS':
            return create_response(200, {})
        
        # 認証情報の取得
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        if not user_id:
            return create_response(401, {'error': '認証が必要です'})
        
        # POSTリクエストの処理
        if event['httpMethod'] == 'POST':
            try:
                body = json.loads(event['body'])
                connection_id = body.get('connectionId')
                to_email = body.get('to')
                cc_email = body.get('cc', '')
                subject = body.get('subject')
                body_text = body.get('body')
                
                # 必須パラメータの検証
                if not all([connection_id, to_email, subject, body_text]):
                    return create_response(400, {'error': '必須パラメータが不足しています'})
                
                # 接続情報を取得
                connection_info = get_connection_info(user_id, connection_id)
                
                # メール送信
                send_email(connection_info, to_email, cc_email, subject, body_text)
                
                return create_response(200, {
                    'success': True,
                    'message': 'メールが正常に送信されました',
                    'sentAt': datetime.now().isoformat()
                })
                
            except Exception as e:
                print(f"Error processing request: {str(e)}")
                return create_response(500, {'error': f'メール送信に失敗しました: {str(e)}'})
        
        else:
            return create_response(405, {'error': '許可されていないメソッドです'})
    
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return create_response(500, {'error': f'内部サーバーエラー: {str(e)}'})
