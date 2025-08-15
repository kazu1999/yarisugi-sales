import json
import os
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from botocore.exceptions import ClientError

# 共通ライブラリをインポート（あなたのラッパー）
from common.dynamodb import DynamoDBClient

# === 環境変数 ===
FAQS_TABLE = os.environ.get('FAQS_TABLE', 'yarisugi-sales-faqs-dev')

# === DynamoDBクライアント ===
dynamodb_client = DynamoDBClient()


def create_response(status_code: int, body: Dict[str, Any], event: Dict[str, Any] = None, extra_headers: Dict[str, str] = None) -> Dict[str, Any]:
    """
    API Gateway (Lambda proxy) で常に正しいCORSヘッダーを返すための共通レスポンス関数。
    - 全オリジン許可（*）でシンプルに
    - Bearerトークン認証のみ対応（Cookie等は使用しない）
    - プリフライトのキャッシュを効かせる（Max-Age）
    """
    ALLOWED_METHODS = 'GET,POST,PUT,DELETE,OPTIONS'
    ALLOWED_HEADERS = 'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With'
    EXPOSED_HEADERS = 'Content-Type,ETag,Location'
    MAX_AGE_SECONDS = '600'

    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',          # 全オリジン許可
        'Access-Control-Allow-Credentials': 'false', # Cookie等は使わない前提
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Expose-Headers': EXPOSED_HEADERS,
        'Access-Control-Max-Age': MAX_AGE_SECONDS,
    }

    # 追加ヘッダ（必要なら呼び出し側から上書き）
    if extra_headers:
        headers.update(extra_headers)

    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, ensure_ascii=False, default=str)
    }



def get_user_id_from_event(event: Dict[str, Any]) -> Tuple[Optional[str], bool]:
    """
    イベントからユーザーID(Cognito sub)を取得
    - 認証あり: (sub, True)
    - 認証なし: (None, False)
    """
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub') or claims.get('cognito:username')
        if user_id:
            return user_id, True
        return None, False
    except Exception:
        return None, False


def require_auth_for_write(http_method: str, is_auth: bool, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    書き込み系（POST/PUT/DELETE）は未認証なら401で返す
    """
    if http_method in ('POST', 'PUT', 'DELETE') and not is_auth:
        return create_response(401, {'error': 'Unauthorized'}, event)
    return None


# ============== CRUD ==============
def get_faqs(user_id: str, event: Optional[Dict[str, Any]] = None):
    """ユーザーのFAQ一覧取得（PKクエリで高速）"""
    try:
        print(f"🔍 FAQ一覧取得開始 - ユーザーID: {user_id}, TABLE: {FAQS_TABLE}")
        query_params = {':pk': f'USER#{user_id}'}

        result = dynamodb_client.query(
            FAQS_TABLE,
            'PK = :pk',
            query_params
        )

        if result['success']:
            items = result.get('data', [])
            print(f"✅ FAQデータ取得成功: {len(items)}件")
            return create_response(200, {'faqs': items}, event)
        else:
            err = result.get('error', 'Unknown error')
            print(f"❌ DynamoDBエラー(get_faqs): {err}")
            return create_response(500, {'error': err}, event)

    except Exception as e:
        print(f"❌ 例外エラー(get_faqs): {str(e)}")
        return create_response(500, {'error': str(e)}, event)


def get_faq(user_id: str, faq_id: str, event: Optional[Dict[str, Any]] = None):
    """特定FAQ取得：PK/SKキーでGetItem"""
    try:
        key = {'PK': f'USER#{user_id}', 'SK': f'FAQ#{faq_id}'}
        print(f"🔍 FAQ詳細取得 - Key: {key}, TABLE: {FAQS_TABLE}")

        result = dynamodb_client.get_item(
            FAQS_TABLE,
            key
        )
        if result['success']:
            data = result.get('data')
            if data:
                return create_response(200, data, event)
            return create_response(404, {'error': 'FAQ not found'}, event)
        else:
            err = result.get('error', 'Unknown error')
            print(f"❌ DynamoDBエラー(get_faq): {err}")
            # 存在しない -> 404 に寄せる（ラッパー実装次第）
            if 'not found' in str(err).lower():
                return create_response(404, {'error': 'FAQ not found'}, event)
            return create_response(500, {'error': err}, event)

    except Exception as e:
        print(f"❌ FAQ詳細取得エラー(get_faq): {str(e)}")
        return create_response(500, {'error': str(e)}, event)


def create_faq(user_id: str, body: Any, event: Optional[Dict[str, Any]] = None):
    """FAQ作成：PK/SK + userId を保存。GSI(UserIdIndex)用に userId を必ず持たせる"""
    try:
        faq_data = json.loads(body) if isinstance(body, str) else body or {}
        # 必須
        for field in ('question', 'answer', 'category'):
            if not faq_data.get(field):
                return create_response(400, {'error': f'Missing required field: {field}'}, event)

        faq_id = f"faq_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"
        now_iso = datetime.utcnow().isoformat()

        item = {
            'PK': f'USER#{user_id}',
            'SK': f'FAQ#{faq_id}',
            'id': faq_id,
            'userId': user_id,                 # ★ GSI(UserIdIndex) 用
            'question': faq_data['question'],
            'answer': faq_data['answer'],
            'category': faq_data['category'],
            'tags': faq_data.get('tags', []),
            'isPublic': faq_data.get('isPublic', True),
            'createdAt': now_iso,
            'updatedAt': now_iso,
        }

        print(f"📝 PutItem: {item}")

        result = dynamodb_client.put_item(FAQS_TABLE, item)
        if result['success']:
            return create_response(201, item, event)
        else:
            err = result.get('error', 'Unknown error')
            print(f"❌ DynamoDBエラー(create_faq): {err}")
            return create_response(500, {'error': err}, event)

    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON'}, event)
    except Exception as e:
        print(f"❌ FAQ作成エラー(create_faq): {str(e)}")
        return create_response(500, {'error': str(e)}, event)


def update_faq(user_id: str, faq_id: str, body: Any, event: Optional[Dict[str, Any]] = None):
    """FAQ更新：更新可能フィールド + updatedAt"""
    try:
        faq_data = json.loads(body) if isinstance(body, str) else body or {}
        updatable = ['question', 'answer', 'category', 'tags', 'isPublic']

        # Update式作成
        update_exps, expr_vals = [], {}
        for f in updatable:
            if f in faq_data:
                update_exps.append(f'#{f} = :{f}')
                expr_vals[f':{f}'] = faq_data[f]

        if not update_exps:
            return create_response(400, {'error': 'No fields to update'}, event)

        update_exps.append('#updatedAt = :updatedAt')
        expr_vals[':updatedAt'] = datetime.utcnow().isoformat()

        expr_names = {f'#{f}': f for f in updatable}
        expr_names['#updatedAt'] = 'updatedAt'

        key = {'PK': f'USER#{user_id}', 'SK': f'FAQ#{faq_id}'}
        print(f"🛠 UpdateItem Key={key}, Update={update_exps}, Names={expr_names}, Values={expr_vals}")

        result = dynamodb_client.update_item(
            FAQS_TABLE,
            key,
            'SET ' + ', '.join(update_exps),
            expr_vals,
            expr_names
        )

        if result['success']:
            # ラッパーが新しい値を返すならそれを返す
            return create_response(200, result.get('data', {'id': faq_id}), event)
        else:
            err = result.get('error', 'Unknown error')
            print(f"❌ DynamoDBエラー(update_faq): {err}")
            if 'ConditionalCheckFailed' in str(err) or 'The conditional request failed' in str(err):
                return create_response(404, {'error': 'FAQ not found'}, event)
            return create_response(500, {'error': err}, event)

    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON'}, event)
    except ClientError as e:
        code = e.response.get('Error', {}).get('Code', '')
        msg = e.response.get('Error', {}).get('Message', str(e))
        print(f"❌ ClientError(update_faq) {code}: {msg}")
        if code == 'ConditionalCheckFailedException':
            return create_response(404, {'error': 'FAQ not found'}, event)
        if code in ('AccessDeniedException', 'UnauthorizedOperation'):
            return create_response(403, {'error': 'Forbidden'}, event)
        return create_response(500, {'error': msg}, event)
    except Exception as e:
        print(f"❌ FAQ更新エラー(update_faq): {str(e)}")
        return create_response(500, {'error': str(e)}, event)


def delete_faq(user_id: str, faq_id: str, event: Optional[Dict[str, Any]] = None):
    """FAQ削除：未認証を塞ぎ、条件失敗は404に寄せる"""
    try:
        key = {'PK': f'USER#{user_id}', 'SK': f'FAQ#{faq_id}'}
        print(f"🗑️ DeleteItem Key={key}, TABLE={FAQS_TABLE}")

        result = dynamodb_client.delete_item(
            FAQS_TABLE,
            key
        )

        if result['success']:
            return create_response(200, {'message': 'FAQ deleted successfully'}, event)

        err = str(result.get('error', 'Unknown error'))
        print(f"❌ DynamoDBエラー(delete_faq): {err}")

        if 'ConditionalCheckFailed' in err or 'The conditional request failed' in err:
            return create_response(404, {'error': 'FAQ not found'}, event)
        if 'AccessDenied' in err or 'not authorized' in err:
            return create_response(403, {'error': 'Forbidden'}, event)

        return create_response(500, {'error': err}, event)

    except ClientError as e:
        code = e.response.get('Error', {}).get('Code', '')
        msg = e.response.get('Error', {}).get('Message', str(e))
        print(f"❌ ClientError(delete_faq) {code}: {msg}")
        if code == 'ConditionalCheckFailedException':
            return create_response(404, {'error': 'FAQ not found'}, event)
        if code in ('AccessDeniedException', 'UnauthorizedOperation'):
            return create_response(403, {'error': 'Forbidden'}, event)
        return create_response(500, {'error': msg}, event)
    except Exception as e:
        print(f"❌ FAQ削除エラー(delete_faq): {str(e)}")
        return create_response(500, {'error': str(e)}, event)


# ============== ルーター ==============
def lambda_handler(event, context):
    try:
        print(f"🚀 FAQ Lambda開始")
        print(f"📋 イベント: {json.dumps(event, ensure_ascii=False, default=str)[:4000]}")  # 長過ぎ対策

        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '') or ''
        path_params = event.get('pathParameters') or {}
        body = event.get('body', '{}')

        print(f"🔍 HTTP Method: {http_method}")
        print(f"🔍 Path: {path}")
        print(f"🔍 Path Parameters: {path_params}")

        user_id, is_auth = get_user_id_from_event(event)
        print(f"🔑 is_auth={is_auth}, user_id={user_id}")

        # 書き込み系は未認証を弾く
        auth_resp = require_auth_for_write(http_method, is_auth, event)
        if auth_resp:
            return auth_resp

        # 事前に user_id 必須の処理
        if http_method in ('GET',) and not is_auth:
            # GETは要件次第：認証不要で空配列にしたいならここを調整
            # ここでは未認証GETは401に寄せる
            return create_response(401, {'error': 'Unauthorized'}, event)

        if http_method == 'GET':
            faq_id = path_params.get('id')
            if faq_id:
                return get_faq(user_id, faq_id, event)
            return get_faqs(user_id, event)

        elif http_method == 'POST':
            return create_faq(user_id, body, event)

        elif http_method == 'PUT':
            faq_id = path_params.get('id')
            if not faq_id:
                return create_response(400, {'error': 'FAQ ID is required for update'}, event)
            return update_faq(user_id, faq_id, body, event)

        elif http_method == 'DELETE':
            faq_id = path_params.get('id')
            if not faq_id:
                return create_response(400, {'error': 'FAQ ID is required for deletion'}, event)
            return delete_faq(user_id, faq_id, event)

        elif http_method == 'OPTIONS':
            print(f"🔍 OPTIONSリクエスト処理")
            return create_response(200, {}, event)

        else:
            return create_response(405, {'error': 'Method not allowed'}, event)

    except Exception as e:
        print(f"❌ Lambda エラー: {str(e)}")
        # ここで500に落ちた時もCORSは必ず返す
        return create_response(500, {'error': 'Internal server error'}, event)
