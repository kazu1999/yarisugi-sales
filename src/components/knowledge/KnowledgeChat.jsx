import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, FileText, Search, X, CheckCircle } from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';

const KnowledgeChat = ({ isOpen, onClose, selectedKnowledgeIds = [] }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [knowledgeOptions, setKnowledgeOptions] = useState([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState(selectedKnowledgeIds);
  const [showKnowledgeSelector, setShowKnowledgeSelector] = useState(false);
  const messagesEndRef = useRef(null);

  // メッセージの自動スクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // チャット履歴を取得
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
      loadKnowledgeOptions();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    try {
      const response = await awsApiClient.getKnowledgeChatHistory(chatId);
      if (response.success && response.data.chats) {
        const allMessages = [];
        Object.values(response.data.chats).forEach(chatMessages => {
          allMessages.push(...chatMessages);
        });
        setMessages(allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      }
    } catch (error) {
      console.error('チャット履歴の読み込みに失敗しました:', error);
    }
  };

  const loadKnowledgeOptions = async () => {
    try {
      console.log('🔍 ナレッジオプション読み込み開始');
      // ナレッジ一覧を取得
      const response = await awsApiClient.getKnowledge();
      console.log('📦 ナレッジレスポンス:', response);
      
      // knowledge_manager Lambda関数は直接 'knowledgeEntries' を返す
      if (response.knowledgeEntries) {
        console.log('📚 ナレッジデータ:', response.knowledgeEntries);
        if (Array.isArray(response.knowledgeEntries)) {
          setKnowledgeOptions(response.knowledgeEntries);
        } else {
          console.log('❌ ナレッジデータが配列ではありません:', response.knowledgeEntries);
        }
      } else {
        console.log('❌ ナレッジデータが取得できませんでした');
      }
    } catch (error) {
      console.error('ナレッジオプションの読み込みに失敗しました:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      message: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await awsApiClient.sendKnowledgeChatMessage(
        inputMessage,
        chatId,
        selectedKnowledge
      );

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          message: response.data.response,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          knowledgeIds: response.data.knowledgeIds,
          relevantKnowledge: response.data.relevantKnowledge
        };

        setMessages(prev => [...prev, aiMessage]);
        
        if (!chatId) {
          setChatId(response.data.chatId);
        }
      } else {
        throw new Error(response.error || 'メッセージの送信に失敗しました');
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      const errorMessage = {
        id: Date.now() + 1,
        message: '申し訳ございませんが、エラーが発生しました。もう一度お試しください。',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setChatId(null);
  };

  const toggleKnowledgeSelector = () => {
    setShowKnowledgeSelector(!showKnowledgeSelector);
  };

  const handleKnowledgeToggle = (knowledgeId) => {
    setSelectedKnowledge(prev => {
      if (prev.includes(knowledgeId)) {
        return prev.filter(id => id !== knowledgeId);
      } else {
        return [...prev, knowledgeId];
      }
    });
  };

  const selectAllKnowledge = () => {
    const allIds = knowledgeOptions.map(k => k.knowledgeId || k.id);
    setSelectedKnowledge(allIds);
  };

  const clearKnowledgeSelection = () => {
    setSelectedKnowledge([]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">ナレッジチャット</h2>
            {selectedKnowledge.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {selectedKnowledge.length}件のナレッジを指定
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleKnowledgeSelector}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>ナレッジ選択</span>
            </button>
            <button
              onClick={clearChat}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              クリア
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ナレッジ選択パネル */}
        {showKnowledgeSelector && (
          <div className="p-4 border-b bg-gray-50 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">ナレッジを選択</h3>
              <button
                onClick={toggleKnowledgeSelector}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={selectAllKnowledge}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                全て選択
              </button>
              <button
                onClick={clearKnowledgeSelection}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                選択解除
              </button>
              <span className="text-xs text-gray-600">
                {selectedKnowledge.length}件選択中
              </span>
            </div>

            <div className="space-y-2">
              {knowledgeOptions.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  ナレッジが見つかりません
                </div>
              ) : (
                knowledgeOptions.map((knowledge) => {
                  const knowledgeId = knowledge.knowledgeId || knowledge.id;
                  return (
                    <div
                      key={knowledgeId}
                      className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                        selectedKnowledge.includes(knowledgeId)
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleKnowledgeToggle(knowledgeId)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedKnowledge.includes(knowledgeId)}
                        onChange={() => handleKnowledgeToggle(knowledgeId)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {knowledge.fileName || knowledge.title || '無題のナレッジ'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {knowledge.summary || '要約なし'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 text-xs text-gray-600">
              選択したナレッジのみから検索します。何も選択しない場合は全ナレッジから検索します。
            </div>
          </div>
        )}

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>ナレッジデータを基にしたチャットを開始できます</p>
              <p className="text-sm mt-2">質問を入力して、AIに聞いてみてください</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isError
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.message}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {formatTime(message.timestamp)}
                  </div>
                  
                  {/* 参考ナレッジ表示 */}
                  {message.relevantKnowledge && message.relevantKnowledge.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs font-medium mb-1">参考ナレッジ:</div>
                      {message.relevantKnowledge.map((knowledge, index) => (
                        <div key={`${message.id}-knowledge-${index}`} className="text-xs bg-white bg-opacity-50 p-2 rounded mb-1">
                          <div className="font-medium">{knowledge.title}</div>
                          <div className="text-gray-600 truncate">{knowledge.chunkText}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">AIが回答を生成中...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ナレッジについて質問してください..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
            >
              <Send className="w-4 h-4" />
              <span>送信</span>
            </button>
          </div>
          
          {/* ナレッジ指定表示 */}
          {selectedKnowledge.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              {selectedKnowledge.length}件のナレッジを指定して検索
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeChat;
