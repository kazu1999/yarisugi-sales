// IndexedDBベースの認証システム

import { dbOperations } from './indexedDB';

// 認証状態変更のコールバックを管理
let authStateCallbacks = [];

// 認証状態変更を通知する関数
const notifyAuthStateChange = (user) => {
  authStateCallbacks.forEach(callback => {
    try {
      callback(user);
    } catch (error) {
      console.error('認証状態変更通知エラー:', error);
    }
  });
};

// ユーザーID生成（バックエンドAPI連携を考慮）
const generateUserId = () => {
  // 将来的にバックエンドから取得したIDと互換性を持たせる
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ユーザー登録
export const registerUser = async (email, password, displayName) => {
  try {
    console.log('IndexedDB registerUser: 開始', { email, displayName });
    
    // 既存ユーザーの確認
    const existingUsers = await dbOperations.getByIndex('users', 'email', email);
    console.log('IndexedDB registerUser: 既存ユーザー数', existingUsers.length);
    
    if (existingUsers.length > 0) {
      throw new Error('このメールアドレスは既に使用されています。');
    }

    // パスワードの検証
    if (password.length < 6) {
      throw new Error('パスワードは6文字以上で入力してください。');
    }

    // 新しいユーザーを作成
    const newUser = {
      id: generateUserId(), // バックエンドAPI連携を考慮したID
      email,
      password, // 実際のアプリではハッシュ化すべき
      displayName,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      // バックエンドAPI連携用の追加フィールド
      apiVersion: '1.0',
      syncStatus: 'local', // local, synced, pending
      lastSyncAt: null
    };

    console.log('IndexedDB registerUser: 新規ユーザー作成', { id: newUser.id, email: newUser.email });

    // ユーザーを保存
    await dbOperations.add('users', newUser);
    console.log('IndexedDB registerUser: ユーザー保存完了');

    // ログイン状態に設定
    const { password: _, ...userWithoutPassword } = newUser;
    await dbOperations.update('sessions', {
      id: 'current',
      userId: newUser.id,
      user: userWithoutPassword,
      loginAt: new Date().toISOString()
    });
    console.log('IndexedDB registerUser: ログイン状態設定完了');

    // 認証状態変更を通知
    notifyAuthStateChange(userWithoutPassword);

    return { user: userWithoutPassword };
  } catch (error) {
    console.error('IndexedDB registerUser: エラー', error);
    throw error;
  }
};

// ユーザーログイン
export const loginUser = async (email, password) => {
  try {
    console.log('IndexedDB loginUser: 開始', { email });
    
    // メールアドレスでユーザーを検索
    const users = await dbOperations.getByIndex('users', 'email', email);
    console.log('IndexedDB loginUser: ユーザー検索結果', users.length);
    
    const user = users.find(u => u.password === password);
    console.log('IndexedDB loginUser: パスワード検証結果', user ? '成功' : '失敗');

    if (!user) {
      throw new Error('メールアドレスまたはパスワードが間違っています。');
    }

    // 最終ログイン時間を更新
    user.lastLogin = new Date().toISOString();
    await dbOperations.update('users', user);
    console.log('IndexedDB loginUser: 最終ログイン時間更新');

    // ログイン状態に設定
    const { password: _, ...userWithoutPassword } = user;
    await dbOperations.update('sessions', {
      id: 'current',
      userId: user.id,
      user: userWithoutPassword,
      loginAt: new Date().toISOString()
    });
    console.log('IndexedDB loginUser: ログイン状態設定完了', { id: userWithoutPassword.id });

    // 認証状態変更を通知
    notifyAuthStateChange(userWithoutPassword);

    return { user: userWithoutPassword };
  } catch (error) {
    console.error('IndexedDB loginUser: エラー', error);
    throw error;
  }
};

// ログアウト
export const logoutUser = () => {
  console.log('IndexedDB logoutUser: ログアウト実行');
  dbOperations.delete('sessions', 'current').then(() => {
    console.log('IndexedDB logoutUser: セッション削除完了');
  }).catch(error => {
    console.error('IndexedDB logoutUser: セッション削除エラー', error);
  });
  
  // 認証状態変更を通知
  notifyAuthStateChange(null);
};

// 現在のユーザーを取得
export const getCurrentUser = async () => {
  try {
    const session = await dbOperations.get('sessions', 'current');
    const user = session ? session.user : null;
    console.log('IndexedDB getCurrentUser: 現在のユーザー', user ? { id: user.id, email: user.email } : '未ログイン');
    return user;
  } catch (error) {
    console.error('IndexedDB getCurrentUser: エラー', error);
    return null;
  }
};

// 認証状態の監視
export const onAuthStateChanged = (callback) => {
  console.log('IndexedDB onAuthStateChanged: 監視開始');
  
  // コールバックを登録
  authStateCallbacks.push(callback);
  
  // 初期状態を通知
  getCurrentUser().then(user => {
    callback(user);
  });

  // クリーンアップ関数を返す
  return () => {
    // コールバックを削除
    const index = authStateCallbacks.indexOf(callback);
    if (index > -1) {
      authStateCallbacks.splice(index, 1);
    }
  };
};

// パスワードリセット（簡易版）
export const resetPassword = async (email) => {
  const users = await dbOperations.getByIndex('users', 'email', email);
  
  if (users.length === 0) {
    throw new Error('このメールアドレスは登録されていません。');
  }

  // 実際のアプリではメール送信機能が必要
  // ここでは簡易的にコンソールに表示
  console.log(`パスワードリセットリンクを ${email} に送信しました。`);
  
  return { message: 'パスワードリセットリンクを送信しました。' };
};

// プロフィール更新
export const updateUserProfile = async (updates) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('ユーザーがログインしていません。');
    }

    // ユーザー情報を取得
    const user = await dbOperations.get('users', currentUser.id);
    if (!user) {
      throw new Error('ユーザーが見つかりません。');
    }

    // ユーザー情報を更新
    const updatedUser = { ...user, ...updates };
    await dbOperations.update('users', updatedUser);

    // セッション情報も更新
    const { password: _, ...userWithoutPassword } = updatedUser;
    await dbOperations.update('sessions', {
      id: 'current',
      userId: updatedUser.id,
      user: userWithoutPassword,
      loginAt: new Date().toISOString()
    });

    // 認証状態変更を通知
    notifyAuthStateChange(userWithoutPassword);

    return { user: userWithoutPassword };
  } catch (error) {
    throw error;
  }
};

// バックエンドAPI連携用の関数

// ユーザーIDを取得（API呼び出し用）
export const getCurrentUserId = async () => {
  const user = await getCurrentUser();
  return user ? user.id : null;
};

// ユーザー情報をAPI形式で取得
export const getUserForAPI = async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    lastLogin: user.lastLogin,
    apiVersion: user.apiVersion || '1.0'
  };
};

// APIからのユーザー情報を同期
export const syncUserFromAPI = async (apiUserData) => {
  try {
    // APIから取得したユーザー情報でローカルデータを更新
    const existingUser = await dbOperations.get('users', apiUserData.userId);
    
    if (existingUser) {
      // 既存ユーザーの更新
      const updatedUser = {
        ...existingUser,
        ...apiUserData,
        syncStatus: 'synced',
        lastSyncAt: new Date().toISOString()
      };
      await dbOperations.update('users', updatedUser);
    } else {
      // 新規ユーザーの作成
      const newUser = {
        ...apiUserData,
        syncStatus: 'synced',
        lastSyncAt: new Date().toISOString(),
        createdAt: apiUserData.createdAt || new Date().toISOString()
      };
      await dbOperations.add('users', newUser);
    }
    
    console.log('IndexedDB: APIからのユーザー同期完了', apiUserData.userId);
  } catch (error) {
    console.error('IndexedDB: APIからのユーザー同期エラー', error);
    throw error;
  }
}; 