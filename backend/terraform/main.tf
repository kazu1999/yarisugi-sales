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

# ナレッジベーステーブル
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

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  password_policy {
    minimum_length    = 6
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
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
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  callback_urls = ["http://localhost:5173", "https://your-domain.com"]
  logout_urls   = ["http://localhost:5173", "https://your-domain.com"]

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30
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
          aws_dynamodb_table.sales_processes.arn
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

# API Gateway Method Response
resource "aws_api_gateway_method_response" "health" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.root.id
  http_method = aws_api_gateway_method.health.http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }
}

# API Gateway Integration Response
resource "aws_api_gateway_integration_response" "health" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.root.id
  http_method = aws_api_gateway_method.health.http_method
  status_code = aws_api_gateway_method_response.health.status_code

  response_templates = {
    "application/json" = jsonencode({
      message = "Yarisugi Sales API is running"
      timestamp = "$${context.requestTime}"
    })
  }
}

# 顧客管理APIリソース
resource "aws_api_gateway_resource" "customers" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "customers"
}

# 顧客一覧取得 (GET /customers) - 認証なし（開発・テスト用）
resource "aws_api_gateway_method" "customers_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customers.id
  http_method   = "GET"
  authorization = "NONE"
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

# 顧客詳細リソース
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

# CORS用のOPTIONSメソッド (customer)
resource "aws_api_gateway_method" "customer_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 顧客削除 (DELETE /customers/{id})
resource "aws_api_gateway_method" "customer_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
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

# Lambda関数の権限設定
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "yarisugi-customers-api"
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
      SALES_PROCESSES_TABLE = aws_dynamodb_table.sales_processes.name
    }
  }
}

# 現在のAWSアカウントIDを取得
data "aws_caller_identity" "current" {}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = var.environment

  depends_on = [
    aws_api_gateway_method.health,
    aws_api_gateway_integration.health,
    aws_api_gateway_method_response.health,
    aws_api_gateway_integration_response.health,
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
    aws_api_gateway_integration_response.customer_options
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
  }
} 