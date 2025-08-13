"""
顧客管理Lambda関数
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any

# 共通ライブラリをインポート
import sys
sys.path.append('/opt/python/lib/python3.11/site-packages')
from common.dynamodb import dynamodb_client

# テーブル名
CUSTOMERS_TABLE = os.environ.get('CUSTOMERS_TABLE', 'yarisugi-customers-dev')

def lambda_handler(event, context):
    """
    Lambda関数のメインハンドラー
    """
    try:
        # HTTPメソッドとパスを取得
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        
        # ユーザーIDを取得（Cognito認証から）
        user_id = get_user_id_from_event(event)
        
        # ルーティング
        if http_method == 'GET' and path == '/customers':
            return get_customers(user_id)
        elif http_method == 'GET' and path.startswith('/customers/'):
            customer_id = path.split('/')[-1]
            return get_customer(user_id, customer_id)
        elif http_method == 'POST' and path == '/customers':
            return create_customer(user_id, event.get('body', '{}'))
        elif http_method == 'PUT' and path.startswith('/customers/'):
            customer_id = path.split('/')[-1]
            return update_customer(user_id, customer_id, event.get('body', '{}'))
        elif http_method == 'DELETE' and path.startswith('/customers/'):
            customer_id = path.split('/')[-1]
            return delete_customer(user_id, customer_id)
        else:
            return create_response(404, {'error': 'Not Found'})
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return create_response(500, {'error': 'Internal Server Error'})

def get_user_id_from_event(event):
    """
    イベントからユーザーIDを取得
    """
    try:
        print(f"🔍 イベントからユーザーID取得開始")
        print(f"📋 イベント構造: {json.dumps(event, default=str)}")
        
        # Cognito認証情報からユーザーIDを取得
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        print(f"🔑 認証クレーム: {claims}")
        
        user_id = claims.get('sub') or claims.get('cognito:username')
        print(f"👤 取得されたユーザーID: {user_id}")
        
        # 認証なしの場合はテスト用ユーザーIDを使用
        if not user_id:
            user_id = 'test-user-123'
            print(f"⚠️ 認証なしのためテストユーザーIDを使用: {user_id}")
            
        print(f"✅ 最終ユーザーID: {user_id}")
        return user_id
    except Exception as e:
        print(f"❌ ユーザーID取得エラー: {str(e)}")
        return 'test-user-123'

def get_customers(user_id):
    """
    ユーザーの顧客一覧を取得
    """
    try:
        print(f"🔍 顧客一覧取得開始 - ユーザーID: {user_id}")
        print(f"📋 テーブル名: {CUSTOMERS_TABLE}")
        
        # ユーザーIDでクエリ
        query_params = {':pk': f'USER#{user_id}'}
        print(f"🔎 クエリパラメータ: {query_params}")
        
        result = dynamodb_client.query(
            CUSTOMERS_TABLE,
            'PK = :pk',
            query_params
        )
        
        print(f"📦 DynamoDB結果: {result}")
        
        if result['success']:
            print(f"✅ 顧客データ取得成功: {len(result['data'])}件")
            return create_response(200, {
                'customers': result['data']
            })
        else:
            print(f"❌ DynamoDBエラー: {result['error']}")
            return create_response(500, {'error': result['error']})
            
    except Exception as e:
        print(f"❌ 例外エラー: {str(e)}")
        return create_response(500, {'error': str(e)})

def get_customer(user_id, customer_id):
    """
    特定の顧客を取得
    """
    try:
        result = dynamodb_client.get_item(
            CUSTOMERS_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'CUSTOMER#{customer_id}'
            }
        )
        
        if result['success']:
            return create_response(200, result['data'])
        elif result['error'] == 'Item not found':
            return create_response(404, {'error': 'Customer not found'})
        else:
            return create_response(500, {'error': result['error']})
            
    except Exception as e:
        return create_response(500, {'error': str(e)})

def create_customer(user_id, body):
    """
    新しい顧客を作成
    """
    try:
        customer_data = json.loads(body) if isinstance(body, str) else body
        
        # 必須フィールドの検証
        required_fields = ['companyName', 'customerName']
        for field in required_fields:
            if not customer_data.get(field):
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # 顧客IDを生成
        customer_id = str(uuid.uuid4())
        
        # DynamoDBアイテムを作成
        item = {
            'PK': f'USER#{user_id}',
            'SK': f'CUSTOMER#{customer_id}',
            'id': customer_id,
            'userId': user_id,
            'companyName': customer_data['companyName'],
            'customerName': customer_data['customerName'],
            'location': customer_data.get('location', ''),
            'industry': customer_data.get('industry', ''),
            'siteUrl': customer_data.get('siteUrl', ''),
            'snsStatus': customer_data.get('snsStatus', ''),
            'lineId': customer_data.get('lineId', ''),
            'email': customer_data.get('email', ''),
            'salesPerson': customer_data.get('salesPerson', ''),
            'status': customer_data.get('status', '新規'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        result = dynamodb_client.put_item(CUSTOMERS_TABLE, item)
        
        if result['success']:
            return create_response(201, item)
        else:
            return create_response(500, {'error': result['error']})
            
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON'})
    except Exception as e:
        return create_response(500, {'error': str(e)})

def update_customer(user_id, customer_id, body):
    """
    顧客情報を更新
    """
    try:
        customer_data = json.loads(body) if isinstance(body, str) else body
        
        # 更新可能なフィールド
        updateable_fields = [
            'companyName', 'customerName', 'location', 'industry', 
            'siteUrl', 'snsStatus', 'lineId', 'email', 'salesPerson', 'status'
        ]
        
        # 更新式を構築
        update_expressions = []
        expression_values = {}
        
        for field in updateable_fields:
            if field in customer_data:
                update_expressions.append(f'#{field} = :{field}')
                expression_values[f':{field}'] = customer_data[field]
        
        if not update_expressions:
            return create_response(400, {'error': 'No fields to update'})
        
        # updatedAtフィールドを追加
        update_expressions.append('#updatedAt = :updatedAt')
        expression_values[':updatedAt'] = datetime.utcnow().isoformat()
        
        # 属性名マッピング
        expression_names = {f'#{field}': field for field in updateable_fields}
        expression_names['#updatedAt'] = 'updatedAt'
        
        result = dynamodb_client.update_item(
            CUSTOMERS_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'CUSTOMER#{customer_id}'
            },
            'SET ' + ', '.join(update_expressions),
            expression_values,
            expression_names
        )
        
        if result['success']:
            return create_response(200, result['data'])
        else:
            return create_response(500, {'error': result['error']})
            
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON'})
    except Exception as e:
        return create_response(500, {'error': str(e)})

def delete_customer(user_id, customer_id):
    """
    顧客を削除
    """
    try:
        result = dynamodb_client.delete_item(
            CUSTOMERS_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'CUSTOMER#{customer_id}'
            }
        )
        
        if result['success']:
            return create_response(200, {'message': 'Customer deleted successfully'})
        else:
            return create_response(500, {'error': result['error']})
            
    except Exception as e:
        return create_response(500, {'error': str(e)})

def create_response(status_code, body):
    """
    API Gatewayレスポンスを作成
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Origin',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, ensure_ascii=False)
    } 