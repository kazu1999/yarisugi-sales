import json
import boto3
from datetime import datetime, timedelta
from typing import Dict, Any, List
import os
import uuid
import base64
import hmac
import hashlib

# LINE API用
import requests

# DynamoDBクライアント
dynamodb = boto3.resource('dynamodb')
line_integrations_table = dynamodb.Table(os.environ.get('LINE_INTEGRATIONS_TABLE', 'yarisugi-sales-line-integrations-dev'))
line_chats_table = dynamodb.Table(os.environ.get('LINE_CHATS_TABLE', 'yarisugi-sales-line-chats-dev'))
faqs_table = dynamodb.Table(os.environ.get('FAQS_TABLE', 'yarisugi-sales-faqs-dev'))

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    LINE連携管理のLambda関数
    """
    try:
        print(f"📱 LINE Integration request: {event}")
        
        # リクエストボディの解析
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)
        
        # HTTPメソッドとアクションの取得
        http_method = event.get('httpMethod', 'GET')
        action = body.get('action', 'get')
        
        print(f"📋 HTTP Method: {http_method}, Action: {action}")
        
        # 認証情報の取得
        user_id = get_user_id_from_event(event)
        if not user_id:
            return create_error_response(401, '認証が必要です')
        
        # アクション別の処理
        if action == 'get_integrations':
            return get_line_integrations(user_id)
        elif action == 'add_integration':
            return add_line_integration(body, user_id)
        elif action == 'delete_integration':
            return delete_line_integration(body, user_id)
        elif action == 'get_chats':
            return get_chat_history(body, user_id)
        elif action == 'webhook':
            return handle_webhook(event, body)
        else:
            return create_error_response(400, '無効なアクションです')
        
    except Exception as e:
        print(f"❌ LINE Integration error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return create_error_response(500, f'LINE連携処理エラー: {str(e)}')

def get_user_id_from_event(event: Dict[str, Any]) -> str:
    """イベントからユーザーIDを取得"""
    try:
        # Cognito認証からユーザーIDを取得
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})
        return claims.get('sub')
    except Exception as e:
        print(f"❌ User ID取得エラー: {e}")
        return None

def get_line_integrations(user_id: str) -> Dict[str, Any]:
    """LINE連携一覧を取得"""
    try:
        response = line_integrations_table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression='userId = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            }
        )
        
        integrations = []
        for item in response.get('Items', []):
            if item.get('SK', '').startswith('LINE#'):
                integrations.append({
                    'id': item.get('lineId'),
                    'lineId': item.get('lineId'),
                    'displayName': item.get('displayName', ''),
                    'createdAt': item.get('createdAt'),
                    'lastUsed': item.get('lastUsed')
                })
        
        return create_success_response({
            'integrations': integrations
        })
        
    except Exception as e:
        print(f"❌ LINE連携一覧取得エラー: {e}")
        return create_error_response(500, f'LINE連携一覧の取得に失敗しました: {str(e)}')

def add_line_integration(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """LINE公式アカウント連携を追加"""
    try:
        channel_secret = body.get('channelSecret')
        access_token = body.get('accessToken')
        display_name = body.get('displayName', '')
        
        if not channel_secret or not access_token:
            return create_error_response(400, 'Channel SecretとAccess Tokenが必要です')
        
        # 既存の連携をチェック
        existing_response = line_integrations_table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression='userId = :user_id',
            FilterExpression='channelSecret = :channel_secret',
            ExpressionAttributeValues={
                ':user_id': user_id,
                ':channel_secret': channel_secret
            }
        )
        
        if existing_response.get('Items'):
            return create_error_response(400, 'このChannel Secretは既に登録されています')
        
        # 新しい連携を追加
        integration_id = str(uuid.uuid4())
        current_time = datetime.utcnow().isoformat()
        
        line_integrations_table.put_item(
            Item={
                'PK': f'USER#{user_id}',
                'SK': f'LINE#{integration_id}',
                'userId': user_id,
                'channelSecret': channel_secret,
                'accessToken': access_token,
                'displayName': display_name,
                'webhookUrl': f"https://j6vov5s543.execute-api.ap-northeast-1.amazonaws.com/dev/line-webhook/{integration_id}",
                'createdAt': current_time,
                'lastUsed': current_time
            }
        )
        
        return create_success_response({
            'message': 'LINE公式アカウント連携が追加されました',
            'integration': {
                'id': integration_id,
                'channelSecret': channel_secret,
                'displayName': display_name,
                'webhookUrl': f"https://j6vov5s543.execute-api.ap-northeast-1.amazonaws.com/dev/line-webhook/{integration_id}",
                'createdAt': current_time
            }
        })
        
    except Exception as e:
        print(f"❌ LINE連携追加エラー: {e}")
        return create_error_response(500, f'LINE連携の追加に失敗しました: {str(e)}')

def delete_line_integration(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """LINE連携を削除"""
    try:
        integration_id = body.get('integrationId')
        
        if not integration_id:
            return create_error_response(400, '連携IDが必要です')
        
        # 連携を削除
        line_integrations_table.delete_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': f'LINE#{integration_id}'
            }
        )
        
        return create_success_response({
            'message': 'LINE連携が削除されました'
        })
        
    except Exception as e:
        print(f"❌ LINE連携削除エラー: {e}")
        return create_error_response(500, f'LINE連携の削除に失敗しました: {str(e)}')

def get_chat_history(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """チャット履歴を取得"""
    try:
        line_id = body.get('lineId')
        
        if not line_id:
            return create_error_response(400, 'LINE IDが必要です')
        
        # チャット履歴を取得
        response = line_chats_table.query(
            IndexName='LineIdIndex',
            KeyConditionExpression='lineId = :line_id',
            ExpressionAttributeValues={
                ':line_id': line_id
            },
            ScanIndexForward=True  # 時系列順
        )
        
        chats = []
        for item in response.get('Items', []):
            chats.append({
                'id': item.get('messageId'),
                'messageId': item.get('messageId'),
                'lineId': item.get('lineId'),
                'message': item.get('message'),
                'sender': item.get('sender'),  # 'user' or 'ai'
                'status': item.get('status'),   # 'pending', 'approved', 'sent'
                'aiResponse': item.get('aiResponse'),
                'timestamp': item.get('timestamp'),
                'createdAt': item.get('createdAt')
            })
        
        return create_success_response({
            'chats': chats
        })
        
    except Exception as e:
        print(f"❌ チャット履歴取得エラー: {e}")
        return create_error_response(500, f'チャット履歴の取得に失敗しました: {str(e)}')

def send_message(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """メッセージを送信"""
    try:
        line_id = body.get('lineId')
        message = body.get('message')
        
        if not line_id or not message:
            return create_error_response(400, 'LINE IDとメッセージが必要です')
        
        # メッセージを保存
        message_id = str(uuid.uuid4())
        current_time = datetime.utcnow().isoformat()
        
        line_chats_table.put_item(
            Item={
                'PK': f'LINE#{line_id}',
                'SK': f'MESSAGE#{message_id}',
                'messageId': message_id,
                'lineId': line_id,
                'userId': user_id,
                'message': message,
                'sender': 'user',
                'status': 'sent',
                'timestamp': current_time,
                'createdAt': current_time
            }
        )
        
        return create_success_response({
            'message': 'メッセージが送信されました',
            'messageId': message_id
        })
        
    except Exception as e:
        print(f"❌ メッセージ送信エラー: {e}")
        return create_error_response(500, f'メッセージの送信に失敗しました: {str(e)}')

def generate_ai_response(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """AI返答を生成"""
    try:
        line_id = body.get('lineId')
        message = body.get('message')
        
        if not line_id or not message:
            return create_error_response(400, 'LINE IDとメッセージが必要です')
        
        # FAQデータを取得
        faqs_response = faqs_table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression='userId = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            }
        )
        
        faqs = faqs_response.get('Items', [])
        
        # AI返答を生成（簡易版）
        ai_response = generate_faq_response(message, faqs)
        
        # AI返答を保存
        message_id = str(uuid.uuid4())
        current_time = datetime.utcnow().isoformat()
        
        line_chats_table.put_item(
            Item={
                'PK': f'LINE#{line_id}',
                'SK': f'MESSAGE#{message_id}',
                'messageId': message_id,
                'lineId': line_id,
                'userId': user_id,
                'message': message,
                'sender': 'ai',
                'status': 'pending',
                'aiResponse': ai_response,
                'timestamp': current_time,
                'createdAt': current_time
            }
        )
        
        return create_success_response({
            'message': 'AI返答が生成されました',
            'messageId': message_id,
            'aiResponse': ai_response
        })
        
    except Exception as e:
        print(f"❌ AI返答生成エラー: {e}")
        return create_error_response(500, f'AI返答の生成に失敗しました: {str(e)}')

def handle_webhook(event: Dict[str, Any], body: Dict[str, Any]) -> Dict[str, Any]:
    """LINE Webhook処理"""
    try:
        # パスからintegration_idを取得
        path = event.get('path', '')
        integration_id = path.split('/')[-1]
        
        # 連携情報を取得
        integration_response = line_integrations_table.query(
            KeyConditionExpression='SK = :sk',
            ExpressionAttributeValues={
                ':sk': f'LINE#{integration_id}'
            }
        )
        
        if not integration_response.get('Items'):
            return create_error_response(404, '連携情報が見つかりません')
        
        integration = integration_response['Items'][0]
        channel_secret = integration.get('channelSecret')
        access_token = integration.get('accessToken')
        user_id = integration.get('userId')
        
        # 署名検証
        signature = event.get('headers', {}).get('X-Line-Signature', '')
        body_str = json.dumps(body) if isinstance(body, dict) else str(body)
        
        if not verify_signature(channel_secret, body_str, signature):
            return create_error_response(400, 'Invalid signature')
        
        # イベント処理
        events = body.get('events', [])
        for ev in events:
            if ev.get('type') == 'message' and ev.get('message', {}).get('type') == 'text':
                user_id_line = ev.get('source', {}).get('userId')
                message_text = ev.get('message', {}).get('text')
                reply_token = ev.get('replyToken')
                
                if user_id_line and message_text:
                    # メッセージを保存
                    save_message(integration_id, user_id_line, message_text, 'user')
                    
                    # FAQデータからAI返答を生成
                    ai_response = generate_ai_response_from_faqs(message_text, user_id)
                    
                    if ai_response and reply_token:
                        # AI返答を保存
                        save_message(integration_id, user_id_line, ai_response, 'ai')
                        
                        # LINEに返答送信
                        send_reply_message(access_token, reply_token, ai_response)
        
        return create_success_response({'message': 'Webhook processed successfully'})
        
    except Exception as e:
        print(f"❌ Webhook処理エラー: {e}")
        return create_error_response(500, f'Webhook処理に失敗しました: {str(e)}')

def verify_signature(channel_secret: str, body: str, signature: str) -> bool:
    """署名検証"""
    try:
        hash_value = hmac.new(
            channel_secret.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha256
        ).digest()
        expected_signature = base64.b64encode(hash_value).decode('utf-8')
        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        print(f"❌ 署名検証エラー: {e}")
        return False

def send_reply_message(access_token: str, reply_token: str, message: str) -> None:
    """LINEに返答メッセージを送信"""
    try:
        url = 'https://api.line.me/v2/bot/message/reply'
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        data = {
            'replyToken': reply_token,
            'messages': [{
                'type': 'text',
                'text': message
            }]
        }
        
        response = requests.post(url, headers=headers, json=data)
        if response.status_code != 200:
            print(f"❌ LINE API エラー: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ LINE返答送信エラー: {e}")

def save_message(integration_id: str, user_id_line: str, message: str, sender: str) -> None:
    """メッセージを保存"""
    try:
        message_id = str(uuid.uuid4())
        current_time = datetime.utcnow().isoformat()
        
        line_chats_table.put_item(
            Item={
                'PK': f'LINE#{integration_id}',
                'SK': f'MESSAGE#{message_id}',
                'messageId': message_id,
                'integrationId': integration_id,
                'userIdLine': user_id_line,
                'message': message,
                'sender': sender,
                'timestamp': current_time,
                'createdAt': current_time
            }
        )
    except Exception as e:
        print(f"❌ メッセージ保存エラー: {e}")

def generate_ai_response_from_faqs(message: str, user_id: str) -> str:
    """FAQデータからAI返答を生成"""
    try:
        # FAQデータを取得
        faqs_response = faqs_table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression='userId = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            }
        )
        
        faqs = faqs_response.get('Items', [])
        return generate_faq_response(message, faqs)
        
    except Exception as e:
        print(f"❌ AI返答生成エラー: {e}")
        return "申し訳ございません。現在システムに問題が発生しています。"

def generate_faq_response(message: str, faqs: List[Dict[str, Any]]) -> str:
    """FAQデータから最適な回答を生成"""
    if not faqs:
        return "FAQに該当する情報がありません。"
    
    # 簡易的なキーワードマッチング
    message_lower = message.lower()
    best_match = None
    best_score = 0
    
    for faq in faqs:
        question = faq.get('question', '').lower()
        answer = faq.get('answer', '')
        
        # キーワードマッチングスコアを計算
        score = 0
        for word in message_lower.split():
            if word in question:
                score += 1
        
        if score > best_score:
            best_score = score
            best_match = answer
    
    if best_match:
        return best_match
    else:
        return "FAQに該当する情報がありません。"

def create_success_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """成功レスポンスを作成"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps({
            'success': True,
            'data': data
        })
    }

def create_error_response(status_code: int, message: str) -> Dict[str, Any]:
    """エラーレスポンスを作成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps({
            'success': False,
            'error': message
        })
    }
