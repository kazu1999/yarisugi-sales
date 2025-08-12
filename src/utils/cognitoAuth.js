// Cognito認証システム

import { Amplify } from 'aws-amplify';
import { signUp, confirmSignUp as amplifyConfirmSignUp, signIn, signOut, getCurrentUser as amplifyGetCurrentUser, resetPassword as amplifyResetPassword, confirmResetPassword as amplifyConfirmResetPassword, updateUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { configureAmplify } from './awsConfig';

// Amplify設定を初期化
configureAmplify();

let authStateCallbacks = [];

// 認証状態変更の通知
const notifyAuthStateChange = (user) => {
  authStateCallbacks.forEach(callback => callback(user));
};

// ユーザー登録
export const registerUser = async (email, password, displayName) => {
  try {
    console.log('Cognito: ユーザー登録開始', { email, displayName });
    
    const result = await signUp({
      username: email,
      password: password,
      options: {
        userAttributes: {
          email: email,
          name: displayName
        }
      }
    });

    console.log('Cognito: ユーザー登録成功', result);
    
    // 確認コードの送信を待つ
    return {
      success: true,
      message: '確認コードをメールで送信しました。メールを確認してコードを入力してください。',
      user: result.user
    };
  } catch (error) {
    console.error('Cognito: ユーザー登録エラー', error);
    return {
      success: false,
      message: error.message || 'ユーザー登録に失敗しました'
    };
  }
};

// 確認コードの確認
export const confirmSignUp = async (email, code) => {
  try {
    console.log('Cognito: 確認コード確認開始', { email, code });
    
    await amplifyConfirmSignUp({
      username: email,
      confirmationCode: code
    });
    
    console.log('Cognito: 確認コード確認成功');
    
    return {
      success: true,
      message: 'アカウントが確認されました。ログインしてください。'
    };
  } catch (error) {
    console.error('Cognito: 確認コード確認エラー', error);
    return {
      success: false,
      message: error.message || '確認コードの確認に失敗しました'
    };
  }
};

// ログイン
export const loginUser = async (email, password) => {
  try {
    console.log('Cognito: ログイン開始', { email });
    
    const user = await signIn({
      username: email,
      password: password
    });
    
    console.log('Cognito: ログイン成功', user);
    notifyAuthStateChange(user);
    
    return {
      success: true,
      user: user
    };
  } catch (error) {
    console.error('Cognito: ログインエラー', error);
    return {
      success: false,
      message: error.message || 'ログインに失敗しました'
    };
  }
};

// ログアウト
export const logoutUser = async () => {
  try {
    console.log('Cognito: ログアウト開始');
    
    await signOut();
    
    console.log('Cognito: ログアウト成功');
    notifyAuthStateChange(null);
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Cognito: ログアウトエラー', error);
    return {
      success: false,
      message: error.message || 'ログアウトに失敗しました'
    };
  }
};

// 現在のユーザーを取得
export const getCurrentUser = async () => {
  try {
    const user = await amplifyGetCurrentUser();
    console.log('Cognito: 現在のユーザー', user);
    return user;
  } catch (error) {
    console.log('Cognito: 認証されていないユーザー');
    return null;
  }
};

// 認証状態の監視
export const onAuthStateChanged = (callback) => {
  authStateCallbacks.push(callback);
  
  // 初期状態を確認
  getCurrentUser().then(user => {
    callback(user);
  });
  
  // リスナーの登録
  getCurrentUser().then(user => {
    callback(user);
  }).catch(() => {
    callback(null);
  });
  
  // クリーンアップ関数を返す
  return () => {
    const index = authStateCallbacks.indexOf(callback);
    if (index > -1) {
      authStateCallbacks.splice(index, 1);
    }
  };
};

// パスワードリセット
export const resetPassword = async (email) => {
  try {
    console.log('Cognito: パスワードリセット開始', { email });
    
    await amplifyResetPassword({
      username: email
    });
    
    console.log('Cognito: パスワードリセットコード送信成功');
    
    return {
      success: true,
      message: 'パスワードリセットコードをメールで送信しました。'
    };
  } catch (error) {
    console.error('Cognito: パスワードリセットエラー', error);
    return {
      success: false,
      message: error.message || 'パスワードリセットに失敗しました'
    };
  }
};

// パスワードリセット確認
export const confirmResetPassword = async (email, code, newPassword) => {
  try {
    console.log('Cognito: パスワードリセット確認開始', { email, code });
    
    await amplifyConfirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword: newPassword
    });
    
    console.log('Cognito: パスワードリセット確認成功');
    
    return {
      success: true,
      message: 'パスワードが正常にリセットされました。'
    };
  } catch (error) {
    console.error('Cognito: パスワードリセット確認エラー', error);
    return {
      success: false,
      message: error.message || 'パスワードリセットの確認に失敗しました'
    };
  }
};

// ユーザープロフィール更新
export const updateUserProfile = async (updates) => {
  try {
    console.log('Cognito: プロフィール更新開始', updates);
    
    const user = await getCurrentUser();
    const result = await updateUserAttributes({
      userAttributes: updates
    });
    
    console.log('Cognito: プロフィール更新成功', result);
    
    return {
      success: true,
      message: 'プロフィールが更新されました。'
    };
  } catch (error) {
    console.error('Cognito: プロフィール更新エラー', error);
    return {
      success: false,
      message: error.message || 'プロフィールの更新に失敗しました'
    };
  }
};

// 認証トークンを取得
export const getAuthToken = async () => {
  try {
    const session = await fetchAuthSession();
    return session.tokens.idToken.toString();
  } catch (error) {
    console.error('Cognito: トークン取得エラー', error);
    return null;
  }
}; 