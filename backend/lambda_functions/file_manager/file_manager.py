import json
import boto3
import os
import uuid
from datetime import datetime
import base64
from typing import Dict, Any, List
import PyPDF2
import io
import requests
import openai
from decimal import Decimal
import subprocess
import tempfile
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re

# AWS クライアントの初期化
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
secretsmanager = boto3.client('secretsmanager')

# 環境変数
CUSTOMER_FILES_TABLE = os.environ.get('CUSTOMER_FILES_TABLE')
S3_BUCKET = os.environ.get('S3_BUCKET')
OPENAI_API_KEY_SECRET = os.environ.get('OPENAI_API_KEY_SECRET')

# Decimal型を処理するヘルパー関数
def convert_decimals(obj):
    """DynamoDBのDecimal型を通常の数値に変換"""
    if isinstance(obj, Decimal):
        return float(obj) if obj % 1 != 0 else int(obj)
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    else:
        return obj

# OpenAI クライアントの初期化
def get_openai_client():
    try:
        # Secrets ManagerからAPIキーを取得
        response = secretsmanager.get_secret_value(SecretId=OPENAI_API_KEY_SECRET)
        api_key = json.loads(response['SecretString'])['openai_api_key']
        openai.api_key = api_key
        return openai
    except Exception as e:
        print(f"Error getting OpenAI API key: {e}")
        return None

# URLコンテンツ取得関数
def validate_url(url: str) -> bool:
    """URLの妥当性をチェック"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc]) and result.scheme in ['http', 'https']
    except Exception:
        return False

def fetch_url_content(url: str) -> Dict[str, Any]:
    """URLからコンテンツを取得してテキストを抽出"""
    try:
        # URLの妥当性チェック
        if not validate_url(url):
            return {
                'success': False,
                'error': 'Invalid URL format'
            }
        
        # リクエストヘッダーを設定（User-Agentを追加してブロックを回避）
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # タイムアウトを設定（30秒）
        response = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
        response.raise_for_status()
        
        # コンテンツタイプをチェック
        content_type = response.headers.get('content-type', '').lower()
        if 'text/html' not in content_type:
            return {
                'success': False,
                'error': f'Unsupported content type: {content_type}'
            }
        
        # HTMLをパース
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 不要なタグを削除
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript']):
            tag.decompose()
        
        # メインコンテンツを抽出
        content_text = ""
        
        # タイトルを取得
        title = soup.find('title')
        if title:
            content_text += f"タイトル: {title.get_text().strip()}\n\n"
        
        # h1タグを取得
        h1_tags = soup.find_all('h1')
        if h1_tags:
            content_text += "見出し1:\n"
            for h1 in h1_tags:
                content_text += f"- {h1.get_text().strip()}\n"
            content_text += "\n"
        
        # h2-h6タグを取得
        for level in range(2, 7):
            h_tags = soup.find_all(f'h{level}')
            if h_tags:
                content_text += f"見出し{level}:\n"
                for h in h_tags:
                    content_text += f"- {h.get_text().strip()}\n"
                content_text += "\n"
        
        # 段落テキストを取得
        paragraphs = soup.find_all(['p', 'article', 'section', 'div'])
        paragraph_text = ""
        for p in paragraphs:
            text = p.get_text().strip()
            if text and len(text) > 20:  # 短すぎるテキストは除外
                paragraph_text += text + "\n\n"
        
        content_text += paragraph_text
        
        # テキストをクリーンアップ
        content_text = re.sub(r'\n\s*\n', '\n\n', content_text)  # 複数の改行を2つに統一
        content_text = re.sub(r'[ \t]+', ' ', content_text)  # 複数のスペースを1つに統一
        content_text = content_text.strip()
        
        # テキストが短すぎる場合はエラー
        if len(content_text) < 100:
            return {
                'success': False,
                'error': 'Content too short or no meaningful text found'
            }
        
        # 長すぎる場合は切り詰め（8000文字まで）
        if len(content_text) > 8000:
            content_text = content_text[:8000] + "..."
        
        return {
            'success': True,
            'content': content_text,
            'url': url,
            'title': title.get_text().strip() if title else 'No title',
            'content_length': len(content_text)
        }
        
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'Request timeout - URL took too long to respond'
        }
    except requests.exceptions.ConnectionError:
        return {
            'success': False,
            'error': 'Connection error - Could not connect to URL'
        }
    except requests.exceptions.HTTPError as e:
        return {
            'success': False,
            'error': f'HTTP error: {e.response.status_code}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Failed to fetch URL content: {str(e)}'
        }

# 音声ファイル圧縮関数
def compress_audio(audio_content: bytes, file_extension: str, target_size_mb: int = 20) -> bytes:
    """音声ファイルを圧縮してWhisper APIの制限内に収める"""
    try:
        print(f"Starting audio compression for {file_extension} file, target size: {target_size_mb}MB")
        
        # 一時ファイルを作成
        with tempfile.NamedTemporaryFile(suffix=f'.{file_extension}', delete=False) as input_file:
            input_file.write(audio_content)
            input_file_path = input_file.name
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as output_file:
            output_file_path = output_file.name
        
        # ffmpegで圧縮（Whisper推奨設定）
        cmd = [
            '/var/task/ffmpeg', '-i', input_file_path,
            '-ar', '16000',          # サンプリングレート16kHz
            '-ac', '1',              # モノラル
            '-acodec', 'pcm_s16le',  # 16bit PCM
            '-y',                    # 上書き確認なし
            output_file_path
        ]
        
        print(f"Running ffmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"ffmpeg output: {result.stdout}")
        
        # 圧縮後のファイルを読み込み
        with open(output_file_path, 'rb') as f:
            compressed_content = f.read()
        
        # 一時ファイルを削除
        os.unlink(input_file_path)
        os.unlink(output_file_path)
        
        original_size_mb = len(audio_content) / (1024 * 1024)
        compressed_size_mb = len(compressed_content) / (1024 * 1024)
        compression_ratio = (1 - compressed_size_mb / original_size_mb) * 100
        
        print(f"Audio compression completed: {original_size_mb:.2f}MB -> {compressed_size_mb:.2f}MB ({compression_ratio:.1f}% reduction)")
        
        return compressed_content
        
    except subprocess.CalledProcessError as e:
        print(f"ffmpeg error: {e}")
        print(f"ffmpeg stderr: {e.stderr}")
        return audio_content  # 圧縮失敗時は元のファイルを返す
    except Exception as e:
        print(f"Audio compression error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return audio_content  # 圧縮失敗時は元のファイルを返す

def extract_text_from_pdf(pdf_content: bytes) -> str:
    """PDFファイルからテキストを抽出"""
    try:
        pdf_file = io.BytesIO(pdf_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def transcribe_audio(audio_content: bytes, file_extension: str) -> str:
    """音声ファイルをテキストに変換（OpenAI Whisper使用）"""
    try:
        print(f"Starting audio transcription for extension: {file_extension}")
        print(f"Audio content size: {len(audio_content)} bytes")
        
        openai_client = get_openai_client()
        if not openai_client:
            print("OpenAI client not available")
            return "音声変換に失敗しました"
        
        # 音声ファイルを一時的に保存
        temp_file_path = f"/tmp/audio.{file_extension}"
        print(f"Saving audio to temp file: {temp_file_path}")
        with open(temp_file_path, "wb") as f:
            f.write(audio_content)
        
        # OpenAI Whisperで音声変換
        print("Calling OpenAI Whisper API...")
        with open(temp_file_path, "rb") as audio_file:
            transcript = openai_client.Audio.transcribe("whisper-1", audio_file)
        
        print(f"Transcription result: {transcript.text[:100] if transcript.text else 'None'}...")
        
        # 一時ファイルを削除
        os.remove(temp_file_path)
        return transcript.text
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return "音声変換に失敗しました"

# 質問機能の関数
def handle_file_question(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイルに対する質問を処理"""
    try:
        # リクエストボディの解析
        body = json.loads(event.get('body', '{}'))
        file_id = body.get('fileId')
        customer_id = body.get('customerId')
        question = body.get('question')
        user_id = body.get('userId')
        
        if not all([file_id, customer_id, question, user_id]):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'Missing required parameters'})
            }
        
        # ファイル情報を取得
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.query(
            KeyConditionExpression='PK = :pk AND SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'CUSTOMER#{customer_id}',
                ':sk': f'FILE#{file_id}'
            }
        )
        
        if not response['Items']:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'File not found'})
            }
        
        file_item = response['Items'][0]
        file_text = file_item.get('fileText', '')
        file_name = file_item.get('fileName', '')
        file_type = file_item.get('fileType', '')
        
        if not file_text:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'File content not available for questions'})
            }
        
        # GPTで質問に回答
        answer = generate_question_answer(file_text, question, file_name, file_type)
        
        # 質問・回答を履歴として保存
        question_id = str(uuid.uuid4())
        save_question_history(question_id, file_id, customer_id, question, answer, user_id)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'questionId': question_id,
                'answer': answer
            })
        }
        
    except Exception as e:
        print(f"Error handling file question: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }

def generate_question_answer(file_text: str, question: str, file_name: str, file_type: str) -> str:
    """ファイル内容に基づいて質問に回答を生成"""
    try:
        openai_client = get_openai_client()
        if not openai_client:
            return "OpenAI APIキーが設定されていません"
        
        # ファイル内容を適切な長さに制限（GPTのトークン制限を考慮）
        max_chars = 8000  # 安全な範囲で制限
        if len(file_text) > max_chars:
            file_text = file_text[:max_chars] + "..."
        
        # プロンプトを作成
        if file_type.lower() == 'pdf':
            prompt = f"""以下のPDFファイル「{file_name}」の内容に基づいて、質問に回答してください。

ファイル内容:
{file_text}

質問: {question}

回答の際は以下の点に注意してください:
1. ファイル内容に基づいた正確な回答を提供してください
2. 関連する箇所があれば引用してください（「〜の部分で」「〜によると」など）
3. ファイル内容に答えがない場合は、その旨を明確に述べてください
4. 回答は日本語で、分かりやすく簡潔に記述してください
"""
        else:  # 音声ファイル
            prompt = f"""以下の音声ファイル「{file_name}」の転写内容に基づいて、質問に回答してください。

音声内容:
{file_text}

質問: {question}

回答の際は以下の点に注意してください:
1. 音声内容に基づいた正確な回答を提供してください
2. 関連する箇所があれば引用してください（「〜の部分で」「〜によると」など）
3. 音声内容に答えがない場合は、その旨を明確に述べてください
4. 回答は日本語で、分かりやすく簡潔に記述してください
"""
        
        response = openai_client.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたは文書や音声の内容を分析して質問に答えるアシスタントです。"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Error generating question answer: {e}")
        return "回答の生成中にエラーが発生しました"

def save_question_history(question_id: str, file_id: str, customer_id: str, 
                         question: str, answer: str, user_id: str) -> None:
    """質問・回答の履歴をDynamoDBに保存"""
    try:
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        
        item = {
            'PK': f'CUSTOMER#{customer_id}',
            'SK': f'QUESTION#{question_id}',
            'questionId': question_id,
            'fileId': file_id,
            'customerId': customer_id,
            'question': question,
            'answer': answer,
            'userId': user_id,
            'createdAt': datetime.utcnow().isoformat(),
            'status': 'active'
        }
        
        table.put_item(Item=item)
        print(f"Question history saved: {question_id}")
        
    except Exception as e:
        print(f"Error saving question history: {e}")

def handle_file_questions(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイルの質問履歴を取得"""
    try:
        # クエリパラメータの解析
        query_params = event.get('queryStringParameters', {}) or {}
        file_id = query_params.get('fileId')
        customer_id = query_params.get('customerId')
        
        if not all([file_id, customer_id]):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'Missing required parameters'})
            }
        
        # 質問履歴を取得
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
            FilterExpression='fileId = :file_id',
            ExpressionAttributeValues={
                ':pk': f'CUSTOMER#{customer_id}',
                ':sk_prefix': 'QUESTION#',
                ':file_id': file_id
            }
        )
        
        questions = []
        for item in response['Items']:
            questions.append({
                'questionId': item.get('questionId'),
                'question': item.get('question'),
                'answer': item.get('answer'),
                'createdAt': item.get('createdAt')
            })
        
        # 作成日時でソート（新しい順）
        questions.sort(key=lambda x: x['createdAt'], reverse=True)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'questions': questions
            })
        }
        
    except Exception as e:
        print(f"Error getting file questions: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }

def generate_summary(text: str, file_type: str) -> str:
    """テキストの要約を生成"""
    try:
        openai_client = get_openai_client()
        if not openai_client:
            return "要約の生成に失敗しました"
        
        # ファイルの長さに応じて要約の長さを調整
        if len(text) < 1000:
            summary_length = "2-3行"
        elif len(text) < 5000:
            summary_length = "段落単位"
        else:
            summary_length = "セクション単位"
        
        prompt = f"""
以下の{file_type}ファイルの内容を{summary_length}で要約してください。
内容を簡潔にまとめ、重要なポイントを抽出してください。

内容:
{text}

要約:
"""
        
        response = openai_client.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "あなたは優秀な要約作成者です。与えられた内容を簡潔で分かりやすく要約してください。"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "要約の生成に失敗しました"

def save_file_to_s3(file_content: bytes, file_name: str, customer_id: str) -> str:
    """ファイルをS3に保存"""
    try:
        file_id = str(uuid.uuid4())
        s3_key = f"customers/{customer_id}/files/{file_id}/{file_name}"
        
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType='application/octet-stream'
        )
        
        return file_id, s3_key
    except Exception as e:
        print(f"Error saving file to S3: {e}")
        raise e

def save_file_metadata(file_id: str, customer_id: str, file_name: str, file_type: str, 
                      file_size: int, s3_key: str, summary: str, user_id: str, file_text: str = "", 
                      url: str = "", original_title: str = "") -> Dict[str, Any]:
    """ファイルのメタデータをDynamoDBに保存"""
    try:
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        
        item = {
            'PK': f'CUSTOMER#{customer_id}',
            'SK': f'FILE#{file_id}',
            'fileId': file_id,
            'customerId': customer_id,
            'fileName': file_name,
            'fileType': file_type,
            'fileSize': file_size,
            's3Key': s3_key,
            'summary': summary,
            'fileText': file_text,  # ファイル内容のテキスト（質問機能用）
            'userId': user_id,
            'uploadedAt': datetime.utcnow().isoformat(),
            'status': 'active'
        }
        
        # URL関連のフィールドを追加（URLアップロードの場合）
        if url:
            item['url'] = url
        if original_title:
            item['originalTitle'] = original_title
        
        table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error saving file metadata: {e}")
        raise e

def handle_url_upload(event: Dict[str, Any]) -> Dict[str, Any]:
    """URLアップロード処理"""
    try:
        print("handle_url_upload function called")
        # リクエストボディの解析
        body = json.loads(event.get('body', '{}'))
        customer_id = body.get('customerId')
        url = body.get('url')
        user_id = body.get('userId', 'unknown')
        
        print(f"Parsed parameters - customer_id: {customer_id}, url: {url}, user_id: {user_id}")
        
        if not customer_id or not url:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'customerId and url are required'
                })
            }
        
        print(f"URLアップロード開始: {url}")
        
        # URLからコンテンツを取得
        url_result = fetch_url_content(url)
        
        if not url_result['success']:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'error': f'Failed to fetch URL content: {url_result["error"]}'
                })
            }
        
        content = url_result['content']
        title = url_result['title']
        
        print(f"URLコンテンツ取得成功: {url_result['content_length']} characters")
        print(f"タイトル: {title}")
        
        # ファイルIDを生成
        file_id = str(uuid.uuid4())
        
        # ファイル名を生成（URLのドメイン名を使用）
        try:
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.replace('www.', '')
            # タイトルから.txt拡張子を削除
            clean_title = title[:50] if title != 'No title' else 'content'
            file_name = f"{domain}_{clean_title}"
        except:
            file_name = f"url_content_{file_id[:8]}"
        
        # テキストファイルとしてS3に保存
        s3_key = f"customer-files/{customer_id}/{file_id}/{file_name}"
        
        try:
            s3.put_object(
                Bucket=S3_BUCKET,
                Key=s3_key,
                Body=content.encode('utf-8'),
                ContentType='text/plain'
            )
            print(f"S3に保存完了: {s3_key}")
        except Exception as e:
            print(f"S3保存エラー: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to save content to S3'
                })
            }
        
        # 要約を生成
        summary = ""
        try:
            openai_client = get_openai_client()
            if openai_client:
                summary = generate_summary(content, "URL")
                print(f"要約生成完了: {len(summary)} characters")
            else:
                print("OpenAI client not available, skipping summary generation")
        except Exception as e:
            print(f"要約生成エラー: {e}")
            summary = "要約の生成に失敗しました。"
        
        # DynamoDBにメタデータを保存
        try:
            file_metadata = save_file_metadata(
                file_id=file_id,
                customer_id=customer_id,
                file_name=file_name,
                file_type='url',
                file_size=len(content.encode('utf-8')),
                s3_key=s3_key,
                summary=summary,
                user_id=user_id,
                file_text=content,
                url=url,
                original_title=title
            )
            
            print(f"メタデータ保存完了: {file_id}")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'success': True,
                    'file': convert_decimals(file_metadata)
                })
            }
            
        except Exception as e:
            print(f"メタデータ保存エラー: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to save file metadata'
                })
            }
            
    except Exception as e:
        print(f"URLアップロードエラー: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """メインのLambda関数"""
    try:
        print(f"Event: {json.dumps(event)}")
        
        # リクエストの解析
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        print(f"HTTP Method: {http_method}, Path: {path}")
        
        if http_method == 'POST' and '/files/upload-url' in path:
            print("Routing to handle_url_upload")
            return handle_url_upload(event)
        elif http_method == 'POST' and '/files/upload' in path:
            print("Routing to handle_file_upload")
            return handle_file_upload(event)
        elif http_method == 'POST' and '/files/question' in path:
            return handle_file_question(event)
        elif http_method == 'GET' and '/files/questions' in path:
            return handle_file_questions(event)
        elif http_method == 'GET' and '/files/' in path and path != '/files':
            return handle_file_detail(event)
        elif http_method == 'GET' and '/files' in path:
            return handle_file_list(event)
        elif http_method == 'DELETE' and '/files/' in path:
            return handle_file_delete(event)
        elif http_method == 'POST' and '/files/generate-text' in path:
            return handle_generate_file_text(event)
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'Invalid endpoint'})
            }
            
    except Exception as e:
        print(f"Error in lambda_handler: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }

def handle_generate_file_text(event: Dict[str, Any]) -> Dict[str, Any]:
    """既存ファイルのfileTextを後から生成する"""
    try:
        # リクエストボディの解析
        body = json.loads(event.get('body', '{}'))
        file_id = body.get('fileId')
        customer_id = body.get('customerId')
        
        if not file_id or not customer_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'fileId and customerId are required'})
            }
        
        # ファイル情報を取得
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.query(
            KeyConditionExpression='PK = :pk AND SK = :sk',
            ExpressionAttributeValues={
                ':pk': f'CUSTOMER#{customer_id}',
                ':sk': f'FILE#{file_id}'
            }
        )
        
        if not response.get('Items'):
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'File not found'})
            }
        
        file_item = response['Items'][0]
        s3_key = file_item.get('s3Key')
        file_type = file_item.get('fileType', '').lower()
        file_name = file_item.get('fileName', '')
        
        # S3からファイルを取得
        s3_response = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
        file_content = s3_response['Body'].read()
        
        # ファイルタイプに応じてテキストを抽出
        file_text = ""
        if file_type == 'pdf':
            file_text = extract_text_from_pdf(file_content)
        elif file_type in ['mp3', 'wav', 'm4a', 'aac', 'audio', 'webm']:
            # 音声ファイルの場合は拡張子を取得
            if file_type == 'audio':
                # ファイル名から拡張子を抽出
                file_extension = file_name.split('.')[-1].lower() if '.' in file_name else 'wav'
            else:
                file_extension = file_type
            
            file_text = transcribe_audio(file_content, file_extension)
        
        # DynamoDBのfileTextフィールドを更新
        table.update_item(
            Key={
                'PK': f'CUSTOMER#{customer_id}',
                'SK': f'FILE#{file_id}'
            },
            UpdateExpression='SET fileText = :file_text',
            ExpressionAttributeValues={
                ':file_text': file_text
            }
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'message': 'ファイルテキストが正常に生成されました',
                'fileText': file_text[:500] + '...' if len(file_text) > 500 else file_text
            })
        }
        
    except Exception as e:
        print(f"Error in handle_generate_file_text: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'Failed to generate file text: {str(e)}'})
        }

def handle_file_upload(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイルアップロード処理"""
    try:
        # リクエストボディの解析
        body = json.loads(event.get('body', '{}'))
        customer_id = body.get('customerId')
        file_name = body.get('fileName')
        file_type = body.get('fileType')
        file_content_base64 = body.get('fileContent')
        user_id = body.get('userId')
        
        if not all([customer_id, file_name, file_type, file_content_base64, user_id]):
                    return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'Missing required parameters'})
        }
        
        # Base64デコード
        file_content = base64.b64decode(file_content_base64)
        file_size = len(file_content)
        file_size_mb = file_size / (1024 * 1024)
        
        print(f"Original file size: {file_size_mb:.2f}MB")
        
        # 音声ファイルの圧縮処理
        if file_type.lower() in ['mp3', 'wav', 'm4a', 'aac', 'audio', 'webm']:
            # 25MBを超える音声ファイルは自動圧縮
            if file_size_mb > 25:
                print(f"Audio file size ({file_size_mb:.2f}MB) exceeds 25MB limit, compressing...")
                
                # file_typeが'audio'の場合は、ファイル名から拡張子を取得
                if file_type.lower() in ['audio']:
                    file_extension = file_name.split('.')[-1].lower() if '.' in file_name else 'wav'
                else:
                    file_extension = file_type.lower()
                
                # 音声圧縮実行
                compressed_content = compress_audio(file_content, file_extension, target_size_mb=20)
                
                # 圧縮後のサイズをチェック
                compressed_size_mb = len(compressed_content) / (1024 * 1024)
                if compressed_size_mb <= 25:
                    file_content = compressed_content
                    file_size = len(file_content)
                    print(f"Audio compression successful: {file_size_mb:.2f}MB -> {compressed_size_mb:.2f}MB")
                else:
                    print(f"Audio compression failed to reduce size below 25MB: {compressed_size_mb:.2f}MB")
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                        },
                        'body': json.dumps({'error': f'Audio file too large even after compression: {compressed_size_mb:.2f}MB'})
                    }
        
        # 最終的なファイルサイズチェック（50MB制限）
        final_file_size_mb = len(file_content) / (1024 * 1024)
        if final_file_size_mb > 50:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': f'File size exceeds 50MB limit: {final_file_size_mb:.2f}MB'})
            }
        
        # ファイルをS3に保存
        file_id, s3_key = save_file_to_s3(file_content, file_name, customer_id)
        
        # ファイル内容の処理と要約生成
        summary = ""
        print(f"Processing file type: {file_type}")
        
        if file_type.lower() == 'pdf':
            text = extract_text_from_pdf(file_content)
            print(f"PDF text extracted: {len(text) if text else 0} characters")
            if text:
                summary = generate_summary(text, "PDF")
                print(f"PDF summary generated: {len(summary)} characters")
        elif file_type.lower() in ['mp3', 'wav', 'm4a', 'aac', 'audio', 'webm']:
            print(f"Starting audio transcription for {file_type}")
            # file_typeが'audio'の場合は、ファイル名から拡張子を取得
            if file_type.lower() in ['audio']:
                file_extension = file_name.split('.')[-1].lower() if '.' in file_name else 'wav'
            else:
                file_extension = file_type.lower()
            
            # 圧縮されたファイルの場合は'wav'を使用
            if file_size_mb != final_file_size_mb:
                print(f"Using compressed audio file (wav format) for transcription")
                file_extension = 'wav'
            
            print(f"Using file extension: {file_extension}")
            text = transcribe_audio(file_content, file_extension)
            print(f"Audio transcription result: {text[:100] if text else 'None'}...")
            if text and "失敗" not in text:
                summary = generate_summary(text, "音声")
                print(f"Audio summary generated: {len(summary)} characters")
            else:
                print("Audio transcription failed or returned empty text")
        
        # ファイル内容をテキストとして保存（質問機能用）
        file_text = ""
        if file_type.lower() == 'pdf':
            file_text = text if text else ""
        elif file_type.lower() in ['mp3', 'wav', 'm4a', 'aac', 'audio', 'webm']:
            file_text = text if text else ""
        
        # メタデータをDynamoDBに保存
        file_metadata = save_file_metadata(
            file_id, customer_id, file_name, file_type, 
            file_size, s3_key, summary, user_id, file_text
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'fileId': file_id,
                'summary': summary,
                'message': 'ファイルが正常にアップロードされました'
            })
        }
        
    except Exception as e:
        print(f"Error in handle_file_upload: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'File upload failed: {str(e)}'})
        }

def handle_file_list(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイル一覧取得"""
    try:
        # クエリパラメータの解析
        query_params = event.get('queryStringParameters', {}) or {}
        customer_id = query_params.get('customerId')
        
        if not customer_id:
                    return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': 'customerId is required'})
        }
        
        # DynamoDBからファイル一覧を取得（ファイルレコードのみ）
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.query(
            IndexName='CustomerIdIndex',
            KeyConditionExpression='customerId = :customerId',
            FilterExpression='begins_with(SK, :file_prefix)',
            ExpressionAttributeValues={
                ':customerId': customer_id,
                ':file_prefix': 'FILE#'
            }
        )
        
        files = []
        for item in response.get('Items', []):
            # Decimal型を変換
            converted_item = convert_decimals(item)
            files.append({
                'fileId': converted_item.get('fileId'),
                'fileName': converted_item.get('fileName'),
                'fileType': converted_item.get('fileType'),
                'fileSize': converted_item.get('fileSize'),
                'uploadedAt': converted_item.get('uploadedAt'),
                'summary': converted_item.get('summary', '')[:100] + '...' if converted_item.get('summary') and len(converted_item.get('summary', '')) > 100 else converted_item.get('summary', '')
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'files': files
            })
        }
        
    except Exception as e:
        print(f"Error in handle_file_list: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'Failed to get file list: {str(e)}'})
        }

def handle_file_detail(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイル詳細取得"""
    try:
        # パスパラメータの解析
        path_params = event.get('pathParameters', {}) or {}
        file_id = path_params.get('fileId')
        
        if not file_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'fileId is required'})
            }
        
        # DynamoDBからファイル詳細を取得
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.scan(
            FilterExpression='fileId = :fileId',
            ExpressionAttributeValues={
                ':fileId': file_id
            }
        )
        
        if not response.get('Items'):
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'File not found'})
            }
        
        file_item = response['Items'][0]
        
        # Decimal型を変換
        converted_item = convert_decimals(file_item)
        
        # S3からファイルのダウンロードURLを生成
        s3_key = converted_item.get('s3Key')
        download_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=3600  # 1時間有効
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'file': {
                    'fileId': converted_item.get('fileId'),
                    'fileName': converted_item.get('fileName'),
                    'fileType': converted_item.get('fileType'),
                    'fileSize': converted_item.get('fileSize'),
                    'uploadedAt': converted_item.get('uploadedAt'),
                    'summary': converted_item.get('summary'),
                    'downloadUrl': download_url,
                    'url': converted_item.get('url'),
                    'originalTitle': converted_item.get('originalTitle')
                }
            })
        }
        
    except Exception as e:
        print(f"Error in handle_file_detail: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'Failed to get file detail: {str(e)}'})
        }

def handle_file_delete(event: Dict[str, Any]) -> Dict[str, Any]:
    """ファイル削除"""
    try:
        # パスパラメータの解析
        path_params = event.get('pathParameters', {}) or {}
        file_id = path_params.get('fileId')
        
        if not file_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'fileId is required'})
            }
        
        # DynamoDBからファイル情報を取得
        table = dynamodb.Table(CUSTOMER_FILES_TABLE)
        response = table.scan(
            FilterExpression='fileId = :fileId',
            ExpressionAttributeValues={
                ':fileId': file_id
            }
        )
        
        if not response.get('Items'):
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': json.dumps({'error': 'File not found'})
            }
        
        file_item = response['Items'][0]
        s3_key = file_item.get('s3Key')
        
        # S3からファイルを削除（s3Keyが存在する場合のみ）
        if s3_key:
            try:
                s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
            except Exception as s3_error:
                print(f"Warning: Failed to delete S3 object {s3_key}: {s3_error}")
                # S3の削除に失敗してもDynamoDBの削除は続行
        
        # DynamoDBからファイル情報を削除
        table.delete_item(
            Key={
                'PK': file_item.get('PK'),
                'SK': file_item.get('SK')
            }
        )
        
        # 関連する質問レコードも削除
        customer_id = file_item.get('customerId')
        if customer_id:
            # 該当ファイルの質問レコードを検索
            questions_response = table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :question_prefix)',
                FilterExpression='fileId = :fileId',
                ExpressionAttributeValues={
                    ':pk': f'CUSTOMER#{customer_id}',
                    ':question_prefix': 'QUESTION#',
                    ':fileId': file_id
                }
            )
            
            # 質問レコードを削除
            for question_item in questions_response.get('Items', []):
                table.delete_item(
                    Key={
                        'PK': question_item.get('PK'),
                        'SK': question_item.get('SK')
                    }
                )
                print(f"Deleted question: {question_item.get('questionId')}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'message': 'ファイルが正常に削除されました'
            })
        }
        
    except Exception as e:
        print(f"Error in handle_file_delete: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': f'Failed to delete file: {str(e)}'})
        }
