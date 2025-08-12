import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  onAuthStateChanged,
  resetPassword,
  updateUserProfile,
  confirmSignUp,
  confirmResetPassword,
  getAuthToken
} from '../utils/cognitoAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // サインアップ
  const signup = async (email, password, displayName) => {
    try {
      setError(null);
      const result = await registerUser(email, password, displayName);
      
      if (result.success) {
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (error) {
      console.error('AuthContext: サインアップエラー', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // 確認コード確認
  const confirmSignup = async (email, code) => {
    try {
      setError(null);
      const result = await confirmSignUp(email, code);
      
      if (result.success) {
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (error) {
      console.error('AuthContext: 確認コード確認エラー', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // ログイン
  const login = async (email, password) => {
    try {
      setError(null);
      const result = await loginUser(email, password);
      
      if (result.success) {
        setCurrentUser(result.user);
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (error) {
      console.error('AuthContext: ログインエラー', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // Googleログイン（Cognitoでは別途設定が必要）
  const loginWithGoogle = async () => {
    try {
      setError(null);
      // TODO: Google認証の実装
      setError('Googleログインは現在サポートされていません');
      return { success: false, message: 'Googleログインは現在サポートされていません' };
    } catch (error) {
      console.error('AuthContext: Googleログインエラー', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      setError(null);
      const result = await logoutUser();
      
      if (result.success) {
        setCurrentUser(null);
        // ログアウト後、ログインページに遷移
        navigate('/login');
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (error) {
      console.error('AuthContext: ログアウトエラー', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // パスワードリセット
  const resetPasswordHandler = async (email) => {
    try {
      setError(null);
      const result = await resetPassword(email);
      
      if (result.success) {
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (error) {
      console.error('AuthContext: パスワードリセットエラー', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // パスワードリセット確認
  const confirmResetPasswordHandler = async (email, code, newPassword) => {
    try {
      setError(null);
      const result = await confirmResetPassword(email, code, newPassword);
      
      if (result.success) {
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (error) {
      console.error('AuthContext: パスワードリセット確認エラー', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // ユーザープロフィール更新
  const updateUserProfileHandler = async (updates) => {
    try {
      setError(null);
      const result = await updateUserProfile(updates);
      
      if (result.success) {
        // ユーザー情報を更新
        const updatedUser = await getCurrentUser();
        setCurrentUser(updatedUser);
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (error) {
      console.error('AuthContext: プロフィール更新エラー', error);
      setError(error.message);
      return { success: false, message: error.message };
    }
  };

  // 認証状態の監視
  useEffect(() => {
    try {
      console.log('AuthContext: Cognito認証状態監視開始');
      const unsubscribe = onAuthStateChanged((user) => {
        console.log('AuthContext: ユーザー状態変更', user ? 'ログイン済み' : '未ログイン');
        setCurrentUser(user);
        setLoading(false);
        
        // 認証状態に応じてナビゲーション
        if (user) {
          // ログイン済みの場合、メインページに遷移
          if (window.location.pathname === '/login') {
            navigate('/');
          }
        } else {
          // 未ログインの場合、ログインページに遷移
          if (window.location.pathname !== '/login') {
            navigate('/login');
          }
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('AuthContext: 認証状態監視エラー', error);
      setError(error);
      setLoading(false);
    }
  }, [navigate]);

  const value = {
    currentUser,
    signup,
    confirmSignup,
    login,
    loginWithGoogle,
    logout,
    resetPassword: resetPasswordHandler,
    confirmResetPassword: confirmResetPasswordHandler,
    updateUserProfile: updateUserProfileHandler,
    getAuthToken,
    error
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-blue-600 mb-4">認証システム初期化中</h2>
          <p className="text-gray-600 mb-4">
            AWS Cognito認証システムを初期化しています...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 