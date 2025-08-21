import json
import boto3
import uuid
import hashlib
from datetime import datetime
from botocore.exceptions import ClientError
import base64
import os
import requests
import re
from typing import List, Dict, Any, Optional

# S3クライアント
s3_client = boto3.client('s3')
import PyPDF2
import io
import math
import itertools

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
knowledge_table = dynamodb.Table(os.environ['KNOWLEDGE_TABLE'])
vectors_table = dynamodb.Table(os.environ['KNOWLEDGE_VECTORS_TABLE'])

# OpenAI設定
secrets_client = boto3.client('secretsmanager')

def extract_text_from_pdf(pdf_bytes):
    """PDFファイルからテキストを抽出（PyPDF2を使用）"""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    # エンコーディングエラーを回避するため、エラーを無視してデコード
                    if isinstance(page_text, bytes):
                        # 複数のエンコーディングを試行
                        for encoding in ['utf-8', 'shift_jis', 'euc-jp', 'iso-2022-jp']:
                            try:
                                page_text = page_text.decode(encoding, errors='ignore')
                                break
                            except UnicodeDecodeError:
                                continue
                        else:
                            # すべてのエンコーディングが失敗した場合
                            page_text = page_text.decode('utf-8', errors='ignore')
                    elif isinstance(page_text, str):
                        # 文字列の場合はそのまま使用
                        pass
                    else:
                        page_text = str(page_text)
                    
                    text += page_text + "\n"
                    print(f"📄 Page {page_num + 1}: Extracted {len(page_text)} characters")
            except Exception as e:
                print(f"⚠️ Error extracting text from page {page_num + 1}: {e}")
                continue
        
        if not text.strip():
            return "PDFからテキストを抽出できませんでした。画像のみのPDFの可能性があります。"
        
        print(f"📄 Total extracted {len(text)} characters from PDF")
        return text.strip()
    except Exception as e:
        print(f"❌ Error extracting text from PDF: {e}")
        return f"PDFテキスト抽出エラー: {str(e)}"

def dataurl_to_bytes(s: str) -> bytes:
    """data URLからバイトデータを安全に抽出"""
    try:
        # dataURL なら "...,base64,<<<<ここからが実データ>>>>"
        if s.startswith("data:"):
            # 例: data:application/pdf;name=Yarisugi基礎-顧客個別画面.pdf;base64,AAAA...
            parts = s.split("base64,", 1)
            if len(parts) != 2:
                # 念のため正規表現でもリカバリ
                m = re.search(r'base64,(.*)', s, flags=re.S)
                if not m:
                    raise ValueError("Invalid data URL format")
                s = m.group(1)
            else:
                s = parts[1]
        
        # 改行やスペースを除去（メール/HTTPの改行折返し対策）
        s = "".join(s.split())
        return base64.b64decode(s)
    except Exception as e:
        print(f"❌ Error in dataurl_to_bytes: {e}")
        raise

def get_file_from_s3(bucket: str, key: str) -> bytes:
    """S3からファイルを取得"""
    try:
        print(f"📥 S3からファイル取得開始: {bucket}/{key}")
        response = s3_client.get_object(Bucket=bucket, Key=key)
        file_content = response['Body'].read()
        print(f"✅ S3からファイル取得完了: {len(file_content)} bytes")
        return file_content
    except Exception as e:
        print(f"❌ S3からファイル取得エラー: {e}")
        raise e

def process_file_content(content, file_type):
    """ファイルコンテンツを処理（PDFの場合はテキスト抽出）"""
    if file_type and file_type.lower() == 'application/pdf':
        try:
            # 既にbytesで渡された場合の分岐を追加
            if isinstance(content, (bytes, bytearray)):
                pdf_bytes = bytes(content)
                print(f"📄 PDF bytes provided directly, size: {len(pdf_bytes)} bytes")
            else:
                # 文字列（data URL / Base64）のみ dataurl_to_bytes に通す
                pdf_bytes = dataurl_to_bytes(content)
                print(f"📄 PDF file size: {len(pdf_bytes)} bytes")
            
            # PDFヘッダーチェック
            if len(pdf_bytes) < 4 or pdf_bytes[:4] != b'%PDF':
                return f"PDF処理エラー: 無効なPDFファイル形式\n\nファイルサイズ: {len(pdf_bytes)} bytes\nファイル形式: PDF"
            
            extracted_text = extract_text_from_pdf(pdf_bytes)
            
            # エラーメッセージが含まれている場合は、より詳細な情報を提供
            if "PDFテキスト抽出エラー" in extracted_text:
                return f"PDF処理エラー: {extracted_text}\n\nファイルサイズ: {len(pdf_bytes)} bytes\nファイル形式: PDF"
            
            print(f"✅ Successfully extracted {len(extracted_text)} characters from PDF")
            return extracted_text
        except Exception as e:
            print(f"❌ Error processing PDF content: {e}")
            return f"PDF処理エラー: {str(e)}\n\nファイル形式: PDF"
    else:
        # テキストファイルの場合はそのまま返す
        return content

def get_openai_api_key():
    """OpenAI APIキーを取得（環境変数またはSecrets Managerから）"""
    try:
        # まず環境変数から取得を試行
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            return api_key
        
        # Secrets Managerから取得を試行
        secret_arn = os.environ.get('OPENAI_API_SECRET_ARN')
        if secret_arn:
            response = secrets_client.get_secret_value(SecretId=secret_arn)
            secret = json.loads(response['SecretString'])
            return secret['openai_api_key']
        
        raise ValueError("OpenAI API key not configured")
    except Exception as e:
        print(f"Error retrieving OpenAI API key: {str(e)}")
        return None

def chunk_text(text, chunk_size=2000, overlap=100):
    """テキストをチャンクに分割（チャンクサイズを大きくしてチャンク数を減らす）"""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # 文の境界で分割を試みる
        if end < len(text):
            last_period = chunk.rfind('.')
            last_newline = chunk.rfind('\n')
            split_point = max(last_period, last_newline)
            
            if split_point > start + chunk_size * 0.7:  # 70%以上進んでいる場合のみ分割
                chunk = chunk[:split_point + 1]
                end = start + split_point + 1
        
        chunks.append(chunk)
        start = end - overlap if end < len(text) else end
    
    print(f"📄 Split text into {len(chunks)} chunks (max {chunk_size} chars each)")
    return chunks

def generate_embeddings(text_chunks, batch_size=64, max_chunks=None):
    """OpenAI APIを使用してテキストチャンクの埋め込みを生成（バッチ処理で効率化）"""
    api_key = get_openai_api_key()
    if not api_key:
        print("❌ OpenAI API key not available")
        return []
    
    # 上限キャップ（デカいPDFで29秒超を防ぐ）
    if max_chunks is not None and len(text_chunks) > max_chunks:
        print(f"⚠️ Limiting chunks from {len(text_chunks)} to {max_chunks} for synchronous embeddings")
        text_chunks = text_chunks[:max_chunks]

    embeddings = []
    session = requests.Session()
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    # バッチ送信：input に配列を渡す
    for start in range(0, len(text_chunks), batch_size):
        batch = text_chunks[start:start+batch_size]
        try:
            payload = {'input': batch, 'model': 'text-embedding-3-small'}
            response = session.post(
                'https://api.openai.com/v1/embeddings',
                headers=headers,
                json=payload,
                timeout=20
            )
            if response.status_code == 200:
                result = response.json()
                # APIは入力順に data を返す（各要素に index も付与）
                for item in result['data']:
                    embedding = item['embedding']
                    embeddings.append(json.dumps(embedding))
                print(f"✅ Generated embeddings for batch {start+1}-{start+len(batch)}/{len(text_chunks)}")
            else:
                print(f"❌ Error generating embeddings batch: {response.status_code} - {response.text}")
                # 失敗したバッチ分は None を詰めて長さを合わせる
                embeddings.extend([None]*len(batch))
        except Exception as e:
            print(f"❌ Exception generating embeddings batch: {str(e)}")
            embeddings.extend([None]*len(batch))
    
    return embeddings

def summarize_content(content):
    """OpenAI APIを使用してコンテンツを要約（タイムアウトを短縮）"""
    api_key = get_openai_api_key()
    if not api_key:
        print("❌ OpenAI API key not available")
        return f"【要約エラー】\n• ファイル内容: {len(content)}文字\n• OpenAI APIキーが設定されていません"
    
    try:
        # コンテンツが長すぎる場合は最初の部分のみを使用
        max_content_length = 3000  # トークン制限を考慮して短縮
        content_to_summarize = content[:max_content_length]
        if len(content) > max_content_length:
            content_to_summarize += "\n\n... (内容が長いため省略)"
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'gpt-4o-mini',
            'messages': [
                {
                    'role': 'system',
                    'content': 'あなたは文書の要約専門家です。与えられた文書を簡潔で分かりやすく要約してください。'
                },
                {
                    'role': 'user',
                    'content': f'以下の文書を要約してください：\n\n{content_to_summarize}'
                }
            ],
            'max_tokens': 300,  # トークン数を削減
            'temperature': 0.3
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=20  # タイムアウトを20秒に短縮
        )
        
        if response.status_code == 200:
            result = response.json()
            summary = result['choices'][0]['message']['content']
            print(f"✅ Generated summary: {len(summary)} characters")
            return summary
        else:
            print(f"❌ Error generating summary: {response.status_code} - {response.text}")
            return f"【要約エラー】\n• ファイル内容: {len(content)}文字\n• OpenAI API エラー: {response.status_code}"
            
    except Exception as e:
        print(f"❌ Exception generating summary: {str(e)}")
        return f"【要約エラー】\n• ファイル内容: {len(content)}文字\n• 例外エラー: {str(e)}"

def create_knowledge_entry(user_id, title, content, category, file_type=None):
    """ナレッジエントリを作成"""
    knowledge_id = str(uuid.uuid4())
    content_hash = hashlib.md5(content.encode()).hexdigest()
    
    # コンテンツの要約を生成
    summary = summarize_content(content)
    
    # テキストをチャンクに分割
    chunks = chunk_text(content)
    
    # 埋め込みを生成（バッチ＋上限キャップ）
    max_embed_chunks = int(os.environ.get('MAX_EMBED_CHUNKS', '48'))  # まずは 48 件まで等
    embeddings = generate_embeddings(chunks, batch_size=64, max_chunks=max_embed_chunks)
    
    # メインのナレッジエントリを保存
    knowledge_item = {
        'PK': f'KNOWLEDGE#{user_id}',
        'SK': f'KNOWLEDGE#{knowledge_id}',
        'knowledgeId': knowledge_id,
        'userId': user_id,
        'title': title,
        'content': content,
        'summary': summary,
        'category': category,
        'fileType': file_type,
        'contentHash': content_hash,
        'chunkCount': len(chunks),
        'createdAt': datetime.utcnow().isoformat(),
        'updatedAt': datetime.utcnow().isoformat()
    }
    
    try:
        # メインテーブルに保存
        knowledge_table.put_item(Item=knowledge_item)
        
        # ベクトルテーブルにチャンクとその埋め込みを保存
        # 生成した分だけ保存（キャップしている可能性があるため）
        for i, (chunk, embedding) in enumerate(zip(chunks[:len(embeddings)], embeddings)):
            if embedding:  # 埋め込み生成に成功した場合のみ保存
                vector_item = {
                    'knowledgeId': knowledge_id,
                    'chunkIndex': i,
                    'userId': user_id,
                    'chunk': chunk,
                    'embedding': embedding,
                    'createdAt': datetime.utcnow().isoformat()
                }
                vectors_table.put_item(Item=vector_item)
        
        return knowledge_item
    except ClientError as e:
        print(f"Error saving knowledge entry: {e}")
        raise e

def get_knowledge_entries(user_id, category=None):
    """ユーザーのナレッジエントリを取得"""
    try:
        if category:
            response = knowledge_table.query(
                IndexName='CategoryIndex',
                KeyConditionExpression='category = :cat',
                FilterExpression='userId = :uid',
                ExpressionAttributeValues={
                    ':cat': category,
                    ':uid': user_id
                }
            )
        else:
            response = knowledge_table.query(
                IndexName='UserIdIndex',
                KeyConditionExpression='userId = :uid',
                ExpressionAttributeValues={
                    ':uid': user_id
                }
            )
        
        items = response.get('Items', [])
        # Decimal型をfloatに変換してJSONシリアライゼーション可能にする
        import json
        from decimal import Decimal
        
        def decimal_to_float(obj):
            if isinstance(obj, Decimal):
                return float(obj)
            return obj
        
        # 再帰的にDecimalを変換
        def convert_decimals(obj):
            if isinstance(obj, list):
                return [convert_decimals(item) for item in obj]
            elif isinstance(obj, dict):
                return {key: convert_decimals(value) for key, value in obj.items()}
            elif isinstance(obj, Decimal):
                return float(obj)
            return obj
        
        converted_items = convert_decimals(items)
        print(f"Converted {len(converted_items)} knowledge entries")
        return converted_items
    except ClientError as e:
        print(f"Error getting knowledge entries: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error in get_knowledge_entries: {e}")
        return []

def delete_knowledge_entry(user_id, knowledge_id):
    """ナレッジエントリを削除"""
    try:
        print(f"Deleting knowledge entry: {knowledge_id} for user: {user_id}")
        
        # まず、Knowledgeエントリが存在するかチェック
        knowledge_entry = None
        
        # 両方のPK形式を試す
        pk_formats = [
            f'KNOWLEDGE#{user_id}',
            f'USER#{user_id}'
        ]
        
        for pk in pk_formats:
            try:
                response = knowledge_table.get_item(
                    Key={
                        'PK': pk,
                        'SK': f'KNOWLEDGE#{knowledge_id}'
                    }
                )
                if 'Item' in response:
                    knowledge_entry = response['Item']
                    print(f"Found knowledge entry with PK: {pk}")
                    break
            except Exception as e:
                print(f"Error checking PK {pk}: {e}")
                continue
        
        if not knowledge_entry:
            print(f"Knowledge entry not found: {knowledge_id}")
            return False
        
        # 見つかったPK形式で削除を実行
        actual_pk = knowledge_entry['PK']
        response = knowledge_table.delete_item(
            Key={
                'PK': actual_pk,
                'SK': f'KNOWLEDGE#{knowledge_id}'
            }
        )
        
        print(f"Main knowledge entry deleted: {response}")
        
        # ベクトルテーブルから関連するチャンクを削除
        try:
            # ベクトルテーブルから該当するknowledgeIdのアイテムを削除
            scan_response = vectors_table.scan(
                FilterExpression='knowledgeId = :kid',
                ExpressionAttributeValues={
                    ':kid': knowledge_id
                }
            )
            
            for item in scan_response.get('Items', []):
                vectors_table.delete_item(
                    Key={
                        'knowledgeId': item['knowledgeId'],
                        'chunkIndex': item['chunkIndex']
                    }
                )
            
            print(f"Deleted {len(scan_response.get('Items', []))} vector chunks")
            
        except Exception as e:
            print(f"Warning: Error deleting vector chunks: {e}")
            # ベクトル削除に失敗してもメインエントリの削除は成功とする
        
        return True
        
    except ClientError as e:
        print(f"Error deleting knowledge entry: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error in delete_knowledge_entry: {e}")
        return False

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    print(f"Event: {json.dumps(event)}")
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    try:
        http_method = event['httpMethod']
        
        # OPTIONSリクエスト（CORS preflight）
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight response'})
            }
        
        # ユーザーIDを取得（Cognito経由）
        try:
            print(f"🔍 イベントからユーザーID取得開始")
            print(f"📋 イベント構造: {json.dumps(event, default=str)}")
            
            # Cognito認証情報からユーザーIDを取得
            claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
            print(f"🔑 認証クレーム: {claims}")
            
            user_id = claims.get('sub') or claims.get('cognito:username')
            print(f"👤 取得されたユーザーID: {user_id}")
            
            # 認証なしの場合は401エラーを返す
            if not user_id:
                print(f"❌ No user ID found in claims: {claims}")
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'error': 'Unauthorized - No valid user ID found'})
                }
                
            print(f"✅ 最終ユーザーID: {user_id}")
        except Exception as e:
            print(f"❌ ユーザーID取得エラー: {str(e)}")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized - Error retrieving user ID'})
            }
        
        if http_method == 'GET':
            # ナレッジエントリを取得
            query_params = event.get('queryStringParameters') or {}
            category = query_params.get('category')
            
            knowledge_entries = get_knowledge_entries(user_id, category)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'knowledgeEntries': knowledge_entries
                }, default=str)
            }
        
        elif http_method == 'POST':
            # 新しいナレッジエントリを作成
            body = json.loads(event.get('body', '{}'))
            
            title = body.get('title')
            content = body.get('content')
            category = body.get('category', 'general')
            file_type = body.get('fileType')
            s3_bucket = body.get('s3Bucket')
            s3_key = body.get('s3Key')
            
            if not title:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Title is required'})
                }
            
            # S3からのファイル取得または直接コンテンツ
            if s3_bucket and s3_key:
                # S3からファイルを取得
                try:
                    print(f"📥 S3からファイル取得: {s3_bucket}/{s3_key}")
                    file_content = get_file_from_s3(s3_bucket, s3_key)
                    
                    if file_type and file_type.lower() == 'application/pdf':
                        # PDFファイルの場合、テキスト抽出
                        processed_content = process_file_content(file_content, file_type)
                        if isinstance(processed_content, str) and processed_content.startswith("PDF処理エラー"):
                            return {
                                'statusCode': 500,
                                'headers': headers,
                                'body': json.dumps({'error': processed_content})
                            }
                        content = processed_content
                    else:
                        # テキストファイルの場合
                        content = file_content.decode('utf-8', errors='ignore')
                        
                except Exception as e:
                    print(f"❌ S3ファイル取得エラー: {e}")
                    return {
                        'statusCode': 500,
                        'headers': headers,
                        'body': json.dumps({'error': f'S3 file retrieval error: {str(e)}'})
                    }
            else:
                # 直接コンテンツの場合
                if not content:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Content or S3 file information is required'})
                    }
                
                print(f"🔎 content head: {content[:40]!r}")
                
                # ⚠️ PDFなどバイナリはここでいじらず、process_file_content に任せる
                if file_type and file_type.lower() == 'application/pdf':
                    processed_content = process_file_content(content, file_type)
                    if isinstance(processed_content, str) and processed_content.startswith("PDF処理エラー"):
                        return {
                            'statusCode': 500,
                            'headers': headers,
                            'body': json.dumps({'error': processed_content})
                        }
                    content = processed_content # テキスト抽出後の内容を使用
                else:
                    # テキスト系の data URL だけをここでデコード（任意）
                    if isinstance(content, str) and content.startswith('data:'):
                        try:
                            header, encoded = content.split(',', 1)
                            mime = header[5:].split(';', 1)[0].lower()  # "data:xxxx"
                            decoded = base64.b64decode(encoded)
                            if mime.startswith('text/') or mime in ('application/json',):
                                content = decoded.decode('utf-8', errors='ignore')
                            else:
                                # 非テキストはこのAPIでは扱わない想定なのでUTF-8化せずスルーしてもOK
                                # 必要があればここで reject する: return 400
                                content = decoded.decode('utf-8', errors='ignore')
                        except Exception as e:
                            print(f"Error decoding data URL content: {e}")
            
            knowledge_entry = create_knowledge_entry(
                user_id=user_id,
                title=title,
                content=content,
                category=category,
                file_type=file_type
            )
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Knowledge entry created successfully',
                    'knowledgeEntry': knowledge_entry
                })
            }
        
        elif http_method == 'DELETE':
            # ナレッジエントリを削除
            path_parameters = event.get('pathParameters', {})
            knowledge_id = path_parameters.get('knowledgeId')
            
            if not knowledge_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Knowledge ID is required'})
                }
            
            success = delete_knowledge_entry(user_id, knowledge_id)
            
            if success:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Knowledge entry deleted successfully'
                    })
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'Knowledge entry not found'})
                }
        
        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
