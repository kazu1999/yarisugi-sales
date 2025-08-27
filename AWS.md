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

#### メール接続テーブル (`yarisugi-sales-email-connections-dev`) ✅ 最新版
- **PK**: `USER#{userId}`
- **SK**: `EMAIL_CONNECTION#{connectionId}`
- **属性**: emailAddress, imapServer, imapPort, useSSL, isActive, createdAt, updatedAt

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

#### メール管理 (`yarisugi-sales-email-manager-dev`) ✅ 最新版
- `POST /email/test-connection` - メール接続テスト
- `POST /email/save-connection` - メール接続保存
- `GET /email/connections` - メール接続一覧取得
- `DELETE /email/connections/{connectionId}` - メール接続削除
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **機能**: IMAP接続テスト、接続情報管理

#### メール取得 (`yarisugi-sales-email-fetcher-dev`) ✅ 最新版（顧客フィルタリング対応）
- `GET /email/messages` - メール一覧取得（顧客フィルタリング対応、最新30件）
- `GET /email/messages/{messageId}` - メール詳細取得（顧客メールのみ）
- **メモリ**: 256MB
- **タイムアウト**: 30秒
- **機能**: IMAPメール取得、顧客フィルタリング、詳細表示
- **環境変数**: `EMAIL_CONNECTIONS_TABLE`, `CUSTOMERS_TABLE`

#### メール送信 (`yarisugi-sales-email-sender-dev`) ✅ 新規追加
- `POST /email/send` - メール送信（返信機能）
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **機能**: SMTP送信、返信機能
- **環境変数**: `EMAIL_CONNECTIONS_TABLE`

#### AI返信提案 (`yarisugi-sales-email-ai-reply-dev`) ✅ 最新版
- `POST /email/ai-reply` - AI返信提案生成（FAQ活用）
- **メモリ**: 256MB
- **タイムアウト**: 30秒
- **機能**: OpenAI GPT-4o-miniによる返信生成、FAQ活用
- **環境変数**: `FAQS_TABLE`, `OPENAI_API_KEY_SECRET_NAME`
- **依存関係**: boto3, openai, typing_extensions

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

### メール管理Lambda ✅ 最新版
- **ランタイム**: Python 3.11
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **依存関係**: boto3, imaplib, email
- **機能**: IMAP接続テスト、接続情報のCRUD操作

### メール取得Lambda ✅ 最新版（顧客フィルタリング対応）
- **ランタイム**: Python 3.11
- **メモリ**: 256MB
- **タイムアウト**: 30秒
- **依存関係**: boto3, imaplib, email
- **機能**: IMAPメール取得、顧客フィルタリング、メール詳細表示
- **環境変数**: `EMAIL_CONNECTIONS_TABLE`, `CUSTOMERS_TABLE`
- **フィルタリング**: 顧客テーブルに登録されている顧客からのメールのみ表示

### メール送信Lambda ✅ 新規追加
- **ランタイム**: Python 3.11
- **メモリ**: 128MB
- **タイムアウト**: 30秒
- **依存関係**: boto3, smtplib, ssl
- **機能**: SMTP送信、メール返信機能
- **環境変数**: `EMAIL_CONNECTIONS_TABLE`

### AI返信提案Lambda ✅ 最新版
- **ランタイム**: Python 3.11
- **メモリ**: 256MB
- **タイムアウト**: 30秒
- **依存関係**: boto3, openai, typing_extensions
- **機能**: OpenAI GPT-4o-miniによる返信生成、FAQ活用
- **環境変数**: `FAQS_TABLE`, `OPENAI_API_KEY_SECRET_NAME`
- **Secrets Manager統合**: 安全なOpenAI APIキー管理

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
- **メールLambda実行ロール**: 顧客テーブルアクセス権限追加 ✅ 最新版

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

## AIメール機能 ✅ 最新版

### 概要
IMAP接続によるメール取得・管理機能です。Gmail等のメールサーバーに安全に接続し、顧客テーブルに登録されている顧客からのメールのみを表示し、返信機能も提供します。

### 機能特徴
- **IMAP接続**: Gmail等のメールサーバーへの安全な接続
- **顧客フィルタリング**: 顧客テーブルに登録されている顧客からのメールのみ表示
- **メール取得**: 最新30件のメールを高速取得（パフォーマンス最適化）
- **メール詳細表示**: 個別メールの内容・添付ファイル表示
- **メール返信機能**: SMTP送信による返信機能
- **複数アカウント対応**: 複数のメールアカウントを同時管理
- **セキュア接続**: SSL/TLS対応の安全なメール接続
- **Gmail対応**: Gmailアプリパスワードによる安全な接続

### 技術仕様

#### IMAP接続機能
- **imaplib**: Python標準ライブラリによるIMAP接続
- **SSL/TLS対応**: 安全な暗号化通信
- **接続テスト**: 接続前に認証情報の検証
- **エラーハンドリング**: 接続失敗時の適切な処理
- **タイムアウト**: 10秒のタイムアウトでレスポンス性を確保

#### メール取得機能（顧客フィルタリング対応）
- **最新30件表示**: パフォーマンス最適化のため最新30件のみ取得
- **顧客フィルタリング**: 顧客テーブルに登録されている顧客からのメールのみ表示
- **メール詳細**: 件名、送信者、日時、本文、添付ファイル情報
- **HTML/プレーンテキスト対応**: 両形式のメール本文に対応
- **文字エンコーディング**: 適切な文字エンコーディング処理
- **セキュリティ**: 顧客メール以外へのアクセス拒否

#### SMTP送信機能
- **smtplib**: Python標準ライブラリによるSMTP送信
- **SSL/TLS対応**: 安全な暗号化通信
- **動的サーバー設定**: 接続情報からSMTPサーバー・ポートを自動判定
- **返信機能**: 元のメール情報を活用した返信
- **エラーハンドリング**: 送信失敗時の適切な処理

### API仕様

#### メール接続管理
- **POST /email/test-connection**: メール接続テスト
- **POST /email/save-connection**: メール接続保存
- **GET /email/connections**: メール接続一覧取得
- **DELETE /email/connections/{connectionId}**: メール接続削除

#### メール取得（顧客フィルタリング対応）
- **GET /email/messages**: メール一覧取得（顧客フィルタリング対応、最新30件）
- **GET /email/messages/{messageId}**: メール詳細取得（顧客メールのみ）

#### メール送信（返信機能）
- **POST /email/send**: メール送信（返信機能）

#### AI返信提案（FAQ活用）
- **POST /email/ai-reply**: AI返信提案生成（FAQ活用）

#### リクエスト形式（接続テスト）
```json
{
  "email": "user@gmail.com",
  "password": "app-password",
  "imapServer": "imap.gmail.com",
  "imapPort": 993,
  "useSSL": true
}
```

#### レスポンス形式（メール一覧）
```json
{
  "success": true,
  "emails": [
    {
      "messageId": "message-id",
      "subject": "メール件名",
      "from": "送信者",
      "date": "2025-08-26T12:00:00Z",
      "hasAttachments": false
    }
  ],
  "filtered": true,
  "filter_description": "顧客テーブルに登録されている顧客からのメールのみを表示しています"
}
```

#### リクエスト形式（メール送信）
```json
{
  "connectionId": "connection-uuid",
  "to": "recipient@example.com",
  "cc": "cc@example.com",
  "subject": "Re: 件名",
  "body": "メール本文"
}
```

### 処理フロー
1. **接続テスト**: ユーザーが入力した認証情報でIMAP接続をテスト
2. **接続保存**: 接続成功時に認証情報をDynamoDBに安全に保存
3. **顧客メール取得**: 顧客テーブルから顧客メールアドレスを取得
4. **メールフィルタリング**: 顧客からのメールのみをフィルタリング
5. **メール表示**: フロントエンドで顧客メール一覧・詳細を表示
6. **AI返信提案**: FAQ情報を活用したAI返信提案生成
7. **メール返信**: SMTP送信による返信機能（AI提案内容反映）

### セキュリティ
- **アプリパスワード**: Gmail等のアプリパスワードによる安全な認証
- **DynamoDB暗号化**: 接続情報の暗号化保存
- **SSL/TLS**: すべての通信の暗号化
- **タイムアウト**: 適切なタイムアウト設定
- **顧客フィルタリング**: 顧客メール以外へのアクセス拒否

### パフォーマンス最適化
- **最新30件表示**: 全メール取得による遅延を回避
- **顧客フィルタリング**: 不要なメールを除外した効率的な処理
- **非同期処理**: フロントエンドでの非同期メール取得
- **キャッシュ**: 接続情報の効率的な管理
- **エラーハンドリング**: 接続失敗時の適切な処理

### 環境変数設定
- **email_fetcher Lambda**: `EMAIL_CONNECTIONS_TABLE`, `CUSTOMERS_TABLE`
- **email_sender Lambda**: `EMAIL_CONNECTIONS_TABLE`
- **email_ai_reply Lambda**: `FAQS_TABLE`, `OPENAI_API_KEY_SECRET_NAME`
- **IAM権限**: 顧客テーブルアクセス権限の追加、Secrets Managerアクセス権限の追加

## AIメール返信提案機能 ✅ 最新版

### 概要
FAQ情報を活用してAIによる高品質なメール返信提案を生成する機能です。営業担当者の文脈を考慮し、既存のFAQデータベースの情報を活用して適切な返信を自動生成します。

### 機能特徴
- **FAQ活用**: データベースに保存されたFAQ情報を活用した返信生成
- **OpenAI統合**: GPT-4o-miniを使用した高品質な返信提案
- **ユーザーコンテキスト**: 営業担当者の文脈を考慮した返信生成
- **返信テンプレート**: 丁寧で親しみやすい返信スタイル
- **リアルタイム生成**: 200-400文字程度の適切な長さの返信を即座に生成
- **統合UI**: メール詳細画面から直接AI返信提案を利用可能
- **Secrets Manager統合**: 安全なOpenAI APIキー管理

### 技術仕様

#### AI返信生成機能
- **OpenAI GPT-4o-mini**: 自然言語処理による返信生成
- **FAQデータベース連携**: DynamoDBのFAQテーブルとの統合
- **プロンプトエンジニアリング**: 営業担当者向けの最適化されたプロンプト
- **コンテキスト統合**: メール内容、FAQ情報、ユーザーコンテキストの統合
- **文字数制限**: 200-400文字の適切な長さで返信生成
- **エラーハンドリング**: 詳細なログ出力と適切なエラー処理

#### FAQ活用機能
- **DynamoDB連携**: ユーザー固有のFAQデータを取得
- **関連性分析**: メール内容とFAQ情報の関連性を分析
- **情報統合**: 関連するFAQ情報を返信に統合
- **品質向上**: FAQ情報による正確で一貫性のある返信

### API仕様

#### AI返信提案生成
- **POST /email/ai-reply**: AI返信提案生成（FAQ活用）

#### リクエスト形式
```json
{
  "emailContent": "件名: お問い合わせ\n送信者: 顧客名 <customer@example.com>\n本文:\n商品について詳しく教えてください。",
  "userContext": "営業担当者としての追加コンテキスト（オプション）"
}
```

#### レスポンス形式
```json
{
  "success": true,
  "aiReply": "いつもお世話になっております。\n\n商品についてのご質問をいただき、ありがとうございます。\n\n弊社の商品は、お客様のニーズに合わせてカスタマイズ可能で、導入実績も豊富にございます。\n\n詳細な資料をお送りいたしますので、ご確認いただけますでしょうか。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n今後ともよろしくお願いいたします。",
  "faqsUsed": 5,
  "generatedAt": "2025-08-27T10:30:00.000Z",
  "modelUsed": "gpt-4o-mini"
}
```

### 処理フロー
1. **メール内容解析**: 受信メールの内容を解析
2. **FAQ取得**: ユーザーのFAQデータベースから関連情報を取得
3. **プロンプト生成**: メール内容、FAQ情報、ユーザーコンテキストを統合したプロンプトを生成
4. **AI返信生成**: OpenAI GPT-4o-miniで返信を生成
5. **品質チェック**: 生成された返信の品質と適切性を確認
6. **レスポンス返却**: フロントエンドに返信提案を返却

### プロンプト設計
```
あなたは営業担当者のアシスタントです。以下の情報を基に、顧客からのメールに対する適切な返信を生成してください。

## 顧客からのメール内容:
{emailContent}

## 参考となるFAQ情報:
{faqs_text}

## ユーザーコンテキスト:
{userContext}

## 返信作成のガイドライン:
1. 丁寧で親しみやすい口調を使用
2. 顧客の質問や要望に適切に回答
3. FAQ情報を活用して正確な情報を提供
4. 営業的な要素を含めつつ、押し付けがましくならない
5. 具体的で実用的な内容にする
6. 返信は200-400文字程度で作成

## 返信例:
「いつもお世話になっております。
[具体的な回答内容]
今後ともよろしくお願いいたします。」

上記のガイドラインに従って、適切な返信を作成してください。
```

### セキュリティ
- **Secrets Manager統合**: OpenAI APIキーの安全な管理
- **IAM権限**: Secrets Managerアクセス権限の適切な設定
- **ユーザー分離**: ユーザー固有のFAQデータのみアクセス
- **エラーハンドリング**: APIキー取得失敗時の適切な処理

### パフォーマンス最適化
- **キャッシュ**: FAQデータの効率的な取得
- **非同期処理**: フロントエンドでの非同期返信生成
- **タイムアウト**: 30秒のタイムアウトでレスポンス性を確保
- **メモリ最適化**: 256MBメモリでの効率的な処理

### エラーハンドリング
- **APIキー取得失敗**: Secrets ManagerからのAPIキー取得失敗時の処理
- **OpenAI API エラー**: API呼び出し失敗時の適切なエラーメッセージ
- **FAQ取得失敗**: FAQデータベースアクセス失敗時の処理
- **プロンプト生成失敗**: プロンプト生成時のエラー処理

### 環境変数設定
- **FAQS_TABLE**: FAQデータベースのテーブル名
- **OPENAI_API_KEY_SECRET_NAME**: OpenAI APIキーのSecrets Manager名
- **IAM権限**: Secrets Managerアクセス権限、DynamoDBアクセス権限

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
2025年8月27日 - AIメール返信提案機能実装完了

## バージョン
v3.7.0

## 主要な改善点（v3.7.0）

### AIメール返信提案機能 ✅ 最新版
- **AI返信提案**: 各メールにAIによる返信提案ボタンを追加
- **FAQ活用**: データベースに保存されたFAQ情報を活用した返信生成
- **OpenAI統合**: GPT-4o-miniを使用した高品質な返信提案
- **ユーザーコンテキスト**: 営業担当者の文脈を考慮した返信生成
- **返信テンプレート**: 丁寧で親しみやすい返信スタイル
- **リアルタイム生成**: 200-400文字程度の適切な長さの返信を即座に生成
- **統合UI**: メール詳細画面から直接AI返信提案を利用可能

### 技術的改善
- **email_ai_reply Lambda**: AI返信生成専用のLambda関数
- **FAQデータベース連携**: DynamoDBのFAQテーブルとの統合
- **OpenAI API統合**: GPT-4o-miniを使用した返信生成
- **API Gateway拡張**: `/email/ai-reply`エンドポイントの追加
- **CORS設定**: 新しいエンドポイントの適切なCORS設定
- **Terraform設定**: 新しいLambda関数とAPI Gatewayの完全な設定

### ユーザビリティ
- **営業支援**: FAQ情報を活用した適切な返信提案
- **効率性**: 手動返信作成の時間短縮
- **品質向上**: AIによる一貫性のある返信品質
- **カスタマイズ**: ユーザーコンテキストの考慮
- **統合体験**: メール詳細画面からの直接利用

## 主要な改善点（v3.6.0）

### AIメール機能 顧客フィルタリング
- **顧客フィルタリング**: 顧客テーブルに登録されている顧客からのメールのみ表示
- **メール返信機能**: SMTP送信による返信機能の追加
- **メール取得件数**: 30件に最適化（タイムアウト回避）
- **パフォーマンス最適化**: 処理時間の短縮と安定性向上
- **フィルタリング情報表示**: 顧客メールのみ表示されていることをユーザーに通知
- **セキュリティ強化**: 顧客メール以外へのアクセス拒否
- **デバッグ機能**: 詳細なログ出力による問題解決支援

### 技術的改善
- **顧客テーブル連携**: DynamoDBの顧客テーブルとメールフィルタリングの統合
- **SMTP送信機能**: メール返信用のSMTP送信Lambda関数
- **パフォーマンス最適化**: 30件表示によるタイムアウト回避
- **環境変数設定**: Lambda関数の適切な環境変数設定
- **IAM権限**: 顧客テーブルアクセス権限の追加
- **Terraform同期**: インフラ設定の完全な状態管理

### ユーザビリティ
- **営業特化**: 顧客からのメールのみを表示し、営業活動に集中
- **返信機能**: メール詳細から直接返信可能
- **視覚的フィードバック**: フィルタリング状態の明確な表示
- **安定性**: タイムアウトエラーの回避
- **効率性**: 不要なメールを除外した効率的なメール管理
