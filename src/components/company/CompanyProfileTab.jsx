import React, { useState } from 'react';
import { Save, Plus, Trash2, GripVertical, AlertCircle, Info } from 'lucide-react';
import Button from '../common/Button';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';

const CompanyProfileTab = () => {
  const {
    companyProfile,
    proposals,
    loading,
    error,
    updateCompanyProfile,
    addProposal,
    updateProposal,
    deleteProposal
  } = useCompanyProfile();

  // フォーム状態
  const [profileForm, setProfileForm] = useState({
    companyName: '',
    introduction: '',
    services: '',
    achievements: ''
  });

  // 提案内容フォーム状態
  const [proposalForm, setProposalForm] = useState({
    title: '',
    purpose: '',
    content: '',
    estimatedCost: '',
    documentUrl: ''
  });

  // 編集状態
  const [editingProposal, setEditingProposal] = useState(null);
  const [editingProposalData, setEditingProposalData] = useState({});
  const [showAddProposal, setShowAddProposal] = useState(false);

  // メッセージ状態
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  // 基本情報フォームを初期化
  React.useEffect(() => {
    setProfileForm({
      companyName: companyProfile.companyName,
      introduction: companyProfile.introduction,
      services: companyProfile.services,
      achievements: companyProfile.achievements
    });
  }, [companyProfile]);

  // 基本情報を保存
  const handleSaveProfile = async () => {
    if (!profileForm.companyName.trim()) {
      displayMessage('会社名は必須です', 'error');
      return;
    }

    const result = await updateCompanyProfile(profileForm);
    if (result.success) {
      displayMessage('基本情報を保存しました', 'success');
    } else {
      displayMessage('保存に失敗しました', 'error');
    }
  };

  // 提案内容を追加
  const handleAddProposal = async () => {
    if (!proposalForm.title.trim()) {
      displayMessage('提案内容のタイトルは必須です', 'error');
      return;
    }

    const result = await addProposal(proposalForm);
    if (result.success) {
      setProposalForm({
        title: '',
        purpose: '',
        content: '',
        estimatedCost: '',
        documentUrl: ''
      });
      setShowAddProposal(false);
      displayMessage('提案内容を追加しました', 'success');
    } else {
      displayMessage('追加に失敗しました', 'error');
    }
  };

  // 提案内容の編集を開始
  const startEditingProposal = (proposal) => {
    setEditingProposal(proposal.id);
    setEditingProposalData({
      title: proposal.title || '',
      purpose: proposal.purpose || '',
      content: proposal.content || '',
      estimatedCost: proposal.estimatedCost || '',
      documentUrl: proposal.documentUrl || ''
    });
  };

  // 提案内容を更新
  const handleUpdateProposal = async (proposalId) => {
    const result = await updateProposal(proposalId, editingProposalData);
    if (result.success) {
      setEditingProposal(null);
      setEditingProposalData({});
      displayMessage('提案内容を更新しました', 'success');
    } else {
      displayMessage('更新に失敗しました', 'error');
    }
  };

  // 提案内容を削除
  const handleDeleteProposal = async (proposalId) => {
    if (!confirm('この提案内容を削除しますか？')) return;

    const result = await deleteProposal(proposalId);
    if (result.success) {
      displayMessage('提案内容を削除しました', 'success');
    } else {
      displayMessage('削除に失敗しました', 'error');
    }
  };

  // メッセージを表示
  const displayMessage = (text, type = 'info') => {
    setMessage(text);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  // 提案内容フォームをリセット
  const resetProposalForm = () => {
    setProposalForm({
      title: '',
      purpose: '',
      content: '',
      estimatedCost: '',
      documentUrl: ''
    });
    setShowAddProposal(false);
    setEditingProposal(null);
    setEditingProposalData({});
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* メッセージ表示 */}
      {showMessage && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${
          message.includes('失敗') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          <span>{message}</span>
          <button onClick={() => setShowMessage(false)}>
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* 基本情報セクション */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b-2 border-gray-200">
          自社情報
        </h2>
        
        {!profileForm.companyName && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">
                  初回設定のお知らせ
                </p>
                <p className="text-sm text-blue-700">
                  基本情報を入力して「保存する」ボタンをクリックしてください。会社名は必須項目です。
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              自社名 <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={profileForm.companyName}
              onChange={(e) => setProfileForm({...profileForm, companyName: e.target.value})}
              placeholder="例：株式会社SKYVILLAGE"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              自己紹介文（あいさつ文）
            </label>
            <textarea 
              rows="3" 
              value={profileForm.introduction}
              onChange={(e) => setProfileForm({...profileForm, introduction: e.target.value})}
              placeholder="例：私たちは◯◯業界に特化した業務改善サービスを提供しています..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              サービス構成
            </label>
            <textarea 
              rows="2" 
              value={profileForm.services}
              onChange={(e) => setProfileForm({...profileForm, services: e.target.value})}
              placeholder="例：Yarisugi事務DX、広告DX、営業支援、自動レポート作成など"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              過去の導入実績・事例
            </label>
            <textarea 
              rows="2" 
              value={profileForm.achievements}
              onChange={(e) => setProfileForm({...profileForm, achievements: e.target.value})}
              placeholder="例：◯◯工務店様での導入により、見積もり作成時間を50%短縮"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSaveProfile}
            disabled={loading}
            className="flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存する
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 提案内容セクション */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">提案内容</h2>
          <Button 
            onClick={() => setShowAddProposal(true)}
            className="flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            提案内容を追加
          </Button>
        </div>

        {/* 提案内容一覧 */}
        <div className="space-y-4">
          {proposals.map((proposal, index) => (
            <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <GripVertical className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500">提案 {index + 1}</span>
                </div>
                <div className="flex space-x-2">
                  {editingProposal === proposal.id ? (
                    <>
                      <button
                        onClick={() => handleUpdateProposal(proposal.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingProposal(null);
                          setEditingProposalData({});
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditingProposal(proposal)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteProposal(proposal.id)}
                        className="text-sm text-red-600 hover:text-red-800 flex items-center"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        削除
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    提案内容
                  </label>
                  {editingProposal === proposal.id ? (
                    <input
                      type="text"
                      value={editingProposalData.title}
                      onChange={(e) => setEditingProposalData({
                        ...editingProposalData,
                        title: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{proposal.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    想定金額
                  </label>
                  {editingProposal === proposal.id ? (
                    <input
                      type="text"
                      value={editingProposalData.estimatedCost}
                      onChange={(e) => setEditingProposalData({
                        ...editingProposalData,
                        estimatedCost: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{proposal.estimatedCost}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    提案目的
                  </label>
                  {editingProposal === proposal.id ? (
                    <input
                      type="text"
                      value={editingProposalData.purpose}
                      onChange={(e) => setEditingProposalData({
                        ...editingProposalData,
                        purpose: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{proposal.purpose}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    提案資料URL
                  </label>
                  {editingProposal === proposal.id ? (
                    <input
                      type="url"
                      value={editingProposalData.documentUrl}
                      onChange={(e) => setEditingProposalData({
                        ...editingProposalData,
                        documentUrl: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{proposal.documentUrl}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {proposals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              提案内容がありません。新しい提案内容を追加してください。
            </div>
          )}
        </div>

        {/* 提案内容追加フォーム */}
        {showAddProposal && (
          <div className="border border-gray-200 rounded-lg p-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">新しい提案内容を追加</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  提案内容 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({...proposalForm, title: e.target.value})}
                  placeholder="例：Yarisugi営業の導入による顧客対応の自動化"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  想定金額
                </label>
                <input
                  type="text"
                  value={proposalForm.estimatedCost}
                  onChange={(e) => setProposalForm({...proposalForm, estimatedCost: e.target.value})}
                  placeholder="例：月額10万円＋初期費用25万円"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  提案目的
                </label>
                <input
                  type="text"
                  value={proposalForm.purpose}
                  onChange={(e) => setProposalForm({...proposalForm, purpose: e.target.value})}
                  placeholder="例：営業効率の改善、CV率向上、現場情報の一元化など"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  提案資料URL
                </label>
                <input
                  type="url"
                  value={proposalForm.documentUrl}
                  onChange={(e) => setProposalForm({...proposalForm, documentUrl: e.target.value})}
                  placeholder="例：https://drive.google.com/file/d/xxxxx/view"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <Button
                onClick={resetProposalForm}
                variant="secondary"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleAddProposal}
                disabled={loading}
              >
                {loading ? '追加中...' : '追加する'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyProfileTab;
