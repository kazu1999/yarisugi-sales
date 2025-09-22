import json
import boto3
from datetime import datetime
from typing import Dict, Any, List
import os

# DynamoDBクライアント
dynamodb = boto3.resource('dynamodb')
sales_flows_table = dynamodb.Table(os.environ.get('SALES_FLOWS_TABLE', 'yarisugi-sales-sales-flows-dev'))

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    営業フロー統計データを取得するLambda関数
    """
    try:
        print(f"📊 Sales flow stats request: {event}")
        
        # リクエストボディの解析
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)
        
        # リクエストパラメータの取得
        user_id = body.get('user_id')
        
        print(f"👤 User ID: {user_id}")
        
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
        
        # 営業フロー統計データを取得
        print("🔍 Fetching sales flow statistics...")
        stats_data = get_sales_flow_statistics(user_id)
        print(f"✅ Sales flow statistics retrieved: {stats_data}")
        
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
                'data': stats_data
            })
        }
        
        print(f"📤 Response: {response}")
        return response
        
    except Exception as e:
        print(f"❌ Sales flow stats error: {str(e)}")
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
                'error': f'Sales flow statistics retrieval failed: {str(e)}'
            })
        }

def get_sales_flow_statistics(user_id: str) -> Dict[str, Any]:
    """営業フロー統計データを取得"""
    try:
        # 1. 顧客一覧から総顧客数を取得
        customers_table_name = os.environ.get('CUSTOMERS_TABLE', 'yarisugi-sales-customers-dev')
        print(f"🔍 Using customers table: {customers_table_name}")
        print(f"👤 Querying for user_id: {user_id}")
        
        customers_table = dynamodb.Table(customers_table_name)
        customers_response = customers_table.query(
            IndexName='UserIdIndex',
            KeyConditionExpression='userId = :user_id',
            ExpressionAttributeValues={
                ':user_id': user_id
            }
        )
        all_customers = customers_response.get('Items', [])
        total_customers = len(all_customers)
        print(f"📊 Total customers from customers table: {total_customers}")
        print(f"📋 Customer items: {all_customers}")
        
        # 2. 営業フローデータを取得（顧客ごとに個別にクエリ）
        customer_stages = {}
        
        # 各顧客の営業フローデータを取得
        for customer in all_customers:
            customer_id = customer.get('id')
            if not customer_id:
                continue
                
            # 顧客の営業フローデータを取得
            try:
                response = sales_flows_table.query(
                    KeyConditionExpression='PK = :pk',
                    ExpressionAttributeValues={
                        ':pk': f'CUSTOMER#{customer_id}'
                    }
                )
                
                items = response.get('Items', [])
                print(f"📋 Customer {customer_id} has {len(items)} sales flow items")
                print(f"📋 Sales flow items for customer {customer_id}: {items}")
                
                # 現在のステージを取得
                current_stage = 'lead_generation'  # デフォルト
                if len(items) == 0:
                    print(f"🆕 New customer {customer_id} - no sales flow data, defaulting to lead_generation")
                else:
                    for item in items:
                        print(f"📋 Processing item: {item}")
                        if item.get('SK', '').startswith('STAGE#'):
                            current_stage = item.get('stage', 'lead_generation')
                            print(f"📊 Found stage data: {current_stage}")
                            break
                
                customer_stages[customer_id] = current_stage
                print(f"📊 Customer {customer_id} is in stage: {current_stage}")
                
            except Exception as e:
                print(f"❌ Error getting sales flow for customer {customer_id}: {e}")
                customer_stages[customer_id] = 'lead_generation'
        
        # ステージ別の顧客数をカウント
        stage_counts = {
            'lead_generation': 0,
            'qualification': 0,
            'initial_contact': 0,
            'approach': 0,
            'needs_analysis': 0,
            'proposal': 0,
            'closing': 0,
            'order_contract': 0,
            'follow_up': 0
        }
        
        print(f"📊 Customer stages: {customer_stages}")
        
        # ステージ別の顧客数をカウント
        for customer_id, stage in customer_stages.items():
            print(f"📊 Counting customer {customer_id} in stage {stage}")
            if stage in stage_counts:
                stage_counts[stage] += 1
                print(f"📊 Stage {stage} count is now: {stage_counts[stage]}")
            else:
                print(f"❌ Unknown stage: {stage}")
        
        print(f"📊 Final stage counts: {stage_counts}")
        
        # ステージ定義（フロントエンドと一致）
        stage_definitions = [
            {
                'id': 'lead_generation',
                'name': 'リード獲得',
                'description': '新しいリードを獲得する段階',
                'color': 'bg-blue-100 text-blue-800',
                'icon': '🎯'
            },
            {
                'id': 'qualification',
                'name': 'リード選別',
                'description': 'リードの質を評価し選別する段階',
                'color': 'bg-purple-100 text-purple-800',
                'icon': '🔍'
            },
            {
                'id': 'initial_contact',
                'name': '初回コンタクト',
                'description': '初回コンタクトを取る段階',
                'color': 'bg-green-100 text-green-800',
                'icon': '📞'
            },
            {
                'id': 'approach',
                'name': 'アプローチ',
                'description': '顧客へのアプローチ段階',
                'color': 'bg-indigo-100 text-indigo-800',
                'icon': '🤝'
            },
            {
                'id': 'needs_analysis',
                'name': 'ニーズヒアリング',
                'description': '顧客のニーズを深く理解する段階',
                'color': 'bg-yellow-100 text-yellow-800',
                'icon': '💬'
            },
            {
                'id': 'proposal',
                'name': '提案・プレゼン',
                'description': '具体的な提案を行う段階',
                'color': 'bg-orange-100 text-orange-800',
                'icon': '📋'
            },
            {
                'id': 'closing',
                'name': 'クロージング',
                'description': '契約に向けて交渉する段階',
                'color': 'bg-red-100 text-red-800',
                'icon': '🤝'
            },
            {
                'id': 'order_contract',
                'name': '受注・契約',
                'description': '契約を締結する段階',
                'color': 'bg-emerald-100 text-emerald-800',
                'icon': '📄'
            },
            {
                'id': 'follow_up',
                'name': 'アフターフォロー',
                'description': '契約後のフォローアップ段階',
                'color': 'bg-gray-100 text-gray-800',
                'icon': '✅'
            }
        ]
        
        # ステージ別の詳細データを作成
        stage_details = []
        # total_customersは既に顧客テーブルから取得済み
        
        print(f"📊 Stage counts: {stage_counts}")
        print(f"📊 Total customers: {total_customers}")
        
        for stage_def in stage_definitions:
            stage_id = stage_def['id']
            count = stage_counts[stage_id]
            percentage = (count / total_customers * 100) if total_customers > 0 else 0
            
            print(f"📊 Stage {stage_id}: count={count}, percentage={percentage}")
            
            stage_details.append({
                **stage_def,
                'count': count,
                'percentage': round(percentage, 1)
            })
        
        print(f"📊 Final stage_details: {len(stage_details)} items")
        
        # 4. 顧客別営業フロー一覧を作成
        customer_flows = []
        for customer in all_customers:
            customer_id = customer.get('id')
            customer_name = customer.get('customerName', 'Unknown')
            company_name = customer.get('companyName', 'Unknown')
            current_stage = customer_stages.get(customer_id, 'lead_generation')
            
            # ステージ定義から詳細を取得
            stage_info = next((s for s in stage_definitions if s['id'] == current_stage), None)
            if stage_info:
                customer_flows.append({
                    'customerId': customer_id,
                    'customerName': customer_name,
                    'companyName': company_name,
                    'currentStage': current_stage,
                    'stageName': stage_info['name'],
                    'stageIcon': stage_info['icon'],
                    'stageColor': stage_info['color']
                })
        
        return {
            'stage_details': stage_details,
            'total_customers': total_customers,
            'stage_counts': stage_counts,
            'customer_flows': customer_flows,
            'last_updated': datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error getting sales flow statistics: {e}")
        return {
            'stage_details': [],
            'total_customers': 0,
            'stage_counts': {},
            'last_updated': datetime.now().isoformat()
        }
