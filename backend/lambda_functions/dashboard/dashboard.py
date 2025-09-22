import json
import boto3
from datetime import datetime, timedelta
from typing import Dict, Any, List
import os

# DynamoDBクライアント
dynamodb = boto3.resource('dynamodb')
customers_table = dynamodb.Table(os.environ.get('CUSTOMERS_TABLE', 'yarisugi-sales-customers-dev'))
files_table = dynamodb.Table(os.environ.get('CUSTOMER_FILES_TABLE', 'yarisugi-sales-customer-files-dev'))
sales_flows_table = dynamodb.Table(os.environ.get('SALES_FLOWS_TABLE', 'yarisugi-sales-sales-flows-dev'))

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    ダッシュボードデータを取得するLambda関数
    """
    try:
        print(f"📊 Dashboard data request: {event}")
        
        # リクエストボディの解析
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)
        
        # リクエストパラメータの取得
        user_id = body.get('user_id')
        time_range = body.get('timeRange', '30days')
        
        print(f"👤 User ID: {user_id}")
        print(f"📅 Time Range: {time_range}")
        
        if not user_id:
            print("❌ user_id is missing")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'user_id is required'
                })
            }
        
        # 期間の計算
        end_date = datetime.now()
        start_date = calculate_start_date(time_range)
        
        print(f"📅 Date range: {start_date} to {end_date}")
        
        # データ取得
        print("🔍 Fetching dashboard data...")
        dashboard_data = get_dashboard_data(user_id, start_date, end_date)
        print(f"✅ Dashboard data retrieved: {dashboard_data}")
        
        response = {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'data': dashboard_data
            })
        }
        
        print(f"📤 Response: {response}")
        return response
        
    except Exception as e:
        print(f"❌ Dashboard error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'error': f'Dashboard data retrieval failed: {str(e)}'
            })
        }

def calculate_start_date(time_range: str) -> datetime:
    """期間に基づいて開始日を計算"""
    now = datetime.now()
    
    if time_range == '7days':
        return now - timedelta(days=7)
    elif time_range == '30days':
        return now - timedelta(days=30)
    elif time_range == '90days':
        return now - timedelta(days=90)
    elif time_range == '1year':
        return now - timedelta(days=365)
    else:
        return now - timedelta(days=30)  # デフォルトは30日

def get_dashboard_data(user_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """ダッシュボードデータを取得"""
    
    # 顧客データの取得
    customers = get_customers_data(user_id, start_date, end_date)
    
    # ファイルデータの取得
    files = get_files_data(user_id, start_date, end_date)
    
    # KPI計算
    kpis = calculate_kpis(customers, files, start_date, end_date)
    
    # トレンド計算
    trends = calculate_trends(kpis, user_id, start_date, end_date)
    
    # チャートデータ生成
    charts = generate_chart_data(customers, files, start_date, end_date)
    
    # 営業フローデータ取得
    sales_flows = get_sales_flows_data(user_id)
    
    return {
        'kpis': kpis,
        'trends': trends,
        'charts': charts,
        'sales_flows': sales_flows
    }

def get_customers_data(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
    """顧客データを取得"""
    try:
        response = customers_table.scan(
            FilterExpression='PK = :pk AND createdAt BETWEEN :start_date AND :end_date',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':start_date': start_date.isoformat(),
                ':end_date': end_date.isoformat()
            }
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"❌ Error getting customers data: {e}")
        return []

def get_files_data(user_id: str, start_date: datetime, end_date: datetime) -> List[Dict]:
    """ファイルデータを取得"""
    try:
        response = files_table.scan(
            FilterExpression='PK = :pk AND createdAt BETWEEN :start_date AND :end_date',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':start_date': start_date.isoformat(),
                ':end_date': end_date.isoformat()
            }
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"❌ Error getting files data: {e}")
        return []

def get_sales_flows_data(user_id: str) -> Dict[str, Any]:
    """営業フローデータを取得"""
    try:
        # 営業フローデータをスキャン
        response = sales_flows_table.scan(
            FilterExpression='userId = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            }
        )
        
        items = response.get('Items', [])
        
        # 顧客ごとに営業フローデータを整理
        customer_flows = {}
        stage_counts = {}
        
        for item in items:
            customer_id = item.get('customerId')
            if not customer_id:
                continue
                
            if customer_id not in customer_flows:
                customer_flows[customer_id] = {
                    'customerId': customer_id,
                    'currentStage': 'lead_generation',
                    'tasks': [],
                    'stageHistory': []
                }
            
            # 現在のステージを取得
            if item.get('SK', '').startswith('STAGE#'):
                customer_flows[customer_id]['currentStage'] = item.get('stage', 'lead_generation')
            
            # タスクを取得
            elif item.get('SK', '').startswith('TASK#'):
                task = {
                    'id': item.get('taskId'),
                    'title': item.get('title'),
                    'description': item.get('description'),
                    'dueDate': item.get('dueDate'),
                    'priority': item.get('priority', 'medium'),
                    'completed': item.get('completed', False),
                    'createdAt': item.get('createdAt')
                }
                customer_flows[customer_id]['tasks'].append(task)
            
            # ステージ履歴を取得
            elif item.get('SK', '').startswith('HISTORY#'):
                history = {
                    'stage': item.get('stage'),
                    'timestamp': item.get('timestamp'),
                    'note': item.get('note', '')
                }
                customer_flows[customer_id]['stageHistory'].append(history)
        
        # ステージ別の顧客数をカウント
        for customer_id, flow_data in customer_flows.items():
            stage = flow_data['currentStage']
            stage_counts[stage] = stage_counts.get(stage, 0) + 1
        
        return {
            'customer_flows': list(customer_flows.values()),
            'stage_distribution': stage_counts,
            'total_customers': len(customer_flows)
        }
        
    except Exception as e:
        print(f"❌ Error getting sales flows data: {e}")
        return {
            'customer_flows': [],
            'stage_distribution': {},
            'total_customers': 0
        }

def calculate_kpis(customers: List[Dict], files: List[Dict], start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """KPIを計算"""
    
    # 新規顧客数
    new_customers = len(customers)
    
    # 営業活動数（ファイルアップロードを活動としてカウント）
    activities = len(files)
    
    # 成約率（簡易計算：ファイルアップロード数 / 顧客数）
    conversion_rate = (activities / new_customers * 100) if new_customers > 0 else 0
    
    # 平均受注金額（仮の値）
    avg_order_value = 500000  # 50万円（仮の値）
    
    return {
        'newCustomers': new_customers,
        'activities': activities,
        'conversionRate': round(conversion_rate, 1),
        'avgOrderValue': avg_order_value
    }

def calculate_trends(current_kpis: Dict[str, Any], user_id: str, start_date: datetime, end_date: datetime) -> Dict[str, float]:
    """前期間との比較でトレンドを計算"""
    
    # 前期間のデータを取得
    period_days = (end_date - start_date).days
    prev_start_date = start_date - timedelta(days=period_days)
    prev_end_date = start_date
    
    prev_customers = get_customers_data(user_id, prev_start_date, prev_end_date)
    prev_files = get_files_data(user_id, prev_start_date, prev_end_date)
    prev_kpis = calculate_kpis(prev_customers, prev_files, prev_start_date, prev_end_date)
    
    # トレンド計算
    trends = {}
    for key in current_kpis:
        if key in prev_kpis and prev_kpis[key] > 0:
            trends[key] = round(((current_kpis[key] - prev_kpis[key]) / prev_kpis[key]) * 100, 1)
        else:
            trends[key] = 0
    
    return trends

def generate_chart_data(customers: List[Dict], files: List[Dict], start_date: datetime, end_date: datetime) -> Dict[str, List]:
    """チャート用のデータを生成"""
    
    # 売上推移データ（仮のデータ）
    sales_data = generate_sales_chart_data(start_date, end_date)
    
    # 顧客ステータスデータ
    customer_data = generate_customer_status_data(customers)
    
    # 営業活動データ
    activity_data = generate_activity_data(files, start_date, end_date)
    
    return {
        'salesData': sales_data,
        'customerData': customer_data,
        'activityData': activity_data
    }

def generate_sales_chart_data(start_date: datetime, end_date: datetime) -> List[Dict]:
    """売上推移チャートデータを生成（仮のデータ）"""
    data = []
    current_date = start_date
    
    while current_date <= end_date:
        # 仮の売上データ（ランダム）
        import random
        sales_amount = random.randint(100000, 1000000)
        
        data.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'amount': sales_amount
        })
        
        current_date += timedelta(days=1)
    
    return data

def generate_customer_status_data(customers: List[Dict]) -> List[Dict]:
    """顧客ステータスデータを生成"""
    status_counts = {
        '新規': 0,
        '既存': 0,
        '休眠': 0,
        '失注': 0
    }
    
    # 顧客のステータスを分析（簡易版）
    for customer in customers:
        # 仮のロジック：作成日から判断
        created_at = datetime.fromisoformat(customer.get('createdAt', ''))
        days_old = (datetime.now() - created_at).days
        
        if days_old < 30:
            status_counts['新規'] += 1
        elif days_old < 90:
            status_counts['既存'] += 1
        elif days_old < 180:
            status_counts['休眠'] += 1
        else:
            status_counts['失注'] += 1
    
    return [
        {'status': status, 'count': count}
        for status, count in status_counts.items()
        if count > 0
    ]

def generate_activity_data(files: List[Dict], start_date: datetime, end_date: datetime) -> List[Dict]:
    """営業活動データを生成"""
    activity_counts = {}
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        activity_counts[date_str] = 0
        current_date += timedelta(days=1)
    
    # ファイルアップロード日をカウント
    for file_item in files:
        created_at = datetime.fromisoformat(file_item.get('createdAt', ''))
        date_str = created_at.strftime('%Y-%m-%d')
        if date_str in activity_counts:
            activity_counts[date_str] += 1
    
    return [
        {'date': date, 'count': count}
        for date, count in activity_counts.items()
    ]
