import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CustomerDetail from '../components/customer/CustomerDetail';
import { useCustomerManagement } from '../hooks/useCustomerManagement';

const CustomerDetailPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  
  // カスタムフックから顧客管理の状態と関数を取得
  const {
    // 状態
    activeTab,
    setActiveTab,
    showProcessSettings,
    setShowProcessSettings,
    activeSubTab,
    setActiveSubTab,
    showEmailComposer,
    setShowEmailComposer,
    showLineComposer,
    setShowLineComposer,
    selectedProcess,
    setSelectedProcess,
    customerForm,
    setCustomerForm,
    aiSettings,
    setAiSettings,
    emailHistory,
    setEmailHistory,
    lineHistory,
    setLineHistory,
    approvalItems,
    setApprovalItems,
    salesProcess,
    setSalesProcess,
    processTemplates,
    setProcessTemplates,
    showTemplateSaveModal,
    setShowTemplateSaveModal,
    newTemplateName,
    setNewTemplateName,
    questionnaireItems,
    setQuestionnaireItems,
    
    // 関数
    calculateProgress,
    updateProcessStep,
    addProcessStep,
    removeProcessStep,
    updateQuestionnaireItem,
    addQuestionnaireItem,
    removeQuestionnaireItem,
    saveAsTemplate,
    updateReplyDueDate,
    applyProcessTemplate,
    deleteTemplate,
    
    // 定数
    industryOptions,
    snsStatusOptions,
    customerStatuses,
    processTypes
  } = useCustomerManagement();

  // 顧客データ（実際のアプリケーションではAPIから取得）
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 顧客IDに基づいて顧客データを取得
    // 実際のアプリケーションではAPIコールを行う
    const fetchCustomerData = async () => {
      setLoading(true);
      try {
        // 顧客IDに基づいてサンプルデータを取得
        const customerDataMap = {
          'tech-solution-001': {
            id: 'tech-solution-001',
            name: '株式会社テックソリューション',
            contact: '田中一郎',
            industry: 'IT・通信',
            email: 'tanaka@tech-solution.com',
            phone: '03-1234-5678',
            status: '商談中'
          },
          'global-trading-002': {
            id: 'global-trading-002',
            name: '株式会社グローバル商事',
            contact: '佐藤花子',
            industry: '小売・流通',
            email: 'sato@global-trading.co.jp',
            phone: '03-2345-6789',
            status: '成約'
          },
          'manufacturing-003': {
            id: 'manufacturing-003',
            name: '株式会社製造工業',
            contact: '鈴木次郎',
            industry: '製造業',
            email: 'suzuki@manufacturing.com',
            phone: '03-3456-7890',
            status: '新規'
          }
        };
        
        const customerData = customerDataMap[customerId] || {
          id: customerId,
          name: '不明な顧客',
          contact: '不明',
          industry: '不明',
          email: 'unknown@example.com',
          phone: '不明',
          status: '不明'
        };
        
        setSelectedCustomer(customerData);
        
        // 顧客情報をフォームに設定
        setCustomerForm({
          companyName: customerData.name || '',
          customerName: customerData.contact || '',
          location: '',
          industry: customerData.industry || '',
          siteUrl: '',
          snsStatus: '',
          lineId: '',
          email: customerData.email || '',
          salesPerson: '',
          status: customerData.status || ''
        });
      } catch (error) {
        console.error('顧客データの取得に失敗しました:', error);
        // エラー時は一覧ページに戻る
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId, navigate, setCustomerForm]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">顧客情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!selectedCustomer) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">顧客が見つかりませんでした</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                一覧に戻る
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{selectedCustomer.name}</h1>
                <p className="text-sm text-gray-600">{selectedCustomer.contact} • {selectedCustomer.industry}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {selectedCustomer.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 顧客詳細コンテンツ */}
      <div className="flex-1 overflow-hidden">
        <CustomerDetail
          showCustomerDetail={true}
          setShowCustomerDetail={() => navigate('/')}
          selectedCustomer={selectedCustomer}
          // カスタムフックから取得した状態と関数
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showProcessSettings={showProcessSettings}
          setShowProcessSettings={setShowProcessSettings}
          showEmailComposer={showEmailComposer}
          setShowEmailComposer={setShowEmailComposer}
          showLineComposer={showLineComposer}
          setShowLineComposer={setShowLineComposer}
          selectedProcess={selectedProcess}
          setSelectedProcess={setSelectedProcess}
          customerForm={customerForm}
          setCustomerForm={setCustomerForm}
          aiSettings={aiSettings}
          setAiSettings={setAiSettings}
          emailHistory={emailHistory}
          lineHistory={lineHistory}
          approvalItems={approvalItems}
          salesProcess={salesProcess}
          processTemplates={processTemplates}
          showTemplateSaveModal={showTemplateSaveModal}
          setShowTemplateSaveModal={setShowTemplateSaveModal}
          newTemplateName={newTemplateName}
          setNewTemplateName={setNewTemplateName}
          // 関数
          calculateProgress={calculateProgress}
          updateProcessStep={updateProcessStep}
          addProcessStep={addProcessStep}
          removeProcessStep={removeProcessStep}
          saveAsTemplate={saveAsTemplate}
          applyProcessTemplate={applyProcessTemplate}
          deleteTemplate={deleteTemplate}
          // 定数
          industryOptions={industryOptions}
          snsStatusOptions={snsStatusOptions}
          customerStatuses={customerStatuses}
          processTypes={processTypes}
        />
      </div>
    </div>
  );
};

export default CustomerDetailPage; 