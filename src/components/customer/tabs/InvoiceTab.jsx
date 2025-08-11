import React from 'react';
import Button from '../../common/Button';

const InvoiceTab = () => {
  // サンプルデータ
  const invoices = [
    {
      id: 'INV-2024-001',
      date: '2024/01/15',
      amount: '¥800,000',
      status: '支払済み',
      statusColor: 'bg-green-100 text-green-800'
    },
    {
      id: 'INV-2024-002',
      date: '2024/01/10',
      amount: '¥1,200,000',
      status: '未払い',
      statusColor: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'INV-2024-003',
      date: '2024/01/20',
      amount: '¥600,000',
      status: '支払期限前',
      statusColor: 'bg-blue-100 text-blue-800'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">請求書管理</h3>
            <Button size="sm">新規請求書作成</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求書番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発行日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{invoice.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{invoice.date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${invoice.statusColor}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Button size="sm" variant="secondary">詳細</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTab; 