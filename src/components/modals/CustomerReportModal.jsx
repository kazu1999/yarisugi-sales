import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Sparkles, Loader2 } from 'lucide-react';
import { awsApiClient } from '../../utils/awsApiClient';

const CustomerReportModal = ({ isOpen, onClose, customerData, companyProfile }) => {
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && customerData && !report) {
      generateReport();
    }
  }, [isOpen, customerData]);

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await awsApiClient.request('/customer-report', {
        method: 'POST',
        body: {
          customerData: customerData,
          companyProfile: companyProfile
        }
      });

      setReport(response);
    } catch (error) {
      console.error('Failed to generate report:', error);
      setError('レポートの生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;

    const reportText = `
顧客レポート
${customerData.companyName}
生成日: ${new Date().toLocaleDateString('ja-JP')}

【顧客についてのまとめ】
${report.customerSummary}

【営業提案】
${report.salesProposal}

【推奨アプローチ】
${report.recommendedApproach}
    `;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customerData.companyName}_レポート_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">顧客レポート</h2>
              <p className="text-sm text-gray-600">{customerData?.companyName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {report && (
              <button onClick={handleDownload} className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                ダウンロード
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">AIがレポートを生成中...</p>
              <p className="text-sm text-gray-600">ChatGPTを使用して、顧客の分析と営業提案を作成しています</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={generateReport} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                再試行
              </button>
            </div>
          ) : report ? (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">顧客についてのまとめ</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{report.customerSummary}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <FileText className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-green-900">営業提案</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{report.salesProposal}</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="text-lg font-semibold text-purple-900">推奨アプローチ</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{report.recommendedApproach}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>生成日時: {new Date().toLocaleString('ja-JP')}</span>
                  <span>AI: ChatGPT</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CustomerReportModal;
