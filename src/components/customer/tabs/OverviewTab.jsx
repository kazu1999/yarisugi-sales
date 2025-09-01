import React, { useState } from 'react';
import { Building, CheckCircle, Edit, Copy, Trash2, Download, Save, X } from 'lucide-react';
import Button from '../../common/Button';
import { awsApiClient } from '../../../utils/awsApiClient';
import CustomerReportModal from '../../modals/CustomerReportModal';

const OverviewTab = ({ 
  customerForm, 
  setCustomerForm, 
  industryOptions, 
  snsStatusOptions, 
  customerStatuses,
  selectedCustomer
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);

  const handleSave = async () => {
    // 必須フィールドの検証
    if (!customerForm.companyName || !customerForm.customerName || !customerForm.email || !customerForm.industry || !customerForm.status) {
      setSaveMessage('必須フィールドを入力してください');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      console.log('💾 Saving customer data:', customerForm);
      
      const response = await awsApiClient.request(`/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        body: customerForm
      });

      console.log('✅ Customer data saved:', response);
      
      setSaveMessage('顧客情報を更新しました');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
      
    } catch (error) {
      console.error('❌ Failed to save customer data:', error);
      setSaveMessage('保存に失敗しました');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      // 自社情報を取得
      const profileResponse = await awsApiClient.request('/company-profile', {
        method: 'GET'
      });
      setCompanyProfile(profileResponse);
      
      // レポートモーダルを開く
      setShowReportModal(true);
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
      // エラーが発生してもモーダルは開く（デフォルト値で処理）
      setShowReportModal(true);
    }
  };



  return (
    <div className="max-w-4xl mx-auto">
      {/* 保存メッセージ */}
      {showSaveMessage && (
        <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
          saveMessage.includes('失敗') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          <span>{saveMessage}</span>
          <button onClick={() => setShowSaveMessage(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold mb-6">顧客情報</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerForm.companyName}
              onChange={(e) => setCustomerForm({...customerForm, companyName: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              顧客名（担当者名） <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerForm.customerName}
              onChange={(e) => setCustomerForm({...customerForm, customerName: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所在地
            </label>
            <input
              type="text"
              value={customerForm.location}
              onChange={(e) => setCustomerForm({...customerForm, location: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              業種 <span className="text-red-500">*</span>
            </label>
            <select
              value={customerForm.industry}
              onChange={(e) => setCustomerForm({...customerForm, industry: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              {industryOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サイトURL
            </label>
            <input
              type="url"
              value={customerForm.siteUrl}
              onChange={(e) => setCustomerForm({...customerForm, siteUrl: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SNS運用状況
            </label>
            <select
              value={customerForm.snsStatus}
              onChange={(e) => setCustomerForm({...customerForm, snsStatus: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              {snsStatusOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LINE ID
            </label>
            <input
              type="text"
              value={customerForm.lineId}
              onChange={(e) => setCustomerForm({...customerForm, lineId: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              担当営業
            </label>
            <input
              type="text"
              value={customerForm.salesPerson}
              onChange={(e) => setCustomerForm({...customerForm, salesPerson: e.target.value})}
              placeholder="担当者名を入力"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス <span className="text-red-500">*</span>
            </label>
            <select
              value={customerForm.status}
              onChange={(e) => setCustomerForm({...customerForm, status: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              {customerStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存
              </>
            )}
          </Button>
          <Button onClick={handleGenerateReport}>
            <Download className="w-4 h-4 mr-2" />
            レポート抽出
          </Button>

        </div>
      </div>



      {/* レポートモーダル */}
      <CustomerReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        customerData={selectedCustomer}
        companyProfile={companyProfile}
      />


    </div>
  );
};

export default OverviewTab; 