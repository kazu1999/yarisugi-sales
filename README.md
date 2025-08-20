# Yarisugi Sales - 営業支援・顧客管理システム

Yarisugi Salesは、営業活動を効率化し、顧客情報を一元管理し、AIを活用した営業支援を提供する総合的な営業管理システムです。

## 🎯 主要機能

### 🔐 認証・セキュリティ
- **AWS Cognito認証**: セキュアなユーザー認証・管理
- **ユーザー管理**: アカウント登録、ログイン、ログアウト
- **認証ガード**: 未認証ユーザーの自動リダイレクト
- **セッション管理**: 安全なユーザーセッション管理
- **JWT認証**: API Gatewayでの認証付きエンドポイント

### 📊 顧客管理システム ✅ **完成**
- **新規顧客登録**: 会社名、担当者名、所在地、業種、サイトURL、SNS状況、LINE ID、メール、営業担当者、ステータス
- **顧客一覧表示**: 認証されたユーザーの顧客情報を一覧表示
- **顧客編集**: 既存顧客の情報を更新・編集
- **顧客削除**: 不要な顧客データを削除
- **ステータス管理**: 新規、商談中、成約、失注の進捗管理
- **顧客詳細**: 独立ページでの顧客詳細表示（URL管理、ブックマーク対応）
- **検索・フィルタリング**: 顧客データの検索とフィルタリング機能

### ❓ FAQ管理システム ✅ **完成**
- **FAQ作成・編集**: 手動でのFAQ作成と編集機能
- **FAQ削除**: 不要なFAQデータの削除
- **カテゴリ管理**: 料金、サポート、契約、機能、その他のカテゴリ別整理
- **全オリジン対応**: 全ドメインからのアクセスを許可（CORS設定）
- **認証付きAPI**: セキュアなFAQ管理API
- **DynamoDB統合**: 高速なFAQデータの保存・取得

### 🧠 ナレッジベース機能 ✅ **完成**
- **ナレッジ検索**: 蓄積されたナレッジの検索機能
- **データベース管理**: ナレッジデータベースの管理
- **ファイル管理**: ファイルアップロードによるナレッジ蓄積
- **PDF処理**: 日本語ファイル名対応のPDFテキスト抽出
- **AI要約**: OpenAI GPTによる自動要約生成
- **ベクトル化**: 検索用のベクトル埋め込み生成
- **最適化**: 大きなファイルでも安定動作するバッチ処理

### 📈 営業プロセス管理
- **カスタムプロセス**: カスタマイズ可能な営業プロセス設定
- **テンプレート機能**: プロセステンプレートの保存・適用
- **進捗管理**: 営業活動の進捗追跡とリマインダー機能
- **アンケート管理**: 顧客アンケート項目の管理

### 💬 コミュニケーション機能
- **メール機能**: メール作成・送信機能
- **LINE連携**: LINEとの連携機能
- **履歴管理**: 顧客とのコミュニケーション履歴管理

### 🤖 AI支援機能 ✅ **完成**
- **AI FAQ自動生成**: OpenAI GPTを使用したテキストからのFAQ自動生成
- **テキスト入力対応**: 直接テキストを入力してFAQ生成
- **個別・一括保存**: 生成されたFAQの個別保存または一括保存
- **リアルタイム編集**: 生成後のFAQ編集機能（質問・回答・カテゴリ）
- **保存状態管理**: 保存済み・編集済みのステータス表示
- **削除機能**: 不要なFAQの削除機能

### ⚙️ システム管理
- **基本情報管理**: 会社・担当者情報の管理
- **ID管理**: ID追加・プラン変更機能
- **機能要望**: ユーザーからの機能要望収集フォーム

## 🛠 技術スタック

### フロントエンド
- **React**: 19.1.1
- **ビルドツール**: Vite 7.1.0
- **ルーティング**: React Router DOM 7.8.0
- **UIアイコン**: Lucide React 0.539.0
- **スタイリング**: Tailwind CSS
- **状態管理**: React Hooks + AWS API

### バックエンド（AWS）
- **認証**: AWS Cognito
- **データベース**: Amazon DynamoDB
- **API**: Amazon API Gateway
- **サーバーレス**: AWS Lambda（Python 3.11）
- **AI**: OpenAI GPT API（FAQ自動生成）
- **インフラ**: Terraform
- **CDN**: CloudFront（CORS対応）

## 🚀 セットアップ

### 前提条件
- Node.js (v16以上)
- npm または yarn
- AWS CLI
- Terraform
- OpenAI API Key（AI FAQ生成機能用）

### 1. フロントエンドセットアップ

```bash
# リポジトリをクローン
git clone [repository-url]
cd yarisugi-sales

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### 2. AWSリソースデプロイ

```bash
# バックエンドディレクトリに移動
cd backend

# デプロイスクリプトを実行
chmod +x deploy.sh
./deploy.sh
```

### 3. 環境変数設定

デプロイ完了後、出力された値を`.env`ファイルに設定：

```env
# AWS設定
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_HePREiq48
VITE_COGNITO_CLIENT_ID=51u2578ebgtvvao9kh5ldspcol
VITE_AWS_REGION=ap-northeast-1
VITE_API_GATEWAY_ENDPOINT=https://xpx8akh2cj.execute-api.ap-northeast-1.amazonaws.com/dev

# DynamoDBテーブル名（オプション）
VITE_DYNAMODB_USERS_TABLE=yarisugi-sales-users-dev
VITE_DYNAMODB_CUSTOMERS_TABLE=yarisugi-sales-customers-dev
VITE_DYNAMODB_FAQS_TABLE=yarisugi-sales-faqs-dev
VITE_DYNAMODB_KNOWLEDGE_TABLE=yarisugi-sales-knowledge-dev
VITE_DYNAMODB_SALES_PROCESSES_TABLE=yarisugi-sales-sales-processes-dev
```

## 📁 プロジェクト構造

```
yarisugi-sales/
├── src/                    # フロントエンド（React）
│   ├── components/         # Reactコンポーネント
│   │   ├── auth/          # 認証関連コンポーネント
│   │   └── ...
│   ├── contexts/          # React Context
│   │   └── AuthContext.jsx # 認証状態管理
│   ├── hooks/             # カスタムフック
│   │   ├── useCustomerManagement.js # 顧客管理フック
│   │   └── useFaqManagement.js # FAQ管理フック
│   ├── utils/             # ユーティリティ
│   │   ├── awsConfig.js   # AWS設定
│   │   ├── awsApiClient.js # APIクライアント
│   │   ├── cognitoAuth.js # Cognito認証
│   │   └── constants.js   # 定数定義
│   ├── App.jsx            # メインアプリケーション
│   ├── YarisugiSales.jsx  # メインダッシュボード
│   └── ...
├── backend/               # バックエンド（AWS）
│   ├── lambda_functions/  # Python Lambda関数
│   │   ├── customers_lambda/      # 顧客管理API
│   │   │   ├── customers.py       # 顧客CRUD操作
│   │   │   ├── requirements.txt   # 依存関係（pydantic==1.10.13）
│   │   │   ├── payload.zip        # デプロイ用zipファイル
│   │   │   ├── build/             # 依存関係インストール先
│   │   │   └── common/            # 共通ライブラリ
│   │   │       ├── __init__.py
│   │   │       └── dynamodb.py    # DynamoDB操作ヘルパー
│   │   ├── ai_generator/          # AI FAQ生成API
│   │   │   ├── ai_generator.py    # OpenAI GPT統合
│   │   │   ├── requirements.txt   # 依存関係（openai, boto3）
│   │   │   └── common/            # 共通ライブラリ
│   │   ├── knowledge_manager/     # ナレッジ管理API
│   │   │   ├── knowledge_manager.py # ナレッジCRUD操作
│   │   │   └── requirements.txt   # 依存関係（openai, boto3）
│   │   ├── rag_search/            # RAG検索API
│   │   │   ├── rag_search.py      # ベクトル検索・AI応答生成
│   │   │   └── requirements.txt   # 依存関係（boto3）
│   │   ├── faqs_lambda/           # FAQ管理API
│   │   │   └── ...                # FAQ CRUD操作
│   │   └── common/                # 共通ライブラリ
│   │       ├── __init__.py
│   │       └── dynamodb.py        # DynamoDB操作クラス
│   ├── terraform/         # インフラ設定
│   │   ├── main.tf        # メイン設定
│   │   └── variables.tf   # 変数定義
│   └── deploy.sh          # デプロイスクリプト
├── api-specification.yaml # OpenAPI仕様書
└── README.md              # このファイル
```

## 🔧 開発ガイドライン

### フロントエンド開発
- **認証**: AWS Cognitoを使用したセキュアな認証
- **API通信**: AWS API Gateway経由でDynamoDBと通信
- **状態管理**: React Hooks + カスタムフック
- **UI/UX**: Tailwind CSS + Lucide React

### バックエンド開発
- **Python Lambda**: サーバーレス関数（Python 3.11/3.13）
- **DynamoDB**: NoSQLデータベース
- **API Gateway**: RESTful API（認証付き）

### Lambda関数の詳細

#### customers_lambda/ - 顧客管理API ✅ **完成**
- **機能**: 顧客の CRUD 操作（作成・読取・更新・削除）
- **認証**: AWS Cognito（JWT）
- **データベース**: DynamoDB（PK: USER#{user_id}, SK: CUSTOMER#{customer_id}）
- **依存関係**: Pydantic v1.10.13（v2互換性問題を回避）
- **エンドポイント**: 
  - `GET /customers` - 顧客一覧取得
  - `POST /customers` - 顧客作成
  - `PUT /customers/{id}` - 顧客更新
  - `DELETE /customers/{id}` - 顧客削除

#### ai_generator/ - AI FAQ生成API ✅ **完成**
- **機能**: OpenAI GPTを使用したテキストからのFAQ自動生成
- **認証**: AWS Cognito（JWT）
- **外部API**: OpenAI GPT-4
- **セキュリティ**: AWS Secrets Manager（APIキー管理）
- **エンドポイント**: `POST /ai-generate`

#### knowledge_manager/ - ナレッジ管理API ✅ **完成**
- **機能**: ナレッジデータの管理・AI要約・ベクトル化・PDF処理
- **認証**: AWS Cognito（JWT）
- **外部API**: OpenAI（要約・ベクトル化）
- **データベース**: DynamoDB（knowledge + knowledge_vectors）
- **PDF処理**: PyPDF2による日本語ファイル名対応
- **最適化**: バッチ埋め込み処理、タイムアウト対策
- **エンドポイント**: 
  - `GET /knowledge` - ナレッジ一覧取得
  - `POST /knowledge` - ナレッジ作成（PDF対応）
  - `DELETE /knowledge/{id}` - ナレッジ削除

#### rag_search/ - RAG検索API 🚧 **開発中**
- **機能**: ベクトル類似度検索・RAG応答生成
- **認証**: AWS Cognito（JWT）
- **外部API**: OpenAI（クエリベクトル化・応答生成）
- **アルゴリズム**: コサイン類似度検索
- **エンドポイント**: `POST /rag-search`

#### faqs_lambda/ - FAQ管理API ✅ **完成**
- **機能**: FAQ の CRUD 操作（作成・読取・更新・削除）
- **認証**: AWS Cognito（JWT）
- **データベース**: DynamoDB（PK: USER#{user_id}, SK: FAQ#{faq_id}）
- **依存関係**: boto3, botocore
- **特徴**: 詳細なデバッグログ、pathParameters対応
- **エンドポイント**: 
  - `GET /faqs` - FAQ一覧取得
  - `POST /faqs` - FAQ作成（question, answer, category必須）
  - `GET /faqs/{id}` - FAQ詳細取得
  - `PUT /faqs/{id}` - FAQ更新
  - `DELETE /faqs/{id}` - FAQ削除

#### common/ - 共通ライブラリ
- **dynamodb.py**: DynamoDB操作の共通クラス
- **機能**: CRUD操作、クエリ、エラーハンドリング
- **特徴**: ExpressionAttributeNames対応、型安全性

### 依存関係管理

#### Pydantic v1への固定理由
```text
問題: Pydantic v2の`pydantic_core`がMac環境でLinux用Lambda向けにビルドされない
解決: requirements.txtで`pydantic==1.10.13`に固定
影響: customers_lambda のみ（他はPydantic未使用）
```

#### Lambda関数デプロイ手順
```bash
# customers_lambdaの例
cd backend/lambda_functions/customers_lambda

# 依存関係をインストール
python3 -m pip install -r requirements.txt -t build

# zipファイル作成
(cd build && zip -r ../payload.zip .)
zip -g payload.zip customers.py common/

# Lambda関数更新
aws lambda update-function-code \
  --function-name yarisugi-customers-api \
  --zip-file fileb://payload.zip
```

### インフラ管理
- **Terraform**: Infrastructure as Code
- **AWS**: クラウドインフラ

## 🌐 API仕様

### 認証
- **Cognito User Pool**: ユーザー認証
- **JWT Token**: API認証（Authorization: Bearer）

### エンドポイント

#### 顧客管理API ✅ **完成**
- `GET /customers` - 顧客一覧取得（認証付き）
- `POST /customers` - 顧客作成（認証付き）
- `PUT /customers/{id}` - 顧客更新（認証付き）
- `DELETE /customers/{id}` - 顧客削除（認証付き）

#### FAQ管理API ✅ **完成**
- `GET /faqs` - FAQ一覧取得（認証付き）
- `POST /faqs` - FAQ作成（認証付き）
- `GET /faqs/{id}` - FAQ詳細取得（認証付き）
- `PUT /faqs/{id}` - FAQ更新（認証付き）
- `DELETE /faqs/{id}` - FAQ削除（認証付き）

#### AI生成API ✅ **完成**
- `POST /ai-generate` - AI FAQ自動生成（認証付き）

#### その他のAPI
- `GET /knowledge` - ナレッジ一覧取得
- `POST /knowledge` - ナレッジ作成（PDF対応）
- `DELETE /knowledge/{id}` - ナレッジ削除

### データ構造

#### 顧客データ
```json
{
  "id": "uuid",
  "userId": "cognito-user-id",
  "companyName": "株式会社サンプル",
  "customerName": "田中太郎",
  "location": "東京都渋谷区",
  "industry": "IT・ソフトウェア",
  "siteUrl": "https://example.com",
  "snsStatus": "積極的に運用中",
  "lineId": "example_line_id",
  "email": "contact@example.com",
  "salesPerson": "山田花子",
  "status": "新規",
  "createdAt": "2025-08-13T00:00:00.000000",
  "updatedAt": "2025-08-13T00:00:00.000000"
}
```

#### FAQデータ
```json
{
  "id": "faq_20250813_123456_789",
  "userId": "cognito-user-id",
  "question": "料金プランについて教えてください",
  "answer": "当社の料金プランは以下の通りです...",
  "category": "料金",
  "tags": ["料金", "プラン", "月額"],
  "isPublic": true,
  "createdAt": "2025-08-13T12:34:56.789Z",
  "updatedAt": "2025-08-13T12:34:56.789Z"
}
```

#### AI生成リクエスト
```json
{
  "content": "当社のサービスは月額980円のベーシックプランと月額2980円のプロプランがあります。ベーシックプランは10ユーザーまで、プロプランは無制限です。年間契約の場合は2ヶ月分の割引があります。"
}
```

#### ナレッジ作成リクエスト（PDF対応）
```json
{
  "title": "営業マニュアル.pdf",
  "content": "data:application/pdf;name=営業マニュアル.pdf;base64,JVBERi0xLjQK...",
  "category": "マニュアル",
  "fileType": "application/pdf"
}
```

#### AI生成レスポンス
```json
{
  "message": "FAQs generated successfully",
  "faqs": [
    {
      "id": "ai_generated_1",
      "question": "ベーシックプランの料金はいくらですか？",
      "answer": "ベーシックプランは月額980円です。10ユーザーまでご利用いただけます。",
      "category": "料金",
      "status": "generated"
    },
    {
      "id": "ai_generated_2", 
      "question": "年間契約をすると割引はありますか？",
      "answer": "はい、年間契約の場合は2ヶ月分の割引が適用されます。",
      "category": "料金",
      "status": "generated"
    }
  ]
}
```

## 🔐 AWS Cognito認証の統合

### 認証フロー
1. **ユーザー登録**: メールアドレスとパスワードでアカウント作成
2. **確認コード**: メールで送信された確認コードを入力
3. **ログイン**: 確認済みアカウントでログイン
4. **セッション管理**: JWTトークンによるセッション管理

### 設定ファイル
- `src/utils/awsConfig.js`: AWS Amplify設定
- `src/utils/cognitoAuth.js`: Cognito認証ロジック
- `src/contexts/AuthContext.jsx`: 認証状態管理

### 重要な設定
```javascript
// App.jsxでのRouterとAuthProviderの順序
<Router>
  <AuthProvider>
    <Routes>
      {/* ルート定義 */}
    </Routes>
  </AuthProvider>
</Router>
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. CORSエラー
**エラー**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**解決方法**: 
- ブラウザのハードリフレッシュ（Ctrl+Shift+R / Cmd+Shift+R）を実行
- API Gatewayのキャッシュがクリアされるまで数分待機
- 全オリジン許可（`*`）のCORS設定が適用されていることを確認

#### 2. AWS Amplifyのインポートエラー
**エラー**: `The requested module does not provide an export named 'Auth'`

**解決方法**: AWS Amplify v6ではインポート方法が変更されています
```javascript
// 旧
import { Auth } from 'aws-amplify';

// 新
import { signUp, signIn, signOut } from 'aws-amplify/auth';
```

#### 3. Cognito認証フローエラー
**エラー**: `USER_SRP_AUTH is not enabled for the client`

**解決方法**: AWS Cognitoコンソールで認証フローを有効にする
- AWS Cognito → User Pools → App client → Authentication flows
- `USER_SRP_AUTH`を有効にする

#### 4. useNavigateエラー
**エラー**: `useNavigate() may be used only in the context of a <Router> component`

**解決方法**: RouterとAuthProviderの順序を修正
```javascript
// 正しい順序
<Router>
  <AuthProvider>
    {/* コンポーネント */}
  </AuthProvider>
</Router>
```

#### 5. DynamoDB更新エラー
**エラー**: `Invalid UpdateExpression: An expression attribute name used in the document path is not defined`

**解決方法**: Lambda関数で`ExpressionAttributeNames`を正しく渡す
```python
# customers.py
result = dynamodb_client.update_item(
    CUSTOMERS_TABLE,
    key,
    update_expression,
    expression_values,
    expression_names  # このパラメータを追加
)
```

#### 6. API Gateway統合エラー
**エラー**: `500 Internal Server Error`（Lambdaに到達しない）

**解決方法**: API Gateway統合URIの形式を確認
```terraform
# 正しい形式
uri = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.faqs_api.arn}/invocations"

# 間違った形式
uri = aws_lambda_function.faqs_api.invoke_arn
```

#### 7. Lambda権限エラー
**エラー**: `Invalid permissions on Lambda function`

**解決方法**: API GatewayがLambda関数を呼び出す権限を追加
```bash
# PUT/DELETEメソッドの権限を追加
aws lambda add-permission \
  --function-name yarisugi-customers-api \
  --statement-id apigateway-customers-put \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-northeast-1:339712825457:API_ID/*/PUT/customers/*"
```

#### 8. Pydantic v2互換性エラー
**エラー**: `No module named 'pydantic_core._pydantic_core'`

**解決方法**: Pydantic v1への固定
```bash
# requirements.txtを更新
echo "pydantic==1.10.13" >> requirements.txt

# 依存関係を再インストール
rm -rf build/
python3 -m pip install -r requirements.txt -t build
```

#### 9. Lambda関数のHTTPメソッドエラー
**エラー**: `'[object Object]' is not a valid HTTP method`

**解決方法**: awsApiClient.jsのrequest方法を統一
```javascript
// 修正前：混在した呼び出し方
this.request(endpoint, { method: 'PUT', body: data });
this.request(endpoint, 'GET');

// 修正後：統一した呼び出し方
this.request(endpoint, { method: 'PUT', body: data });
this.request(endpoint, { method: 'GET' });
```

#### 10. PDF処理のASCII文字エラー
**エラー**: `string argument should contain only ASCII characters`

**解決方法**: Lambda関数でdata URLヘッダーの適切な処理
```python
# 修正前：PDFバイナリをUTF-8文字列に変換してしまう
if content.startswith('data:'):
    decoded_bytes = base64.b64decode(encoded)
    content = decoded_bytes.decode('utf-8', errors='ignore')

# 修正後：PDFはprocess_file_contentに直接渡す
if file_type and file_type.lower() == 'application/pdf':
    processed_content = process_file_content(content, file_type)
```

#### 11. 大きなPDFファイルのタイムアウトエラー
**エラー**: `504 Gateway Timeout`（29秒制限）

**解決方法**: 埋め込みバッチ処理と上限設定
```python
# バッチ処理でAPI呼び出し回数を削減
embeddings = generate_embeddings(chunks, batch_size=64, max_chunks=48)

# Lambda設定の最適化
aws lambda update-function-configuration \
  --function-name knowledge-api \
  --timeout 900 --memory-size 3008
```

### デバッグ方法
1. **ブラウザの開発者ツール**: F12でコンソールを確認
2. **AWS CloudWatch**: Lambda関数のログを確認
3. **Cognitoコンソール**: ユーザー認証状態を確認
4. **API Gateway**: メソッド統合とレスポンスを確認

## 🔧 APIテストとSwagger Editor

### APIエンドポイント

#### 認証なしでアクセス可能
- **GET /customers**: 顧客一覧取得（テスト用）

#### 認証が必要
- **POST /customers**: 顧客作成
- **GET /customers/{id}**: 顧客詳細取得
- **PUT /customers/{id}**: 顧客更新
- **DELETE /customers/{id}**: 顧客削除
- **GET /faqs**: FAQ一覧取得
- **POST /faqs**: FAQ作成
- **GET /faqs/{id}**: FAQ詳細取得
- **PUT /faqs/{id}**: FAQ更新
- **DELETE /faqs/{id}**: FAQ削除

### Swagger Editorでのテスト方法

#### 1. 認証トークンの取得

**方法A: ブラウザから取得**
```bash
# フロントエンドを起動
npm run dev
```

1. ブラウザで `http://localhost:5173` にアクセス
2. ユーザー登録・ログインを実行
3. 開発者ツール（F12）を開く
4. Consoleタブで以下を実行:

```javascript
// 認証トークンを取得
import { getAuthToken } from './src/utils/cognitoAuth.js';
getAuthToken().then(token => {
    console.log('Auth Token:', token);
    // このトークンをコピー
});
```

**方法B: AWS CLIから取得**
```bash
# ユーザー認証（ユーザーが存在する場合）
aws cognito-idp admin-initiate-auth \
  --user-pool-id ap-northeast-1_HePREiq48 \
  --client-id 51u2578ebgtvvao9kh5ldspcol \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=your-email@example.com,PASSWORD=your-password
```

#### 2. Swagger Editorでの認証設定

1. **Swagger Editorを開く**: https://editor.swagger.io/
2. **API仕様を読み込み**: `api-specification.yaml`
3. **右上の「Authorize」ボタンをクリック**
4. **CognitoAuthセクションで**:
   - **Value**: `Bearer YOUR_TOKEN_HERE`
   - **Authorize**をクリック

#### 3. テストリクエスト例

**POST /customers（顧客作成）**
```json
{
  "companyName": "テスト株式会社",
  "customerName": "田中太郎",
  "location": "東京都渋谷区",
  "industry": "IT・ソフトウェア",
  "siteUrl": "https://example.com",
  "email": "contact@example.com",
  "status": "新規",
  "notes": "Swagger Editorからのテスト"
}
```

**POST /faqs（FAQ作成）**
```json
{
  "question": "料金プランについて教えてください",
  "answer": "当社の料金プランは以下の通りです...",
  "category": "料金",
  "tags": ["料金", "プラン"],
  "isPublic": true
}
```

**POST /ai-generate（AI FAQ生成）**
```json
{
  "content": "当社のサービスは月額980円のベーシックプランと月額2980円のプロプランがあります。ベーシックプランは10ユーザーまで、プロプランは無制限です。年間契約の場合は2ヶ月分の割引があります。サポートは平日9時から18時まで対応しています。"
}
```

### CORS設定

APIは以下のドメインからのアクセスを許可しています：
- `http://localhost:5173`（開発環境）
- `http://localhost:5174`（開発環境）
- `https://editor.swagger.io`（Swagger Editor）
- `*`（すべてのドメイン - 全オリジン許可）

### エラーハンドリング

#### 401 Unauthorized
- 認証トークンが無効または期限切れ
- 解決方法: 新しいトークンを取得

#### 400 Bad Request
- リクエストデータが不正
- 解決方法: 必須フィールドを確認

#### 500 Internal Server Error
- サーバー側エラー
- 解決方法: AWS CloudWatchでログを確認

## 📝 最近の更新

### v2.7.0 - ナレッジマネージャー最適化 ✅ **NEW!**
- ✅ **PDFファイル処理の最適化**: 日本語ファイル名対応とBase64デコード改善
- ✅ **埋め込みバッチ処理**: OpenAI API呼び出しを最大64分の1に削減
- ✅ **タイムアウト対策**: 29秒制限を回避する埋め込み数上限設定（最大48チャンク）
- ✅ **Lambda設定最適化**: メモリ3GB、タイムアウト900秒に拡張
- ✅ **チャンクサイズ最適化**: 1000文字→2000文字でチャンク数を削減
- ✅ **エラーハンドリング改善**: 詳細なログ出力とエラー回復機能
- ✅ **パフォーマンス向上**: 大きなPDFファイルでも安定動作
- ✅ **非同期処理対応**: 将来のSQS/Step Functions統合を見据えた設計

### v2.6.0 - Lambda関数アーキテクチャ整理 ✅
- ✅ **Lambda関数ディレクトリ構造の整理**: 各API別にディレクトリを分離
- ✅ **customers_lambda完全CRUD対応**: PUT/DELETE機能の実装と権限修正
- ✅ **Pydantic v2互換性問題の解決**: v1.10.13への固定とデプロイフロー確立
- ✅ **HTTPメソッドエラーの修正**: awsApiClient.jsのrequest統一
- ✅ **API Gateway権限設定**: PUT/DELETEメソッドのlambda:InvokeFunction追加
- ✅ **依存関係の最適化**: 不要なファイル削除とbuildディレクトリの整理
- ✅ **ドキュメント更新**: Lambda関数の詳細構造とトラブルシューティング追加
- ✅ **デプロイフロー確立**: zipファイル作成からLambda更新までの手順整備

### v2.5.0 - AI FAQ自動生成機能完成 ✅
- ✅ **AI FAQ自動生成**: OpenAI GPTを使用したテキストからのFAQ自動生成
- ✅ **テキスト入力対応**: 美しいUIでテキスト入力からFAQ生成
- ✅ **個別・一括保存**: 生成されたFAQを個別または一括でDynamoDBに保存
- ✅ **リアルタイム編集**: 生成後のFAQ編集機能（質問・回答・カテゴリ）
- ✅ **保存状態管理**: 保存済み・編集済みのステータス表示
- ✅ **削除機能**: 不要なFAQの削除機能
- ✅ **画面遷移**: 入力画面から結果画面へのスムーズな遷移
- ✅ **OpenAI API統合**: AWS Lambda経由でのOpenAI GPT APIとの統合
- ✅ **エラーハンドリング**: AI生成時のエラー処理と成功フィードバック

### v2.4.0 - FAQ管理システム完成 ✅
- ✅ **FAQ一覧表示**: 認証されたユーザーのFAQデータを表示
- ✅ **FAQ新規作成**: フォームから新しいFAQを追加
- ✅ **FAQ編集**: 既存FAQの情報を更新・編集
- ✅ **FAQ削除**: 不要なFAQデータを削除
- ✅ **カテゴリ管理**: 料金、サポート、契約、機能、その他のカテゴリ別整理
- ✅ **全オリジン対応**: 全ドメインからのアクセスを許可（CORS設定）
- ✅ **API Gateway統合修正**: 正しいURI形式でのLambda統合
- ✅ **CORS問題解決**: CloudFrontキャッシュとVaryヘッダーの適切な設定

### v2.3.0 - 顧客管理システム完成 ✅
- ✅ **顧客一覧表示**: 認証されたユーザーの顧客データを表示
- ✅ **顧客新規登録**: フォームから新しい顧客を追加
- ✅ **顧客編集**: 既存顧客の情報を更新・編集
- ✅ **顧客削除**: 不要な顧客データを削除
- ✅ **DynamoDB更新機能**: ExpressionAttributeNamesの修正
- ✅ **認証付きAPI**: GET /customersエンドポイントの認証設定
- ✅ **エラーハンドリング**: 顧客管理関連のエラー処理改善

### v2.2.0 - APIテストとSwagger Editor対応
- ✅ 認証なしGET /customersエンドポイントの実装
- ✅ Swagger Editor用CORS設定の追加
- ✅ APIテスト環境の構築
- ✅ 認証トークン取得方法のドキュメント化
- ✅ エラーハンドリングの改善

### v2.1.0 - AWS Cognito認証の完全統合
- ✅ AWS Cognito認証システムの完全実装
- ✅ ユーザー登録・確認・ログイン機能
- ✅ 認証状態監視と自動ナビゲーション
- ✅ エラーハンドリングとトラブルシューティング
- ✅ セキュアなセッション管理

### v2.0.0 - AWS構成への移行
- ✅ AWS Cognito認証システムの実装
- ✅ DynamoDBデータベースの構築
- ✅ Python Lambda関数の実装
- ✅ API Gatewayの設定
- ✅ Terraformによるインフラ管理
- ✅ オフライン対応（IndexedDB）
- ✅ クラウド同期機能

### v1.3.0 - ローカル認証システムへの移行
- ✅ Firebase依存関係の完全削除
- ✅ ローカルストレージベース認証システムの実装
- ✅ プライバシー重視の設計（データはブラウザに保存）
- ✅ 設定不要の簡単セットアップ
- ✅ オフライン対応

## 🔐 セキュリティ

- **AWS Cognito**: 業界標準の認証システム
- **IAM認証**: 細かい権限管理
- **DynamoDB**: 暗号化されたデータ保存
- **API Gateway**: セキュアなAPI通信
- **JWT認証**: 安全なトークンベース認証
- **CORS設定**: 適切なオリジン制御

## 💰 コスト

### AWS料金（月額目安）
- **DynamoDB**: 従量課金（使用量に応じて）
- **Lambda**: 従量課金（100万リクエストまで無料）
- **API Gateway**: 従量課金（100万リクエストまで無料）
- **Cognito**: 従量課金（5万ユーザーまで無料）
- **CloudFront**: 従量課金（転送量に応じて）

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。

## 📞 サポート

機能追加要望やバグ報告は、アプリ内の「機能追加要望フォーム」からお送りください。

---

**Yarisugi Sales** - 営業活動を効率化し、顧客との関係を深めるための総合営業支援システム

**最新バージョン**: v2.7.0 - ナレッジマネージャー最適化完成 🎉📄

## 🚀 主要な改善点（v2.7.0）

### 📄 PDFファイル処理の最適化
- **日本語ファイル名対応**: `dataurl_to_bytes`関数による安全なBase64デコード
- **エラーハンドリング**: 詳細なログ出力とエラー回復機能
- **PyPDF2統合**: 安定したPDFテキスト抽出

### ⚡ パフォーマンス最適化
- **埋め込みバッチ処理**: OpenAI API呼び出しを最大64分の1に削減
- **タイムアウト対策**: 29秒制限を回避する埋め込み数上限設定（最大48チャンク）
- **Lambda設定最適化**: メモリ3GB、タイムアウト900秒に拡張
- **チャンクサイズ最適化**: 1000文字→2000文字でチャンク数を削減

### 🔧 技術的改善
- **非同期処理対応**: 将来のSQS/Step Functions統合を見据えた設計
- **環境変数管理**: `MAX_EMBED_CHUNKS`による柔軟な設定
- **セッション管理**: `requests.Session()`による効率的なHTTP通信

**実装済み機能**:
- ✅ 認証システム（AWS Cognito）
- ✅ 顧客管理システム（CRUD + 検索・フィルタリング）
- ✅ FAQ管理システム（CRUD + カテゴリ管理）
- ✅ **AI FAQ自動生成機能**（OpenAI GPT統合）
- ✅ **ナレッジベース機能**（PDF処理 + AI要約 + ベクトル化）
- ✅ 全オリジン対応（CORS設定）
- ✅ API Gateway統合
- ✅ DynamoDB統合
- ✅ Terraformインフラ管理

**次期開発予定**:
- 📈 営業プロセス管理
- 💬 コミュニケーション機能
- 📊 FAQ分析ダッシュボード
- 🔍 RAG検索機能（ベクトル検索）
- 📱 モバイル対応
