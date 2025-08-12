#!/bin/bash

# AWSリソースデプロイスクリプト

set -e

# 設定
PROJECT_NAME="yarisugi-sales"
ENVIRONMENT="dev"
AWS_REGION="ap-northeast-1"

echo "🚀 AWSリソースのデプロイを開始します..."

# Terraformディレクトリに移動
cd terraform

# Terraform初期化
echo "📦 Terraform初期化中..."
terraform init

# Terraformプラン実行
echo "📋 Terraformプラン実行中..."
terraform plan \
  -var="project_name=${PROJECT_NAME}" \
  -var="environment=${ENVIRONMENT}" \
  -var="aws_region=${AWS_REGION}"

# 確認
read -p "デプロイを続行しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ デプロイをキャンセルしました"
    exit 1
fi

# Terraform適用
echo "🔨 Terraform適用中..."
terraform apply \
  -var="project_name=${PROJECT_NAME}" \
  -var="environment=${ENVIRONMENT}" \
  -var="aws_region=${AWS_REGION}" \
  -auto-approve

# 出力値を取得
echo "📤 出力値を取得中..."
COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id)
API_GATEWAY_ENDPOINT=$(terraform output -raw api_gateway_endpoint)

echo "✅ デプロイ完了！"
echo ""
echo "📋 設定値:"
echo "Cognito User Pool ID: ${COGNITO_USER_POOL_ID}"
echo "Cognito Client ID: ${COGNITO_CLIENT_ID}"
echo "API Gateway Endpoint: ${API_GATEWAY_ENDPOINT}"
echo ""
echo "🔧 フロントエンドの環境変数を更新してください:"
echo "VITE_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}"
echo "VITE_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}"
echo "VITE_API_GATEWAY_ENDPOINT=${API_GATEWAY_ENDPOINT}"
echo "VITE_AWS_REGION=${AWS_REGION}" 