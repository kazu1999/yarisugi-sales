import React from 'react';
import { Mail, X, Upload, Brain, Send } from 'lucide-react';
import Button from '../common/Button';

const EmailComposerModal = ({ 
  showEmailComposer, 
  setShowEmailComposer, 
  selectedProcess, 
  customerForm 
}) => {
  if (!showEmailComposer || !selectedProcess) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-500" />
              メール作成 - {selectedProcess.name}
            </h2>
            <button
              onClick={() => setShowEmailComposer(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">宛先</label>
              <input
                type="email"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                defaultValue={customerForm.email}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
              <input
                type="text"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                defaultValue={`【${selectedProcess.name}】のご案内`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">テンプレート</label>
              <select className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500">
                <option>自動生成テンプレート（AI推奨）</option>
                <option>標準テンプレート</option>
                <option>カスタムテンプレート</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
              <textarea
                className="w-full p-3 border rounded h-64 focus:ring-2 focus:ring-blue-500"
                defaultValue={`${customerForm.customerName || ''}様

いつもお世話になっております。
${customerForm.salesPerson || ''}です。

${selectedProcess.name}についてご連絡させていただきました。

[AIが商談履歴から自動生成した内容がここに挿入されます]

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">添付ファイル</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">ファイルをドラッグ&ドロップまたは</p>
                <button className="text-sm text-blue-600 hover:text-blue-800">ファイルを選択</button>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Brain className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">AI分析による推奨事項</p>
                  <p className="text-sm text-blue-700 mt-1">
                    前回の商談内容から、{selectedProcess.name}に関する具体的な提案内容を自動生成しました。
                    送信前に内容をご確認ください。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end space-x-3">
          <Button 
            variant="secondary"
            onClick={() => setShowEmailComposer(false)}
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

export default EmailComposerModal; 