import json
import boto3
import os
import math
from datetime import datetime
from botocore.exceptions import ClientError

# DynamoDB設定
dynamodb = boto3.resource('dynamodb')
knowledge_table = dynamodb.Table(os.environ.get('KNOWLEDGE_TABLE', 'yarisugi-sales-knowledge-dev'))
vectors_table = dynamodb.Table(os.environ.get('KNOWLEDGE_VECTORS_TABLE', 'yarisugi-sales-knowledge-vectors-dev'))

def cosine_similarity(vec1, vec2):
    """コサイン類似度を計算"""
    dot_product = sum(v1 * v2 for v1, v2 in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(v1**2 for v1 in vec1))
    magnitude2 = math.sqrt(sum(v2**2 for v2 in vec2))
    if not magnitude1 or not magnitude2:
        return 0.0
    return dot_product / (magnitude1 * magnitude2)

def generate_query_embedding(query):
    """ダミーのクエリ埋め込みを生成"""
    # 実際のOpenAI APIの代わりにダミー埋め込みを返す
    return [0.1] * 1536

def search_similar_chunks(user_id, query_embedding, top_k=5):
    """類似するチャンクを検索"""
    try:
        print(f"Searching for similar chunks for user: {user_id}")

        # ユーザーのベクトルエントリを取得
        response = vectors_table.scan(
            FilterExpression='userId = :uid',
            ExpressionAttributeValues={':uid': user_id}
        )

        vector_items = response.get('Items', [])
        print(f"Found {len(vector_items)} vector chunks")

        if not vector_items:
            return []

        # 類似度を計算
        similarities = []
        for item in vector_items:
            chunk_embedding_str = item.get('embedding')
            if chunk_embedding_str:
                try:
                    chunk_embedding = json.loads(chunk_embedding_str)
                    similarity = cosine_similarity(query_embedding, chunk_embedding)
                    similarities.append({
                        'knowledgeId': item.get('knowledgeId'),
                        'chunkIndex': item.get('chunkIndex'),
                        'chunk': item.get('chunk'),
                        'similarity': similarity
                    })
                except json.JSONDecodeError as e:
                    print(f"Error decoding embedding string: {e}")
                    continue

        # 類似度でソートして上位top_k件を返す
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        top_chunks = similarities[:top_k]

        print(f"Top {len(top_chunks)} similar chunks found")
        return top_chunks

    except Exception as e:
        print(f"Error searching similar chunks: {e}")
        return []

def convert_decimals(obj):
    """Decimal型をfloatに変換する再帰関数"""
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif hasattr(obj, '__class__') and obj.__class__.__name__ == 'Decimal':
        return float(obj)
    else:
        return obj

def get_knowledge_info(knowledge_ids):
    """ナレッジIDからナレッジ情報を取得"""
    knowledge_info = {}
    unique_ids = list(set(knowledge_ids))

    for knowledge_id in unique_ids:
        try:
            response = knowledge_table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues={
                    ':pk': f'USER#test-user-123',
                    ':sk_prefix': f'KNOWLEDGE#{knowledge_id}'
                }
            )
            items = response.get('Items', [])
            if items:
                item = convert_decimals(items[0])
                knowledge_info[knowledge_id] = {
                    'title': item.get('title', 'Unknown'),
                    'category': item.get('category', 'general'),
                    'createdAt': item.get('createdAt', '')
                }
        except Exception as e:
            print(f"Error getting knowledge info for {knowledge_id}: {e}")
            knowledge_info[knowledge_id] = {
                'title': 'Unknown',
                'category': 'general',
                'createdAt': ''
            }

    return knowledge_info

def generate_rag_response(query, similar_chunks):
    """ダミーのRAG回答を生成"""
    if not similar_chunks:
        return "関連するナレッジが見つかりませんでした。"
    
    # 実際のOpenAI APIの代わりにダミー回答を返す
    return f"【ダミーRAG回答】\n質問: {query}\n\n関連するナレッジから以下の情報が見つかりました:\n" + \
           "\n".join([f"- {chunk['chunk'][:100]}..." for chunk in similar_chunks[:3]])

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    print(f"Event: {json.dumps(event)}")

    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }

    try:
        http_method = event['httpMethod']

        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight response'})
            }

        user_id = 'test-user-123'
        print(f"Using test user_id: {user_id}")

        if http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            query = body.get('query')
            top_k = body.get('top_k', 5)

            if not query:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Query is required'})
                }

            # 1. クエリの埋め込みを生成
            query_embedding = generate_query_embedding(query)

            # 2. 類似するチャンクを検索
            similar_chunks = search_similar_chunks(user_id, query_embedding, top_k)

            # 3. 関連ナレッジの情報を取得
            referenced_knowledge_ids = [chunk['knowledgeId'] for chunk in similar_chunks]
            referenced_knowledge_info = get_knowledge_info(referenced_knowledge_ids)

            # 4. RAG回答を生成
            rag_answer = generate_rag_response(query, similar_chunks)

            # 応答を構築
            result = {
                'answer': rag_answer,
                'referencedKnowledge': [
                    {
                        'knowledgeId': k_id,
                        'title': info.get('title', 'Unknown'),
                        'category': info.get('category', 'general'),
                        'createdAt': info.get('createdAt', '')
                    }
                    for k_id, info in referenced_knowledge_info.items()
                ],
                'similarityScores': [chunk['similarity'] for chunk in similar_chunks]
            }

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(result, ensure_ascii=False)
            }

        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': 'Method not allowed'})
            }

    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
