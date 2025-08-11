import React from 'react';
import Button from '../../common/Button';

const ContractTab = () => {
  // サンプルデータ
  const contracts = [
    {
      id: 'CON-2024-001',
      name: 'システム導入契約書',
      period: '2024/01/01 - 2024/12/31',
      amount: '¥2,400,000',
      signedDate: '2024/01/15',
      status: '有効',
      statusColor: 'bg-green-100 text-green-800'
    },
    {
      id: 'CON-2024-002',
      name: '保守契約書',
      period: '2024/01/01 - 2024/12/31',
      amount: '¥600,000',
      signedDate: '2024/01/20',
      status: '作成中',
      statusColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'CON-2024-003',
      name: 'SLA契約書',
      period: '2024/02/01 - 2025/01/31',
      amount: '¥300,000',
      signedDate: '2024/02/01',
      status: '有効',
      statusColor: 'bg-green-100 text-green-800'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">契約書管理</h3>
            <Button size="sm">新規契約書作成</Button>
          </div>
        </div>
        <div className="divide-y">
          {contracts.map((contract) => (
            <div key={contract.id} className="p-6 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{contract.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">期間: {contract.period}</p>
                  <p className="text-sm text-gray-600">契約金額: {contract.amount}</p>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span>契約番号: {contract.id}</span>
                    <span>署名日: {contract.signedDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${contract.statusColor}`}>
                    {contract.status}
                  </span>
                  <Button size="sm" variant="secondary">詳細</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContractTab; 