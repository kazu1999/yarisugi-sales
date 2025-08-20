import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError

# 共通ライブラリをインポート
from common.dynamodb import DynamoDBClient

# 環境変数
FAQS_TABLE = os.environ.get('FAQS_TABLE', 'yarisugi-sales-faqs-dev')

# DynamoDBクライアント
dynamodb_client = DynamoDBClient()

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """レスポンスを作成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, ensure_ascii=False, default=str)
    }

def get_user_id_from_event(event):
    """イベントからユーザーIDを取得"""
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

def get_faqs(user_id):
    """ユーザーのFAQ一覧を取得"""
    try:
        print(f"🔍 FAQ一覧取得開始 - ユーザーID: {user_id}")
        print(f"📋 テーブル名: {FAQS_TABLE}")
        
        # ユーザーIDでクエリ
        query_params = {':pk': f'USER#{user_id}'}
        print(f"🔎 クエリパラメータ: {query_params}")
        
        result = dynamodb_client.query(
            FAQS_TABLE,
            'PK = :pk',
            query_params
        )
        
        print(f"📦 DynamoDB結果: {result}")
        
        if result['success']:
            print(f"✅ FAQデータ取得成功: {len(result['data'])}件")
            return create_response(200, {
                'faqs': result['data']
            })
        else:
            print(f"❌ DynamoDBエラー: {result['error']}")
            return create_response(500, {'error': result['error']})
            
    except Exception as e:
        print(f"❌ 例外エラー: {str(e)}")
        return create_response(500, {'error': str(e)})

def get_faq(user_id, faq_id):
    """特定のFAQを取得"""
    try:
        print(f"🔍 FAQ詳細取得開始 - ユーザーID: {user_id}, FAQ ID: {faq_id}")
        
        result = dynamodb_client.get_item(
            FAQS_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'FAQ#{faq_id}'
            }
        )
        
        if result['success']:
            return create_response(200, result['data'])
        else:
            return create_response(404, {'error': 'FAQ not found'})
            
    except Exception as e:
        print(f"❌ FAQ詳細取得エラー: {str(e)}")
        return create_response(500, {'error': str(e)})

def create_faq(user_id, body):
    """FAQを作成"""
    try:
        faq_data = json.loads(body) if isinstance(body, str) else body
        
        # 必須フィールドの確認
        required_fields = ['question', 'answer', 'category']
        for field in required_fields:
            if not faq_data.get(field):
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # FAQ IDを生成
        faq_id = f"faq_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{user_id[-8:]}"
        
        # DynamoDBアイテムを作成
        item = {
            'PK': f'USER#{user_id}',
            'SK': f'FAQ#{faq_id}',
            'id': faq_id,
            'userId': user_id,
            'question': faq_data['question'],
            'answer': faq_data['answer'],
            'category': faq_data['category'],
            'tags': faq_data.get('tags', []),
            'isPublic': faq_data.get('isPublic', True),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        result = dynamodb_client.put_item(FAQS_TABLE, item)
        
        if result['success']:
            return create_response(201, item)
        else:
            return create_response(500, {'error': result['error']})
            
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON'})
    except Exception as e:
        print(f"❌ FAQ作成エラー: {str(e)}")
        return create_response(500, {'error': str(e)})

def update_faq(user_id, faq_id, body):
    """FAQを更新"""
    try:
        faq_data = json.loads(body) if isinstance(body, str) else body
        
        # 更新可能なフィールド
        updateable_fields = [
            'question', 'answer', 'category', 'tags', 'isPublic'
        ]
        
        # 更新式を構築
        update_expressions = []
        expression_values = {}
        
        for field in updateable_fields:
            if field in faq_data:
                update_expressions.append(f'#{field} = :{field}')
                expression_values[f':{field}'] = faq_data[field]
        
        if not update_expressions:
            return create_response(400, {'error': 'No fields to update'})
        
        # updatedAtフィールドを追加
        update_expressions.append('#updatedAt = :updatedAt')
        expression_values[':updatedAt'] = datetime.utcnow().isoformat()
        
        # 属性名マッピング
        expression_names = {f'#{field}': field for field in updateable_fields}
        expression_names['#updatedAt'] = 'updatedAt'
        
        result = dynamodb_client.update_item(
            FAQS_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'FAQ#{faq_id}'
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
        print(f"❌ FAQ更新エラー: {str(e)}")
        return create_response(500, {'error': str(e)})

def delete_faq(user_id, faq_id):
    """FAQを削除"""
    try:
        print(f"🔍 FAQ削除開始 - ユーザーID: {user_id}, FAQ ID: {faq_id}")
        
        result = dynamodb_client.delete_item(
            FAQS_TABLE,
            {
                'PK': f'USER#{user_id}',
                'SK': f'FAQ#{faq_id}'
            }
        )
        
        if result['success']:
            return create_response(200, {'message': 'FAQ deleted successfully'})
        else:
            return create_response(500, {'error': result['error']})
            
    except Exception as e:
        print(f"❌ FAQ削除エラー: {str(e)}")
        return create_response(500, {'error': str(e)})

def lambda_handler(event, context):
    """メインハンドラー"""
    try:
        print(f"🚀 FAQ Lambda開始")
        print(f"📋 イベント: {json.dumps(event, default=str)}")
        
        # HTTPメソッドとパスを取得
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '')
        path_parameters = event.get('pathParameters', {})
        
        print(f"🔍 HTTP Method: {http_method}")
        print(f"🔍 Path: {path}")
        print(f"🔍 Path Parameters: {path_parameters}")
        
        # ユーザーIDを取得
        user_id = get_user_id_from_event(event)
        
        # ルーティング
        if http_method == 'GET':
            if path_parameters and 'id' in path_parameters:
                # 特定のFAQを取得
                return get_faq(user_id, path_parameters['id'])
            else:
                # FAQ一覧を取得
                return get_faqs(user_id)
                
        elif http_method == 'POST':
            # FAQを作成
            return create_faq(user_id, event.get('body', '{}'))
            
        elif http_method == 'PUT':
            if path_parameters and 'id' in path_parameters:
                # FAQを更新
                return update_faq(user_id, path_parameters['id'], event.get('body', '{}'))
            else:
                return create_response(400, {'error': 'FAQ ID is required for update'})
                
        elif http_method == 'DELETE':
            if path_parameters and 'id' in path_parameters:
                # FAQを削除
                return delete_faq(user_id, path_parameters['id'])
            else:
                return create_response(400, {'error': 'FAQ ID is required for deletion'})
                
        elif http_method == 'OPTIONS':
            # CORS preflight request
            return create_response(200, {})
            
        else:
            return create_response(405, {'error': 'Method not allowed'})
            
    except Exception as e:
        print(f"❌ Lambda エラー: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})
