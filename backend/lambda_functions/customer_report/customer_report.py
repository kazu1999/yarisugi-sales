import json
import boto3
import os
import requests
from datetime import datetime
from botocore.exceptions import ClientError
from bs4 import BeautifulSoup
import re
import time

# OpenAI設定
secrets_client = boto3.client('secretsmanager')

def extract_response_content(response):
    """
    Responses APIの応答からコンテンツを抽出
    
    Args:
        response (Dict[str, Any]): API応答
    
    Returns:
        str: 抽出されたコンテンツ
    """
    print(f"🔍 Extracting content from response structure: {list(response.keys())}")
    
    # Responses APIの実際の構造に基づいて抽出
    if 'output' in response and isinstance(response['output'], list):
        print(f"📋 Found output array with {len(response['output'])} items")
        # output配列内のすべてのアイテムをチェック
        for i, output_item in enumerate(response['output']):
            print(f"📝 Output item {i}: {output_item}")
            # messageタイプのアイテムを探す
            if output_item.get('type') == 'message' and 'content' in output_item:
                if isinstance(output_item['content'], list) and len(output_item['content']) > 0:
                    content_item = output_item['content'][0]
                    print(f"📄 Content item: {content_item}")
                    
                    if 'text' in content_item:
                        print(f"✅ Found text content: {content_item['text'][:100]}...")
                        return content_item['text']
    
    # フォールバック: 従来のChat Completions API形式
    if 'choices' in response and len(response['choices']) > 0:
        print("🔄 Trying Chat Completions API format")
        choice = response['choices'][0]
        # 形式1: message.content
        if 'message' in choice and 'content' in choice['message']:
            print("✅ Found message.content format")
            return choice['message']['content']
        # 形式2: 直接content
        elif 'content' in choice:
            print("✅ Found direct content format")
            return choice['content']
        # 形式3: text
        elif 'text' in choice:
            print("✅ Found text format")
            return choice['text']
    
    # その他の形式
    if 'content' in response:
        print("✅ Found top-level content")
        return response['content']
    
    if 'text' in response:
        print("✅ Found top-level text")
        return response['text']
    
    if 'output' in response:
        print("✅ Found top-level output")
        return str(response['output'])
    
    print("❌ No content found in response")
    return ''

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
    """ChatGPT Responses APIとWeb検索を使用して顧客レポートを生成"""
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
        
        # Responses APIを使用してレポート生成
        data = {
            'model': 'gpt-4o-mini',
            'input': f"""あなたは営業コンサルタントです。顧客情報、Webサイトの内容、自社情報を総合的に分析して、以下の6つのセクションでレポートを作成してください。

Web検索ツールを使用して、顧客会社の最新情報、業界動向、競合状況などの最新情報を取得し、それらを踏まえた包括的なレポートを作成してください。

1. 顧客についてのまとめ（200-300文字）
   - 顧客の特徴、業界での位置づけ、潜在的なニーズを分析
   - Webサイトの内容とWeb検索で取得した最新情報から読み取れる事業内容や特徴も含める
   - 最新のニュースや業界動向も考慮する

2. SWOT分析
   - **強み（Strengths）**: 顧客企業の優位性、競争力、リソース
   - **弱み（Weaknesses）**: 改善が必要な領域、リスク要因
   - **機会（Opportunities）**: 市場機会、成長可能性、外部要因
   - **脅威（Threats）**: 競合、市場変化、外部リスク
   - 各項目について具体的で実用的な分析を提供

3. ペルソナ分析
   - **意思決定者の特徴**: 年齢層、役職、関心事項、意思決定スタイル
   - **影響力のある人物**: 技術責任者、経営陣、現場担当者などの特徴
   - **コミュニケーション傾向**: 好む連絡方法、会議スタイル、情報の受け取り方
   - **価値観と優先順位**: コスト重視、品質重視、革新性重視など
   - 各項目について具体的で実用的な分析を提供

4. 予算感の推定
   - **予算規模の推定**: 会社規模、業界、過去の投資実績から推定される予算範囲
   - **投資優先度**: どの分野に投資する可能性が高いか
   - **意思決定プロセス**: 予算承認の流れ、承認権限者、期間
   - **価格感度**: コスト重視度、ROI重視度、品質重視度
   - 各項目について具体的で実用的な分析を提供

5. 営業提案（300-400文字）
   - 自社のサービス・提案内容を踏まえて、この顧客に対する具体的な営業提案を作成
   - Webサイトの内容とWeb検索で取得した最新情報から読み取れる顧客の課題やニーズを踏まえた提案
   - 業界動向や競合状況も考慮した差別化された提案

6. 推奨アプローチ（200-300文字）
   - 効果的な営業アプローチの方法、タイミング、注意点を提案
   - Webサイトの内容とWeb検索で取得した最新情報から読み取れる顧客の特徴を考慮したアプローチ
   - 最新の業界動向や競合状況を踏まえた戦略的アプローチ

回答は日本語で、実用的で具体的な内容にしてください。Web検索で取得した最新情報を積極的に活用してください。

以下の情報を基にレポートを作成してください：

{customer_info}

{website_content}

{company_info}

{proposals_info}

上記の情報を総合的に分析し、Web検索で最新情報を取得して、顧客のまとめ、SWOT分析、ペルソナ分析、予算感の推定、営業提案、推奨アプローチを6つのセクションで回答してください。""",
            'tools': [
                {"type": "web_search"}
            ],
            'tool_choice': 'auto',
            'temperature': 0.7
        }
        
        response = requests.post(
            'https://api.openai.com/v1/responses',
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"🔍 Raw API response: {result}")
            content = extract_response_content(result)
            print(f"📝 Extracted content: {content}")
            
            # レスポンスを3つのセクションに分割
            print(f"📋 Full content length: {len(content)}")
            
            customer_summary = ""
            swot_analysis = ""
            persona_analysis = ""
            budget_estimation = ""
            sales_proposal = ""
            recommended_approach = ""
            
            # セクションを正規表現で抽出
            import re
            
            # 1. 顧客についてのまとめ
            summary_match = re.search(r'\*\*1\.\s*顧客についてのまとめ\*\*(.*?)(?=\*\*2\.|$)', content, re.DOTALL)
            if summary_match:
                customer_summary = summary_match.group(1).strip()
                print(f"✅ Found customer summary: {len(customer_summary)} chars")
            
            # 2. SWOT分析
            swot_match = re.search(r'\*\*2\.\s*SWOT分析\*\*(.*?)(?=\*\*3\.|$)', content, re.DOTALL)
            if swot_match:
                swot_analysis = swot_match.group(1).strip()
                print(f"✅ Found SWOT analysis: {len(swot_analysis)} chars")
            
            # 3. ペルソナ分析
            persona_match = re.search(r'\*\*3\.\s*ペルソナ分析\*\*(.*?)(?=\*\*4\.|$)', content, re.DOTALL)
            if persona_match:
                persona_analysis = persona_match.group(1).strip()
                print(f"✅ Found persona analysis: {len(persona_analysis)} chars")
            
            # 4. 予算感の推定
            budget_match = re.search(r'\*\*4\.\s*予算感の推定\*\*(.*?)(?=\*\*5\.|$)', content, re.DOTALL)
            if budget_match:
                budget_estimation = budget_match.group(1).strip()
                print(f"✅ Found budget estimation: {len(budget_estimation)} chars")
            
            # 5. 営業提案
            proposal_match = re.search(r'\*\*5\.\s*営業提案\*\*(.*?)(?=\*\*6\.|$)', content, re.DOTALL)
            if proposal_match:
                sales_proposal = proposal_match.group(1).strip()
                print(f"✅ Found sales proposal: {len(sales_proposal)} chars")
            
            # 6. 推奨アプローチ
            approach_match = re.search(r'\*\*6\.\s*推奨アプローチ\*\*(.*?)(?=以上が|$)', content, re.DOTALL)
            if approach_match:
                recommended_approach = approach_match.group(1).strip()
                print(f"✅ Found recommended approach: {len(recommended_approach)} chars")
            
            return {
                'customerSummary': customer_summary or content,
                'swotAnalysis': swot_analysis or content,
                'personaAnalysis': persona_analysis or content,
                'budgetEstimation': budget_estimation or content,
                'salesProposal': sales_proposal or content,
                'recommendedApproach': recommended_approach or content,
                'generatedAt': datetime.now().isoformat(),
                'modelUsed': data['model'],
                'webSearchEnabled': True
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
