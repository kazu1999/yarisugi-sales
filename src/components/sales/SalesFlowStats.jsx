import React, { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  Users, 
  Activity,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';

const SalesFlowStats = () => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatsData();
  }, []);

  const fetchStatsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 トップページデータ取得開始...');
      const response = await awsApiClient.getSalesFlowStats();
      console.log('📊 トップページレスポンス:', response);
      
      if (response && response.success) {
        setStatsData(response.data);
        console.log('✅ トップページデータ取得成功');
      } else {
        console.error('❌ トップページデータ取得失敗:', response);
        setError('トップページデータの取得に失敗しました');
      }
    } catch (err) {
      console.error('❌ トップページデータ取得エラー:', err);
      setError(`データの取得中にエラーが発生しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">トップページを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <Activity className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchStatsData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!statsData || !statsData.stage_details) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* ヘッダー */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-blue-600" />
          トップページ
        </h1>
        <p className="text-sm sm:text-base text-gray-600">営業フローの進捗状況を確認できます</p>
      </div>

      {/* 全体統計 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">総顧客数</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{statsData.total_customers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">最終更新</p>
              <p className="text-xs sm:text-sm text-gray-500">
                {new Date(statsData.last_updated).toLocaleString('ja-JP')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">営業ステップ</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">8段階</p>
            </div>
          </div>
        </div>
      </div>

      {/* ステージ別統計 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
            営業ステップ別顧客数
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">各営業ステップにいる顧客の数と割合</p>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {statsData.stage_details.map((stage, index) => (
              <div key={stage.id} className="text-center">
                <div className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3 ${stage.color}`}>
                  <span className="mr-1 sm:mr-2 text-sm sm:text-lg">{stage.icon}</span>
                  <span className="hidden sm:inline">{stage.name}</span>
                  <span className="sm:hidden">{stage.name.split('・')[0]}</span>
                </div>
                
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {stage.count}
                </div>
                
                <div className="text-xs sm:text-sm text-gray-500 mb-2">
                  {stage.percentage}%
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                  <div 
                    className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stage.percentage}%` }}
                  ></div>
                </div>
                
                <p className="text-xs text-gray-500 mt-1 sm:mt-2 hidden sm:block">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 顧客別営業フロー一覧 */}
      {statsData.customer_flows && statsData.customer_flows.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
              顧客別営業フロー一覧
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">各顧客の現在の営業ステップを確認できます</p>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {statsData.customer_flows.map((customer) => (
                <div key={customer.customerId} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{customer.customerName}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{customer.companyName}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${customer.stageColor}`}>
                      <span className="mr-1">{customer.stageIcon}</span>
                      <span className="hidden sm:inline">{customer.stageName}</span>
                      <span className="sm:hidden">{customer.stageName.split('・')[0]}</span>
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 hidden sm:block">
                    現在のステップ: {customer.stageName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 更新ボタン */}
      <div className="mt-4 sm:mt-6 text-center">
        <button
          onClick={fetchStatsData}
          className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto text-sm sm:text-base"
        >
          <RefreshCw className="w-4 h-4" />
          データを更新
        </button>
      </div>
    </div>
  );
};

export default SalesFlowStats;
