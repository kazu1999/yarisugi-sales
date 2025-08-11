import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase設定（環境変数から取得）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// デバッグ用：環境変数の確認
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? '設定済み' : '未設定',
  authDomain: firebaseConfig.authDomain ? '設定済み' : '未設定',
  projectId: firebaseConfig.projectId ? '設定済み' : '未設定',
  storageBucket: firebaseConfig.storageBucket ? '設定済み' : '未設定',
  messagingSenderId: firebaseConfig.messagingSenderId ? '設定済み' : '未設定',
  appId: firebaseConfig.appId ? '設定済み' : '未設定'
});

// Firebase初期化
const app = initializeApp(firebaseConfig);

// 認証とFirestoreの初期化
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app; 