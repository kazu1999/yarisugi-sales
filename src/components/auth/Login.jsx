import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react';

const Login = () => {
  const { signup, confirmSignup, login, error } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // フォームデータ
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmCode: ''
  });

  // フォーム入力の処理
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // サインアップ処理
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    
    try {
      const result = await signup(formData.email, formData.password, formData.displayName);
      
      if (result.success) {
        setSuccessMessage(result.message);
        setIsConfirming(true);
      }
    } catch (error) {
      console.error('サインアップエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 確認コード確認処理
  const handleConfirmSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    
    try {
      const result = await confirmSignup(formData.email, formData.confirmCode);
      
      if (result.success) {
        setSuccessMessage(result.message);
        setIsConfirming(false);
        setIsSignup(false);
      }
    } catch (error) {
      console.error('確認コード確認エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // ログイン処理
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        setSuccessMessage('ログインに成功しました！');
        // ログイン成功後、メインページに遷移
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    } catch (error) {
      console.error('ログインエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // デモユーザー情報を入力
  const fillDemoData = () => {
    setFormData({
      email: 'demo@example.com',
      password: 'demo123456',
      displayName: 'デモユーザー',
      confirmCode: ''
    });
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      displayName: '',
      confirmCode: ''
    });
    setSuccessMessage('');
    setIsConfirming(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isConfirming ? '確認コード入力' : (isSignup ? 'アカウント作成' : 'ログイン')}
          </h1>
          <p className="text-gray-600">
            {isConfirming 
              ? 'メールに送信された確認コードを入力してください'
              : (isSignup 
                ? 'AWS Cognitoを使用したセキュアなアカウント作成'
                : 'AWS Cognitoを使用したセキュアなログイン'
              )
            }
          </p>
        </div>

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 確認コード入力フォーム */}
        {isConfirming ? (
          <form onSubmit={handleConfirmSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                確認コード
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="confirmCode"
                  value={formData.confirmCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123456"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '確認中...' : '確認コードを確認'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              戻る
            </button>
          </form>
        ) : (
          /* ログイン/サインアップフォーム */
          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="表示名を入力"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="パスワードを入力"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isSignup ? '作成中...' : 'ログイン中...') 
                : (isSignup ? 'アカウント作成' : 'ログイン')
              }
            </button>

            {/* デモユーザー情報入力ボタン */}
            <button
              type="button"
              onClick={fillDemoData}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
            >
              デモユーザー情報を入力
            </button>
          </form>
        )}

        {/* 切り替えリンク */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              resetForm();
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {isSignup 
              ? '既にアカウントをお持ちですか？ログイン' 
              : 'アカウントをお持ちでない方はこちら'
            }
          </button>
        </div>

        {/* AWS Cognito情報 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">AWS Cognito認証</h3>
          <p className="text-xs text-blue-700">
            このアプリケーションはAWS Cognitoを使用したセキュアな認証システムです。
            ユーザー情報はAWSのクラウドで安全に管理されます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 