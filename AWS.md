# AWS アーキテクチャ仕様書

## 概要
Yarisugi Sales Management SystemのAWSアーキテクチャ仕様書です。AIを活用した顧客分析と営業戦略提案機能により、営業担当者の生産性を大幅に向上させます。

## アーキテクチャ図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  API Gateway    │    │   Lambda        │
│   (Frontend)    │◄──►│   (REST API)    │◄──►│   Functions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cognito       │    │   DynamoDB      │    │   S3            │
│   (Auth)        │    │   (Database)    │    │   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 認証・認可

### AWS Cognito
- **User Pool**: `ap-northeast-1_HePREiq48`
- **App Client**: `52r963fff4l1s8d15p641u5kq7`
- **認証フロー**: USER_SRP_AUTH
- **JWT認証**: API Gatewayでの認証付きエンドポイント

## データベース

### Amazon DynamoDB

#### ユーザーテーブル (`yarisugi-sales-users-dev`)
- **PK**: `USER#{userId}`
- **SK**: `USER#{userId}`
- **属性**: email, username, createdAt, updatedAt

#### 顧客テーブル (`yarisugi-sales-customers-dev`)
- **PK**: `USER#{userId}`
- **SK**: `CUSTOMER#{customerId}`
- **属性**: companyName, customerName, location, industry, siteUrl, snsStatus, lineId, email, salesPerson, status, createdAt, updatedAt

#### FAQテーブル (`yarisugi-sales-faqs-dev`)
- **PK**: `USER#{userId}`
- **SK**: `FAQ#{faqId}`
- **属性**: question, answer, category, tags, isPublic, createdAt, updatedAt

#### ナレッジテーブル (`yarisugi-sales-knowledge-dev`)
- **PK**: `KNOWLEDGE#{userId}`
- **SK**: `KNOWLEDGE#{knowledgeId}`
- **属性**: title, content, category, summary, createdAt, updatedAt

#### ナレッジベクトルテーブル (`yarisugi-sales-knowledge-vectors-dev`)
- **PK**: `knowledgeId`
- **SK**: `chunkIndex`
- **属性**: userId, chunkText, embedding, similarity

#### 営業プロセステーブル (`yarisugi-sales-sales-processes-dev`)
- **PK**: `USER#{userId}`
- **SK**: `PROCESS#{processId}`
- **属性**: name, steps, createdAt, updatedAt

#### 基本情報テーブル (`yarisugi-sales-company-profiles-dev`)
- **PK**: `USER#{userId}`
- **SK**: `PROFILE#{userId}`
- **属性**: companyName, introduction, services, achievements, createdAt, updatedAt

#### 提案内容テーブル (`yarisugi-sales-proposals-dev`)
- **PK**: `USER#{userId}`
- **SK**: `PROPOSAL#{proposalId}`
- **属性**: title, purpose, content, estimatedCost, documentUrl, order, createdAt, updatedAt

## API Gateway

### エンドポイント一覧

#### 認証・ヘルスチェック
- `GET /` - ヘルスチェック

#### 顧客管理 (`yarisugi-customers-api`)
- `GET /customers` - 顧客一覧取得
- `POST /customers` - 顧客登録
- `GET /customers/{id}` - 顧客詳細取得
- `PUT /customers/{id}` - 顧客情報更新
- `DELETE /customers/{id}` - 顧客削除

#### FAQ管理 (`yarisugi-faqs-api`)
- `GET /faqs` - FAQ一覧取得
- `POST /faqs` - FAQ作成
- `GET /faqs/{id}` - FAQ詳細取得
- `PUT /faqs/{id}` - FAQ更新
- `DELETE /faqs/{id}` - FAQ削除

#### ナレッジ管理 (`yarisugi-sales-knowledge-manager-dev`)
- `GET /knowledge` - ナレッジ一覧取得
- `POST /knowledge` - ナレッジ登録（PDF対応）
- `GET /knowledge/{id}` - ナレッジ詳細取得
- `DELETE /knowledge/{id}` - ナレッジ削除

#### AI生成 (`yarisugi-ai-generator`)
- `POST /ai-generate` - AI FAQ自動生成

#### RAG検索 (`yarisugi-sales-rag-search-dev`) ✅ 最適化済み
- `POST /rag-search` - AI検索（最適化済み）
- **メモリ**: 3008MB
- **タイムアウト**: 29秒
- **最適化**: vector limits, processing time, similarity, context length, DynamoDB key structure fix

#### S3署名付きURL (`yarisugi-sales-s3-presigned-url-dev`)
- `POST /knowledge/s3-presigned-url` - ファイルアップロード用URL生成

#### 基本情報管理 (`yarisugi-sales-company-profile-dev`) ✅ 新規追加
- `GET /company-profile` - 基本情報取得
- `PUT /company-profile` - 基本情報更新
- `GET /company-profile/proposals` - 提案内容一覧取得
- `POST /company-profile/proposals` - 提案内容追加
- `PUT /company-profile/proposals/{id}` - 提案内容更新
- `DELETE /company-profile/proposals/{id}` - 提案内容削除

#### AI顧客レポート生成 (`yarisugi-sales-customer-report-dev`) ✅ 新規追加
- `POST /customer-report` - AI顧客レポート生成（Webサイト分析含む）
- **メモリ**: 256MB
- **タイムアウト**: 30秒
- **機能**: Webサイト分析、包括的顧客分析、営業戦略提案

### CORS設定
- **許可オリジン**: `*`（全オリジン許可）
- **許可メソッド**: GET, POST, PUT, DELETE, OPTIONS
- **許可ヘッダー**: Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token

## Lambda関数

### 顧客管理Lambda
- **ランタイム**: Python 3.11
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **依存関係**: boto3, pydantic==1.10.13

### FAQ管理Lambda
- **ランタイム**: Python 3.11
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **依存関係**: boto3

### ナレッジ管理Lambda
- **ランタイム**: Python 3.11
- **メモリ**: 3008MB
- **タイムアウト**: 900秒
- **依存関係**: boto3, openai, PyPDF2
- **機能**: PDF処理、AI要約、ベクトル化

### AI生成Lambda
- **ランタイム**: Python 3.11
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **依存関係**: boto3, openai
- **機能**: OpenAI GPT統合

### RAG検索Lambda
- **ランタイム**: Python 3.11
- **メモリ**: 3008MB
- **タイムアウト**: 29秒
- **依存関係**: boto3, openai
- **機能**: ベクトル検索、RAG応答生成

### S3署名付きURL Lambda
- **ランタイム**: Python 3.11
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **依存関係**: boto3
- **機能**: S3署名付きURL生成

### 基本情報管理Lambda ✅ 新規追加
- **ランタイム**: Python 3.11
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **依存関係**: boto3
- **機能**: 基本情報・提案内容のCRUD操作

### AI顧客レポート生成Lambda ✅ 新規追加
- **ランタイム**: Python 3.11
- **メモリ**: 256MB
- **タイムアウト**: 30秒
- **依存関係**: boto3, requests==2.31.0, beautifulsoup4==4.12.2
- **機能**: Webサイト分析、AI顧客分析、営業戦略提案

## ストレージ

### Amazon S3
- **バケット**: `yarisugi-sales-uploads-dev`
- **用途**: PDFファイルの一時保存
- **ライフサイクル**: 7日後に自動削除
- **CORS設定**: アップロード用

## セキュリティ

### IAMロール
- **Lambda実行ロール**: DynamoDB、CloudWatch Logs、S3アクセス権限
- **AI Lambda実行ロール**: OpenAI API Key（Secrets Manager）アクセス権限

### Secrets Manager
- **シークレット**: `yarisugi-sales-openai-api-key-dev`
- **用途**: OpenAI API Keyの安全な管理

## 監視・ログ

### CloudWatch
- **ロググループ**: 各Lambda関数の実行ログ
- **メトリクス**: API Gateway、Lambda、DynamoDBのメトリクス

## デプロイ

### Terraform
- **状態管理**: S3バックエンド
- **変数**: `terraform.tfvars`で環境固有の設定
- **モジュール**: 各AWSリソースの定義

### デプロイ手順
1. `terraform init`
2. `terraform plan`
3. `terraform apply`

## AI顧客レポート生成機能 ✅ 新規追加

### 概要
顧客のWebサイトを自動分析し、包括的な顧客分析レポートと営業戦略を生成する機能です。

### 機能特徴
- **Webサイト自動分析**: 顧客のWebサイトを自動取得・解析
- **包括的顧客分析**: 顧客情報、Webサイト内容、自社情報を統合分析
- **営業戦略提案**: AIによる具体的な営業提案とアプローチ方法
- **3セクション構成**: 顧客まとめ、営業提案、推奨アプローチ

### 技術仕様

#### Webサイト分析機能
- **BeautifulSoup4**: HTML解析による高精度なテキスト抽出
- **URL正規化**: `http://`や`https://`が付いていないURLも自動処理
- **テキストクリーニング**: 不要なHTML要素（script、style、nav、footer、header）を除去
- **文字数制限**: 2000文字に制限してAIの処理負荷を軽減
- **エラーハンドリング**: サイト取得失敗時の適切な処理

#### AI分析機能
- **OpenAI GPT-4o-mini**: 自然言語処理による顧客分析
- **統合分析**: 顧客情報、Webサイト内容、自社情報、提案内容を統合
- **営業コンサルタント**: 営業専門家としての分析・提案
- **構造化出力**: 3つのセクションに分けた詳細なレポート

### API仕様

#### 顧客レポート生成
- **POST /customer-report**: AI顧客レポート生成（Webサイト分析含む）

#### リクエスト形式
```json
{
  "customerData": {
    "companyName": "顧客会社名",
    "customerName": "担当者名",
    "industry": "業種",
    "location": "所在地",
    "siteUrl": "WebサイトURL",
    "email": "メールアドレス",
    "lineId": "LINE ID",
    "snsStatus": "SNS運用状況",
    "salesPerson": "担当営業",
    "status": "ステータス"
  },
  "companyProfile": {
    "companyName": "自社名",
    "introduction": "自己紹介文",
    "services": "サービス内容",
    "achievements": "実績",
    "proposals": [
      {
        "title": "提案タイトル",
        "purpose": "提案目的",
        "content": "提案内容",
        "estimatedCost": "想定金額"
      }
    ]
  }
}
```

#### レスポンス形式
```json
{
  "customerSummary": "顧客についてのまとめ（200-300文字）",
  "salesProposal": "営業提案（300-400文字）",
  "recommendedApproach": "推奨アプローチ（200-300文字）",
  "generatedAt": "2025-08-25T06:59:24.085000+00:00",
  "modelUsed": "gpt-4o-mini"
}
```

### 処理フロー
1. **Webサイト取得**: 顧客のWebサイトURLからHTMLを取得
2. **テキスト抽出**: BeautifulSoup4でHTMLを解析し、テキストを抽出
3. **データ統合**: 顧客情報、Webサイト内容、自社情報を統合
4. **AI分析**: OpenAI GPT-4o-miniで包括的な分析を実行
5. **レポート生成**: 3つのセクションに分けた詳細なレポートを生成

### エラーハンドリング
- **サイト取得失敗**: サイトが取得できない場合でもレポート生成を継続
- **タイムアウト**: 10秒のタイムアウトでレスポンス性を確保
- **User-Agent設定**: ブラウザとして認識されるようヘッダーを設定
- **CORS対応**: フロントエンドからのアクセスに対応

## 基本情報管理機能 ✅ 新規追加

### 概要
自社情報と提案内容を管理する機能です。

### データ構造

#### 基本情報
```json
{
  "userId": "cognito-user-id",
  "companyName": "株式会社サンプル",
  "introduction": "自己紹介文",
  "services": "サービス構成",
  "achievements": "過去の実績・事例",
  "createdAt": "2025-08-23T00:00:00.000Z",
  "updatedAt": "2025-08-23T00:00:00.000Z"
}
```

#### 提案内容
```json
{
  "id": "proposal-uuid",
  "userId": "cognito-user-id",
  "title": "提案内容タイトル",
  "purpose": "提案目的",
  "content": "提案詳細",
  "estimatedCost": "想定金額",
  "documentUrl": "提案資料URL",
  "order": 1,
  "createdAt": "2025-08-23T00:00:00.000Z",
  "updatedAt": "2025-08-23T00:00:00.000Z"
}
```

### API仕様

#### 基本情報管理
- **GET /company-profile**: 基本情報取得
- **PUT /company-profile**: 基本情報更新

#### 提案内容管理
- **GET /company-profile/proposals**: 提案内容一覧取得（order順）
- **POST /company-profile/proposals**: 提案内容追加
- **PUT /company-profile/proposals/{id}**: 提案内容更新
- **DELETE /company-profile/proposals/{id}**: 提案内容削除

### 機能特徴
- **動的提案内容**: 提案内容の追加・編集・削除が可能
- **順序管理**: 提案内容の表示順序を管理
- **バリデーション**: 必須フィールドの検証
- **リアルタイム更新**: データの即座な反映

## RAG検索最適化

### 最適化内容
- **DynamoDBキー構造修正**: 複合キー（PK/SK）の正しい使用
- **ベクトル数制限**: 最大3000ベクトルでの効率的な検索
- **処理時間最適化**: 29秒API制限内での高速処理（2-10秒）
- **類似度スコア**: 0.5以上の高精度な検索
- **コンテキスト長制限**: 8000文字以内での最適な回答生成

### 技術的改善
- **メモリ最適化**: 3008MBメモリでの大規模処理対応
- **エラーハンドリング**: 詳細なデバッグログとエラー回復機能
- **DynamoDB統合**: 正確なナレッジコンテキスト取得
- **パフォーマンス向上**: ベクトル検索の高速化

### 検索フロー
1. **クエリベクトル化**: ユーザー質問をベクトル化
2. **類似度検索**: DynamoDBで類似ベクトルを検索
3. **コンテキスト取得**: 関連ナレッジの詳細情報を取得
4. **RAG応答生成**: OpenAI GPTで回答を生成

### パフォーマンス指標
- **検索時間**: 2-10秒（29秒制限内）
- **ベクトル数**: 最大3000個
- **類似度閾値**: 0.5以上
- **コンテキスト長**: 8000文字以内
- **メモリ使用量**: 3008MB

## 最終更新
2025年8月25日

## バージョン
v3.4.0
