import React from 'react';
import { MessageSquare, X, Smile, Image, Paperclip, Brain, Send } from 'lucide-react';
import Button from '../common/Button';

const LineComposerModal = ({ 
  showLineComposer, 
  setShowLineComposer, 
  selectedProcess, 
  customerForm 
}) => {
  if (!showLineComposer || !selectedProcess) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-green-500" />
              LINE作成 - {selectedProcess.name}
            </h2>
            <button
              onClick={() => setShowLineComposer(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">送信先: {customerForm.customerName || '-'}</p>
              <p className="text-sm text-gray-600">LINE ID: {customerForm.lineId || '-'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メッセージタイプ</label>
              <select className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500">
                <option>テキストメッセージ</option>
                <option>画像付きメッセージ</option>
                <option>リッチメッセージ</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メッセージ内容</label>
              <textarea
                className="w-full p-3 border rounded h-48 focus:ring-2 focus:ring-green-500"
                defaultValue={`${customerForm.customerName || ''}様

お疲れさまです！😊

${selectedProcess.name}の件でご連絡させていただきました。

[商談履歴に基づく内容]

ご都合の良い時にご確認いただけますと幸いです。
何かご不明な点がございましたら、お気軽にメッセージください！`}
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center">
                <Smile className="w-4 h-4 mr-2" />
                スタンプ追加
              </button>
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center">
                <Image className="w-4 h-4 mr-2" />
                画像追加
              </button>
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center">
                <Paperclip className="w-4 h-4 mr-2" />
                ファイル添付
              </button>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Brain className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">AI推奨</p>
                  <p className="text-sm text-green-700 mt-1">
                    LINEでのコミュニケーションはカジュアルに。絵文字を使って親しみやすさを演出しています。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end space-x-3">
          <Button 
            variant="secondary"
            onClick={() => setShowLineComposer(false)}
          >
            キャンセル
          </Button>
          <Button variant="secondary">
            下書き保存
          </Button>
          <Button variant="primary">
            <Send className="w-4 h-4 mr-2" />
            送信
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LineComposerModal; 