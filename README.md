# Yarisugi Sales - 営業支援・顧客管理システム

Yarisugi Salesは、営業活動を効率化し、顧客情報を一元管理し、AIを活用した営業支援を提供する総合的な営業管理システムです。

## 🎯 主要機能

### 🔐 認証・セキュリティ
- **AWS Cognito認証**: セキュアなユーザー認証・管理
- **ユーザー管理**: アカウント登録、ログイン、ログアウト
- **認証ガード**: 未認証ユーザーの自動リダイレクト
- **セッション管理**: 安全なユーザーセッション管理
- **プライバシー重視**: オフライン対応とクラウド同期

### 📊 顧客管理システム
- **新規顧客登録**: 会社名、担当者名、所在地、業種、サイトURL、SNS状況、LINE ID、メール、営業担当者、ステータス
- **顧客一覧表示**: 顧客情報の一覧表示と詳細情報管理
- **ステータス管理**: 新規、商談中、成約、失注の進捗管理
- **顧客詳細**: 独立ページでの顧客詳細表示（URL管理、ブックマーク対応）

### ❓ FAQ管理システム
- **FAQ作成・編集**: 手動でのFAQ作成と編集機能
- **カテゴリ管理**: 料金、サポート、契約、機能、その他のカテゴリ別整理
- **AI自動生成**: AIを活用したFAQ自動生成機能
- **ファイルアップロード**: ファイルからFAQを自動生成

### 🧠 ナレッジベース機能
- **ナレッジ検索**: 蓄積されたナレッジの検索機能
- **データベース管理**: ナレッジデータベースの管理
- **ファイル管理**: ファイルアップロードによるナレッジ蓄積

### 📈 営業プロセス管理
- **カスタムプロセス**: カスタマイズ可能な営業プロセス設定
- **テンプレート機能**: プロセステンプレートの保存・適用
- **進捗管理**: 営業活動の進捗追跡とリマインダー機能
- **アンケート管理**: 顧客アンケート項目の管理

### 💬 コミュニケーション機能
- **メール機能**: メール作成・送信機能
- **LINE連携**: LINEとの連携機能
- **履歴管理**: 顧客とのコミュニケーション履歴管理

### 🤖 AI支援機能
- **FAQ自動生成**: AIによるFAQ自動生成
- **内容分析**: ファイル内容の自動分析
- **営業支援**: 営業活動を支援するAIアシスタント

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
- **状態管理**: IndexedDB（オフライン対応）

### バックエンド（AWS）
- **認証**: AWS Cognito
- **データベース**: Amazon DynamoDB
- **API**: Amazon API Gateway
- **サーバーレス**: AWS Lambda（Python）
- **インフラ**: Terraform

## 🚀 セットアップ

### 前提条件
- Node.js (v16以上)
- npm または yarn
- AWS CLI
- Terraform

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
VITE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=ap-northeast-1
VITE_API_GATEWAY_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev
```

## 📁 プロジェクト構造

```
yarisugi-sales/
├── src/                    # フロントエンド（React）
│   ├── components/         # Reactコンポーネント
│   ├── contexts/          # React Context
│   ├── utils/             # ユーティリティ
│   │   ├── awsConfig.js   # AWS設定
│   │   ├── awsApiClient.js # APIクライアント
│   │   ├── cognitoAuth.js # Cognito認証
│   │   └── indexedDB.js   # IndexedDB操作
│   └── ...
├── backend/               # バックエンド（AWS）
│   ├── lambda_functions/  # Python Lambda関数
│   │   ├── common/        # 共通ライブラリ
│   │   ├── customers.py   # 顧客管理API
│   │   └── ...
│   ├── terraform/         # インフラ設定
│   │   ├── main.tf        # メイン設定
│   │   └── variables.tf   # 変数定義
│   └── deploy.sh          # デプロイスクリプト
└── ...
```

## 🔧 開発ガイドライン

### フロントエンド開発
- **オフライン対応**: IndexedDBでローカルデータ管理
- **クラウド同期**: AWS API Gateway経由でDynamoDBと同期
- **認証**: AWS Cognitoを使用したセキュアな認証

### バックエンド開発
- **Python Lambda**: サーバーレス関数
- **DynamoDB**: NoSQLデータベース
- **API Gateway**: RESTful API

### インフラ管理
- **Terraform**: Infrastructure as Code
- **AWS**: クラウドインフラ

## 🌐 API仕様

### 認証
- **Cognito User Pool**: ユーザー認証
- **JWT Token**: API認証

### エンドポイント
- `GET /customers` - 顧客一覧取得
- `POST /customers` - 顧客作成
- `PUT /customers/{id}` - 顧客更新
- `DELETE /customers/{id}` - 顧客削除
- `GET /faqs` - FAQ一覧取得
- `POST /faqs` - FAQ作成
- `GET /knowledge` - ナレッジ一覧取得
- `POST /knowledge` - ナレッジ作成

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

#### 1. AWS Amplifyのインポートエラー
**エラー**: `The requested module does not provide an export named 'Auth'`

**解決方法**: AWS Amplify v6ではインポート方法が変更されています
```javascript
// 旧
import { Auth } from 'aws-amplify';

// 新
import { signUp, signIn, signOut } from 'aws-amplify/auth';
```

#### 2. Cognito認証フローエラー
**エラー**: `USER_SRP_AUTH is not enabled for the client`

**解決方法**: AWS Cognitoコンソールで認証フローを有効にする
- AWS Cognito → User Pools → App client → Authentication flows
- `USER_SRP_AUTH`を有効にする

#### 3. useNavigateエラー
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

#### 4. 画面遷移しない問題
**問題**: ログイン成功後、メインページに遷移しない

**解決方法**: 認証状態監視とナビゲーション処理を追加
```javascript
// AuthContext.jsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged((user) => {
    if (user && window.location.pathname === '/login') {
      navigate('/');
    }
  });
  return unsubscribe;
}, [navigate]);
```

### デバッグ方法
1. **ブラウザの開発者ツール**: F12でコンソールを確認
2. **AWS CloudWatch**: Lambda関数のログを確認
3. **Cognitoコンソール**: ユーザー認証状態を確認

## 📝 最近の更新

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
- **オフライン対応**: ローカルデータの安全な管理

## 💰 コスト

### AWS料金（月額目安）
- **DynamoDB**: 従量課金（使用量に応じて）
- **Lambda**: 従量課金（100万リクエストまで無料）
- **API Gateway**: 従量課金（100万リクエストまで無料）
- **Cognito**: 従量課金（5万ユーザーまで無料）

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
