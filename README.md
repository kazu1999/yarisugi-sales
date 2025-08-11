# Yarisugi Sales - 営業支援・顧客管理システム

Yarisugi Salesは、営業活動を効率化し、顧客情報を一元管理し、AIを活用した営業支援を提供する総合的な営業管理システムです。

## 🎯 主要機能

### 🔐 認証・セキュリティ
- **Firebase認証**: メール/パスワード認証とGoogle認証
- **ユーザー管理**: アカウント登録、ログイン、ログアウト
- **認証ガード**: 未認証ユーザーの自動リダイレクト
- **セッション管理**: 安全なユーザーセッション管理

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

- **フロントエンド**: React 19.1.1
- **ビルドツール**: Vite 7.1.0
- **ルーティング**: React Router DOM 7.8.0
- **UIアイコン**: Lucide React 0.539.0
- **スタイリング**: Tailwind CSS
- **認証**: Firebase Authentication
- **データベース**: Firebase Firestore
- **開発環境**: ESLint、TypeScript対応

## 🚀 セットアップ

### 前提条件
- Node.js (v16以上)
- npm または yarn
- Firebaseプロジェクト

### Firebase設定

1. **Firebaseプロジェクト作成**
   - [Firebase Console](https://console.firebase.google.com/)でプロジェクト作成
   - Authenticationを有効化（メール/パスワード、Google）
   - Firestore Databaseを有効化

2. **環境変数の設定**
   ```bash
   # .envファイルを作成
   cp env.example .env
   ```
   
   `.env`ファイルにFirebase設定を記入：
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

### インストール

1. リポジトリをクローン
```bash
git clone [repository-url]
cd yarisugi-sales
```

2. 依存関係をインストール
```bash
npm install
```

3. 開発サーバーを起動
```bash
npm run dev
```

4. ブラウザで `http://localhost:5173` にアクセス

### ビルド

本番用ビルドを作成:
```bash
npm run build
```

### プレビュー

ビルド結果をプレビュー:
```bash
npm run preview
```

### リント

コードの品質チェック:
```bash
npm run lint
```

## 📁 プロジェクト構造

```
src/
├── components/          # 再利用可能なコンポーネント
│   ├── auth/           # 認証関連コンポーネント
│   │   ├── Login.jsx   # ログインコンポーネント
│   │   └── PrivateRoute.jsx  # 認証ガード
│   ├── customer/       # 顧客関連コンポーネント
│   │   ├── CustomerDetail.jsx
│   │   └── tabs/       # 顧客詳細タブコンポーネント
│   ├── modals/         # モーダルコンポーネント
│   └── common/         # 共通コンポーネント
├── contexts/           # React Context
│   └── AuthContext.jsx # 認証状態管理
├── firebase/           # Firebase設定
│   └── config.js       # Firebase初期化設定
├── pages/              # ページコンポーネント
│   └── CustomerDetailPage.jsx  # 顧客詳細独立ページ
├── hooks/              # カスタムフック
│   └── useCustomerManagement.js
├── utils/              # ユーティリティ関数
├── assets/             # 静的アセット
├── App.jsx             # メインアプリケーション（ルーティング設定）
├── YarisugiSales.jsx   # メインコンポーネント
└── main.jsx            # エントリーポイント
```

## 🎨 主要コンポーネント

- **YarisugiSales**: メインのダッシュボードコンポーネント
- **CustomerDetailPage**: 顧客詳細独立ページ（`/customer/:customerId`）
- **CustomerDetail**: 顧客詳細表示コンポーネント
- **Login**: 認証ログインコンポーネント
- **AuthContext**: 認証状態管理コンテキスト
- **useCustomerManagement**: 顧客管理用カスタムフック

## 🔧 開発ガイドライン

### コードスタイル
- ESLintを使用したコード品質管理
- React Hooksの推奨パターンに従う
- コンポーネントの再利用性を重視

### 状態管理
- React Hooks (useState, useEffect) を使用
- React Contextによる認証状態管理
- カスタムフックによるロジックの分離
- React RouterによるURL状態管理

### スタイリング
- Tailwind CSSを使用したユーティリティファーストアプローチ
- レスポンシブデザインの実装
- フルスクリーン対応レイアウト

## 🌐 ルーティング

### ページ構成
- **`/login`**: ログインページ
- **`/`**: メインダッシュボード（YarisugiSales）- 認証必須
- **`/customer/:customerId`**: 顧客詳細ページ - 認証必須

### 認証フロー
- **未認証ユーザー**: 自動的に`/login`にリダイレクト
- **認証済みユーザー**: メインアプリにアクセス可能
- **ログアウト**: 自動的に`/login`にリダイレクト

### 顧客詳細ページの特徴
- **独立ページ表示**: モーダルではなく完全なページ遷移
- **URL管理**: 顧客IDがURLに反映され、ブックマーク可能
- **ブラウザ戻る対応**: ブラウザの戻るボタンで一覧に戻れる
- **SEO対応**: 検索エンジンでのインデックス可能

## 📝 最近の更新

### v1.2.0 - Firebase認証機能の実装
- ✅ Firebase Authentication統合
- ✅ メール/パスワード認証
- ✅ Google認証（OAuth）
- ✅ ユーザー登録・ログイン機能
- ✅ 認証ガードによるページ保護
- ✅ セッション管理とログアウト機能
- ✅ 環境変数による設定管理

### v1.1.0 - 独立ページ表示への変更
- ✅ 顧客詳細をモーダルから独立ページ表示に変更
- ✅ React Router DOMによるルーティング実装
- ✅ 顧客IDに基づくデータ取得機能
- ✅ ブラウザ戻るボタンの正常動作
- ✅ ブックマーク機能の対応

## 📝 今後の開発予定

- [ ] Firestore Database統合
- [ ] 顧客データの永続化
- [ ] リアルタイムデータ同期
- [ ] ユーザープロフィール管理
- [ ] パスワードリセット機能
- [ ] メール認証機能
- [ ] ユーザー権限管理
- [ ] リアルタイム通知機能
- [ ] モバイルアプリ対応
- [ ] 多言語対応
- [ ] 検索・フィルタリング機能の強化
- [ ] データの永続化（ローカルストレージ）

## 🔐 セキュリティ

- **Firebase Authentication**: 業界標準の認証システム
- **環境変数**: 機密情報の安全な管理
- **認証ガード**: 未認証アクセスの防止
- **セッション管理**: 安全なユーザーセッション

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
