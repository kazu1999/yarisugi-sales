"""
DynamoDB操作の共通ライブラリ
"""

import boto3
import json
import os
from typing import Dict, List, Any, Optional
from botocore.exceptions import ClientError

class DynamoDBClient:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.client = boto3.client('dynamodb')
        
    def get_table(self, table_name: str):
        """テーブルを取得"""
        return self.dynamodb.Table(table_name)
    
    def put_item(self, table_name: str, item: Dict[str, Any]) -> Dict[str, Any]:
        """アイテムを追加・更新"""
        try:
            table = self.get_table(table_name)
            response = table.put_item(Item=item)
            return {
                'success': True,
                'data': response
            }
        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_item(self, table_name: str, key: Dict[str, Any]) -> Dict[str, Any]:
        """アイテムを取得"""
        try:
            table = self.get_table(table_name)
            response = table.get_item(Key=key)
            
            if 'Item' in response:
                return {
                    'success': True,
                    'data': response['Item']
                }
            else:
                return {
                    'success': False,
                    'error': 'Item not found'
                }
        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def query(self, table_name: str, key_condition_expression: str, 
              expression_attribute_values: Dict[str, Any]) -> Dict[str, Any]:
        """クエリ実行"""
        try:
            table = self.get_table(table_name)
            response = table.query(
                KeyConditionExpression=key_condition_expression,
                ExpressionAttributeValues=expression_attribute_values
            )
            return {
                'success': True,
                'data': response.get('Items', [])
            }
        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def scan(self, table_name: str, filter_expression: Optional[str] = None,
             expression_attribute_values: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """スキャン実行"""
        try:
            table = self.get_table(table_name)
            scan_kwargs = {}
            
            if filter_expression:
                scan_kwargs['FilterExpression'] = filter_expression
            if expression_attribute_values:
                scan_kwargs['ExpressionAttributeValues'] = expression_attribute_values
            
            response = table.scan(**scan_kwargs)
            return {
                'success': True,
                'data': response.get('Items', [])
            }
        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_item(self, table_name: str, key: Dict[str, Any]) -> Dict[str, Any]:
        """アイテムを削除"""
        try:
            table = self.get_table(table_name)
            response = table.delete_item(Key=key)
            return {
                'success': True,
                'data': response
            }
        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_item(self, table_name: str, key: Dict[str, Any], 
                   update_expression: str, expression_attribute_values: Dict[str, Any]) -> Dict[str, Any]:
        """アイテムを更新"""
        try:
            table = self.get_table(table_name)
            response = table.update_item(
                Key=key,
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues="ALL_NEW"
            )
            return {
                'success': True,
                'data': response.get('Attributes', {})
            }
        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }

# シングルトンインスタンス
dynamodb_client = DynamoDBClient() 