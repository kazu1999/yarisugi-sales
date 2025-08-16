# Terraform変数定義

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "プロジェクト名"
  type        = string
  default     = "yarisugi-sales"
}

variable "environment" {
  description = "環境（dev, staging, prod）"
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "ドメイン名（本番環境用）"
  type        = string
  default     = "your-domain.com"
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  default     = ""
  sensitive   = true
} 