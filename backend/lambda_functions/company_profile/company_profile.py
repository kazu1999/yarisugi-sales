"""
基本情報管理Lambda関数
"""

import json
import os
from datetime import datetime
from typing import Dict, Any

# 共通ライブラリをインポート
import sys
sys.path.append('/opt/python/lib/python3.11/site-packages')
from common.dynamodb import dynamodb_client

# テーブル名
COMPANY_PROFILES_TABLE = os.environ.get('COMPANY_PROFILES_TABLE', 'yarisugi-sales-company-profiles-dev')
PROPOSALS_TABLE = os.environ.get('PROPOSALS_TABLE', 'yarisugi-sales-proposals-dev')

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
        if http_method == 'GET' and path == '/company-profile':
            return get_company_profile(user_id)
        elif http_method == 'PUT' and path == '/company-profile':
            return update_company_profile(user_id, event.get('body', '{}'))
        elif http_method == 'GET' and path == '/company-profile/proposals':
            return get_proposals(user_id)
        elif http_method == 'POST' and path == '/company-profile/proposals':
            return create_proposal(user_id, event.get('body', '{}'))
        elif http_method == 'PUT' and path.startswith('/company-profile/proposals/'):
            proposal_id = path.split('/')[-1]
            return update_proposal(user_id, proposal_id, event.get('body', '{}'))
        elif http_method == 'DELETE' and path.startswith('/company-profile/proposals/'):
            proposal_id = path.split('/')[-1]
            return delete_proposal(user_id, proposal_id)
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
        # Cognito認証情報からユーザーIDを取得
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub') or claims.get('cognito:username')
        
        # 認証なしの場合はテスト用ユーザーIDを使用
        if not user_id:
            user_id = 'test-user-123'
            
        return user_id
    except:
        return 'test-user-123'

def get_company_profile(user_id):
    """
    ユーザーの基本情報を取得
    """
    try:
        result = dynamodb_client.get_item(
            COMPANY_PROFILES_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'PROFILE#{user_id}'
            }
        )
        
        if result['success']:
            return create_response(200, result['data'])
        elif result['error'] == 'Item not found':
            return create_response(404, {'error': 'Company profile not found'})
        else:
            return create_response(500, {'error': result['error']})
            
    except Exception as e:
        return create_response(500, {'error': str(e)})

def update_company_profile(user_id, body):
    """
    基本情報を更新
    """
    try:
        profile_data = json.loads(body) if isinstance(body, str) else body
        
        # 必須フィールドの検証
        required_fields = ['companyName']
        for field in required_fields:
            if not profile_data.get(field):
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # DynamoDBアイテムを作成
        item = {
            'PK': f'USER#{user_id}',
            'SK': f'PROFILE#{user_id}',
            'userId': user_id,
            'companyName': profile_data['companyName'],
            'introduction': profile_data.get('introduction', ''),
            'services': profile_data.get('services', ''),
            'achievements': profile_data.get('achievements', ''),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        result = dynamodb_client.put_item(COMPANY_PROFILES_TABLE, item)
        
        if result['success']:
            return create_response(200, item)
        else:
            return create_response(500, {'error': result['error']})
            
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON'})
    except Exception as e:
        return create_response(500, {'error': str(e)})

def get_proposals(user_id):
    """
    ユーザーの提案内容一覧を取得
    """
    try:
        result = dynamodb_client.query(
            COMPANY_PROFILES_TABLE,
            'PK = :pk AND begins_with(SK, :sk)',
            {
                ':pk': f'USER#{user_id}',
                ':sk': 'PROPOSAL#'
            }
        )
        
        if result['success']:
            return create_response(200, {
                'proposals': result['data']
            })
        else:
            return create_response(500, {'error': result['error']})
            
    except Exception as e:
        return create_response(500, {'error': str(e)})

def create_proposal(user_id, body):
    """
    新しい提案内容を作成
    """
    try:
        proposal_data = json.loads(body) if isinstance(body, str) else body
        
        # 必須フィールドの検証
        required_fields = ['title']
        for field in required_fields:
            if not proposal_data.get(field):
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # 提案IDを生成
        import uuid
        proposal_id = str(uuid.uuid4())
        
        # DynamoDBアイテムを作成
        item = {
            'PK': f'USER#{user_id}',
            'SK': f'PROPOSAL#{proposal_id}',
            'userId': user_id,
            'id': proposal_id,
            'title': proposal_data['title'],
            'purpose': proposal_data.get('purpose', ''),
            'content': proposal_data.get('content', ''),
            'estimatedCost': proposal_data.get('estimatedCost', ''),
            'documentUrl': proposal_data.get('documentUrl', ''),
            'order': proposal_data.get('order', 1),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        result = dynamodb_client.put_item(COMPANY_PROFILES_TABLE, item)
        
        if result['success']:
            return create_response(201, item)
        else:
            return create_response(500, {'error': result['error']})
            
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON'})
    except Exception as e:
        return create_response(500, {'error': str(e)})

def update_proposal(user_id, proposal_id, body):
    """
    提案内容を更新
    """
    try:
        proposal_data = json.loads(body) if isinstance(body, str) else body
        
        # 更新可能なフィールド
        updateable_fields = [
            'title', 'purpose', 'content', 'estimatedCost', 'documentUrl', 'order'
        ]
        
        # 更新式を構築
        update_expressions = []
        expression_values = {}
        
        for field in updateable_fields:
            if field in proposal_data:
                update_expressions.append(f'#{field} = :{field}')
                expression_values[f':{field}'] = proposal_data[field]
        
        if not update_expressions:
            return create_response(400, {'error': 'No fields to update'})
        
        # updatedAtフィールドを追加
        update_expressions.append('#updatedAt = :updatedAt')
        expression_values[':updatedAt'] = datetime.utcnow().isoformat()
        
        # 属性名マッピング
        expression_names = {}
        for field in updateable_fields:
            if field in proposal_data:
                expression_names[f'#{field}'] = field
        expression_names['#updatedAt'] = 'updatedAt'
        
        result = dynamodb_client.update_item(
            COMPANY_PROFILES_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'PROPOSAL#{proposal_id}'
            },
            ', '.join(update_expressions),
            expression_values,
            expression_names
        )
        
        if result['success']:
            return create_response(200, result['data'])
        elif result['error'] == 'Item not found':
            return create_response(404, {'error': 'Proposal not found'})
        else:
            return create_response(500, {'error': result['error']})
            
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON'})
    except Exception as e:
        return create_response(500, {'error': str(e)})

def delete_proposal(user_id, proposal_id):
    """
    提案内容を削除
    """
    try:
        result = dynamodb_client.delete_item(
            COMPANY_PROFILES_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'PROPOSAL#{proposal_id}'
            }
        )
        
        if result['success']:
            return create_response(200, {'message': 'Proposal deleted successfully'})
        elif result['error'] == 'Item not found':
            return create_response(404, {'error': 'Proposal not found'})
        else:
            return create_response(500, {'error': result['error']})
            
    except Exception as e:
        return create_response(500, {'error': str(e)})

def create_response(status_code, body):
    """
    レスポンスを作成
    """
    def convert_decimals(obj):
        """Decimal型をint/floatに変換"""
        if isinstance(obj, dict):
            return {key: convert_decimals(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [convert_decimals(item) for item in obj]
        elif hasattr(obj, 'as_tuple'):  # Decimal型の判定
            return float(obj)
        else:
            return obj
    
    # Decimal型を変換
    converted_body = convert_decimals(body)
    
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(converted_body, ensure_ascii=False)
    }

