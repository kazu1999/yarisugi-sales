import React from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  FileText, 
  Upload, 
  Brain,
  Folder,
  Calendar,
  Tag,
  X,
  MessageSquare,
  Trash2
} from 'lucide-react';

const KnowledgeManager = ({
  // 状態
  knowledgeEntries,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  showFilters,
  setShowFilters,
  filteredKnowledgeEntries,
  categoryCounts,
  categories,
  knowledgeForm,
  setKnowledgeForm,
  showKnowledgeForm,
  setShowKnowledgeForm,
  showRagSearch,
  setShowRagSearch,
  isDragOver,
  
  // 関数
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  handleFileUpload,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  resetKnowledgeForm
}) => {

  // ファイル選択ハンドラー
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // フォーム送信
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) {
      alert('タイトルと内容を入力してください');
      return;
    }
    
    try {
      await createKnowledgeEntry(knowledgeForm);
      resetKnowledgeForm();
      setShowKnowledgeForm(false);
      alert('ナレッジエントリが作成されました！');
    } catch (err) {
      console.error('Error creating knowledge entry:', err);
      alert('ナレッジエントリの作成に失敗しました');
    }
  };

  // 削除ハンドラー
  const handleDelete = async (knowledgeId, title) => {
    if (!confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    
    try {
      await deleteKnowledgeEntry(knowledgeId);
      alert('ナレッジエントリが削除されました！');
    } catch (err) {
      console.error('Error deleting knowledge entry:', err);
      alert('ナレッジエントリの削除に失敗しました');
    }
  };

  // カテゴリ表示名
  const getCategoryLabel = (value) => {
    const category = categories.find(cat => cat.value === value);
    return category ? category.label : value;
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            ナレッジベース管理
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRagSearch(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              ナレッジ検索
            </button>
            <button
              onClick={() => setShowKnowledgeForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新規作成
            </button>
          </div>
        </div>

        {/* 検索とフィルター */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ナレッジを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            フィルター
          </button>
        </div>

        {/* フィルターパネル */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategory === category.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category.label}
                  {categoryCounts[category.value] > 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({categoryCounts[category.value]})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ファイルアップロードエリア */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-2">
            ファイルをドラッグ&ドロップ、または
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            <FileText className="w-4 h-4" />
            ファイルを選択
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".txt,.md,.pdf,.doc,.docx"
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">
            対応形式: TXT, MD, PDF, DOC, DOCX（最大10MB）
          </p>
        </div>
      </div>

      {/* ナレッジエントリ一覧 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            ナレッジエントリ一覧
            <span className="ml-2 text-sm text-gray-500">
              ({filteredKnowledgeEntries.length}件)
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">読み込み中...</p>
          </div>
        ) : filteredKnowledgeEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">ナレッジエントリがありません</p>
            <p className="text-sm">最初のナレッジエントリを作成してみましょう</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredKnowledgeEntries.map((entry) => (
              <div key={entry.knowledgeId} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {entry.title}
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          <Tag className="w-3 h-3" />
                          {getCategoryLabel(entry.category)}
                        </span>
                        {entry.fileType && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            <FileText className="w-3 h-3" />
                            {entry.fileType}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(entry.knowledgeId, entry.title)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    
                    {entry.summary && (
                      <p className="text-gray-600 mb-3 line-clamp-3">
                        {entry.summary}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(entry.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                      {entry.chunkCount && (
                        <span className="flex items-center gap-1">
                          <Folder className="w-4 h-4" />
                          {entry.chunkCount}チャンク
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ナレッジ作成モーダル */}
      {showKnowledgeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                新しいナレッジエントリを作成
              </h3>
              <button
                onClick={() => {
                  setShowKnowledgeForm(false);
                  resetKnowledgeForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル
                </label>
                <input
                  type="text"
                  value={knowledgeForm.title}
                  onChange={(e) => setKnowledgeForm({...knowledgeForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ナレッジのタイトルを入力"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ
                </label>
                <select
                  value={knowledgeForm.category}
                  onChange={(e) => setKnowledgeForm({...knowledgeForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.filter(cat => cat.value !== 'all').map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容
                </label>
                <textarea
                  value={knowledgeForm.content}
                  onChange={(e) => setKnowledgeForm({...knowledgeForm, content: e.target.value})}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ナレッジの内容を入力してください..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '作成中...' : '作成'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowKnowledgeForm(false);
                    resetKnowledgeForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeManager;
