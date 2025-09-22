import json
import boto3
from datetime import datetime, timedelta
from typing import Dict, Any, List
import os
import uuid

# DynamoDBクライアント
dynamodb = boto3.resource('dynamodb')
sales_flows_table = dynamodb.Table(os.environ.get('SALES_FLOWS_TABLE', 'yarisugi-sales-sales-flows-dev'))

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    営業フロー管理のLambda関数
    """
    try:
        print(f"🎯 Sales Flow request: {event}")
        
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
        if action == 'get':
            return get_sales_flow_data(body, user_id)
        elif action == 'update_stage':
            return update_sales_stage(body, user_id)
        elif action == 'add_task':
            return add_task(body, user_id)
        elif action == 'update_task':
            return update_task(body, user_id)
        elif action == 'delete_task':
            return delete_task(body, user_id)
        elif action == 'get_tasks':
            return get_tasks(body, user_id)
        else:
            return create_error_response(400, '無効なアクションです')
        
    except Exception as e:
        print(f"❌ Sales Flow error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return create_error_response(500, f'営業フロー処理エラー: {str(e)}')

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

def get_sales_flow_data(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """営業フローデータを取得"""
    try:
        customer_id = body.get('customerId')
        if not customer_id:
            return create_error_response(400, 'customerIdが必要です')
        
        # 営業フローデータを取得
        response = sales_flows_table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={
                ':pk': f'CUSTOMER#{customer_id}'
            }
        )
        
        items = response.get('Items', [])
        
        # 現在のステージを取得
        current_stage = None
        for item in items:
            if item.get('SK', '').startswith('STAGE#'):
                current_stage = item.get('stage', 'lead_generation')
                break
        
        # タスクを取得
        tasks = []
        for item in items:
            if item.get('SK', '').startswith('TASK#'):
                tasks.append({
                    'id': item.get('taskId'),
                    'title': item.get('title'),
                    'description': item.get('description'),
                    'dueDate': item.get('dueDate'),
                    'priority': item.get('priority', 'medium'),
                    'completed': item.get('completed', False),
                    'createdAt': item.get('createdAt')
                })
        
        # ステージ履歴を取得
        stage_history = []
        for item in items:
            if item.get('SK', '').startswith('HISTORY#'):
                stage_history.append({
                    'stage': item.get('stage'),
                    'timestamp': item.get('timestamp'),
                    'note': item.get('note', '')
                })
        
        return create_success_response({
            'currentStage': current_stage or 'lead_generation',
            'tasks': sorted(tasks, key=lambda x: x.get('createdAt', ''), reverse=True),
            'stageHistory': sorted(stage_history, key=lambda x: x.get('timestamp', ''), reverse=True)
        })
        
    except Exception as e:
        print(f"❌ 営業フローデータ取得エラー: {e}")
        return create_error_response(500, f'データ取得エラー: {str(e)}')

def update_sales_stage(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """営業ステージを更新"""
    try:
        customer_id = body.get('customerId')
        new_stage = body.get('stage')
        note = body.get('note', '')
        
        if not customer_id or not new_stage:
            return create_error_response(400, 'customerIdとstageが必要です')
        
        timestamp = datetime.now().isoformat()
        
        # 現在のステージを更新
        sales_flows_table.put_item(
            Item={
                'PK': f'CUSTOMER#{customer_id}',
                'SK': 'STAGE#CURRENT',
                'customerId': customer_id,
                'userId': user_id,
                'stage': new_stage,
                'updatedAt': timestamp,
                'updatedBy': user_id
            }
        )
        
        # ステージ履歴を追加
        history_id = str(uuid.uuid4())
        sales_flows_table.put_item(
            Item={
                'PK': f'CUSTOMER#{customer_id}',
                'SK': f'HISTORY#{history_id}',
                'customerId': customer_id,
                'userId': user_id,
                'stage': new_stage,
                'timestamp': timestamp,
                'note': note,
                'createdAt': timestamp
            }
        )
        
        return create_success_response({
            'message': 'ステージが更新されました',
            'stage': new_stage,
            'timestamp': timestamp
        })
        
    except Exception as e:
        print(f"❌ ステージ更新エラー: {e}")
        return create_error_response(500, f'ステージ更新エラー: {str(e)}')

def add_task(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """タスクを追加"""
    try:
        customer_id = body.get('customerId')
        title = body.get('title')
        description = body.get('description', '')
        due_date = body.get('dueDate')
        priority = body.get('priority', 'medium')
        
        if not customer_id or not title:
            return create_error_response(400, 'customerIdとtitleが必要です')
        
        task_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # タスクを保存
        sales_flows_table.put_item(
            Item={
                'PK': f'CUSTOMER#{customer_id}',
                'SK': f'TASK#{task_id}',
                'customerId': customer_id,
                'userId': user_id,
                'taskId': task_id,
                'title': title,
                'description': description,
                'dueDate': due_date,
                'priority': priority,
                'completed': False,
                'createdAt': timestamp,
                'updatedAt': timestamp
            }
        )
        
        return create_success_response({
            'message': 'タスクが追加されました',
            'taskId': task_id
        })
        
    except Exception as e:
        print(f"❌ タスク追加エラー: {e}")
        return create_error_response(500, f'タスク追加エラー: {str(e)}')

def update_task(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """タスクを更新"""
    try:
        customer_id = body.get('customerId')
        task_id = body.get('taskId')
        updates = body.get('updates', {})
        
        if not customer_id or not task_id:
            return create_error_response(400, 'customerIdとtaskIdが必要です')
        
        # 更新可能なフィールド
        allowed_updates = ['title', 'description', 'dueDate', 'priority', 'completed']
        update_expression_parts = []
        expression_attribute_values = {}
        
        for field, value in updates.items():
            if field in allowed_updates:
                update_expression_parts.append(f"{field} = :{field}")
                expression_attribute_values[f":{field}"] = value
        
        if not update_expression_parts:
            return create_error_response(400, '更新するフィールドがありません')
        
        update_expression_parts.append("updatedAt = :updatedAt")
        expression_attribute_values[":updatedAt"] = datetime.now().isoformat()
        
        # タスクを更新
        sales_flows_table.update_item(
            Key={
                'PK': f'CUSTOMER#{customer_id}',
                'SK': f'TASK#{task_id}'
            },
            UpdateExpression='SET ' + ', '.join(update_expression_parts),
            ExpressionAttributeValues=expression_attribute_values
        )
        
        return create_success_response({
            'message': 'タスクが更新されました',
            'taskId': task_id
        })
        
    except Exception as e:
        print(f"❌ タスク更新エラー: {e}")
        return create_error_response(500, f'タスク更新エラー: {str(e)}')

def delete_task(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """タスクを削除"""
    try:
        customer_id = body.get('customerId')
        task_id = body.get('taskId')
        
        if not customer_id or not task_id:
            return create_error_response(400, 'customerIdとtaskIdが必要です')
        
        # タスクを削除
        sales_flows_table.delete_item(
            Key={
                'PK': f'CUSTOMER#{customer_id}',
                'SK': f'TASK#{task_id}'
            }
        )
        
        return create_success_response({
            'message': 'タスクが削除されました',
            'taskId': task_id
        })
        
    except Exception as e:
        print(f"❌ タスク削除エラー: {e}")
        return create_error_response(500, f'タスク削除エラー: {str(e)}')

def get_tasks(body: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """タスク一覧を取得"""
    try:
        customer_id = body.get('customerId')
        if not customer_id:
            return create_error_response(400, 'customerIdが必要です')
        
        # タスクを取得
        response = sales_flows_table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
            ExpressionAttributeValues={
                ':pk': f'CUSTOMER#{customer_id}',
                ':sk_prefix': 'TASK#'
            }
        )
        
        tasks = []
        for item in response.get('Items', []):
            tasks.append({
                'id': item.get('taskId'),
                'title': item.get('title'),
                'description': item.get('description'),
                'dueDate': item.get('dueDate'),
                'priority': item.get('priority', 'medium'),
                'completed': item.get('completed', False),
                'createdAt': item.get('createdAt')
            })
        
        return create_success_response({
            'tasks': sorted(tasks, key=lambda x: x.get('createdAt', ''), reverse=True)
        })
        
    except Exception as e:
        print(f"❌ タスク取得エラー: {e}")
        return create_error_response(500, f'タスク取得エラー: {str(e)}')

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
