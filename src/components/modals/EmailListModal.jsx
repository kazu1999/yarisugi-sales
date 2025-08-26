import React, { useState, useEffect } from 'react';
import { X, Mail, RefreshCw, Download, Eye, Calendar, User, FileText } from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';
import useEmailConnection from '../../hooks/useEmailConnection';

const EmailListModal = ({ isOpen, onClose, onEmailSelect }) => {
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { connections, fetchConnections } = useEmailConnection();

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
    }
  }, [isOpen]); // fetchConnectionsを依存配列から削除

  useEffect(() => {
    console.log('Connections updated:', connections); // デバッグ用
  }, [connections]);

  const handleConnectionSelect = async (connection) => {
    console.log('Selected connection:', connection); // デバッグ用
    setSelectedConnection(connection);
    setLoading(true);
    setError('');

    try {
      const params = {
        connectionId: connection.connectionId,
        folder: 'INBOX',
        limit: 10
      };
      console.log('Request params:', params); // デバッグ用
      
      const response = await awsApiClient.request('/email/messages', {
        method: 'GET',
        params: params
      });

      if (response.success) {
        setEmails(response.emails || []);
      } else {
        setError(response.error || 'メール一覧の取得に失敗しました。');
      }
    } catch (err) {
      setError('メール一覧の取得中にエラーが発生しました。');
      console.error('Fetch emails error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedConnection) {
      handleConnectionSelect(selectedConnection);
    }
  };

  const handleEmailClick = (email) => {
    if (onEmailSelect) {
      onEmailSelect(email, selectedConnection);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            メール一覧
          </h2>
          <div className="flex items-center space-x-2">
            {selectedConnection && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                更新
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 接続選択 */}
        {!selectedConnection && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">メールアカウントを選択</h3>
            {connections.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">接続済みのメールアカウントがありません。</p>
                <p className="text-sm text-gray-400 mt-2">まずはメール接続設定を行ってください。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.map((connection) => (
                  <button
                    key={connection.connectionId}
                    onClick={() => handleConnectionSelect(connection)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{connection.emailAddress}</p>
                        <p className="text-sm text-gray-500">{connection.imapServer}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* メール一覧 */}
        {selectedConnection && (
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Mail className="w-4 h-4 text-blue-600 mr-2" />
                <span className="font-medium text-gray-900">{selectedConnection.emailAddress}</span>
                <span className="text-sm text-gray-500 ml-2">({emails.length}件)</span>
              </div>
              <button
                onClick={() => setSelectedConnection(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                アカウント変更
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-600">メールを読み込み中...</span>
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">メールがありません。</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[60vh]">
                <div className="space-y-2">
                  {emails.map((email) => (
                    <div
                      key={email.messageId}
                      onClick={() => handleEmailClick(email)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-2">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600 truncate">
                              {truncateText(email.from, 40)}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                            {email.subject || '(件名なし)'}
                          </h4>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{formatDate(email.date)}</span>
                            {email.hasAttachments && (
                              <FileText className="w-4 h-4 ml-3 text-blue-600" />
                            )}
                          </div>
                        </div>
                        <Eye className="w-4 h-4 text-gray-400 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailListModal;
