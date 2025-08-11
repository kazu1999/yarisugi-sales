import React from 'react';
import { Shield, Check, Brain } from 'lucide-react';

const AIAutomationTab = ({ aiSettings, setAiSettings }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Shield className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-bold">AI自動化設定</h2>
          </div>
          
          <div className="space-y-6">
            {/* 即座に確認メール送信 */}
            <div className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
              aiSettings.immediateConfirmation 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
              onClick={() => setAiSettings({...aiSettings, immediateConfirmation: !aiSettings.immediateConfirmation})}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold mb-2">1. 即座に確認メール送信</h3>
                  <p className="text-gray-600">「承りました」メールを自動送信</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  aiSettings.immediateConfirmation ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {aiSettings.immediateConfirmation && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
            
            {/* AI自動返信（承認制） */}
            <div className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
              aiSettings.aiAutoReply 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
              onClick={() => setAiSettings({...aiSettings, aiAutoReply: !aiSettings.aiAutoReply})}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold mb-2">2. AI自動返信（承認制）</h3>
                  <p className="text-gray-600">AI回答を生成し、承認後に送信</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  aiSettings.aiAutoReply ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {aiSettings.aiAutoReply && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
            
            {/* FAQ自動応答 */}
            <div className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
              aiSettings.faqAutoReply 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
              onClick={() => setAiSettings({...aiSettings, faqAutoReply: !aiSettings.faqAutoReply})}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold mb-2">3. FAQ自動応答</h3>
                  <p className="text-gray-600 font-medium">FAQ自動応答を有効化</p>
                  <p className="text-gray-500 text-sm mt-1">よくある質問に自動で回答</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  aiSettings.faqAutoReply ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {aiSettings.faqAutoReply && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
          </div>
          
          {/* 学習状況 */}
          <div className="mt-8 p-6 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-4">
              <Brain className="w-6 h-6 text-purple-500" />
              <h3 className="font-bold">AI学習・改善</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              承認・却下のパターンからAIが学習し、より精度の高い回答を生成するようになります。
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">今月の学習データ:</p>
                <p className="text-2xl font-bold text-purple-600">127件</p>
                <p className="text-xs text-gray-500">承認パターン</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">&nbsp;</p>
                <p className="text-2xl font-bold text-orange-600">23件</p>
                <p className="text-xs text-gray-500">修正パターン</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">精度向上:</p>
                <p className="text-2xl font-bold text-green-600">+12%</p>
                <p className="text-xs text-gray-500">先月比: +12%</p>
                <p className="text-xs text-gray-500">現在の精度: 87%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAutomationTab; 