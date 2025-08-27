import React, { useState, useEffect, useCallback } from 'react';
import { X, Mail, RefreshCw, Download, Eye, Calendar, User, FileText, Zap, Clock } from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';
import useEmailConnection from '../../hooks/useEmailConnection';

const EmailListModal = ({ isOpen, onClose, onEmailSelect }) => {
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterInfo, setFilterInfo] = useState(null);
  const [performanceInfo, setPerformanceInfo] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const { connections, fetchConnections } = useEmailConnection();

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
    }
  }, [isOpen]);

  useEffect(() => {
    console.log('Connections updated:', connections);
  }, [connections]);

  const handleConnectionSelect = useCallback(async (connection) => {
    console.log('Selected connection:', connection);
    setSelectedConnection(connection);
    setLoading(true);
    setError('');
    setPerformanceInfo(null);

    const startTime = performance.now();

    try {
      const params = {
        connectionId: connection.connectionId,
        folder: 'INBOX',
        limit: 30
      };
      console.log('Request params:', params);
      
      const response = await awsApiClient.request('/email/messages', {
        method: 'GET',
        params: params
      });

      const endTime = performance.now();
      const fetchDuration = endTime - startTime;

      if (response.success) {
        setEmails(response.emails || []);
        setFilterInfo({
          filtered: response.filtered || false,
          description: response.filter_description || ''
        });
        
        // パフォーマンス情報を設定
        setPerformanceInfo({
          optimized: response.performance_optimized || false,
          fetchTime: fetchDuration,
          emailCount: response.emails?.length || 0
        });
        
        setLastFetchTime(new Date());
      } else {
        setError(response.error || 'メール一覧の取得に失敗しました。');
      }
    } catch (err) {
      setError('メール一覧の取得中にエラーが発生しました。');
      console.error('Fetch emails error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (selectedConnection) {
      handleConnectionSelect(selectedConnection);
    }
  }, [selectedConnection, handleConnectionSelect]);

  const handleEmailClick = useCallback((email) => {
    if (onEmailSelect) {
      onEmailSelect(email, selectedConnection);
    }
  }, [onEmailSelect, selectedConnection]);

  const formatDate = useCallback((dateString) => {
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
  }, []);

  const truncateText = useCallback((text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            AIメール
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* パフォーマンス情報表示 */}
        {performanceInfo && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {performanceInfo.optimized ? '高速化済み' : '標準処理'}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-blue-700">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{performanceInfo.fetchTime.toFixed(1)}ms</span>
                </div>
                <span>•</span>
                <span>{performanceInfo.emailCount}件のメール</span>
                {lastFetchTime && (
                  <>
                    <span>•</span>
                    <span>{lastFetchTime.toLocaleTimeString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 接続選択 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">メール接続を選択</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {connections.map((connection) => (
              <button
                key={connection.connectionId}
                onClick={() => handleConnectionSelect(connection)}
                disabled={loading}
                className={`p-3 border rounded-lg text-left transition-all ${
                  selectedConnection?.connectionId === connection.connectionId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-gray-900">{connection.emailAddress}</div>
                <div className="text-sm text-gray-500">
                  {connection.isActive ? 'アクティブ' : '非アクティブ'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* フィルター情報 */}
        {filterInfo && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <FileText className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-green-800">{filterInfo.description}</span>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* メール一覧 */}
        <div className="flex-1 overflow-hidden">
          {selectedConnection && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                メール一覧 ({emails.length}件)
              </h3>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>更新</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-gray-600">メールを取得中...</span>
              </div>
            </div>
          )}

          {!loading && emails.length === 0 && selectedConnection && (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">顧客からのメールが見つかりません</p>
            </div>
          )}

          {!loading && emails.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {emails.map((email) => (
                <div
                  key={email.messageId}
                  onClick={() => handleEmailClick(email)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {truncateText(email.from, 40)}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {truncateText(email.subject, 60)}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(email.date)}</span>
                        </div>
                        {email.hasAttachments && (
                          <div className="flex items-center space-x-1">
                            <Download className="w-3 h-3" />
                            <span>添付ファイルあり</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailListModal;
