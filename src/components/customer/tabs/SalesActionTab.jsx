import React from 'react';
import { 
  Zap, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Settings, 
  Check, 
  Users, 
  Mail, 
  MessageSquare, 
  Bell 
} from 'lucide-react';
import Button from '../../common/Button';

const SalesActionTab = ({
  salesProcess,
  processTypes,
  calculateProgress,
  setShowProcessSettings,
  setSelectedProcess,
  setShowEmailComposer,
  setShowLineComposer
}) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Zap className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-bold">営業アクション</h2>
          </div>
          
          {/* 契約想定日時 - 目立つ位置に配置 */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">契約想定日時</h3>
                  <p className="text-sm text-gray-600">目標とする契約締結日を設定してください</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">残り日数</p>
                <p className="text-2xl font-bold text-blue-600">45日</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                className="flex-1 px-4 py-3 text-lg border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                defaultValue="2025-09-15"
              />
              <Button variant="primary">
                日付を更新
              </Button>
            </div>
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">平均契約期間: 60日</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">進捗: 順調</span>
              </div>
            </div>
          </div>
          
          {/* 営業プロセス進捗 */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">営業プロセス進捗</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{calculateProgress()}% 完了</span>
                <button
                  onClick={() => setShowProcessSettings(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  設定
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full bg-gray-200 h-1 rounded"></div>
              </div>
              <div className="relative flex justify-between">
                {salesProcess.map((process, index) => {
                  const ProcessIcon = processTypes.find(t => t.value === process.type)?.icon || Users;
                  return (
                    <div key={process.id} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        process.completed 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {process.completed ? <Check className="w-4 h-4" /> : <ProcessIcon className="w-4 h-4" />}
                      </div>
                      <p className="text-xs mt-2 text-center max-w-[80px]">{process.name}</p>
                      <p className="text-xs text-gray-500">
                        {process.completed ? process.date : process.targetDate}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* プロセス連動メール送信 */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-bold mb-4 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-blue-500" />
              プロセス連動メール送信
            </h3>
            <div className="space-y-4">
              {salesProcess.map((process) => {
                const ProcessIcon = processTypes.find(t => t.value === process.type)?.icon || Users;
                return (
                  <div key={process.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          process.completed 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <ProcessIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{process.name}</h4>
                          <p className="text-sm text-gray-500">
                            {process.completed ? `完了日: ${process.date}` : `予定日: ${process.targetDate}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {process.completed && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center">
                            <Check className="w-3 h-3 mr-1" />
                            完了
                          </span>
                        )}
                        {process.reminder && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center">
                            <Bell className="w-3 h-3 mr-1" />
                            リマインダー
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setSelectedProcess(process);
                          setShowEmailComposer(true);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        メール作成
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProcess(process);
                          setShowLineComposer(true);
                        }}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        LINE作成
                      </button>
                      {!process.completed && (
                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                          <Calendar className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesActionTab; 