import React, { useState } from 'react';
import { Building, CheckCircle, Edit, Copy, Trash2, Download, Save, X } from 'lucide-react';
import Button from '../../common/Button';
import { awsApiClient } from '../../../utils/awsApiClient';

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
          <Button>
            <Download className="w-4 h-4 mr-2" />
            レポート抽出
          </Button>
        </div>
      </div>

      {/* 顧客情報表示エリア */}
      {customerForm.companyName && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2" />
            顧客情報サマリー
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-500">会社名</p>
              <p className="font-medium">{customerForm.companyName}</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-500">担当者名</p>
              <p className="font-medium">{customerForm.customerName || '-'}</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <p className="text-sm text-gray-500">業種</p>
              <p className="font-medium">{customerForm.industry || '-'}</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-gray-500">ステータス</p>
              <p className="font-medium">
                <span className={`px-2 py-1 rounded-full text-sm ${
                  customerForm.status === '新規' ? 'bg-blue-100 text-blue-700' :
                  customerForm.status === '商談中' ? 'bg-yellow-100 text-yellow-700' :
                  customerForm.status === '成約' ? 'bg-green-100 text-green-700' :
                  customerForm.status === '失注' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {customerForm.status || '-'}
                </span>
              </p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <p className="text-sm text-gray-500">メールアドレス</p>
              <p className="font-medium text-sm">{customerForm.email || '-'}</p>
            </div>
            <div className="border-l-4 border-pink-500 pl-4">
              <p className="text-sm text-gray-500">LINE ID</p>
              <p className="font-medium flex items-center">
                {customerForm.lineId || '-'}
                {customerForm.lineId && (
                  <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                )}
              </p>
            </div>
            <div className="border-l-4 border-gray-500 pl-4">
              <p className="text-sm text-gray-500">SNS運用状況</p>
              <p className="font-medium text-sm">{customerForm.snsStatus || '-'}</p>
            </div>
            <div className="border-l-4 border-cyan-500 pl-4">
              <p className="text-sm text-gray-500">担当営業</p>
              <p className="font-medium">{customerForm.salesPerson || '-'}</p>
            </div>
          </div>
          
          {/* 追加アクション */}
          <div className="mt-6 pt-6 border-t flex justify-between items-center">
            <div className="flex space-x-2">
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Edit className="w-4 h-4 mr-1" />
                編集
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-800 flex items-center">
                <Copy className="w-4 h-4 mr-1" />
                複製
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 flex items-center">
                <Trash2 className="w-4 h-4 mr-1" />
                削除
              </button>
            </div>
            <div className="text-sm text-gray-500">
              更新日: {new Date().toLocaleDateString('ja-JP')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab; 