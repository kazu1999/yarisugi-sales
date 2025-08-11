import React from 'react';
import { Paperclip } from 'lucide-react';
import Button from '../../common/Button';

const EmailTab = ({ emailHistory }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-6">メール管理</h2>
          
          <div className="space-y-4">
            {emailHistory.map(email => (
              <div key={email.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      email.type === '送信' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {email.type}
                    </span>
                    <span className="text-sm text-gray-500">{email.date}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">FROM: {email.from}</p>
                <p className="text-sm text-gray-600 mb-1">TO: {email.to}</p>
                <p className="font-medium mb-2">{email.subject}</p>
                <p className="text-sm text-gray-700">{email.content}</p>
                {email.attachments.length > 0 && (
                  <div className="mt-2 flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      添付: {email.attachments.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Button variant="secondary">
              さらに読み込む
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTab; 