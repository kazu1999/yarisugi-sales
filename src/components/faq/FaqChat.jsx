import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageCircle, Loader2 } from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';

const FaqChat = ({ faqs = [] }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // メッセージが更新されたときに自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 初期メッセージを設定
  useEffect(() => {
    if (faqs.length > 0) {
      setMessages([
        {
          id: 'welcome',
          type: 'bot',
          content: `こんにちは！FAQアシスタントです。\n現在${faqs.length}件のFAQが登録されています。\n何かご質問がございましたら、お気軽にお聞きください。`,
          timestamp: new Date()
        }
      ]);
    } else {
      setMessages([
        {
          id: 'welcome',
          type: 'bot',
          content: 'こんにちは！FAQアシスタントです。\n現在FAQが登録されていません。\nFAQを登録してからご利用ください。',
          timestamp: new Date()
        }
      ]);
    }
  }, [faqs.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    // ユーザーメッセージを追加
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      // FAQチャットAPIを呼び出し
      const response = await awsApiClient.sendFaqChatMessage(userMessage.content);

      if (response.success) {
        const botMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(response.error || '回答の生成に失敗しました');
      }
    } catch (err) {
      console.error('FAQチャットエラー:', err);
      setError(err.message || 'エラーが発生しました');
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '申し訳ございませんが、回答の生成中にエラーが発生しました。しばらく時間をおいてから再度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
          <Bot className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">FAQアシスタント</h3>
          <p className="text-sm text-gray-500">
            {faqs.length}件のFAQから回答します
          </p>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start gap-3 max-w-[80%] ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* アバター */}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                  message.type === 'user'
                    ? 'bg-blue-600'
                    : 'bg-gray-100'
                }`}
              >
                {message.type === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-gray-600" />
                )}
              </div>

              {/* メッセージ内容 */}
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    message.type === 'user'
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ローディング表示 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">回答を生成中...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="FAQについて質問してください..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isLoading || faqs.length === 0}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || faqs.length === 0}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {faqs.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">
            FAQが登録されていません。FAQを登録してからご利用ください。
          </p>
        )}
      </div>
    </div>
  );
};

export default FaqChat;
