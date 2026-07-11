import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import Button from '../common/Button';

const CustomersTab = ({
  customers,
  customersLoading,
  customersError,
  searchQuery,
  setSearchQuery,
  filters,
  updateFilter,
  showFilters,
  setShowFilters,
  filteredCustomers,
  clearFilters,
  activeFilterCount,
  salesPersons,
  locations,
  industryOptions,
  customerStatuses,
  setShowCustomerForm,
  handleEditCustomer,
  navigate,
  fetchCustomers
}) => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">顧客一覧</h1>
        <p className="text-gray-600 mt-2">登録されている顧客の管理</p>
      </div>

      {/* デバッグ情報 */}
      <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <p>Debug: customers.length = {customers.length}</p>
        <p>Debug: filteredCustomers.length = {filteredCustomers.length}</p>
        <p>Debug: loading = {customersLoading.toString()}</p>
        <p>Debug: error = {customersError || 'なし'}</p>
        <p>Debug: activeFilterCount = {activeFilterCount}</p>
        <button 
          onClick={() => {
            console.log('🔄 手動でデータ再取得');
            fetchCustomers();
          }}
          className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs cursor-pointer border-none"
        >
          データ再取得
        </button>
      </div>

      {/* エラーメッセージ */}
      {customersError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{customersError}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 検索・フィルターバー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* 検索バー */}
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="顧客名・会社名・メールで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <Button 
                size="sm" 
                variant={showFilters ? "primary" : "secondary"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                フィルター
                {activeFilterCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px]">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={clearFilters}
                  className="flex items-center gap-2 border border-gray-300"
                >
                  <X className="w-4 h-4" />
                  クリア
                </Button>
              )}
              <Button size="sm" onClick={() => setShowCustomerForm(true)}>新規登録</Button>
            </div>

            {/* フィルターパネル */}
            {showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* ステータスフィルター */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                    <select
                      value={filters.status}
                      onChange={(e) => updateFilter('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">すべて</option>
                      {customerStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {/* 業種フィルター */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">業種</label>
                    <select
                      value={filters.industry}
                      onChange={(e) => updateFilter('industry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">すべて</option>
                      {industryOptions.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>

                  {/* 地域フィルター */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">地域</label>
                    <select
                      value={filters.location}
                      onChange={(e) => updateFilter('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">すべて</option>
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>

                  {/* 営業担当者フィルター */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">営業担当者</label>
                    <select
                      value={filters.salesPerson}
                      onChange={(e) => updateFilter('salesPerson', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">すべて</option>
                      {salesPersons.map(person => (
                        <option key={person} value={person}>{person}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 検索結果サマリー */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {activeFilterCount > 0 ? (
                <span>
                  検索結果: <span className="font-semibold">{filteredCustomers.length}</span>件
                  {customers.length !== filteredCustomers.length && (
                    <span className="text-gray-500">（全{customers.length}件中）</span>
                  )}
                </span>
              ) : (
                <span>全顧客: <span className="font-semibold">{customers.length}</span>件</span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer border-none bg-transparent"
              >
                <X className="w-3 h-3" />
                フィルターをクリア
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {customersLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">顧客データを読み込み中...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              {customers.length === 0 ? (
                <>
                  <p className="text-gray-500">登録されている顧客がありません</p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setShowCustomerForm(true)}
                  >
                    最初の顧客を登録
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-500">検索条件に一致する顧客が見つかりません</p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={clearFilters}
                  >
                    フィルターをクリア
                  </Button>
                </>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会社名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">業種</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当営業</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最終更新</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.companyName}</div>
                      {customer.siteUrl && (
                        <div className="text-sm text-gray-500">{customer.siteUrl}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.customerName}</div>
                      {customer.email && (
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.industry || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        customer.status === '新規' ? 'bg-blue-100 text-blue-800' :
                        customer.status === '商談中' ? 'bg-yellow-100 text-yellow-800' :
                        customer.status === '成約' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.salesPerson || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleEditCustomer(customer)}
                      >
                        編集
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => navigate(`/customer/${customer.id}`)}
                      >
                        詳細
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersTab;
