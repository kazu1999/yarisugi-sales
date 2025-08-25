import json
import boto3
import os
import requests
from datetime import datetime
from botocore.exceptions import ClientError
from bs4 import BeautifulSoup
import re

# OpenAI設定
secrets_client = boto3.client('secretsmanager')

def get_openai_api_key():
    """OpenAI APIキーを取得"""
    try:
        # まず環境変数から取得を試行
        api_key = os.environ.get('OPENAI_API_KEY')
        if api_key:
            return api_key
        
        # Secrets Managerから取得を試行
        secret_arn = os.environ.get('OPENAI_API_SECRET_ARN')
        if secret_arn:
            response = secrets_client.get_secret_value(SecretId=secret_arn)
            secret_dict = json.loads(response['SecretString'])
            return secret_dict['openai_api_key']
        
        raise ValueError("OpenAI API key not configured")
    except Exception as e:
        print(f"Failed to get OpenAI API key: {str(e)}")
        raise

def fetch_website_content(site_url):
    """Webサイトの内容を取得して分析用のテキストを抽出"""
    try:
        if not site_url or site_url == 'N/A' or site_url.strip() == '':
            return "Webサイト情報: サイトURLが提供されていません"
        
        # URLの正規化
        if not site_url.startswith(('http://', 'https://')):
            site_url = 'https://' + site_url
        
        print(f"🌐 Fetching website content from: {site_url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(site_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # HTMLをパース
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 不要な要素を削除
        for element in soup(['script', 'style', 'nav', 'footer', 'header']):
            element.decompose()
        
        # テキストを抽出
        text = soup.get_text()
        
        # テキストのクリーニング
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # 長すぎる場合は最初の2000文字に制限
        if len(text) > 2000:
            text = text[:2000] + "..."
        
        print(f"✅ Website content extracted successfully (length: {len(text)})")
        
        return f"Webサイト情報:\n{text}"
        
    except Exception as e:
        print(f"❌ Failed to fetch website content: {str(e)}")
        return f"Webサイト情報: サイトの取得に失敗しました ({str(e)})"

def generate_customer_report(customer_data, company_profile):
    """ChatGPTを使用して顧客レポートを生成"""
    try:
        api_key = get_openai_api_key()
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        # 顧客データの整形
        customer_info = f"""
顧客情報:
- 会社名: {customer_data.get('companyName', 'N/A')}
- 担当者名: {customer_data.get('customerName', 'N/A')}
- 業種: {customer_data.get('industry', 'N/A')}
- 所在地: {customer_data.get('location', 'N/A')}
- ステータス: {customer_data.get('status', 'N/A')}
- メールアドレス: {customer_data.get('email', 'N/A')}
- LINE ID: {customer_data.get('lineId', 'N/A')}
- SNS運用状況: {customer_data.get('snsStatus', 'N/A')}
- 担当営業: {customer_data.get('salesPerson', 'N/A')}
- サイトURL: {customer_data.get('siteUrl', 'N/A')}
        """
        
        # Webサイトの内容を取得
        website_content = fetch_website_content(customer_data.get('siteUrl', ''))
        
        # 自社情報の整形
        company_info = f"""
自社情報:
- 会社名: {company_profile.get('companyName', 'N/A')}
- 紹介文: {company_profile.get('introduction', 'N/A')}
- サービス内容: {company_profile.get('services', 'N/A')}
- 実績: {company_profile.get('achievements', 'N/A')}
        """
        
        # 提案内容の取得
        proposals = company_profile.get('proposals', [])
        proposals_info = "提案内容:\n"
        for i, proposal in enumerate(proposals, 1):
            proposals_info += f"""
{i}. {proposal.get('title', 'N/A')}
   目的: {proposal.get('purpose', 'N/A')}
   内容: {proposal.get('content', 'N/A')}
   予算: {proposal.get('estimatedCost', 'N/A')}
            """
        
        data = {
            'model': 'gpt-4o-mini',
            'messages': [
                {
                    'role': 'system',
                    'content': """あなたは営業コンサルタントです。顧客情報、Webサイトの内容、自社情報を分析して、以下の3つのセクションでレポートを作成してください：

1. 顧客についてのまとめ（200-300文字）
   - 顧客の特徴、業界での位置づけ、潜在的なニーズを分析
   - Webサイトの内容から読み取れる事業内容や特徴も含める

2. 営業提案（300-400文字）
   - 自社のサービス・提案内容を踏まえて、この顧客に対する具体的な営業提案を作成
   - Webサイトから読み取れる顧客の課題やニーズを踏まえた提案

3. 推奨アプローチ（200-300文字）
   - 効果的な営業アプローチの方法、タイミング、注意点を提案
   - Webサイトの内容から読み取れる顧客の特徴を考慮したアプローチ

回答は日本語で、実用的で具体的な内容にしてください。"""
                },
                {
                    'role': 'user',
                    'content': f"""以下の情報を基にレポートを作成してください：

{customer_info}

{website_content}

{company_info}

{proposals_info}

上記の情報を分析して、顧客のまとめ、営業提案、推奨アプローチを3つのセクションで回答してください。"""
                }
            ],
            'max_tokens': 1500,
            'temperature': 0.7
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # レスポンスを3つのセクションに分割
            sections = content.split('\n\n')
            
            customer_summary = ""
            sales_proposal = ""
            recommended_approach = ""
            
            for section in sections:
                if '顧客についてのまとめ' in section or 'まとめ' in section:
                    customer_summary = section.replace('顧客についてのまとめ:', '').replace('まとめ:', '').strip()
                elif '営業提案' in section:
                    sales_proposal = section.replace('営業提案:', '').strip()
                elif '推奨アプローチ' in section or 'アプローチ' in section:
                    recommended_approach = section.replace('推奨アプローチ:', '').replace('アプローチ:', '').strip()
            
            return {
                'customerSummary': customer_summary or content,
                'salesProposal': sales_proposal or content,
                'recommendedApproach': recommended_approach or content,
                'generatedAt': datetime.now().isoformat(),
                'modelUsed': data['model']
            }
        else:
            print(f"OpenAI API error: {response.status_code}")
            raise Exception(f"OpenAI API error: {response.status_code}")
        
    except Exception as e:
        print(f"Error generating customer report: {str(e)}")
        raise e

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
        'body': json.dumps(body, ensure_ascii=False)
    }

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    print(f"🚀 Customer Report Generation - Event received")
    
    try:
        http_method = event['httpMethod']
        
        # OPTIONSリクエスト（CORS preflight）
        if http_method == 'OPTIONS':
            return create_response(200, {'message': 'CORS preflight response'})
        
        if http_method == 'POST':
            # リクエストボディを解析
            body = json.loads(event.get('body', '{}'))
            customer_data = body.get('customerData', {})
            company_profile = body.get('companyProfile', {})
            
            if not customer_data:
                return create_response(400, {'error': 'Customer data is required'})
            
            print(f"🔍 Generating report for customer: {customer_data.get('companyName', 'Unknown')}")
            
            # レポート生成
            report = generate_customer_report(customer_data, company_profile)
            
            print(f"✅ Report generated successfully")
            
            return create_response(200, report)
        
        else:
            return create_response(405, {'error': 'Method not allowed'})
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return create_response(500, {'error': str(e)})
