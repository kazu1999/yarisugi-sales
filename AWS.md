# AWS構成ドキュメント - Yarisugi Sales

## 概要
Yarisugi Salesアプリケーションは、AWS上でサーバーレスアーキテクチャを採用したセールス支援システムです。

## アーキテクチャ構成

### 1. API Gateway
**API名**: `yarisugi-sales-api-dev`  
**API ID**: `xpx8akh2cj`  
**ベースURL**: `https://xpx8akh2cj.execute-api.ap-northeast-1.amazonaws.com/dev`

#### エンドポイント一覧

| エンドポイント | メソッド | Lambda関数 | 説明 |
|---|---|---|---|
| `/health` | GET | - | ヘルスチェック |
| `/customers` | GET, POST | `yarisugi-customers-api` | 顧客管理 |
| `/customers/{id}` | GET, PUT, DELETE | `yarisugi-customers-api` | 個別顧客操作 |
| `/faqs` | GET, POST | `yarisugi-faqs-api` | FAQ管理 |
| `/faqs/{id}` | GET, PUT, DELETE | `yarisugi-faqs-api` | 個別FAQ操作 |
| `/knowledge` | GET, POST | `knowledge-api` | ナレッジ管理 |
| `/knowledge/{knowledgeId}` | DELETE | `knowledge-api` | 個別ナレッジ削除 |
| `/ai-generate` | POST | `yarisugi-ai-generator` | AI FAQ生成 |
| `/rag-search` | POST | `yarisugi-sales-rag-search-dev` | AI検索 |

#### リソース構造
```
/
├── health (GET)
├── customers
│   ├── GET, POST
│   └── {id}
│       └── GET, PUT, DELETE
├── faqs
│   ├── GET, POST
│   └── {id}
│       └── GET, PUT, DELETE
├── knowledge
│   ├── GET, POST
│   └── {knowledgeId}
│       └── DELETE
├── ai-generate
│   └── POST
└── rag-search
    └── POST
```

### 2. Lambda関数

#### 顧客管理 (`yarisugi-customers-api`)
- **Runtime**: Python 3.13
- **Handler**: `customers.lambda_handler`
- **機能**: 顧客データのCRUD操作
- **DynamoDBテーブル**: `yarisugi-sales-customers-dev`

#### FAQ管理 (`yarisugi-faqs-api`)
- **Runtime**: Python 3.11
- **Handler**: `faqs.lambda_handler`
- **機能**: FAQデータのCRUD操作
- **DynamoDBテーブル**: `yarisugi-sales-faqs-dev`
- **AI統合**: OpenAI API（FAQ生成）

#### ナレッジ管理 (`knowledge-api`)
- **Runtime**: Python 3.13
- **Handler**: `knowledge_manager.lambda_handler`
- **機能**: ナレッジデータ管理、PDFアップロード、テキスト抽出、ベクトル化
- **DynamoDBテーブル**: 
  - `yarisugi-sales-knowledge-dev`
  - `yarisugi-sales-knowledge-vectors-dev`
- **AI統合**: OpenAI API（要約、埋め込み生成）
- **メモリ**: 512MB
- **タイムアウト**: 29秒
- **最適化**: バッチ処理、チャンク制限

#### AI生成 (`yarisugi-ai-generator`)
- **Runtime**: Python 3.11
- **Handler**: `ai_generator.lambda_handler`
- **機能**: テキストからのFAQ自動生成
- **AI統合**: OpenAI API（GPT-4o-mini）
- **DynamoDBテーブル**: `yarisugi-sales-faqs-dev`

#### RAG検索 (`yarisugi-sales-rag-search-dev`)
- **Runtime**: Python 3.11
- **Handler**: `rag_search.lambda_handler`
- **機能**: ベクトル検索による知識検索
- **AI統合**: OpenAI API（埋め込み、回答生成）
- **DynamoDBテーブル**: `yarisugi-sales-knowledge-vectors-dev`

### 3. DynamoDB テーブル

#### 顧客データ (`yarisugi-sales-customers-dev`)
- **パーティションキー**: customer_id
- **用途**: 顧客情報の保存

#### FAQデータ (`yarisugi-sales-faqs-dev`)
- **パーティションキー**: faq_id
- **用途**: FAQ情報の保存

#### ナレッジデータ (`yarisugi-sales-knowledge-dev`)
- **パーティションキー**: knowledge_id
- **用途**: ナレッジ情報、メタデータの保存

#### ベクトルデータ (`yarisugi-sales-knowledge-vectors-dev`)
- **パーティションキー**: vector_id
- **用途**: ベクトル埋め込み、検索インデックス

#### ユーザーデータ (`yarisugi-sales-users-dev`)
- **パーティションキー**: user_id
- **用途**: ユーザー情報の保存

#### 営業プロセス (`yarisugi-sales-sales-processes-dev`)
- **パーティションキー**: process_id
- **用途**: 営業プロセス管理

### 4. AWS Secrets Manager

#### OpenAI APIキー (`yarisugi-sales-openai-api-key-dev`)
- **説明**: OpenAI API Key for AI functions
- **使用Lambda**: 
  - `knowledge-api`
  - `yarisugi-ai-generator`
  - `yarisugi-sales-rag-search-dev`

### 5. IAM ロール

#### Lambda実行ロール (`yarisugi-sales-lambda-role-dev`)
- **アタッチ済みポリシー**:
  - `AWSLambdaBasicExecutionRole`
  - `SecretsManagerReadWrite`
- **カスタムポリシー**: DynamoDB操作権限

### 6. CORS設定

全てのエンドポイントでCORS設定が有効化されており、以下のヘッダーが設定されています：

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Authorization,Content-Type,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With
Access-Control-Allow-Credentials: false
Access-Control-Max-Age: 600
```

## セキュリティ

### 認証
- **Amazon Cognito** を使用したユーザー認証
- **JWT トークン** による API アクセス制御

### 機密情報管理
- **AWS Secrets Manager** によるAPIキーの安全な管理
- 環境変数での直接的な機密情報保存を回避

### ネットワーク
- **HTTPS** による暗号化通信
- **API Gateway** による統一エンドポイント

## パフォーマンス最適化

### ナレッジ管理
- **バッチ処理**: OpenAI API呼び出しの最適化（64チャンクずつ処理）
- **チャンク制限**: 最大48チャンクまでの同期処理
- **Lambda設定**: メモリ512MB、タイムアウト29秒

### データベース
- **DynamoDB**: スケーラブルなNoSQLデータベース
- **ベクトル検索**: 専用テーブルによる高速検索

## 監視・ログ

### CloudWatch Logs
各Lambda関数の実行ログが以下のロググループに保存されます：
- `/aws/lambda/yarisugi-customers-api`
- `/aws/lambda/yarisugi-faqs-api`
- `/aws/lambda/knowledge-api`
- `/aws/lambda/yarisugi-ai-generator`
- `/aws/lambda/yarisugi-sales-rag-search-dev`

### エラーハンドリング
- 統一されたエラーレスポンス形式
- 詳細なログ出力による問題の特定

## デプロイメント

### Terraform
インフラストラクチャはTerraformで管理されており、以下のファイルで設定されています：
- `backend/terraform/main.tf`
- `backend/terraform/terraform.tfvars` (機密情報含む、gitignoreに追加済み)

### Lambda デプロイ
各Lambda関数は個別にZipファイルとしてパッケージ化され、AWS CLIでデプロイされます。

## トラブルシューティング

### よくある問題

1. **OpenAI API エラー**
   - Secrets Managerの値を確認
   - IAM権限を確認

2. **CORS エラー**
   - OPTIONS メソッドの設定を確認
   - レスポンスヘッダーを確認

3. **DynamoDB アクセスエラー**
   - Lambda実行ロールの権限を確認
   - テーブル名の環境変数を確認

4. **PDF処理エラー**
   - ファイルサイズ制限を確認
   - 文字エンコーディングを確認

---

**最終更新**: 2025年8月20日  
**バージョン**: v2.7.0  
**更新者**: AI Assistant
