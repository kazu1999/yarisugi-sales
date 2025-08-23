# AWS構成ドキュメント - Yarisugi Sales

## 概要
Yarisugi Salesアプリケーションは、AWS上でサーバーレスアーキテクチャを採用したセールス支援システムです。

## アーキテクチャ構成

### 1. API Gateway
**API名**: `yarisugi-sales-api-dev`  
**API ID**: `j6vov5s543`  
**ベースURL**: `https://j6vov5s543.execute-api.ap-northeast-1.amazonaws.com/dev`

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
| `/knowledge/s3-presigned-url` | POST | `yarisugi-sales-s3-presigned-url-dev` | S3署名付きURL生成 |
| `/ai-generate` | POST | `yarisugi-ai-generator` | AI FAQ生成 |
| `/rag-search` | POST | `yarisugi-sales-rag-search-dev` | AI検索（最適化済み） |

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
│   ├── {knowledgeId}
│   │   └── DELETE
│   └── s3-presigned-url
│       └── POST
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
- **Runtime**: Python 3.11
- **Handler**: `knowledge_manager.lambda_handler`
- **機能**: ナレッジデータ管理、PDFアップロード、テキスト抽出、ベクトル化、自動削除
- **DynamoDBテーブル**: 
  - `yarisugi-sales-knowledge-dev`
  - `yarisugi-sales-knowledge-vectors-dev`
- **AI統合**: OpenAI API（要約、埋め込み生成）
- **メモリ**: 3008MB
- **タイムアウト**: 900秒
- **最適化**: バッチ処理、チャンク制限、S3統合
- **削除機能**: ナレッジエントリ削除時にベクトルも自動削除（BatchWriteItem）

#### S3署名付きURL生成 (`yarisugi-sales-s3-presigned-url-dev`)
- **Runtime**: Python 3.11
- **Handler**: `s3_presigned_url.lambda_handler`
- **機能**: S3への直接アップロード用署名付きURL生成
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **認証**: Cognito User Pools

#### AI生成 (`yarisugi-ai-generator`)
- **Runtime**: Python 3.11
- **Handler**: `ai_generator.lambda_handler`
- **機能**: テキストからのFAQ自動生成
- **AI統合**: OpenAI API（GPT-4o-mini）
- **DynamoDBテーブル**: `yarisugi-sales-faqs-dev`

#### RAG検索 (`yarisugi-sales-rag-search-dev`) ✅ **最適化済み**
- **Runtime**: Python 3.11
- **Handler**: `rag_search.lambda_handler`
- **機能**: ベクトル検索による知識検索（最適化済み）
- **AI統合**: OpenAI API（埋め込み、回答生成）
- **DynamoDBテーブル**: `yarisugi-sales-knowledge-vectors-dev`
- **メモリ**: 3008MB
- **タイムアウト**: 29秒
- **最適化**: 
  - ベクトル数制限: 最大3000ベクトル
  - 処理時間: 2-10秒（29秒制限内）
  - 類似度スコア: 0.5以上の高精度検索
  - コンテキスト長制限: 8000文字
  - DynamoDBキー構造修正: `PK` + `SK`形式での正確なコンテキスト取得

### 3. DynamoDB テーブル

#### 顧客データ (`yarisugi-sales-customers-dev`)
- **パーティションキー**: customer_id
- **用途**: 顧客情報の保存

#### FAQデータ (`yarisugi-sales-faqs-dev`)
- **パーティションキー**: faq_id
- **用途**: FAQ情報の保存

#### ナレッジデータ (`yarisugi-sales-knowledge-dev`)
- **パーティションキー**: PK (KNOWLEDGE#{userId})
- **ソートキー**: SK (KNOWLEDGE#{knowledgeId})
- **用途**: ナレッジ情報の保存

#### ナレッジベクトル (`yarisugi-sales-knowledge-vectors-dev`)
- **パーティションキー**: knowledgeId
- **ソートキー**: chunkIndex
- **用途**: テキストチャンクのベクトル埋め込み保存

#### ユーザーデータ (`yarisugi-sales-users-dev`)
- **パーティションキー**: PK
- **ソートキー**: SK
- **GSI**: EmailIndex
- **用途**: ユーザー認証情報の保存

#### セールスプロセス (`yarisugi-sales-sales-processes-dev`)
- **パーティションキー**: process_id
- **用途**: セールスプロセス情報の保存

### 4. S3 バケット

#### ファイルアップロード (`yarisugi-sales-uploads-dev`)
- **用途**: 大きなファイル（PDF等）のアップロード
- **CORS設定**: フロントエンドからの直接アップロード対応
- **バージョニング**: 有効
- **アクセス制御**: プライベート
- **ファイルパス**: `{user_id}/{timestamp}_{random_id}.{extension}`

### 5. Cognito User Pool
- **User Pool ID**: `ap-northeast-1_HePREiq48`
- **Client ID**: `52r963fff4l1s8d15p641u5kq7`
- **認証方式**: JWT
- **用途**: フロントエンド認証

### 6. Secrets Manager
- **OpenAI API Key**: `yarisugi-sales-openai-api-key-dev`
- **用途**: AI機能用APIキーの安全な管理

### 7. IAMロール・ポリシー

#### AI Lambda関数用IAMロール (`yarisugi-sales-ai-lambda-role-dev`)
- **用途**: ナレッジ管理、AI生成、RAG検索Lambda関数の実行権限
- **DynamoDB権限**: 
  - `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`
  - `BatchWriteItem`（ベクトル削除用）
  - `Query`, `Scan`
- **対象テーブル**: 
  - `yarisugi-sales-knowledge-dev`
  - `yarisugi-sales-knowledge-vectors-dev`
  - `yarisugi-sales-faqs-dev`
- **Secrets Manager権限**: `GetSecretValue`（OpenAI API Key取得）
- **CloudWatch Logs権限**: ログ出力用

## ファイルアップロード機能

### 大きなファイル対応
- **5MB以下**: 直接API Gateway経由でアップロード
- **5MB以上**: S3直接アップロード（署名付きURL使用）

### S3直接アップロードフロー
1. フロントエンドが署名付きURLを要求
2. S3署名付きURL LambdaがURL生成
3. フロントエンドがS3に直接アップロード
4. ナレッジ管理LambdaがS3からファイル取得・処理

### セキュリティ
- ユーザーIDベースのファイルパス分離
- 署名付きURLの有効期限（1時間）
- プライベートバケット設定

## ナレッジ削除機能

### 自動削除機能
- **ナレッジエントリ削除**: メインのナレッジデータを削除
- **ベクトル自動削除**: 対応するベクトルデータも自動削除
- **バッチ処理**: `BatchWriteItem`による効率的な削除
- **エラーハンドリング**: 削除失敗時の詳細ログ出力

### 削除フロー
1. ナレッジエントリの存在確認
2. メインのナレッジデータを削除
3. 対応するベクトルデータを検索
4. `BatchWriteItem`でベクトルを一括削除
5. 削除結果をログ出力

### IAM権限要件
- **BatchWriteItem**: ベクトルテーブルからの一括削除に必要
- **DeleteItem**: メインのナレッジデータ削除に必要
- **Query**: 削除対象のベクトル検索に必要

## インフラストラクチャ管理

### Terraform管理
**重要**: 全てのAWSリソースがTerraformで管理されています。

#### 管理対象リソース
- ✅ API Gateway（全エンドポイント）
- ✅ Lambda関数（全6個）
- ✅ DynamoDBテーブル（全6個）
- ✅ S3バケット（アップロード用）
- ✅ Cognito User Pool
- ✅ IAMロール・ポリシー
- ✅ Secrets Manager
- ✅ Lambda権限

#### 設定ファイル
- `backend/terraform/main.tf` - メイン設定
- `backend/terraform/terraform.tfvars` - 環境変数（機密情報含む）

#### デプロイ手順
```bash
cd backend/terraform
terraform plan
terraform apply
```

#### 重要事項
- **手動でのAWSリソース変更は避けてください**
- 全ての変更はTerraform設定ファイルで行ってください
- 新しいリソース追加時はTerraform設定に追加してからデプロイしてください

## ログ監視

### CloudWatch Logs
各Lambda関数のログは以下のパスで確認できます：
- `/aws/lambda/yarisugi-customers-api`
- `/aws/lambda/yarisugi-faqs-api`
- `/aws/lambda/yarisugi-sales-knowledge-manager-dev`
- `/aws/lambda/yarisugi-sales-s3-presigned-url-dev`
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
各Lambda関数は個別にZipファイルとしてパッケージ化され、Terraformでデプロイされます。

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

5. **S3アップロードエラー**
   - CORS設定を確認
   - IAM権限を確認
   - 署名付きURLの有効期限を確認

6. **Terraformエラー**
   - 設定ファイルの構文を確認
   - 既存リソースとの競合を確認
   - 状態ファイルの整合性を確認

## API URL設定について

### フロントエンドでのAPI URL指定

フロントエンドアプリケーションが参照するAPI GatewayのURLは、以下の順序で設定されます：

#### 1. 環境変数ファイル（`.env`）
最も重要なファイルで、実際に使用されるAPI GatewayのURLを指定します。

```bash
# .envファイル
VITE_API_GATEWAY_ENDPOINT=https://j6vov5s543.execute-api.ap-northeast-1.amazonaws.com/dev
```

#### 2. 設定ファイル（`src/utils/awsConfig.js`）
環境変数からAPI Gatewayのエンドポイントを読み取る設定ファイルです。

```javascript
// API Gateway設定
apiGateway: {
  endpoint: import.meta.env.VITE_API_GATEWAY_ENDPOINT || '',
  region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1'
}
```

#### 3. APIクライアント（`src/utils/awsApiClient.js`）
実際にAPIリクエストを送信する際に使用されるファイルです。

```javascript
class AwsApiClient {
  constructor() {
    this.baseUrl = awsConfig.apiGateway.endpoint;
    this.region = awsConfig.apiGateway.region;
  }
}
```

### 設定の優先順位

1. **`.env`ファイル** - 実際の環境変数（最重要）
2. **`src/utils/awsConfig.js`** - 環境変数を読み取る設定
3. **`src/utils/awsApiClient.js`** - 実際のAPIリクエストで使用

### 重要なポイント

- 実際に使用されるのは`.env`ファイルの値です
- 他のファイル（`README.md`、`AWS.md`、`api-specification.yaml`）はドキュメント用で、コードには影響しません
- `.env`ファイルを更新したら、アプリケーションを再起動する必要があります
- API Gateway IDが変更された場合は、`.env`ファイルの`VITE_API_GATEWAY_ENDPOINT`を更新してください

### 設定変更時の手順

1. `.env`ファイルでAPI Gateway URLを更新
2. アプリケーションを再起動
3. 必要に応じてドキュメント（`README.md`、`AWS.md`、`api-specification.yaml`）を更新

## RAG検索最適化

### 最適化内容
- **DynamoDBキー構造修正**: `PK` + `SK`形式での正確なナレッジコンテキスト取得
- **パフォーマンス向上**: 29秒API制限内での高速処理（2-10秒）
- **ベクトル数制限**: 最大3000ベクトルでの効率的な検索
- **メモリ最適化**: 3008MBメモリでの大規模処理対応

### 技術的改善
- **エラーハンドリング**: 詳細なデバッグログとエラー回復機能
- **類似度スコア**: 高精度なコサイン類似度計算（0.5以上）
- **コンテキスト長制限**: 8000文字以内での最適な回答生成
- **Terraform同期**: 最新のRAG検索Lambda関数の完全同期

### 検索フロー
1. **クエリ埋め込み生成**: ユーザーの質問をベクトル化
2. **類似度検索**: ナレッジベースから関連文書を検索
3. **コンテキスト構築**: 関連文書を統合
4. **LLM応答生成**: OpenAI GPT-4o-miniで回答生成

### パフォーマンス指標
- **処理時間**: 2-10秒（29秒制限内）
- **メモリ使用量**: 87MB（3008MB中）
- **ベクトル数**: 3-5チャンク（制限内）
- **類似度スコア**: 0.5以上で高精度

---

**最終更新**: 2025年8月23日  
**バージョン**: v3.2.0  
**更新者**: AI Assistant  
**主な変更**: RAG検索最適化、DynamoDBキー構造修正、パフォーマンス向上完了
