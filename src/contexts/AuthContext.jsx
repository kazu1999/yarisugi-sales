import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ユーザー登録
  const signup = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // ログイン
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Googleログイン
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  // ログアウト
  const logout = () => {
    return signOut(auth);
  };

  // パスワードリセット
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // プロフィール更新
  const updateUserProfile = (data) => {
    return updateProfile(currentUser, data);
  };

  useEffect(() => {
    try {
      console.log('AuthContext: Firebase初期化開始');
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('AuthContext: ユーザー状態変更', user ? 'ログイン済み' : '未ログイン');
        setCurrentUser(user);
        setLoading(false);
      }, (error) => {
        console.error('AuthContext: 認証状態監視エラー', error);
        setError(error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('AuthContext: 初期化エラー', error);
      setError(error);
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    error
  };

  // エラーが発生した場合の表示
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-4">初期化エラー</h2>
          <p className="text-gray-600 mb-4">
            Firebaseの初期化に失敗しました。環境変数の設定を確認してください。
          </p>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {error.message}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 