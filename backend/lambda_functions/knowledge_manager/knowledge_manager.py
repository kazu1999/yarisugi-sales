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
from boto3.dynamodb.conditions import Key, Attr

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

def get_user_id_from_event(event):
    """イベントからユーザーIDを取得"""
    try:
        # Cognito認証情報からユーザーIDを取得
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        print(f"🔑 認証クレーム: {claims}")
        
        user_id = claims.get('sub') or claims.get('cognito:username')
        print(f"👤 取得されたユーザーID: {user_id}")
        
        # 認証なしの場合はNoneを返す
        if not user_id:
            print(f"❌ No user ID found in claims: {claims}")
            return None
            
        return user_id
    except Exception as e:
        print(f"❌ ユーザーID取得エラー: {str(e)}")
        return None

def extract_text_from_pdf(pdf_bytes):
    """PDFファイルからテキストを抽出（PyPDF2を使用）"""
    try:
        print(f"🔍 PDF処理開始: {len(pdf_bytes)} bytes")
        print(f"🔍 PDFヘッダー: {pdf_bytes[:10]}")
        
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        print(f"📄 PDFページ数: {len(pdf_reader.pages)}")
        
        text = ""
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                print(f"🔍 Page {page_num + 1} 処理開始")
                page_text = page.extract_text()
                print(f"🔍 Page {page_num + 1} 生テキスト型: {type(page_text)}")
                print(f"🔍 Page {page_num + 1} 生テキスト長: {len(page_text) if page_text else 0}")
                
                if page_text:
                    # エンコーディングエラーを回避するため、エラーを無視してデコード
                    if isinstance(page_text, bytes):
                        print(f"🔍 Page {page_num + 1} バイトデータ検出")
                        # 複数のエンコーディングを試行
                        for encoding in ['utf-8', 'shift_jis', 'euc-jp', 'iso-2022-jp']:
                            try:
                                page_text = page_text.decode(encoding, errors='ignore')
                                print(f"🔍 Page {page_num + 1} {encoding}でデコード成功")
                                break
                            except UnicodeDecodeError:
                                continue
                        else:
                            # すべてのエンコーディングが失敗した場合
                            page_text = page_text.decode('utf-8', errors='ignore')
                            print(f"🔍 Page {page_num + 1} フォールバックデコード使用")
                    elif isinstance(page_text, str):
                        # 文字列の場合はそのまま使用
                        print(f"🔍 Page {page_num + 1} 文字列データ検出")
                        pass
                    else:
                        page_text = str(page_text)
                        print(f"🔍 Page {page_num + 1} その他の型を文字列に変換")
                    
                    text += page_text + "\n"
                    print(f"📄 Page {page_num + 1}: Extracted {len(page_text)} characters")
                    print(f"📄 Page {page_num + 1}: 最初の100文字: {page_text[:100]}")
                else:
                    print(f"⚠️ Page {page_num + 1}: テキストが空")
            except Exception as e:
                print(f"⚠️ Error extracting text from page {page_num + 1}: {e}")
                continue
        
        if not text.strip():
            print("❌ 抽出されたテキストが空")
            return "PDFからテキストを抽出できませんでした。画像のみのPDFの可能性があります。"
        
        print(f"📄 Total extracted {len(text)} characters from PDF")
        print(f"📄 抽出テキストの最初の200文字: {text[:200]}")
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
    
    # 末尾: 空白だけのチャンクを除外
    chunks = [c for c in chunks if c and c.strip()]
    print(f"📄 Split text into {len(chunks)} non-empty chunks (max {chunk_size} chars each)")
    return chunks

def generate_embeddings(text_chunks, batch_size=64, max_chunks=None):
    """OpenAI APIを使用してテキストチャンクの埋め込みを生成（動的バッチ処理で効率化）"""
    api_key = get_openai_api_key()
    if not api_key:
        print("❌ OpenAI API key not available")
        return []
    
    # ファイルサイズに応じた動的バッチサイズ調整
    total_chunks = len(text_chunks)
    if total_chunks > 100:  # 超大容量ファイル
        dynamic_batch_size = 32
        timeout = 15
        print(f"🚨 超大容量ファイル検出: バッチサイズを{dynamic_batch_size}、タイムアウトを{timeout}秒に調整")
    elif total_chunks > 50:  # 大容量ファイル
        dynamic_batch_size = 48
        timeout = 18
        print(f"📏 大容量ファイル検出: バッチサイズを{dynamic_batch_size}、タイムアウトを{timeout}秒に調整")
    elif total_chunks > 20:  # 中容量ファイル
        dynamic_batch_size = 64
        timeout = 20
        print(f"📏 中容量ファイル検出: バッチサイズを{dynamic_batch_size}、タイムアウトを{timeout}秒に調整")
    else:  # 小容量ファイル
        dynamic_batch_size = batch_size
        timeout = 20
        print(f"📏 小容量ファイル検出: バッチサイズを{dynamic_batch_size}、タイムアウトを{timeout}秒に調整")
    
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
    
    # 送信前の二重防御
    text_chunks = [t for t in text_chunks if t and t.strip()]
    if not text_chunks:
        print("⚠️ No non-empty chunks to embed; skipping embeddings.")
        return []
    
    # バッチ送信：input に配列を渡す
    for start in range(0, len(text_chunks), dynamic_batch_size):
        batch = text_chunks[start:start+dynamic_batch_size]
        try:
            payload = {'input': batch, 'model': 'text-embedding-3-small'}
            response = session.post(
                'https://api.openai.com/v1/embeddings',
                headers=headers,
                json=payload,
                timeout=timeout
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
        # ファイルサイズに応じた動的要約長調整
        content_length = len(content)
        if content_length > 2000000:  # 2MB以上
            max_content_length = 1000
            max_tokens = 200
            print(f"🚨 超大容量ファイル要約: 要約長を{max_content_length}文字、トークン数を{max_tokens}に制限")
        elif content_length > 1000000:  # 1MB以上
            max_content_length = 2000
            max_tokens = 250
            print(f"📏 大容量ファイル要約: 要約長を{max_content_length}文字、トークン数を{max_tokens}に制限")
        elif content_length > 500000:  # 500KB以上
            max_content_length = 3000
            max_tokens = 300
            print(f"📏 中容量ファイル要約: 要約長を{max_content_length}文字、トークン数を{max_tokens}に制限")
        else:  # 500KB以下
            max_content_length = 4000
            max_tokens = 400
            print(f"📏 小容量ファイル要約: 要約長を{max_content_length}文字、トークン数を{max_tokens}に制限")
        
        print(f"🔍 summarize_content - 元のcontent長: {content_length}文字")
        print(f"🔍 summarize_content - 元のcontent内容（最初の200文字）: {content[:200]}")
        
        content_to_summarize = content[:max_content_length]
        print(f"🔍 summarize_content - content_to_summarize長: {len(content_to_summarize)}文字")
        print(f"🔍 summarize_content - content_to_summarize内容（最初の200文字）: {content_to_summarize[:200]}")
        
        if len(content) > max_content_length:
            content_to_summarize += "\n\n... (内容が長いため省略)"
            print(f"🔍 summarize_content - 長いコンテンツのため省略処理を実行")
        
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
            'max_tokens': max_tokens,  # 動的トークン数
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

def create_knowledge_entry(user_id, title, content, category, file_type=None, s3_bucket=None, s3_key=None):
    """ナレッジエントリを作成"""
    print(f"🚀 create_knowledge_entry start "
          f"(user_id={user_id}, title={title!r}, category={category!r}, "
          f"file_type={file_type!r}, s3_bucket={s3_bucket!r}, s3_key={s3_key!r}, "
          f"content_len={len(content) if content else 0})")
    
    knowledge_id = str(uuid.uuid4())
    
    # コンテンツソースを決定
    print("🧭 decide content source ...")
    if s3_bucket and s3_key and (file_type or '').lower() == 'application/pdf':
        print(f"📄 S3→PDF抽出ルート: {s3_bucket}/{s3_key}")
        try:
            pdf_bytes = get_file_from_s3(s3_bucket, s3_key)
            print(f"📄 S3からPDF取得完了: {len(pdf_bytes)} bytes")
            extracted_text = extract_text_from_pdf(pdf_bytes)
            print(f"📄 PDFテキスト抽出完了: {len(extracted_text)} characters")
            content = extracted_text or ""
        except Exception as e:
            print(f"❌ S3/PDF抽出失敗: {e}")
            content = f"PDF処理エラー: {str(e)}"
    else:
        # テキスト直登録
        content = (content or "").strip()
        if not content:
            raise ValueError("Empty content is not allowed for non-PDF entries")
        print(f"📄 テキスト直登録ルート: content_len={len(content)}")
    
    content_hash = hashlib.md5(content.encode()).hexdigest()
    print(f"📄 content_len={len(content)}, contentHash={content_hash}")
    
    # コンテンツの要約を生成
    summary = summarize_content(content)
    
    # テキストをチャンクに分割
    chunks = chunk_text(content)
    
    # ファイルサイズに応じて動的にチャンク数を調整
    content_length = len(content)
    max_embed_chunks = int(os.environ.get('MAX_EMBED_CHUNKS', '48'))
    
    # ファイルサイズに応じた動的調整
    print(f"📊 ファイルサイズ分析: {content_length}文字 ({content_length/1024:.1f}KB)")
    
    if content_length > 2000000:  # 2MB以上（超大容量）
        max_embed_chunks = min(max_embed_chunks, 16)
        chunk_size = 3000  # チャンクサイズを大きくしてチャンク数を減らす
        print(f"🚨 超大容量ファイル検出 ({content_length}文字): チャンク数を{max_embed_chunks}、チャンクサイズを{chunk_size}に調整")
    elif content_length > 1000000:  # 1MB以上（大容量）
        max_embed_chunks = min(max_embed_chunks, 24)
        chunk_size = 2500
        print(f"📏 大容量ファイル検出 ({content_length}文字): チャンク数を{max_embed_chunks}、チャンクサイズを{chunk_size}に調整")
    elif content_length > 500000:  # 500KB以上（中容量）
        max_embed_chunks = min(max_embed_chunks, 36)
        chunk_size = 2000
        print(f"📏 中容量ファイル検出 ({content_length}文字): チャンク数を{max_embed_chunks}、チャンクサイズを{chunk_size}に調整")
    elif content_length > 100000:  # 100KB以上（小容量）
        max_embed_chunks = min(max_embed_chunks, 48)
        chunk_size = 2000
        print(f"📏 小容量ファイル検出 ({content_length}文字): チャンク数を{max_embed_chunks}、チャンクサイズを{chunk_size}に調整")
    else:  # 100KB以下（軽量）
        max_embed_chunks = min(max_embed_chunks, 48)
        chunk_size = 2000
        print(f"📏 軽量ファイル検出 ({content_length}文字): チャンク数を{max_embed_chunks}、チャンクサイズを{chunk_size}に調整")
    
    # 動的チャンクサイズで再分割
    chunks = chunk_text(content, chunk_size=chunk_size)
    print(f"📄 動的調整後: {len(chunks)}チャンク（最大{max_embed_chunks}まで処理）")
    
    embeddings = generate_embeddings(chunks, batch_size=64, max_chunks=max_embed_chunks)
    
    # S3リンクを生成（ファイルがS3にある場合）
    s3_link = None
    if s3_bucket and s3_key:
        s3_link = f"s3://{s3_bucket}/{s3_key}"
    
    # メインのナレッジエントリを保存
    knowledge_item = {
        'PK': f'KNOWLEDGE#{user_id}',
        'SK': f'KNOWLEDGE#{knowledge_id}',
        'knowledgeId': knowledge_id,
        'userId': user_id,
        'title': title,
        'summary': summary,
        'category': category,
        'fileType': file_type,
        'contentHash': content_hash,
        'chunkCount': len(chunks),
        's3Link': s3_link,  # S3リンクを追加
        'createdAt': datetime.utcnow().isoformat(),
        'updatedAt': datetime.utcnow().isoformat()
    }
    
    # テキストファイルの場合はcontentも保存（S3リンクがない場合）
    if not s3_link and content:
        knowledge_item['content'] = content
    
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
        
        # 処理統計情報をログ出力
        print(f"📊 処理完了統計:")
        print(f"   • ファイルサイズ: {content_length}文字 ({content_length/1024:.1f}KB)")
        print(f"   • チャンク数: {len(chunks)}個")
        print(f"   • 埋め込み生成: {len(embeddings)}個")
        print(f"   • 要約長: {len(summary)}文字")
        print(f"   • 処理時間: 動的調整により最適化済み")
        
        return knowledge_item
    except ClientError as e:
        print(f"Error saving knowledge entry: {e}")
        raise e

def get_knowledge_entries(user_id, category=None):
    """ユーザーのナレッジエントリを取得"""
    try:
        print(f"🔍 Getting knowledge entries for user: {user_id}, category: {category}")
        print(f"🔍 User ID type: {type(user_id)}, value: '{user_id}'")
        
        if category:
            print(f"📋 Using CategoryIndex for category: {category}")
            try:
                response = knowledge_table.query(
                    IndexName='CategoryIndex',
                    KeyConditionExpression=Key('category').eq(category),
                    FilterExpression=Attr('userId').eq(user_id),
                )
                print(f"✅ CategoryIndex query successful: {response}")
            except Exception as cat_error:
                print(f"❌ CategoryIndex query failed: {cat_error}")
                return []
        else:
            print(f"📋 Using UserIdIndex for user: {user_id}")
            try:
                response = knowledge_table.query(
                    IndexName='UserIdIndex',
                    KeyConditionExpression=Key('userId').eq(user_id),
                )
                print(f"✅ UserIdIndex query successful: {response}")
            except Exception as index_error:
                print(f"⚠️ UserIdIndex query failed: {index_error}")
                print("🔄 Falling back to scan with filter...")
                try:
                    # フォールバック: スキャンしてフィルタ
                    response = knowledge_table.scan(
                        FilterExpression=Attr('userId').eq(user_id)
                    )
                    print(f"✅ Scan fallback successful: {response}")
                except Exception as scan_error:
                    print(f"❌ Scan fallback also failed: {scan_error}")
                    return []
        
        print(f"📊 DynamoDB response type: {type(response)}")
        print(f"📊 DynamoDB response: {response}")
        
        if response is None:
            print("❌ DynamoDB response is None")
            return []
        
        try:
            items = response.get('Items', [])
            print(f"📦 Items extracted successfully: {len(items)} items")
        except AttributeError as e:
            print(f"❌ Error accessing response.get(): {e}")
            print(f"📊 Response type: {type(response)}")
            print(f"📊 Response content: {response}")
            return []
        except Exception as e:
            print(f"❌ Unexpected error accessing response.get(): {e}")
            print(f"📊 Response type: {type(response)}")
            print(f"📊 Response content: {response}")
            return []
        
        print(f"📦 Found {len(items)} items")
        
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
        
        try:
            converted_items = convert_decimals(items)
            print(f"✅ Converted {len(converted_items)} knowledge entries")
            return converted_items
        except Exception as convert_error:
            print(f"❌ Error converting decimals: {convert_error}")
            return []
            
    except ClientError as e:
        print(f"❌ ClientError in get_knowledge_entries: {e}")
        return []
    except Exception as e:
        print(f"❌ Unexpected error in get_knowledge_entries: {e}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
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
            # PK=knowledgeId, SK=chunkIndex の想定なら query + batch_writer が速い
            resp = vectors_table.query(
                KeyConditionExpression=Key('knowledgeId').eq(knowledge_id)
            )
            deleted = 0
            with vectors_table.batch_writer() as batch:
                for item in resp.get('Items', []):
                    batch.delete_item(Key={'knowledgeId': item['knowledgeId'], 'chunkIndex': item['chunkIndex']})
                    deleted += 1
            print(f"Deleted {deleted} vector chunks")
            
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

def generate_s3_presigned_url(bucket: str, key: str, expiration: int = 3600) -> str:
    """S3ファイルのpresigned URLを生成"""
    try:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': key},
            ExpiresIn=expiration
        )
        return presigned_url
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return None

def get_knowledge_entry_with_s3_url(user_id, knowledge_id):
    """ナレッジエントリを取得し、S3リンクがある場合はpresigned URLを生成"""
    try:
        # 両方のPK形式を試す
        pk_formats = [
            f'KNOWLEDGE#{user_id}',
            f'USER#{user_id}'
        ]
        
        knowledge_entry = None
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
                    break
            except Exception as e:
                print(f"Error checking PK {pk}: {e}")
                continue
        
        if not knowledge_entry:
            return None
        
        # S3リンクがある場合はpresigned URLを生成
        if 's3Link' in knowledge_entry and knowledge_entry['s3Link']:
            s3_link = knowledge_entry['s3Link']
            # s3://bucket/key 形式から bucket と key を抽出
            if s3_link.startswith('s3://'):
                parts = s3_link[5:].split('/', 1)
                if len(parts) == 2:
                    bucket, key = parts
                    presigned_url = generate_s3_presigned_url(bucket, key)
                    if presigned_url:
                        knowledge_entry['presignedUrl'] = presigned_url
        
        # Decimal型をfloatに変換
        from decimal import Decimal
        def convert_decimals(obj):
            if isinstance(obj, list):
                return [convert_decimals(item) for item in obj]
            elif isinstance(obj, dict):
                return {key: convert_decimals(value) for key, value in obj.items()}
            elif isinstance(obj, Decimal):
                return float(obj)
            return obj
        
        return convert_decimals(knowledge_entry)
        
    except Exception as e:
        print(f"Error getting knowledge entry with S3 URL: {e}")
        return None

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    print(f"🔍 イベントからユーザーID取得開始")
    print(f"📋 イベント構造: {json.dumps(event, default=str)}")
    
    # CORSヘッダー
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    # 認証チェック
    try:
        user_id = get_user_id_from_event(event)
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized - user_id not found'})
            }
        print(f"✅ 最終ユーザーID: {user_id}")
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
    
    # HTTPメソッドとパスを取得
    http_method = event.get('httpMethod', 'GET')
    resource = event.get('resource', '')
    
    try:
        if http_method == 'GET':
            # パスパラメータをチェック（個別エントリ取得か一覧取得か）
            path_parameters = event.get('pathParameters') or {}
            knowledge_id = path_parameters.get('knowledgeId')
            
            if knowledge_id:
                # 個別のナレッジエントリを取得（S3リンク付き）
                knowledge_entry = get_knowledge_entry_with_s3_url(user_id, knowledge_id)
                
                if knowledge_entry:
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps({
                            'knowledgeEntry': knowledge_entry
                        }, default=str)
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'error': 'Knowledge entry not found'})
                    }
            else:
                # ナレッジエントリ一覧を取得
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
            # ナレッジエントリを作成
            print(f"🔍 POST処理開始")
            body = json.loads(event.get('body', '{}'))
            print(f"🔍 POST body: {body}")
            title = body.get('title', '')
            content = body.get('content')  # 空文字とNoneを区別したいのでデフォルト付けない
            category = body.get('category', 'general')
            file_type = (body.get('fileType') or '').lower()
            s3_bucket = body.get('s3Bucket')
            s3_key = body.get('s3Key')
            
            print(f"🔍 POST処理 - title: {title}")
            print(f"🔍 POST処理 - content length: {len(content) if content else 0}")
            print(f"🔍 POST処理 - category: {category}")
            print(f"🔍 POST処理 - file_type: {file_type}")
            print(f"🔍 POST処理 - s3_bucket: {s3_bucket}")
            print(f"🔍 POST処理 - s3_key: {s3_key}")
            
            # サニタイズされたペイロードをログ出力
            print("📝 POST payload (sanitized):",
                  json.dumps({
                      "title": title,
                      "hasContent": bool(content and content.strip()),
                      "category": category,
                      "fileType": file_type,
                      "s3Bucket": bool(s3_bucket),
                      "s3Key": bool(s3_key),
                  }, ensure_ascii=False))
            
            if not title:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Title is required'})
                }
            
            is_pdf = (file_type == 'application/pdf')
            has_s3 = bool(s3_bucket and s3_key)
            
            # PDFアップロードルートの必須チェック
            if is_pdf and not has_s3:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'fileType=application/pdf の場合は s3Bucket と s3Key が必須です'})
                }
            
            # テキスト直登録ルートの必須チェック
            if not is_pdf:
                if not (content and content.strip()):
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'content is required for non-PDF entries'})
                    }
            
            knowledge_entry = create_knowledge_entry(
                user_id=user_id,
                title=title,
                content=content or "",  # Noneでも関数内で扱えるように
                category=category,
                file_type=file_type or None,
                s3_bucket=s3_bucket,
                s3_key=s3_key
            )
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Knowledge entry created successfully',
                    'knowledgeEntry': knowledge_entry
                }, default=str)
            }
        
        elif http_method == 'DELETE':
            # ナレッジエントリを削除
            path_parameters = event.get('pathParameters') or {}
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
                    'body': json.dumps({'message': 'Knowledge entry deleted successfully'})
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
        print(f"Error in lambda_handler: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
