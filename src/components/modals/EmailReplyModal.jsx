import React, { useState, useEffect } from 'react';
import { X, Send, User, FileText, AlertCircle, Bot } from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';

const EmailReplyModal = ({ isOpen, onClose, originalEmail, connection, onReplySent }) => {
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    subject: '',
    body: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // メールアドレスを抽出する関数
  const extractEmailAddress = (emailString) => {
    if (!emailString) return '';
    
    // 「名前<メアド>」形式の場合、メアド部分を抽出
    const emailMatch = emailString.match(/<([^>]+)>/);
    if (emailMatch) {
      return emailMatch[1];
    }
    
    // メールアドレスのみの場合、そのまま返す
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailString.trim())) {
      return emailString.trim();
    }
    
    // その他の場合は空文字を返す
    return '';
  };

  useEffect(() => {
    if (isOpen && originalEmail) {
      // AI返信提案がある場合はそれを使用、なければ通常の返信形式
      const hasAiReply = originalEmail.aiReply && originalEmail.aiReply.trim();
      
      setFormData({
        to: extractEmailAddress(originalEmail.from) || '',
        cc: extractEmailAddress(originalEmail.cc) || '',
        subject: `Re: ${originalEmail.subject || ''}`,
        body: hasAiReply 
          ? originalEmail.aiReply 
          : `\n\n--- 元のメール ---\n${originalEmail.body || ''}`
      });
      setError('');
    }
  }, [isOpen, originalEmail]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.to.trim()) {
      setError('宛先を入力してください。');
      return;
    }

    if (!formData.subject.trim()) {
      setError('件名を入力してください。');
      return;
    }

    if (!formData.body.trim()) {
      setError('本文を入力してください。');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await awsApiClient.request('/email/send', {
        method: 'POST',
        body: {
          connectionId: connection.connectionId,
          to: formData.to,
          cc: formData.cc,
          subject: formData.subject,
          body: formData.body
        }
      });

      if (response.success) {
        if (onReplySent) {
          onReplySent();
        }
        onClose();
      } else {
        setError(response.error || 'メールの送信に失敗しました。');
      }
    } catch (err) {
      setError('メールの送信中にエラーが発生しました。');
      console.error('Send email error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* ヘッダー（固定） */}
        <div className="flex items-center justify-between p-6 pb-4 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Send className="w-5 h-5 mr-2" />
            メール返信
            {originalEmail?.aiReply && (
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                <Bot className="w-3 h-3 mr-1" />
                AI提案
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* スクロール可能なコンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* AI返信提案の説明 */}
          {originalEmail?.aiReply && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-start">
                <Bot className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-800 font-medium">AI返信提案が適用されています</p>
                  <p className="text-xs text-green-700 mt-1">
                    FAQデータを基に生成された返信提案です。必要に応じて編集してください。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 返信フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4" id="email-reply-form">
            {/* 宛先 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <User className="w-4 h-4 mr-1" />
                宛先 *
              </label>
              <input
                type="email"
                value={formData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@example.com"
                required
              />
            </div>

            {/* CC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CC
              </label>
              <input
                type="email"
                value={formData.cc}
                onChange={(e) => handleInputChange('cc', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="cc@example.com"
              />
            </div>

            {/* 件名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                件名 *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="件名を入力してください"
                required
              />
            </div>

            {/* 本文 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                本文 *
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="メール本文を入力してください"
                required
              />
            </div>
          </form>
        </div>

        {/* フッター（送信ボタン、固定） */}
        <div className="flex justify-end space-x-3 p-6 pt-4 border-t flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="email-reply-form"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                送信中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                送信
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailReplyModal;
