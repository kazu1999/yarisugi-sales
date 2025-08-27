import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar, User, FileText, Download, ArrowLeft, RefreshCw, Send, Bot } from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';
import EmailReplyModal from './EmailReplyModal';

const EmailDetailModal = ({ isOpen, onClose, email, connection, onBack }) => {
  const [emailDetail, setEmailDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [aiReplyLoading, setAiReplyLoading] = useState(false);
  const [showAiReply, setShowAiReply] = useState(false);

  useEffect(() => {
    if (isOpen && email && connection) {
      fetchEmailDetail();
    }
  }, [isOpen, email, connection]);

  const fetchEmailDetail = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await awsApiClient.request(`/email/messages/${email.messageId}`, {
        method: 'GET',
        params: {
          connectionId: connection.connectionId,
          folder: 'INBOX'
        }
      });

      if (response.success) {
        setEmailDetail(response.email);
      } else {
        setError(response.error || 'メール詳細の取得に失敗しました。');
      }
    } catch (err) {
      setError('メール詳細の取得中にエラーが発生しました。');
      console.error('Fetch email detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateAiReply = async () => {
    if (!emailDetail) return;

    setAiReplyLoading(true);
    setError('');

    try {
      // メール内容を準備
      const emailContent = `
件名: ${emailDetail.subject || '(件名なし)'}
送信者: ${emailDetail.from}
本文:
${emailDetail.body || ''}
      `.trim();

      const response = await awsApiClient.request('/email/ai-reply', {
        method: 'POST',
        body: JSON.stringify({
          emailContent: emailContent,
          userContext: ''
        })
      });

      if (response.success) {
        setAiReply(response.aiReply);
        setShowAiReply(true);
      } else {
        setError(response.error || 'AI返信の生成に失敗しました。');
      }
    } catch (err) {
      setError('AI返信の生成中にエラーが発生しました。');
      console.error('Generate AI reply error:', err);
    } finally {
      setAiReplyLoading(false);
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
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderEmailBody = (body) => {
    if (!body) return <p className="text-gray-500">本文がありません。</p>;
    
    // HTMLタグが含まれている場合は安全に表示
    if (body.includes('<') && body.includes('>')) {
      return (
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      );
    }
    
    // プレーンテキストの場合は改行を保持
    return (
      <div className="whitespace-pre-wrap text-gray-900">
        {body}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              メール詳細
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={generateAiReply}
              disabled={aiReplyLoading || !emailDetail}
              className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Bot className="w-4 h-4 mr-1" />
              {aiReplyLoading ? 'AI生成中...' : 'AI返信提案'}
            </button>
            <button
              onClick={() => setShowReplyModal(true)}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4 mr-1" />
              返信
            </button>
            <button
              onClick={fetchEmailDetail}
              disabled={loading}
              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              更新
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* AI返信提案 */}
        {showAiReply && aiReply && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-green-900 flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                AI返信提案
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setShowReplyModal(true);
                    // AI返信を返信モーダルに渡す
                    if (emailDetail) {
                      emailDetail.aiReply = aiReply;
                    }
                  }}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                >
                  この返信を使用
                </button>
                <button
                  onClick={() => setShowAiReply(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  閉じる
                </button>
              </div>
            </div>
            <div className="bg-white border border-green-300 rounded p-3">
              <div className="whitespace-pre-wrap text-gray-900 text-sm">
                {aiReply}
              </div>
            </div>
          </div>
        )}

        {/* メール詳細 */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">メール詳細を読み込み中...</span>
          </div>
        ) : emailDetail ? (
          <div className="overflow-y-auto max-h-[70vh]">
            {/* メール情報 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">件名</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {emailDetail.subject || '(件名なし)'}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      送信者
                    </label>
                    <p className="text-gray-900">{emailDetail.from}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">宛先</label>
                    <p className="text-gray-900">{emailDetail.to}</p>
                  </div>
                </div>

                {emailDetail.cc && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">CC</label>
                    <p className="text-gray-900">{emailDetail.cc}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    送信日時
                  </label>
                  <p className="text-gray-900">{formatDate(emailDetail.date)}</p>
                </div>
              </div>
            </div>

            {/* 添付ファイル */}
            {emailDetail.attachments && emailDetail.attachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  添付ファイル ({emailDetail.attachments.length}件)
                </h3>
                <div className="space-y-2">
                  {emailDetail.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{attachment.filename}</p>
                          <p className="text-sm text-gray-500">
                            {attachment.contentType} • {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* メール本文 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">本文</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                {renderEmailBody(emailDetail.body)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">メール詳細を読み込めませんでした。</p>
          </div>
        )}

        {/* 返信モーダル */}
        <EmailReplyModal
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          originalEmail={emailDetail}
          connection={connection}
          onReplySent={() => {
            setShowReplyModal(false);
            // 返信送信後にメール詳細を更新
            fetchEmailDetail();
          }}
        />
      </div>
    </div>
  );
};

export default EmailDetailModal;
