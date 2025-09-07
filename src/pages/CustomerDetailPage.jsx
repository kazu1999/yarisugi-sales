import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CustomerDetail from '../components/customer/CustomerDetail';
import { useCustomerManagement } from '../hooks/useCustomerManagement';
import { awsApiClient } from '../utils/awsApiClient';
import AuthContext from '../contexts/AuthContext';

const CustomerDetailPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  
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

  // 顧客データ
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 顧客IDに基づいて顧客データを取得
    const fetchCustomerData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Fetching customer data for ID:', customerId);
        
        // APIから顧客データを取得
        const response = await awsApiClient.request(`/customers/${customerId}`, {
          method: 'GET'
        });
        
        console.log('✅ Customer data received:', response);
        
        if (response && response.id) {
          setSelectedCustomer(response);
          
          // 顧客情報をフォームに設定
          setCustomerForm({
            companyName: response.companyName || '',
            customerName: response.customerName || '',
            location: response.location || '',
            industry: response.industry || '',
            siteUrl: response.siteUrl || '',
            snsStatus: response.snsStatus || '',
            lineId: response.lineId || '',
            email: response.email || '',
            salesPerson: response.salesPerson || '',
            status: response.status || '新規'
          });
        } else {
          throw new Error('Invalid customer data received');
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch customer data:', error);
        setError('顧客データの取得に失敗しました');
        
        // エラー時は一覧ページに戻る
        setTimeout(() => {
          navigate('/');
        }, 3000);
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

  if (error) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600 mb-4">3秒後に一覧ページに戻ります...</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            今すぐ一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  if (!selectedCustomer) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">🔍</div>
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{selectedCustomer.companyName}</h1>
                <p className="text-sm text-gray-600">{selectedCustomer.customerName} • {selectedCustomer.industry}</p>
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
          selectedCustomer={{ ...selectedCustomer, currentUser }}
          // カスタムフックから取得した状態と関数
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
          // 定数
          industryOptions={industryOptions}
          snsStatusOptions={snsStatusOptions}
          customerStatuses={customerStatuses}
        />
      </div>
    </div>
  );
};

export default CustomerDetailPage; 