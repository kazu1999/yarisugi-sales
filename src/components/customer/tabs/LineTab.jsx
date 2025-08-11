import React from 'react';
import { MessageSquare, Send } from 'lucide-react';

const LineTab = ({ lineHistory }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-6">LINE管理</h2>
          
          {/* チャット履歴 */}
          <div className="border rounded-lg" style={{ height: '400px' }}>
            <div className="border-b p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">田中一郎</p>
                    <p className="text-sm text-gray-500">株式会社テックソリューション</p>
                  </div>
                </div>
              </div>
            </div>
              
            {/* メッセージエリア */}
            <div className="h-64 overflow-y-auto p-4 space-y-4">
              {lineHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'sales' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.sender === 'sales'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {msg.timestamp}
                      {msg.sender === 'sales' && msg.read && ' • 既読'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 入力エリア */}
            <div className="border-t p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="メッセージを入力..."
                  className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineTab; 