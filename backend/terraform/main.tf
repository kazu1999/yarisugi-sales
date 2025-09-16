# Terraform設定ファイル
# AWSリソースの管理

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# DynamoDBテーブル

# ローカル変数
locals {
  faqs_integration_uri = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.faqs_api.arn}/invocations"
  ai_generator_integration_uri = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.ai_generator.arn}/invocations"
  s3_presigned_url_integration_uri = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.s3_presigned_url.arn}/invocations"
  faq_chat_integration_uri = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.faq_chat.arn}/invocations"
}

# S3バケット（ファイルアップロード用）
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-uploads-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# S3バケットのCORS設定
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# S3バケットのバージョニング設定
resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3署名付きURL Lambda関数
resource "aws_lambda_function" "s3_presigned_url" {
  filename         = "lambda_functions/s3_presigned_url_lambda.zip"
  function_name    = "${var.project_name}-s3-presigned-url-${var.environment}"
  role            = aws_iam_role.ai_lambda_role.arn
  handler         = "s3_presigned_url.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 128

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# S3署名付きURL Lambdaの権限
resource "aws_lambda_permission" "s3_presigned_url" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.s3_presigned_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# ユーザーテーブル
resource "aws_dynamodb_table" "users" {
  name           = "${var.project_name}-users-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name     = "EmailIndex"
    hash_key = "email"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# 顧客テーブル
resource "aws_dynamodb_table" "customers" {
  name           = "${var.project_name}-customers-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# FAQテーブル
resource "aws_dynamodb_table" "faqs" {
  name           = "${var.project_name}-faqs-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ナレッジベーステーブル（RAG対応）
resource "aws_dynamodb_table" "knowledge" {
  name           = "${var.project_name}-knowledge-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name     = "CategoryIndex"
    hash_key = "category"
    range_key = "SK"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ベクトル埋め込み用テーブル
resource "aws_dynamodb_table" "knowledge_vectors" {
  name           = "${var.project_name}-knowledge-vectors-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "knowledgeId"
  range_key      = "chunkIndex"

  attribute {
    name = "knowledgeId"
    type = "S"
  }

  attribute {
    name = "chunkIndex"
    type = "N"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# 営業プロセステーブル
resource "aws_dynamodb_table" "sales_processes" {
  name           = "${var.project_name}-sales-processes-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# 基本情報テーブル
resource "aws_dynamodb_table" "company_profiles" {
  name           = "${var.project_name}-company-profiles-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# 提案内容テーブル
resource "aws_dynamodb_table" "proposals" {
  name           = "${var.project_name}-proposals-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# メール接続テーブル
resource "aws_dynamodb_table" "email_connections" {
  name           = "${var.project_name}-email-connections-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ファイル管理テーブル
resource "aws_dynamodb_table" "customer_files" {
  name           = "${var.project_name}-customer-files-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "customerId"
    type = "S"
  }

  attribute {
    name = "fileType"
    type = "S"
  }

  global_secondary_index {
    name     = "CustomerIdIndex"
    hash_key = "customerId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name     = "FileTypeIndex"
    hash_key = "fileType"
    projection_type = "ALL"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Feature Requests Table
resource "aws_dynamodb_table" "feature_requests" {
  name           = "${var.project_name}-feature-requests-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name     = "StatusIndex"
    hash_key = "status"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  password_policy {
    minimum_length    = 6
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
    temporary_password_validity_days = 7
  }

  auto_verified_attributes = ["email"]

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  callback_urls = ["http://localhost:5173", "http://localhost:5174", "https://your-domain.com"]
  logout_urls   = ["http://localhost:5173", "http://localhost:5174", "https://your-domain.com"]
}

# Lambda関数用のIAMロール
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda関数用のIAMポリシー
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.customers.arn,
          aws_dynamodb_table.faqs.arn,
          aws_dynamodb_table.knowledge.arn,
          aws_dynamodb_table.knowledge_vectors.arn,
          aws_dynamodb_table.sales_processes.arn,
          aws_dynamodb_table.company_profiles.arn,
          aws_dynamodb_table.proposals.arn,
          aws_dynamodb_table.email_connections.arn,
          aws_dynamodb_table.customer_files.arn,
          aws_dynamodb_table.feature_requests.arn,
          "${aws_dynamodb_table.feature_requests.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.uploads.arn}",
          "${aws_s3_bucket.uploads.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# API Gateway
resource "aws_api_gateway_rest_api" "main" {
  name = "${var.project_name}-api-${var.environment}"
}

# API Gateway Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name          = "${var.project_name}-cognito-authorizer-${var.environment}"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.main.id
  provider_arns = [aws_cognito_user_pool.main.arn]
}

# API Gateway Root Resource
resource "aws_api_gateway_resource" "root" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "health"
}

# API Gateway Method (Health Check)
resource "aws_api_gateway_method" "health" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.root.id
  http_method   = "GET"
  authorization = "NONE"
}

# API Gateway Integration (Mock)
resource "aws_api_gateway_integration" "health" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.root.id
  http_method = aws_api_gateway_method.health.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 顧客管理APIリソース
resource "aws_api_gateway_resource" "customers" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "customers"
}

# 顧客一覧取得 (GET /customers) - 認証付き
resource "aws_api_gateway_method" "customers_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customers.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# 顧客作成 (POST /customers)
resource "aws_api_gateway_method" "customers_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customers.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# CORS用のOPTIONSメソッド (customers)
resource "aws_api_gateway_method" "customers_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customers.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 顧客詳細APIリソース
resource "aws_api_gateway_resource" "customer" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.customers.id
  path_part   = "{id}"
}

# 顧客詳細取得 (GET /customers/{id})
resource "aws_api_gateway_method" "customer_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# 顧客更新 (PUT /customers/{id})
resource "aws_api_gateway_method" "customer_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# 顧客削除 (DELETE /customers/{id})
resource "aws_api_gateway_method" "customer_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# CORS用のOPTIONSメソッド (customer)
resource "aws_api_gateway_method" "customer_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# FAQ管理APIリソース
resource "aws_api_gateway_resource" "faqs" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "faqs"
}

# FAQ一覧取得 (GET /faqs) - 認証付き
resource "aws_api_gateway_method" "faqs_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faqs.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# FAQ作成 (POST /faqs)
resource "aws_api_gateway_method" "faqs_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faqs.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# CORS用のOPTIONSメソッド (faqs)
resource "aws_api_gateway_method" "faqs_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faqs.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# FAQ詳細APIリソース
resource "aws_api_gateway_resource" "faq" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.faqs.id
  path_part   = "{id}"
}

# FAQ詳細取得 (GET /faqs/{id})
resource "aws_api_gateway_method" "faq_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faq.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# FAQ更新 (PUT /faqs/{id})
resource "aws_api_gateway_method" "faq_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faq.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# FAQ削除 (DELETE /faqs/{id})
resource "aws_api_gateway_method" "faq_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faq.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# CORS用のOPTIONSメソッド (faq)
resource "aws_api_gateway_method" "faq_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faq.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# AI生成APIリソース
resource "aws_api_gateway_resource" "ai_generate" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "ai-generate"
}

# AI生成 (POST /ai-generate)
resource "aws_api_gateway_method" "ai_generate_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_generate.id
  http_method   = "POST"
  authorization = "NONE"  # 一時的に認証を無効化してテスト
  # authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# CORS用のOPTIONSメソッド (ai-generate)
resource "aws_api_gateway_method" "ai_generate_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.ai_generate.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# FAQチャットAPIリソース
resource "aws_api_gateway_resource" "faq_chat" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "faq-chat"
}

# FAQチャット (POST /faq-chat)
resource "aws_api_gateway_method" "faq_chat_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faq_chat.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# CORS用のOPTIONSメソッド (faq-chat)
resource "aws_api_gateway_method" "faq_chat_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.faq_chat.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Lambda関数との統合
resource "aws_api_gateway_integration" "customers_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customers.id
  http_method = aws_api_gateway_method.customers_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:yarisugi-customers-api/invocations"
}

resource "aws_api_gateway_integration" "customers_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customers.id
  http_method = aws_api_gateway_method.customers_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:yarisugi-customers-api/invocations"
}

resource "aws_api_gateway_integration" "customer_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer.id
  http_method = aws_api_gateway_method.customer_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:yarisugi-customers-api/invocations"
}

resource "aws_api_gateway_integration" "customer_put" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer.id
  http_method = aws_api_gateway_method.customer_put.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:yarisugi-customers-api/invocations"
}

resource "aws_api_gateway_integration" "customer_delete" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer.id
  http_method = aws_api_gateway_method.customer_delete.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:yarisugi-customers-api/invocations"
}

# CORS用の統合 (customers)
resource "aws_api_gateway_integration" "customers_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customers.id
  http_method = aws_api_gateway_method.customers_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# CORS用の統合 (customer)
resource "aws_api_gateway_integration" "customer_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer.id
  http_method = aws_api_gateway_method.customer_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# FAQ Lambda関数
resource "aws_lambda_function" "faqs_api" {
  filename         = "lambda_functions/faqs_lambda.zip"
  function_name    = "yarisugi-faqs-api"
  role            = aws_iam_role.lambda_role.arn
  handler         = "faqs.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30

  environment {
    variables = {
      FAQS_TABLE = aws_dynamodb_table.faqs.name
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# FAQ Lambda関数の権限
resource "aws_lambda_permission" "faqs_api" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.faqs_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# AI生成Lambda関数
resource "aws_lambda_function" "ai_generator" {
  filename         = "../lambda_functions/ai_generator/ai_generator_lambda.zip"
  function_name    = "yarisugi-ai-generator"
  role            = aws_iam_role.lambda_role.arn
  handler         = "ai_generator.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  source_code_hash = filebase64sha256("../lambda_functions/ai_generator/ai_generator_lambda.zip")

  environment {
    variables = {
      FAQS_TABLE = aws_dynamodb_table.faqs.name
      OPENAI_API_KEY = var.openai_api_key
      OPENAI_MODEL = "gpt-4o-mini"
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# AI生成Lambda関数の権限
resource "aws_lambda_permission" "ai_generator" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ai_generator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# FAQチャットLambda関数
resource "aws_lambda_function" "faq_chat" {
  filename         = "../lambda_functions/faq_chat/faq_chat_lambda.zip"
  function_name    = "${var.project_name}-faq-chat-${var.environment}"
  role            = aws_iam_role.ai_lambda_role.arn
  handler         = "faq_chat.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 512
  source_code_hash = filebase64sha256("../lambda_functions/faq_chat/faq_chat_lambda.zip")

  environment {
    variables = {
      FAQS_TABLE = aws_dynamodb_table.faqs.name
      OPENAI_API_KEY_SECRET_NAME = "yarisugi-sales-openai-api-key-dev"
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# FAQチャットLambda関数の権限
resource "aws_lambda_permission" "faq_chat" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.faq_chat.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# FAQ API Gateway統合
resource "aws_api_gateway_integration" "faqs_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faqs.id
  http_method = aws_api_gateway_method.faqs_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.faqs_integration_uri

  depends_on = [aws_lambda_permission.faqs_api]
}

resource "aws_api_gateway_integration" "faqs_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faqs.id
  http_method = aws_api_gateway_method.faqs_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.faqs_integration_uri

  depends_on = [aws_lambda_permission.faqs_api]
}

resource "aws_api_gateway_integration" "faq_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq.id
  http_method = aws_api_gateway_method.faq_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.faqs_integration_uri

  depends_on = [aws_lambda_permission.faqs_api]
}

resource "aws_api_gateway_integration" "faq_put" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq.id
  http_method = aws_api_gateway_method.faq_put.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.faqs_integration_uri

  depends_on = [aws_lambda_permission.faqs_api]
}

resource "aws_api_gateway_integration" "faq_delete" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq.id
  http_method = aws_api_gateway_method.faq_delete.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.faqs_integration_uri

  depends_on = [aws_lambda_permission.faqs_api]
}

# CORS用の統合 (faqs)
resource "aws_api_gateway_integration" "faqs_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faqs.id
  http_method = aws_api_gateway_method.faqs_options.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.faqs_integration_uri

  depends_on = [aws_lambda_permission.faqs_api]
}

# AI生成API Gateway統合
resource "aws_api_gateway_integration" "ai_generate_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_generate.id
  http_method = aws_api_gateway_method.ai_generate_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.ai_generator_integration_uri

  depends_on = [aws_lambda_permission.ai_generator]
}

# FAQチャットAPI Gateway統合
resource "aws_api_gateway_integration" "faq_chat_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq_chat.id
  http_method = aws_api_gateway_method.faq_chat_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.faq_chat_integration_uri

  depends_on = [aws_lambda_permission.faq_chat]
}

# CORS用の統合 (ai-generate)
resource "aws_api_gateway_integration" "ai_generate_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_generate.id
  http_method = aws_api_gateway_method.ai_generate_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# CORS用のメソッドレスポンス (ai-generate)
resource "aws_api_gateway_method_response" "ai_generate_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_generate.id
  http_method = aws_api_gateway_method.ai_generate_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS用の統合レスポンス (ai-generate)
resource "aws_api_gateway_integration_response" "ai_generate_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.ai_generate.id
  http_method = aws_api_gateway_method.ai_generate_options.http_method
  status_code = aws_api_gateway_method_response.ai_generate_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Origin'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS用の統合 (faq-chat)
resource "aws_api_gateway_integration" "faq_chat_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq_chat.id
  http_method = aws_api_gateway_method.faq_chat_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# CORS用のメソッドレスポンス (faq-chat)
resource "aws_api_gateway_method_response" "faq_chat_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq_chat.id
  http_method = aws_api_gateway_method.faq_chat_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS用の統合レスポンス (faq-chat)
resource "aws_api_gateway_integration_response" "faq_chat_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq_chat.id
  http_method = aws_api_gateway_method.faq_chat_options.http_method
  status_code = aws_api_gateway_method_response.faq_chat_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Origin'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS用のメソッドレスポンス (customers)
resource "aws_api_gateway_method_response" "customers_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customers.id
  http_method = aws_api_gateway_method.customers_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS用のメソッドレスポンス (customer)
resource "aws_api_gateway_method_response" "customer_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer.id
  http_method = aws_api_gateway_method.customer_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS用の統合レスポンス (customers)
resource "aws_api_gateway_integration_response" "customers_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customers.id
  http_method = aws_api_gateway_method.customers_options.http_method
  status_code = aws_api_gateway_method_response.customers_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Origin'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS用の統合レスポンス (customer)
resource "aws_api_gateway_integration_response" "customer_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer.id
  http_method = aws_api_gateway_method.customer_options.http_method
  status_code = aws_api_gateway_method_response.customer_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Origin'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS用のメソッドレスポンス (faqs)
resource "aws_api_gateway_method_response" "faqs_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faqs.id
  http_method = aws_api_gateway_method.faqs_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS用の統合レスポンス (faqs) - AWS_PROXY統合では不要のためコメントアウト
# resource "aws_api_gateway_integration_response" "faqs_options" {
#   rest_api_id = aws_api_gateway_rest_api.main.id
#   resource_id = aws_api_gateway_resource.faqs.id
#   http_method = aws_api_gateway_method.faqs_options.http_method
#   status_code = aws_api_gateway_method_response.faqs_options.status_code
#
#   response_parameters = {
#     "method.response.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Origin'"
#     "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
#     "method.response.header.Access-Control-Allow-Origin"  = "'*'"
#   }
# }

# CORS用の統合 (faq)
resource "aws_api_gateway_integration" "faq_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq.id
  http_method = aws_api_gateway_method.faq_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# CORS用のメソッドレスポンス (faq)
resource "aws_api_gateway_method_response" "faq_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq.id
  http_method = aws_api_gateway_method.faq_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS用の統合レスポンス (faq)
resource "aws_api_gateway_integration_response" "faq_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.faq.id
  http_method = aws_api_gateway_method.faq_options.http_method
  status_code = aws_api_gateway_method_response.faq_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Origin'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Gateway Responses for CORS
resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Origin'"
  }
  response_templates = {
    "application/json" = "{\"message\":$context.error.messageString}"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX"
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Origin'"
  }
  response_templates = {
    "application/json" = "{\"message\":$context.error.messageString}"
  }
}

# Lambda関数の権限設定
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "yarisugi-customers-api"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# 基本情報管理Lambda関数の権限設定
resource "aws_lambda_permission" "company_profile" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.company_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# 顧客レポート生成Lambda関数の権限設定
resource "aws_lambda_permission" "customer_report" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.customer_report.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# メール接続管理Lambdaの権限
resource "aws_lambda_permission" "email_manager" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_manager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# メール取得Lambdaの権限
resource "aws_lambda_permission" "email_fetcher" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_fetcher.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# メール送信Lambdaの権限
resource "aws_lambda_permission" "email_sender" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_sender.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# メールAI返信Lambdaの権限
resource "aws_lambda_permission" "email_ai_reply" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_ai_reply.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# ファイル管理Lambdaの権限
resource "aws_lambda_permission" "file_manager" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.file_manager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# 機能追加要望Lambdaの権限
resource "aws_lambda_permission" "feature_request" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.feature_request.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# Lambda関数の環境変数設定
resource "aws_lambda_function" "customers_api" {
  filename         = "../lambda_functions/customers_lambda/customers_lambda.zip"
  function_name    = "yarisugi-customers-api"
  role            = aws_iam_role.lambda_role.arn
  handler         = "customers.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 128

  environment {
    variables = {
      CUSTOMERS_TABLE = aws_dynamodb_table.customers.name
      USERS_TABLE     = aws_dynamodb_table.users.name
      FAQS_TABLE      = aws_dynamodb_table.faqs.name
      KNOWLEDGE_TABLE = aws_dynamodb_table.knowledge.name
      KNOWLEDGE_VECTORS_TABLE = aws_dynamodb_table.knowledge_vectors.name
      SALES_PROCESSES_TABLE = aws_dynamodb_table.sales_processes.name
    }
  }
}

# 現在のAWSアカウントIDを取得
data "aws_caller_identity" "current" {}

# OpenAI API Key用のSecrets Manager
resource "aws_secretsmanager_secret" "openai_api_key" {
  name        = "${var.project_name}-openai-api-key-${var.environment}"
  description = "OpenAI API Key for AI functions"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id = aws_secretsmanager_secret.openai_api_key.id
  secret_string = jsonencode({
    openai_api_key = var.openai_api_key
  })
}

# AI Lambda関数専用のIAMロール
resource "aws_iam_role" "ai_lambda_role" {
  name = "${var.project_name}-ai-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# AI Lambda関数用のIAMポリシー
resource "aws_iam_role_policy" "ai_lambda_policy" {
  name = "${var.project_name}-ai-lambda-policy-${var.environment}"
  role = aws_iam_role.ai_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.faqs.arn,
          aws_dynamodb_table.knowledge.arn,
          aws_dynamodb_table.knowledge_vectors.arn,
          aws_dynamodb_table.company_profiles.arn,
          aws_dynamodb_table.proposals.arn,
          aws_dynamodb_table.customer_files.arn,
          "${aws_dynamodb_table.knowledge.arn}/index/*",
          "${aws_dynamodb_table.knowledge_vectors.arn}/index/*",
          "${aws_dynamodb_table.company_profiles.arn}/index/*",
          "${aws_dynamodb_table.proposals.arn}/index/*",
          "${aws_dynamodb_table.customer_files.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.openai_api_key.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          "${aws_s3_bucket.uploads.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ナレッジ管理Lambda関数
resource "aws_lambda_function" "knowledge_manager" {
  filename         = "../lambda_functions/knowledge_manager/knowledge_manager_optimized.zip"
  function_name    = "${var.project_name}-knowledge-manager-${var.environment}"
  role            = aws_iam_role.ai_lambda_role.arn
  handler         = "knowledge_manager.lambda_handler"
  runtime         = "python3.11"
  timeout         = 900
  memory_size     = 3008
  source_code_hash = filebase64sha256("../lambda_functions/knowledge_manager/knowledge_manager_optimized.zip")

  environment {
    variables = {
      KNOWLEDGE_TABLE = aws_dynamodb_table.knowledge.name
      KNOWLEDGE_VECTORS_TABLE = aws_dynamodb_table.knowledge_vectors.name
      OPENAI_API_SECRET_ARN = aws_secretsmanager_secret.openai_api_key.arn
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# RAG検索Lambda関数
resource "aws_lambda_function" "rag_search" {
  filename         = "../lambda_functions/rag_search/rag_search_lambda.zip"
  function_name    = "${var.project_name}-rag-search-${var.environment}"
  role            = aws_iam_role.ai_lambda_role.arn
  handler         = "rag_search.lambda_handler"
  runtime         = "python3.11"
  timeout         = 29
  memory_size     = 3008
  source_code_hash = filebase64sha256("../lambda_functions/rag_search/rag_search_lambda.zip")

  environment {
    variables = {
      KNOWLEDGE_TABLE = aws_dynamodb_table.knowledge.name
      KNOWLEDGE_VECTORS_TABLE = aws_dynamodb_table.knowledge_vectors.name
      OPENAI_API_SECRET_ARN = aws_secretsmanager_secret.openai_api_key.arn
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# 基本情報管理Lambda関数
resource "aws_lambda_function" "company_profile" {
  filename         = "../lambda_functions/company_profile/company_profile_lambda.zip"
  function_name    = "${var.project_name}-company-profile-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "company_profile.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 128
  source_code_hash = filebase64sha256("../lambda_functions/company_profile/company_profile_lambda.zip")

  environment {
    variables = {
      COMPANY_PROFILES_TABLE = aws_dynamodb_table.company_profiles.name
      PROPOSALS_TABLE = aws_dynamodb_table.proposals.name
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# 顧客レポート生成Lambda関数
resource "aws_lambda_function" "customer_report" {
  filename         = "../lambda_functions/customer_report_lambda.zip"
  function_name    = "${var.project_name}-customer-report-${var.environment}"
  role            = aws_iam_role.ai_lambda_role.arn
  handler         = "customer_report.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256
  source_code_hash = filebase64sha256("../lambda_functions/customer_report/customer_report_lambda.zip")

  environment {
    variables = {
      OPENAI_API_SECRET_ARN = aws_secretsmanager_secret.openai_api_key.arn
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# メール接続管理Lambda関数
resource "aws_lambda_function" "email_manager" {
  filename         = "../lambda_functions/email_manager/email_manager_lambda.zip"
  function_name    = "${var.project_name}-email-manager-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "email_manager.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256
  source_code_hash = filebase64sha256("../lambda_functions/email_manager/email_manager_lambda.zip")

  environment {
    variables = {
      EMAIL_CONNECTIONS_TABLE = aws_dynamodb_table.email_connections.name
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# メール取得Lambda関数
resource "aws_lambda_function" "email_fetcher" {
  filename         = "../lambda_functions/email_fetcher/email_fetcher_lambda.zip"
  function_name    = "yarisugi-sales-email-fetcher-dev"
  role            = aws_iam_role.lambda_role.arn
  handler         = "email_fetcher.lambda_handler"
  runtime         = "python3.11"
  timeout         = 60  # タイムアウトを60秒に延長
  memory_size     = 512  # メモリを512MBに増加

  environment {
    variables = {
      EMAIL_CONNECTIONS_TABLE = aws_dynamodb_table.email_connections.name
      CUSTOMERS_TABLE         = aws_dynamodb_table.customers.name
    }
  }

  tags = {
    Environment = "dev"
    Project     = "yarisugi-sales"
  }
}

# メール送信Lambda関数
resource "aws_lambda_function" "email_sender" {
  filename         = "../lambda_functions/email_sender/email_sender_lambda.zip"
  function_name    = "${var.project_name}-email-sender-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "email_sender.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256
  source_code_hash = filebase64sha256("../lambda_functions/email_sender/email_sender_lambda.zip")

  environment {
    variables = {
      EMAIL_CONNECTIONS_TABLE = aws_dynamodb_table.email_connections.name
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# メールAI返信Lambda関数
resource "aws_lambda_function" "email_ai_reply" {
  filename         = "../lambda_functions/email_ai_reply/email_ai_reply_lambda.zip"
  function_name    = "${var.project_name}-email-ai-reply-${var.environment}"
  role            = aws_iam_role.ai_lambda_role.arn
  handler         = "email_ai_reply.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256
  source_code_hash = filebase64sha256("../lambda_functions/email_ai_reply/email_ai_reply_lambda.zip")

  environment {
    variables = {
      FAQS_TABLE = aws_dynamodb_table.faqs.name
      OPENAI_API_KEY_SECRET_NAME = aws_secretsmanager_secret.openai_api_key.name
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ファイル管理Lambda関数
resource "aws_lambda_function" "file_manager" {
  filename         = "../lambda_functions/file_manager/file_manager_lambda.zip"
  function_name    = "${var.project_name}-file-manager-${var.environment}"
  role            = aws_iam_role.ai_lambda_role.arn
  handler         = "file_manager.lambda_handler"
  runtime         = "python3.11"
  timeout         = 300  # 5分（ファイル処理に時間がかかるため）
  memory_size     = 1024  # 1GB（ファイル処理にメモリが必要）
  source_code_hash = filebase64sha256("../lambda_functions/file_manager/file_manager_lambda.zip")

  environment {
    variables = {
      CUSTOMER_FILES_TABLE = aws_dynamodb_table.customer_files.name
      S3_BUCKET = aws_s3_bucket.uploads.bucket
      OPENAI_API_KEY_SECRET = aws_secretsmanager_secret.openai_api_key.name
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_lambda_function" "feature_request" {
  filename         = "../lambda_functions/feature_request/feature_request_lambda.zip"
  function_name    = "${var.project_name}-feature-request-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "feature_request.lambda_handler"
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256
  source_code_hash = filebase64sha256("../lambda_functions/feature_request/feature_request_lambda.zip")

  environment {
    variables = {
      FEATURE_REQUESTS_TABLE = aws_dynamodb_table.feature_requests.name
      ADMIN_USERS = "admin-user-id-1,admin-user-id-2"  # 管理者ユーザーIDを設定
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ナレッジ管理API リソース
resource "aws_api_gateway_resource" "knowledge" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "knowledge"
}

# 個別ナレッジエントリー用のリソース
resource "aws_api_gateway_resource" "knowledge_item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.knowledge.id
  path_part   = "{knowledgeId}"
}

# RAG検索API Gateway リソース
resource "aws_api_gateway_resource" "rag_search" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "rag-search"
}

# S3署名付きURLリソース（knowledge配下）
resource "aws_api_gateway_resource" "s3_presigned_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.knowledge.id
  path_part   = "s3-presigned-url"
}

# 基本情報管理API リソース
resource "aws_api_gateway_resource" "company_profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "company-profile"
}

# 顧客レポート生成API リソース
resource "aws_api_gateway_resource" "customer_report" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "customer-report"
}

# ファイル管理API リソース
resource "aws_api_gateway_resource" "files" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "files"
}

# ファイルアップロードAPI リソース
resource "aws_api_gateway_resource" "files_upload" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.files.id
  path_part   = "upload"
}

# URLアップロード用リソース
resource "aws_api_gateway_resource" "files_upload_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.files.id
  path_part   = "upload-url"
}

# 個別ファイル管理API リソース
resource "aws_api_gateway_resource" "file_item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.files.id
  path_part   = "{fileId}"
}

# ファイル質問機能API リソース
resource "aws_api_gateway_resource" "files_question" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.files.id
  path_part   = "question"
}

resource "aws_api_gateway_resource" "files_questions" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.files.id
  path_part   = "questions"
}

resource "aws_api_gateway_resource" "files_generate_text" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.files.id
  path_part   = "generate-text"
}

# 提案内容管理API リソース
resource "aws_api_gateway_resource" "proposals" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.company_profile.id
  path_part   = "proposals"
}

# 個別提案内容用のリソース
resource "aws_api_gateway_resource" "proposal_item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.proposals.id
  path_part   = "{proposalId}"
}

# メール接続管理API リソース
resource "aws_api_gateway_resource" "email" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "email"
}

# メール接続テストAPI リソース
resource "aws_api_gateway_resource" "email_test_connection" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.email.id
  path_part   = "test-connection"
}

# メール接続保存API リソース
resource "aws_api_gateway_resource" "email_save_connection" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.email.id
  path_part   = "save-connection"
}

# メール接続一覧API リソース
resource "aws_api_gateway_resource" "email_connections" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.email.id
  path_part   = "connections"
}

# 個別メール接続API リソース
resource "aws_api_gateway_resource" "email_connection_item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.email_connections.id
  path_part   = "{connectionId}"
}

# メール一覧API リソース
resource "aws_api_gateway_resource" "email_messages" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.email.id
  path_part   = "messages"
}

# 個別メール詳細API リソース
resource "aws_api_gateway_resource" "email_message_item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.email_messages.id
  path_part   = "{messageId}"
}

# メール送信API リソース
resource "aws_api_gateway_resource" "email_send" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.email.id
  path_part   = "send"
}

# メールAI返信API リソース
resource "aws_api_gateway_resource" "email_ai_reply" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.email.id
  path_part   = "ai-reply"
}

# Feature Requests API Resources
resource "aws_api_gateway_resource" "feature_requests" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "feature-requests"
}

resource "aws_api_gateway_resource" "feature_request_item" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.feature_requests.id
  path_part   = "{requestId}"
}

# ナレッジ管理API メソッド
resource "aws_api_gateway_method" "knowledge_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.knowledge.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "knowledge_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.knowledge.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "knowledge_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.knowledge.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 個別ナレッジエントリー取得メソッド
resource "aws_api_gateway_method" "knowledge_item_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.knowledge_item.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# 個別ナレッジエントリー削除メソッド
resource "aws_api_gateway_method" "knowledge_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.knowledge_item.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# 基本情報管理API メソッド
resource "aws_api_gateway_method" "company_profile_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.company_profile.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "company_profile_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.company_profile.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "company_profile_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.company_profile.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 顧客レポート生成API メソッド
resource "aws_api_gateway_method" "customer_report_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer_report.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "customer_report_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer_report.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# ファイル管理API メソッド
resource "aws_api_gateway_method" "files_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "files_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "files_upload_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_upload.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "files_upload_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_upload.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# URLアップロード用メソッド
resource "aws_api_gateway_method" "files_upload_url_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_upload_url.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "files_upload_url_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_upload_url.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "file_item_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.file_item.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "file_item_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.file_item.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# ファイル質問機能のAPIメソッド
resource "aws_api_gateway_method" "files_question_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_question.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "files_question_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_question.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "files_questions_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_questions.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "files_questions_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_questions.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# ファイルテキスト生成機能のAPIメソッド
resource "aws_api_gateway_method" "files_generate_text_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_generate_text.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "files_generate_text_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.files_generate_text.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "file_item_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.file_item.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 提案内容管理API メソッド
resource "aws_api_gateway_method" "proposals_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proposals.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "proposals_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proposals.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "proposals_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proposals.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 個別提案内容管理API メソッド
resource "aws_api_gateway_method" "proposal_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proposal_item.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "proposal_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proposal_item.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "proposal_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proposal_item.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "knowledge_item_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.knowledge_item.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# RAG検索API メソッド
resource "aws_api_gateway_method" "rag_search_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.rag_search.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# S3署名付きURL API メソッド
resource "aws_api_gateway_method" "s3_presigned_url_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.s3_presigned_url.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "s3_presigned_url_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.s3_presigned_url.id
  http_method = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "rag_search_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.rag_search.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# ナレッジ管理API 統合
resource "aws_api_gateway_integration" "knowledge_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge.id
  http_method = aws_api_gateway_method.knowledge_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.knowledge_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "knowledge_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge.id
  http_method = aws_api_gateway_method.knowledge_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.knowledge_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "knowledge_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge.id
  http_method = aws_api_gateway_method.knowledge_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 個別ナレッジエントリー取得統合
resource "aws_api_gateway_integration" "knowledge_item_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge_item.id
  http_method = aws_api_gateway_method.knowledge_item_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.knowledge_manager.arn}/invocations"
}

# 個別ナレッジエントリー削除統合
resource "aws_api_gateway_integration" "knowledge_delete" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge_item.id
  http_method = aws_api_gateway_method.knowledge_delete.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.knowledge_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "knowledge_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge_item.id
  http_method = aws_api_gateway_method.knowledge_item_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 基本情報管理API 統合
resource "aws_api_gateway_integration" "company_profile_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.company_profile.id
  http_method = aws_api_gateway_method.company_profile_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.company_profile.arn}/invocations"
}

resource "aws_api_gateway_integration" "company_profile_put" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.company_profile.id
  http_method = aws_api_gateway_method.company_profile_put.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.company_profile.arn}/invocations"
}

resource "aws_api_gateway_integration" "company_profile_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.company_profile.id
  http_method = aws_api_gateway_method.company_profile_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 基本情報管理API CORS設定
resource "aws_api_gateway_method_response" "company_profile_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.company_profile.id
  http_method = aws_api_gateway_method.company_profile_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "company_profile_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.company_profile.id
  http_method = aws_api_gateway_method.company_profile_options.http_method
  status_code = aws_api_gateway_method_response.company_profile_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# 顧客レポート生成API 統合
resource "aws_api_gateway_integration" "customer_report_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer_report.id
  http_method = aws_api_gateway_method.customer_report_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.customer_report.arn}/invocations"
}

resource "aws_api_gateway_integration" "customer_report_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer_report.id
  http_method = aws_api_gateway_method.customer_report_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 顧客レポート生成API CORS設定
resource "aws_api_gateway_method_response" "customer_report_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer_report.id
  http_method = aws_api_gateway_method.customer_report_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "customer_report_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.customer_report.id
  http_method = aws_api_gateway_method.customer_report_options.http_method
  status_code = aws_api_gateway_method_response.customer_report_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# 提案内容管理API 統合
resource "aws_api_gateway_integration" "proposals_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposals.id
  http_method = aws_api_gateway_method.proposals_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.company_profile.arn}/invocations"
}

resource "aws_api_gateway_integration" "proposals_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposals.id
  http_method = aws_api_gateway_method.proposals_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.company_profile.arn}/invocations"
}

resource "aws_api_gateway_integration" "proposals_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposals.id
  http_method = aws_api_gateway_method.proposals_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 提案内容管理API CORS設定
resource "aws_api_gateway_method_response" "proposals_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposals.id
  http_method = aws_api_gateway_method.proposals_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "proposals_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposals.id
  http_method = aws_api_gateway_method.proposals_options.http_method
  status_code = aws_api_gateway_method_response.proposals_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# 個別提案内容管理API 統合
resource "aws_api_gateway_integration" "proposal_put" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposal_item.id
  http_method = aws_api_gateway_method.proposal_put.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.company_profile.arn}/invocations"
}

resource "aws_api_gateway_integration" "proposal_delete" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposal_item.id
  http_method = aws_api_gateway_method.proposal_delete.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.company_profile.arn}/invocations"
}

resource "aws_api_gateway_integration" "proposal_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposal_item.id
  http_method = aws_api_gateway_method.proposal_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 個別提案内容管理API CORS設定
resource "aws_api_gateway_method_response" "proposal_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposal_item.id
  http_method = aws_api_gateway_method.proposal_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "proposal_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proposal_item.id
  http_method = aws_api_gateway_method.proposal_options.http_method
  status_code = aws_api_gateway_method_response.proposal_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# RAG検索API 統合
resource "aws_api_gateway_integration" "rag_search_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.rag_search.id
  http_method = aws_api_gateway_method.rag_search_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.rag_search.arn}/invocations"
}

resource "aws_api_gateway_integration" "rag_search_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.rag_search.id
  http_method = aws_api_gateway_method.rag_search_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Lambda権限
resource "aws_lambda_permission" "knowledge_manager" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.knowledge_manager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

resource "aws_lambda_permission" "rag_search" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rag_search.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}



# S3署名付きURL API インテグレーション
resource "aws_api_gateway_integration" "s3_presigned_url_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.s3_presigned_url.id
  http_method = aws_api_gateway_method.s3_presigned_url_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = local.s3_presigned_url_integration_uri
}

resource "aws_api_gateway_integration" "s3_presigned_url_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.s3_presigned_url.id
  http_method = aws_api_gateway_method.s3_presigned_url_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# CORS レスポンス
resource "aws_api_gateway_method_response" "knowledge_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge.id
  http_method = aws_api_gateway_method.knowledge_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "knowledge_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge.id
  http_method = aws_api_gateway_method.knowledge_options.http_method
  status_code = aws_api_gateway_method_response.knowledge_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# 個別ナレッジエントリー用CORS設定
resource "aws_api_gateway_method_response" "knowledge_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge_item.id
  http_method = aws_api_gateway_method.knowledge_item_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "knowledge_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.knowledge_item.id
  http_method = aws_api_gateway_method.knowledge_item_options.http_method
  status_code = aws_api_gateway_method_response.knowledge_item_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "rag_search_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.rag_search.id
  http_method = aws_api_gateway_method.rag_search_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "rag_search_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.rag_search.id
  http_method = aws_api_gateway_method.rag_search_options.http_method
  status_code = aws_api_gateway_method_response.rag_search_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# S3署名付きURL用CORS設定
resource "aws_api_gateway_method_response" "s3_presigned_url_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.s3_presigned_url.id
  http_method = aws_api_gateway_method.s3_presigned_url_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "s3_presigned_url_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.s3_presigned_url.id
  http_method = aws_api_gateway_method.s3_presigned_url_options.http_method
  status_code = aws_api_gateway_method_response.s3_presigned_url_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# メール接続テストAPI メソッド
resource "aws_api_gateway_method" "email_test_connection_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_test_connection.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "email_test_connection_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_test_connection.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# メール接続保存API メソッド
resource "aws_api_gateway_method" "email_save_connection_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_save_connection.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "email_save_connection_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_save_connection.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# メール接続一覧API メソッド
resource "aws_api_gateway_method" "email_connections_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_connections.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "email_connections_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_connections.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 個別メール接続削除API メソッド
resource "aws_api_gateway_method" "email_connection_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_connection_item.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "email_connection_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_connection_item.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# メール一覧API メソッド
resource "aws_api_gateway_method" "email_messages_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_messages.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "email_messages_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_messages.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 個別メール詳細API メソッド
resource "aws_api_gateway_method" "email_message_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_message_item.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "email_message_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_message_item.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# メール送信API メソッド
resource "aws_api_gateway_method" "email_send_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_send.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "email_send_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_send.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# メールAI返信API メソッド
resource "aws_api_gateway_method" "email_ai_reply_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_ai_reply.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "email_ai_reply_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.email_ai_reply.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Feature Requests API Methods
resource "aws_api_gateway_method" "feature_requests_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.feature_requests.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "feature_requests_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.feature_requests.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "feature_requests_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.feature_requests.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "feature_request_item_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.feature_request_item.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "feature_request_item_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.feature_request_item.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# メール接続テストAPI インテグレーション
resource "aws_api_gateway_integration" "email_test_connection_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_test_connection.id
  http_method = aws_api_gateway_method.email_test_connection_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.email_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "email_test_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_test_connection.id
  http_method = aws_api_gateway_method.email_test_connection_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# メール接続保存API インテグレーション
resource "aws_api_gateway_integration" "email_save_connection_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_save_connection.id
  http_method = aws_api_gateway_method.email_save_connection_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.email_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "email_save_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_save_connection.id
  http_method = aws_api_gateway_method.email_save_connection_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# メール接続一覧API インテグレーション
resource "aws_api_gateway_integration" "email_connections_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_connections.id
  http_method = aws_api_gateway_method.email_connections_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.email_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "email_connections_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_connections.id
  http_method = aws_api_gateway_method.email_connections_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 個別メール接続削除API インテグレーション
resource "aws_api_gateway_integration" "email_connection_delete" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_connection_item.id
  http_method = aws_api_gateway_method.email_connection_delete.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.email_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "email_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_connection_item.id
  http_method = aws_api_gateway_method.email_connection_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# メール一覧API インテグレーション
resource "aws_api_gateway_integration" "email_messages_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_messages.id
  http_method = aws_api_gateway_method.email_messages_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.email_fetcher.arn}/invocations"
}

resource "aws_api_gateway_integration" "email_messages_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_messages.id
  http_method = aws_api_gateway_method.email_messages_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 個別メール詳細API インテグレーション
resource "aws_api_gateway_integration" "email_message_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_message_item.id
  http_method = aws_api_gateway_method.email_message_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.email_fetcher.arn}/invocations"
}

resource "aws_api_gateway_integration" "email_message_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_message_item.id
  http_method = aws_api_gateway_method.email_message_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# ファイル管理API インテグレーション
resource "aws_api_gateway_integration" "files_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files.id
  http_method = aws_api_gateway_method.files_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.file_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "files_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files.id
  http_method = aws_api_gateway_method.files_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration" "files_upload_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_upload.id
  http_method = aws_api_gateway_method.files_upload_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.file_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "files_upload_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_upload.id
  http_method = aws_api_gateway_method.files_upload_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# URLアップロード用インテグレーション
resource "aws_api_gateway_integration" "files_upload_url_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_upload_url.id
  http_method = aws_api_gateway_method.files_upload_url_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.file_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "files_upload_url_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_upload_url.id
  http_method = aws_api_gateway_method.files_upload_url_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration" "file_item_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.file_item.id
  http_method = aws_api_gateway_method.file_item_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.file_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "file_item_delete" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.file_item.id
  http_method = aws_api_gateway_method.file_item_delete.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.file_manager.arn}/invocations"
}

# ファイル質問機能の統合
resource "aws_api_gateway_integration" "files_question_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_question.id
  http_method = aws_api_gateway_method.files_question_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.file_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "files_question_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_question.id
  http_method = aws_api_gateway_method.files_question_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_integration" "files_questions_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_questions.id
  http_method = aws_api_gateway_method.files_questions_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.file_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "files_questions_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_questions.id
  http_method = aws_api_gateway_method.files_questions_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# ファイルテキスト生成機能の統合
resource "aws_api_gateway_integration" "files_generate_text_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_generate_text.id
  http_method = aws_api_gateway_method.files_generate_text_post.http_method
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.file_manager.arn}/invocations"
}

resource "aws_api_gateway_integration" "files_generate_text_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_generate_text.id
  http_method = aws_api_gateway_method.files_generate_text_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_integration" "file_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.file_item.id
  http_method = aws_api_gateway_method.file_item_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# メール送信API インテグレーション
resource "aws_api_gateway_integration" "email_send_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_send.id
  http_method = aws_api_gateway_method.email_send_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.email_sender.arn}/invocations"
}

resource "aws_api_gateway_integration" "email_send_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_send.id
  http_method = aws_api_gateway_method.email_send_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# メールAI返信API インテグレーション
resource "aws_api_gateway_integration" "email_ai_reply_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_ai_reply.id
  http_method = aws_api_gateway_method.email_ai_reply_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.email_ai_reply.arn}/invocations"
}

resource "aws_api_gateway_integration" "email_ai_reply_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_ai_reply.id
  http_method = aws_api_gateway_method.email_ai_reply_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Feature Requests API Integrations
resource "aws_api_gateway_integration" "feature_requests_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_requests.id
  http_method = aws_api_gateway_method.feature_requests_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.feature_request.arn}/invocations"
}

resource "aws_api_gateway_integration" "feature_requests_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_requests.id
  http_method = aws_api_gateway_method.feature_requests_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.feature_request.arn}/invocations"
}

resource "aws_api_gateway_method_response" "feature_requests_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_requests.id
  http_method = aws_api_gateway_method.feature_requests_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration" "feature_requests_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_requests.id
  http_method = aws_api_gateway_method.feature_requests_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration_response" "feature_requests_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_requests.id
  http_method = aws_api_gateway_method.feature_requests_options.http_method
  status_code = aws_api_gateway_method_response.feature_requests_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration" "feature_request_item_put" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_request_item.id
  http_method = aws_api_gateway_method.feature_request_item_put.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.feature_request.arn}/invocations"
}

resource "aws_api_gateway_method_response" "feature_request_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_request_item.id
  http_method = aws_api_gateway_method.feature_request_item_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration" "feature_request_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_request_item.id
  http_method = aws_api_gateway_method.feature_request_item_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration_response" "feature_request_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.feature_request_item.id
  http_method = aws_api_gateway_method.feature_request_item_options.http_method
  status_code = aws_api_gateway_method_response.feature_request_item_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# メール関連のメソッドレスポンス
resource "aws_api_gateway_method_response" "email_test_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_test_connection.id
  http_method = aws_api_gateway_method.email_test_connection_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "email_save_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_save_connection.id
  http_method = aws_api_gateway_method.email_save_connection_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "email_connections_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_connections.id
  http_method = aws_api_gateway_method.email_connections_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "email_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_connection_item.id
  http_method = aws_api_gateway_method.email_connection_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "email_ai_reply_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_ai_reply.id
  http_method = aws_api_gateway_method.email_ai_reply_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "email_messages_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_messages.id
  http_method = aws_api_gateway_method.email_messages_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# ファイル管理用CORS設定
resource "aws_api_gateway_method_response" "files_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files.id
  http_method = aws_api_gateway_method.files_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "files_upload_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_upload.id
  http_method = aws_api_gateway_method.files_upload_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# URLアップロード用メソッドレスポンス
resource "aws_api_gateway_method_response" "files_upload_url_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_upload_url.id
  http_method = aws_api_gateway_method.files_upload_url_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "file_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.file_item.id
  http_method = aws_api_gateway_method.file_item_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# ファイル質問機能のメソッドレスポンス
resource "aws_api_gateway_method_response" "files_question_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_question.id
  http_method = aws_api_gateway_method.files_question_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "files_questions_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_questions.id
  http_method = aws_api_gateway_method.files_questions_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# ファイルテキスト生成機能のメソッドレスポンス
resource "aws_api_gateway_method_response" "files_generate_text_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_generate_text.id
  http_method = aws_api_gateway_method.files_generate_text_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "email_message_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_message_item.id
  http_method = aws_api_gateway_method.email_message_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "email_send_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_send.id
  http_method = aws_api_gateway_method.email_send_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# メール関連のインテグレーションレスポンス
resource "aws_api_gateway_integration_response" "email_test_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_test_connection.id
  http_method = aws_api_gateway_method.email_test_connection_options.http_method
  status_code = aws_api_gateway_method_response.email_test_connection_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "email_save_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_save_connection.id
  http_method = aws_api_gateway_method.email_save_connection_options.http_method
  status_code = aws_api_gateway_method_response.email_save_connection_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "email_connections_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_connections.id
  http_method = aws_api_gateway_method.email_connections_options.http_method
  status_code = aws_api_gateway_method_response.email_connections_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "email_connection_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_connection_item.id
  http_method = aws_api_gateway_method.email_connection_options.http_method
  status_code = aws_api_gateway_method_response.email_connection_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "email_messages_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_messages.id
  http_method = aws_api_gateway_method.email_messages_options.http_method
  status_code = aws_api_gateway_method_response.email_messages_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "email_message_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_message_item.id
  http_method = aws_api_gateway_method.email_message_options.http_method
  status_code = aws_api_gateway_method_response.email_message_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "email_send_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_send.id
  http_method = aws_api_gateway_method.email_send_options.http_method
  status_code = aws_api_gateway_method_response.email_send_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "email_ai_reply_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.email_ai_reply.id
  http_method = aws_api_gateway_method.email_ai_reply_options.http_method
  status_code = aws_api_gateway_method_response.email_ai_reply_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ファイル管理用インテグレーションレスポンス
resource "aws_api_gateway_integration_response" "files_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files.id
  http_method = aws_api_gateway_method.files_options.http_method
  status_code = aws_api_gateway_method_response.files_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "files_upload_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_upload.id
  http_method = aws_api_gateway_method.files_upload_options.http_method
  status_code = aws_api_gateway_method_response.files_upload_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# URLアップロード用インテグレーションレスポンス
resource "aws_api_gateway_integration_response" "files_upload_url_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_upload_url.id
  http_method = aws_api_gateway_method.files_upload_url_options.http_method
  status_code = aws_api_gateway_method_response.files_upload_url_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "file_item_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.file_item.id
  http_method = aws_api_gateway_method.file_item_options.http_method
  status_code = aws_api_gateway_method_response.file_item_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ファイル質問機能の統合レスポンス
resource "aws_api_gateway_integration_response" "files_question_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_question.id
  http_method = aws_api_gateway_method.files_question_options.http_method
  status_code = aws_api_gateway_method_response.files_question_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "files_questions_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_questions.id
  http_method = aws_api_gateway_method.files_questions_options.http_method
  status_code = aws_api_gateway_method_response.files_questions_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ファイルテキスト生成機能の統合レスポンス
resource "aws_api_gateway_integration_response" "files_generate_text_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.files_generate_text.id
  http_method = aws_api_gateway_method.files_generate_text_options.http_method
  status_code = aws_api_gateway_method_response.files_generate_text_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# API Gateway Deployment (Updated with file management endpoints)
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = var.environment

  depends_on = [
    # ファイル管理関連のリソース（優先度を上げる）
    aws_api_gateway_method.files_get,
    aws_api_gateway_integration.files_get,
    aws_api_gateway_method.files_options,
    aws_api_gateway_integration.files_options,
    aws_api_gateway_method_response.files_options,
    aws_api_gateway_integration_response.files_options,
    aws_api_gateway_method.files_upload_post,
    aws_api_gateway_integration.files_upload_post,
    aws_api_gateway_method.files_upload_options,
    aws_api_gateway_integration.files_upload_options,
    aws_api_gateway_method_response.files_upload_options,
    aws_api_gateway_integration_response.files_upload_options,
    # URLアップロード関連のリソース
    aws_api_gateway_method.files_upload_url_post,
    aws_api_gateway_integration.files_upload_url_post,
    aws_api_gateway_method.files_upload_url_options,
    aws_api_gateway_integration.files_upload_url_options,
    aws_api_gateway_method_response.files_upload_url_options,
    aws_api_gateway_integration_response.files_upload_url_options,
    aws_api_gateway_method.file_item_get,
    aws_api_gateway_integration.file_item_get,
    aws_api_gateway_method.file_item_delete,
    aws_api_gateway_integration.file_item_delete,
    aws_api_gateway_method.file_item_options,
    aws_api_gateway_integration.file_item_options,
    aws_api_gateway_method_response.file_item_options,
    aws_api_gateway_integration_response.file_item_options,
    # ファイル質問機能のリソース
    aws_api_gateway_method.files_question_post,
    aws_api_gateway_integration.files_question_post,
    aws_api_gateway_method.files_question_options,
    aws_api_gateway_integration.files_question_options,
    aws_api_gateway_method_response.files_question_options,
    aws_api_gateway_integration_response.files_question_options,
    aws_api_gateway_method.files_questions_get,
    aws_api_gateway_integration.files_questions_get,
    aws_api_gateway_method.files_questions_options,
    aws_api_gateway_integration.files_questions_options,
    aws_api_gateway_method_response.files_questions_options,
    aws_api_gateway_integration_response.files_questions_options,
    # ファイルテキスト生成機能のリソース
    aws_api_gateway_method.files_generate_text_post,
    aws_api_gateway_integration.files_generate_text_post,
    aws_api_gateway_method.files_generate_text_options,
    aws_api_gateway_integration.files_generate_text_options,
    aws_api_gateway_method_response.files_generate_text_options,
    aws_api_gateway_integration_response.files_generate_text_options,
    # ファイル管理Lambda関数（強制的な依存関係）
    aws_lambda_function.file_manager,
    # ファイル管理用DynamoDBテーブル（強制的な依存関係）
    aws_dynamodb_table.customer_files,
    # その他のリソース
    aws_api_gateway_method.customers_get,
    aws_api_gateway_integration.customers_get,
    aws_api_gateway_method.customers_post,
    aws_api_gateway_integration.customers_post,
    aws_api_gateway_method.customers_options,
    aws_api_gateway_integration.customers_options,
    aws_api_gateway_method.customer_get,
    aws_api_gateway_integration.customer_get,
    aws_api_gateway_method.customer_put,
    aws_api_gateway_integration.customer_put,
    aws_api_gateway_method.customer_delete,
    aws_api_gateway_integration.customer_delete,
    aws_api_gateway_method.customer_options,
    aws_api_gateway_integration.customer_options,
    aws_api_gateway_method_response.customers_options,
    aws_api_gateway_integration_response.customers_options,
    aws_api_gateway_method_response.customer_options,
    aws_api_gateway_integration_response.customer_options,
    aws_api_gateway_method.faqs_get,
    aws_api_gateway_integration.faqs_get,
    aws_api_gateway_method.faqs_post,
    aws_api_gateway_integration.faqs_post,
    aws_api_gateway_method.faqs_options,
    aws_api_gateway_integration.faqs_options,
    aws_api_gateway_method.faq_get,
    aws_api_gateway_integration.faq_get,
    aws_api_gateway_method.faq_put,
    aws_api_gateway_integration.faq_put,
    aws_api_gateway_method.faq_delete,
    aws_api_gateway_integration.faq_delete,
    aws_api_gateway_method.faq_options,
    aws_api_gateway_integration.faq_options,
    aws_api_gateway_method_response.faqs_options,
    aws_api_gateway_method_response.faq_options,
    aws_api_gateway_integration_response.faq_options,
    aws_api_gateway_method.ai_generate_post,
    aws_api_gateway_integration.ai_generate_post,
    aws_api_gateway_method.ai_generate_options,
    aws_api_gateway_integration.ai_generate_options,
    aws_api_gateway_method_response.ai_generate_options,
    aws_api_gateway_integration_response.ai_generate_options,
    aws_api_gateway_method.faq_chat_post,
    aws_api_gateway_integration.faq_chat_post,
    aws_api_gateway_method.faq_chat_options,
    aws_api_gateway_integration.faq_chat_options,
    aws_api_gateway_method_response.faq_chat_options,
    aws_api_gateway_integration_response.faq_chat_options,
    aws_api_gateway_method.company_profile_get,
    aws_api_gateway_integration.company_profile_get,
    aws_api_gateway_method.company_profile_put,
    aws_api_gateway_integration.company_profile_put,
    aws_api_gateway_method.company_profile_options,
    aws_api_gateway_integration.company_profile_options,
    aws_api_gateway_method_response.company_profile_options,
    aws_api_gateway_integration_response.company_profile_options,
    aws_api_gateway_method.proposals_get,
    aws_api_gateway_integration.proposals_get,
    aws_api_gateway_method.proposals_post,
    aws_api_gateway_integration.proposals_post,
    aws_api_gateway_method.proposals_options,
    aws_api_gateway_integration.proposals_options,
    aws_api_gateway_method_response.proposals_options,
    aws_api_gateway_integration_response.proposals_options,
    aws_api_gateway_method.proposal_put,
    aws_api_gateway_integration.proposal_put,
    aws_api_gateway_method.proposal_delete,
    aws_api_gateway_integration.proposal_delete,
    aws_api_gateway_method.proposal_options,
    aws_api_gateway_integration.proposal_options,
    aws_api_gateway_method_response.proposal_options,
    aws_api_gateway_integration_response.proposal_options,
    aws_api_gateway_method.proposals_options,
    aws_api_gateway_integration.proposals_options,
    aws_api_gateway_method_response.proposals_options,
    aws_api_gateway_integration_response.proposals_options,
    aws_api_gateway_method.customer_report_post,
    aws_api_gateway_integration.customer_report_post,
    # メール関連のリソース
    aws_api_gateway_method.email_test_connection_post,
    aws_api_gateway_integration.email_test_connection_post,
    aws_api_gateway_method.email_test_connection_options,
    aws_api_gateway_integration.email_test_connection_options,
    aws_api_gateway_method_response.email_test_connection_options,
    aws_api_gateway_integration_response.email_test_connection_options,
    aws_api_gateway_method.email_save_connection_post,
    aws_api_gateway_integration.email_save_connection_post,
    aws_api_gateway_method.email_save_connection_options,
    aws_api_gateway_integration.email_save_connection_options,
    aws_api_gateway_method_response.email_save_connection_options,
    aws_api_gateway_integration_response.email_save_connection_options,
    aws_api_gateway_method.email_connections_get,
    aws_api_gateway_integration.email_connections_get,
    aws_api_gateway_method.email_connections_options,
    aws_api_gateway_integration.email_connections_options,
    aws_api_gateway_method_response.email_connections_options,
    aws_api_gateway_integration_response.email_connections_options,
    aws_api_gateway_method.email_connection_delete,
    aws_api_gateway_integration.email_connection_delete,
    aws_api_gateway_method.email_connection_options,
    aws_api_gateway_integration.email_connection_options,
    aws_api_gateway_method_response.email_connection_options,
    aws_api_gateway_integration_response.email_connection_options,
    aws_api_gateway_method.email_messages_get,
    aws_api_gateway_integration.email_messages_get,
    aws_api_gateway_method.email_messages_options,
    aws_api_gateway_integration.email_messages_options,
    aws_api_gateway_method_response.email_messages_options,
    aws_api_gateway_integration_response.email_messages_options,
    aws_api_gateway_method.email_message_get,
    aws_api_gateway_integration.email_message_get,
    aws_api_gateway_method.email_message_options,
    aws_api_gateway_integration.email_message_options,
    aws_api_gateway_method_response.email_message_options,
    aws_api_gateway_integration_response.email_message_options,
    aws_api_gateway_method.email_send_post,
    aws_api_gateway_integration.email_send_post,
    aws_api_gateway_method.email_send_options,
    aws_api_gateway_integration.email_send_options,
    aws_api_gateway_method_response.email_send_options,
    aws_api_gateway_integration_response.email_send_options,
    aws_api_gateway_method.email_ai_reply_post,
    aws_api_gateway_integration.email_ai_reply_post,
    aws_api_gateway_method.email_ai_reply_options,
    aws_api_gateway_integration.email_ai_reply_options,
    aws_api_gateway_method_response.email_ai_reply_options,
    aws_api_gateway_integration_response.email_ai_reply_options,
    aws_api_gateway_integration_response.email_test_connection_options,
    aws_api_gateway_integration_response.email_save_connection_options,
    aws_api_gateway_integration_response.email_connections_options,
    aws_api_gateway_integration_response.email_connection_options,
    aws_api_gateway_integration_response.email_messages_options,
    # Feature Requests API Resources
    aws_api_gateway_method.feature_requests_post,
    aws_api_gateway_integration.feature_requests_post,
    aws_api_gateway_method.feature_requests_get,
    aws_api_gateway_integration.feature_requests_get,
    aws_api_gateway_method.feature_requests_options,
    aws_api_gateway_method_response.feature_requests_options,
    aws_api_gateway_integration.feature_requests_options,
    aws_api_gateway_integration_response.feature_requests_options,
    aws_api_gateway_method.feature_request_item_put,
    aws_api_gateway_integration.feature_request_item_put,
    aws_api_gateway_method.feature_request_item_options,
    aws_api_gateway_method_response.feature_request_item_options,
    aws_api_gateway_integration.feature_request_item_options,
    aws_api_gateway_integration_response.feature_request_item_options
        ]

  lifecycle {
    create_before_destroy = true
  }
}

# 出力
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.main.id
}

output "api_gateway_endpoint" {
  value = "${aws_api_gateway_rest_api.main.execution_arn}/${var.environment}"
}

output "dynamodb_tables" {
  value = {
    users           = aws_dynamodb_table.users.name
    customers       = aws_dynamodb_table.customers.name
    faqs            = aws_dynamodb_table.faqs.name
    knowledge       = aws_dynamodb_table.knowledge.name
    sales_processes = aws_dynamodb_table.sales_processes.name
    company_profiles = aws_dynamodb_table.company_profiles.name
    proposals       = aws_dynamodb_table.proposals.name
    email_connections = aws_dynamodb_table.email_connections.name
    customer_files  = aws_dynamodb_table.customer_files.name
    feature_requests = aws_dynamodb_table.feature_requests.name
  }
} 