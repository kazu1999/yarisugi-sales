import React from 'react';
import { X } from 'lucide-react';

// タブコンポーネントのインポート
import OverviewTab from './tabs/OverviewTab';
import SalesActionTab from './tabs/SalesActionTab';
import EmailTab from './tabs/EmailTab';
import LineTab from './tabs/LineTab';
import InvoiceTab from './tabs/InvoiceTab';
import ContractTab from './tabs/ContractTab';
import AIAutomationTab from './tabs/AIAutomationTab';
import ApprovalTab from './tabs/ApprovalTab';

// モーダルコンポーネントのインポート
import EmailComposerModal from '../modals/EmailComposerModal';
import LineComposerModal from '../modals/LineComposerModal';
import ProcessSettingsModal from '../modals/ProcessSettingsModal';
import TemplateSaveModal from '../modals/TemplateSaveModal';

const CustomerDetail = ({
  showCustomerDetail,
  setShowCustomerDetail,
  selectedCustomer,
  // カスタムフックから取得した状態と関数
  activeTab,
  setActiveTab,
  showProcessSettings,
  setShowProcessSettings,
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
  lineHistory,
  approvalItems,
  salesProcess,
  processTemplates,
  showTemplateSaveModal,
  setShowTemplateSaveModal,
  newTemplateName,
  setNewTemplateName,
  // 関数
  calculateProgress,
  updateProcessStep,
  addProcessStep,
  removeProcessStep,
  saveAsTemplate,
  applyProcessTemplate,
  deleteTemplate,
  // 定数
  industryOptions,
  snsStatusOptions,
  customerStatuses,
  processTypes
}) => {
  if (!showCustomerDetail || !selectedCustomer) return null;

  const tabs = [
    { id: '概要', label: '概要', icon: '📊' },
    { id: 'ファイル管理', label: 'ファイル管理', icon: '📁' },
    { id: '商談記録', label: '商談記録', icon: '📝' },
    { id: '営業アクション', label: '営業アクション', icon: '⚡' },
    { id: 'メール管理', label: 'メール管理', icon: '📧' },
    { id: 'LINE管理', label: 'LINE管理', icon: '💬' },
    { id: '請求書管理', label: '請求書管理', icon: '💰' },
    { id: '契約書管理', label: '契約書管理', icon: '📋' },
    { id: 'AI自動化', label: 'AI自動化', icon: '🤖' },
    { id: '承認待ち (2)', label: '承認待ち (2)', icon: '⏳' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case '概要':
        return (
          <OverviewTab
            customerForm={customerForm}
            setCustomerForm={setCustomerForm}
            industryOptions={industryOptions}
            snsStatusOptions={snsStatusOptions}
            customerStatuses={customerStatuses}
            selectedCustomer={selectedCustomer}
          />
        );
      case '営業アクション':
        return (
          <SalesActionTab
            salesProcess={salesProcess}
            processTypes={processTypes}
            calculateProgress={calculateProgress}
            setShowProcessSettings={setShowProcessSettings}
            setSelectedProcess={setSelectedProcess}
            setShowEmailComposer={setShowEmailComposer}
            setShowLineComposer={setShowLineComposer}
          />
        );
      case 'メール管理':
        return <EmailTab emailHistory={emailHistory} />;
      case 'LINE管理':
        return <LineTab lineHistory={lineHistory} />;
      case '請求書管理':
        return <InvoiceTab />;
      case '契約書管理':
        return <ContractTab />;
      case 'AI自動化':
        return (
          <AIAutomationTab
            aiSettings={aiSettings}
            setAiSettings={setAiSettings}
          />
        );
      case '承認待ち (2)':
        return <ApprovalTab approvalItems={approvalItems} />;
      default:
        return (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">{activeTab}</h2>
              <p className="text-gray-600">このタブの内容は開発中です。</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* タブナビゲーション */}
      <div className="bg-white border-b shadow-sm flex-shrink-0">
        <div className="w-full">
          <div className="flex space-x-1 p-2 sm:p-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {renderTabContent()}
      </div>

      {/* モーダルコンポーネント */}
      <EmailComposerModal
        showEmailComposer={showEmailComposer}
        setShowEmailComposer={setShowEmailComposer}
        selectedProcess={selectedProcess}
        customerForm={customerForm}
      />
      
      <LineComposerModal
        showLineComposer={showLineComposer}
        setShowLineComposer={setShowLineComposer}
        selectedProcess={selectedProcess}
        customerForm={customerForm}
      />
      
      <ProcessSettingsModal
        showProcessSettings={showProcessSettings}
        setShowProcessSettings={setShowProcessSettings}
        processTemplates={processTemplates}
        salesProcess={salesProcess}
        processTypes={processTypes}
        addProcessStep={addProcessStep}
        removeProcessStep={removeProcessStep}
        updateProcessStep={updateProcessStep}
        applyProcessTemplate={applyProcessTemplate}
        deleteTemplate={deleteTemplate}
        setShowTemplateSaveModal={setShowTemplateSaveModal}
      />
      
      <TemplateSaveModal
        showTemplateSaveModal={showTemplateSaveModal}
        setShowTemplateSaveModal={setShowTemplateSaveModal}
        newTemplateName={newTemplateName}
        setNewTemplateName={setNewTemplateName}
        salesProcess={salesProcess}
        saveAsTemplate={saveAsTemplate}
      />
    </div>
  );
};

export default CustomerDetail; 