import json
import boto3
import uuid
from datetime import datetime
import os

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
FEATURE_REQUESTS_TABLE = os.environ.get('FEATURE_REQUESTS_TABLE', 'yarisugi-sales-feature-requests-dev')

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

def handle_feature_request_submit(event):
    """機能追加要望の送信処理"""
    try:
        body = json.loads(event['body'])
        
        # 必須パラメータの検証
        required_fields = ['description', 'priority']
        for field in required_fields:
            if not body.get(field):
                return create_response(400, {
                    'success': False,
                    'error': f'必須項目が不足しています: {field}'
                })
        
        # ユーザー情報の取得
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        user_email = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('email', 'unknown@example.com')
        
        # 要望IDの生成
        request_id = str(uuid.uuid4())
        current_time = datetime.now().isoformat()
        
        # DynamoDBに保存するデータ
        feature_request = {
            'PK': f'FEATURE_REQUEST#{request_id}',
            'SK': f'FEATURE_REQUEST#{request_id}',
            'requestId': request_id,
            'userId': user_id,
            'userEmail': user_email,
            'description': body.get('description'),
            'priority': body.get('priority'),
            'attachmentUrl': body.get('attachmentUrl', ''),
            'status': 'submitted',
            'createdAt': current_time,
            'updatedAt': current_time,
            'ttl': int(datetime.now().timestamp()) + (365 * 24 * 60 * 60)  # 1年後に自動削除
        }
        
        # DynamoDBに保存
        table = dynamodb.Table(FEATURE_REQUESTS_TABLE)
        table.put_item(Item=feature_request)
        
        return create_response(200, {
            'success': True,
            'message': '機能追加要望を送信しました。ご意見ありがとうございます！',
            'requestId': request_id
        })
        
    except Exception as e:
        print(f"Error submitting feature request: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': f'要望の送信に失敗しました: {str(e)}'
        })

def handle_feature_request_list(event):
    """機能追加要望一覧の取得（管理者用）"""
    try:
        # ユーザー情報の取得
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        
        # 管理者権限のチェック（一時的に無効化）
        # 実際の実装では、より詳細な権限管理が必要
        admin_users = os.environ.get('ADMIN_USERS', '').split(',')
        print(f"🔍 現在のユーザーID: {user_id}")
        print(f"🔍 管理者ユーザー一覧: {admin_users}")
        
        # 一時的にすべてのユーザーを管理者として許可
        # if user_id not in admin_users:
        #     return create_response(403, {
        #         'success': False,
        #         'error': '管理者権限が必要です'
        #     })
        
        # DynamoDBから要望一覧を取得
        table = dynamodb.Table(FEATURE_REQUESTS_TABLE)
        response = table.scan(
            FilterExpression='begins_with(PK, :pk_prefix)',
            ExpressionAttributeValues={
                ':pk_prefix': 'FEATURE_REQUEST#'
            }
        )
        
        # 要望一覧を整理
        requests = []
        for item in response.get('Items', []):
            requests.append({
                'requestId': item.get('requestId'),
                'userId': item.get('userId'),
                'userEmail': item.get('userEmail'),
                'description': item.get('description'),
                'priority': item.get('priority'),
                'status': item.get('status'),
                'createdAt': item.get('createdAt'),
                'updatedAt': item.get('updatedAt')
            })
        
        # 作成日時でソート（新しい順）
        requests.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return create_response(200, {
            'success': True,
            'requests': requests
        })
        
    except Exception as e:
        print(f"Error getting feature requests: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': f'要望一覧の取得に失敗しました: {str(e)}'
        })

def handle_feature_request_update(event):
    """機能追加要望のステータス更新（管理者用）"""
    try:
        # パスパラメータから要望IDを取得
        request_id = event.get('pathParameters', {}).get('requestId')
        if not request_id:
            return create_response(400, {
                'success': False,
                'error': '要望IDが必要です'
            })
        
        body = json.loads(event['body'])
        new_status = body.get('status')
        
        if not new_status:
            return create_response(400, {
                'success': False,
                'error': 'ステータスが必要です'
            })
        
        # ユーザー情報の取得
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        
        # 管理者権限のチェック（一時的に無効化）
        admin_users = os.environ.get('ADMIN_USERS', '').split(',')
        print(f"🔍 ステータス更新 - 現在のユーザーID: {user_id}")
        print(f"🔍 ステータス更新 - 管理者ユーザー一覧: {admin_users}")
        
        # 一時的にすべてのユーザーを管理者として許可
        # if user_id not in admin_users:
        #     return create_response(403, {
        #         'success': False,
        #         'error': '管理者権限が必要です'
        #     })
        
        # DynamoDBの要望を更新
        table = dynamodb.Table(FEATURE_REQUESTS_TABLE)
        current_time = datetime.now().isoformat()
        
        table.update_item(
            Key={
                'PK': f'FEATURE_REQUEST#{request_id}',
                'SK': f'FEATURE_REQUEST#{request_id}'
            },
            UpdateExpression='SET #status = :status, updatedAt = :updated_at',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':status': new_status,
                ':updated_at': current_time
            }
        )
        
        return create_response(200, {
            'success': True,
            'message': '要望のステータスを更新しました'
        })
        
    except Exception as e:
        print(f"Error updating feature request: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': f'要望の更新に失敗しました: {str(e)}'
        })

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
            return create_response(401, {
                'success': False,
                'error': '認証が必要です'
            })
        
        # ルーティング
        path = event.get('path', '')
        method = event['httpMethod']
        
        if method == 'POST' and path == '/feature-requests':
            return handle_feature_request_submit(event)
        elif method == 'GET' and path == '/feature-requests':
            return handle_feature_request_list(event)
        elif method == 'PUT' and path.startswith('/feature-requests/'):
            return handle_feature_request_update(event)
        else:
            return create_response(404, {
                'success': False,
                'error': 'エンドポイントが見つかりません'
            })
    
    except Exception as e:
        print(f"Lambda handler error: {str(e)}")
        return create_response(500, {
            'success': False,
            'error': f'内部サーバーエラー: {str(e)}'
        })
