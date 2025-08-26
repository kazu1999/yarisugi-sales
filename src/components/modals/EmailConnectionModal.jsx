import React, { useState } from 'react';
import { X, Mail, Lock, Server, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';

const EmailConnectionModal = ({ isOpen, onClose, onConnectionSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    imapServer: '',
    imapPort: '993',
    useSSL: true
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [error, setError] = useState('');

  // 一般的なメールサービスのIMAP設定
  const emailProviders = {
    'gmail.com': { server: 'imap.gmail.com', port: '993', ssl: true },
    'outlook.com': { server: 'outlook.office365.com', port: '993', ssl: true },
    'hotmail.com': { server: 'outlook.office365.com', port: '993', ssl: true },
    'yahoo.com': { server: 'imap.mail.yahoo.com', port: '993', ssl: true },
    'yahoo.co.jp': { server: 'imap.mail.yahoo.co.jp', port: '993', ssl: true }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // メールアドレスが変更された場合、自動的にIMAP設定を検出
    if (name === 'email') {
      const domain = value.split('@')[1];
      if (domain && emailProviders[domain]) {
        const provider = emailProviders[domain];
        setFormData(prev => ({
          ...prev,
          email: value,
          imapServer: provider.server,
          imapPort: provider.port,
          useSSL: provider.ssl
        }));
      }
    }
  };

  const handleTestConnection = async () => {
    if (!formData.email || !formData.password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }

    setIsConnecting(true);
    setError('');
    setConnectionStatus(null);

    try {
      const response = await awsApiClient.request('/email/test-connection', {
        method: 'POST',
        body: {
          email: formData.email,
          password: formData.password,
          imapServer: formData.imapServer,
          imapPort: parseInt(formData.imapPort),
          useSSL: formData.useSSL
        }
      });

      if (response.success) {
        setConnectionStatus('success');
        setError('');
      } else {
        setConnectionStatus('error');
        setError(response.error || '接続に失敗しました。');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError('接続テスト中にエラーが発生しました。');
      console.error('Email connection test error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!formData.email || !formData.password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const response = await awsApiClient.request('/email/save-connection', {
        method: 'POST',
        body: {
          email: formData.email,
          password: formData.password,
          imapServer: formData.imapServer,
          imapPort: parseInt(formData.imapPort),
          useSSL: formData.useSSL
        }
      });

      if (response.success) {
        onConnectionSuccess(response.connectionId);
        onClose();
      } else {
        setError(response.error || '接続の保存に失敗しました。');
      }
    } catch (err) {
      setError('接続の保存中にエラーが発生しました。');
      console.error('Email connection save error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            メール接続設定
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム */}
        <div className="space-y-4">
          {/* メールアドレス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@gmail.com"
              />
            </div>
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="パスワードを入力"
              />
            </div>
          </div>

          {/* IMAPサーバー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IMAPサーバー
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="imapServer"
                value={formData.imapServer}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="imap.gmail.com"
              />
            </div>
          </div>

          {/* IMAPポート */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IMAPポート
            </label>
            <input
              type="number"
              name="imapPort"
              value={formData.imapPort}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="993"
            />
          </div>

          {/* SSL使用 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="useSSL"
              checked={formData.useSSL}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              SSL/TLSを使用
            </label>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* 接続ステータス */}
          {connectionStatus && (
            <div className={`border rounded-md p-3 ${
              connectionStatus === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                {connectionStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                )}
                <p className={`text-sm ${
                  connectionStatus === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {connectionStatus === 'success' 
                    ? '接続テストが成功しました！' 
                    : '接続テストに失敗しました。'
                  }
                </p>
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleTestConnection}
              disabled={isConnecting}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isConnecting ? '接続中...' : '接続テスト'}
            </button>
            
            <button
              onClick={handleSaveConnection}
              disabled={isConnecting || connectionStatus !== 'success'}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? '保存中...' : '接続を保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConnectionModal;
