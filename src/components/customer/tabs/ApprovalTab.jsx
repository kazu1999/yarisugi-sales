import React from 'react';
import { Mail, Check, X } from 'lucide-react';
import Button from '../../common/Button';

const ApprovalTab = ({ approvalItems }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">AI応答の承認待ち</h2>
            <div className="flex items-center space-x-2">
              <Button variant="primary">
                全て承認
              </Button>
              <Button variant="secondary">
                一括承認
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {approvalItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{item.type}</p>
                      <p className="text-sm text-gray-500">
                        {item.timestamp} 信頼度: {item.confidence}%
                      </p>
                    </div>
                  </div>
                </div>
                  
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">FROM: {item.from}</p>
                  <p className="text-sm text-gray-600 mb-1">件名: {item.subject}</p>
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    <p className="text-sm">顧客メッセージ:</p>
                    <p className="text-gray-700">{item.message}</p>
                  </div>
                </div>
                  
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">AI提案返信:</p>
                  <textarea
                    className="w-full p-3 border rounded-lg h-32"
                    defaultValue={item.aiSuggestion}
                  />
                </div>
                  
                <div className="flex items-center justify-end space-x-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center">
                    <Check className="w-4 h-4 mr-1" />
                    承認して送信
                  </button>
                  <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                    編集して送信
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center">
                    <X className="w-4 h-4 mr-1" />
                    却下
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                    手動で対応
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalTab; 