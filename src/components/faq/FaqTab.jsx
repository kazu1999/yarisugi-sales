import React from 'react';
import { Search, Plus, Brain, MessageSquare, Filter, X } from 'lucide-react';
import Button from '../common/Button';
import FaqChat from './FaqChat';

const FaqTab = ({
  faqs,
  filteredFaqs,
  faqsLoading,
  faqsError,
  faqSearchQuery,
  setFaqSearchQuery,
  showFaqFilters,
  setShowFaqFilters,
  setShowFaqForm,
  aiGeneratedFaqs,
  setAiGeneratedFaqs,
  setShowAiGenerator,
  showFaqChat,
  setShowFaqChat,
  categories,
  setSelectedCategory,
  selectedCategory,
  categoryCounts,
  setEditingFaq,
  setFaqForm,
  deleteFaq,
  fetchFaqs
}) => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">FAQ管理システム</h1>
        <p className="text-gray-600 mt-2">よくある質問の管理とAI自動生成</p>
      </div>

      {/* デバッグ情報 */}
      <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <p>Debug: faqs.length = {faqs.length}</p>
        <p>Debug: filteredFaqs.length = {filteredFaqs.length}</p>
        <p>Debug: loading = {faqsLoading.toString()}</p>
        <p>Debug: error = {faqsError || 'なし'}</p>
        <button 
          onClick={() => {
            console.log('🔄 手動でFAQデータ再取得');
            fetchFaqs();
          }}
          className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs cursor-pointer border-none"
        >
          FAQデータ再取得
        </button>
      </div>

      {/* エラーメッセージ */}
      {faqsError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{faqsError}</p>
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
                  placeholder="FAQ内容で検索..."
                  value={faqSearchQuery}
                  onChange={(e) => setFaqSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <Button 
                size="sm" 
                variant={showFaqFilters ? "primary" : "secondary"}
                onClick={() => setShowFaqFilters(!showFaqFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                カテゴリ
              </Button>
              <Button 
                size="sm" 
                onClick={() => setShowFaqForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                FAQ追加
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log("🔄 AI生成ボタンクリック - リセット前:", aiGeneratedFaqs.length);
                  setAiGeneratedFaqs([]); // 状態をリセット
                  console.log("🔄 AI生成ボタンクリック - リセット後実行");
                  setShowAiGenerator(true);
                }}
                className="flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                AI生成
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowFaqChat(!showFaqChat)}
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                FAQチャット
              </Button>
            </div>

            {/* カテゴリフィルター */}
            {showFaqFilters && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                        selectedCategory === category.value
                          ? 'bg-indigo-500 text-white border-none'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {category.label} ({categoryCounts[category.value] || 0})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 検索結果サマリー */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {faqSearchQuery || selectedCategory !== 'all' ? (
                <span>
                  検索結果: <span className="font-semibold">{filteredFaqs.length}</span>件
                  {faqs.length !== filteredFaqs.length && (
                    <span className="text-gray-500">（全{faqs.length}件中）</span>
                  )}
                </span>
              ) : (
                <span>全FAQ: <span className="font-semibold">{faqs.length}</span>件</span>
              )}
            </div>
            {(faqSearchQuery || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setFaqSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer border-none bg-transparent"
              >
                <X className="w-3 h-3" />
                フィルターをクリア
              </button>
            )}
          </div>
        </div>

        {/* FAQ一覧 */}
        <div className="p-6">
          {faqsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">FAQデータを読み込み中...</p>
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="p-8 text-center">
              {faqs.length === 0 ? (
                <>
                  <p className="text-gray-500">登録されているFAQがありません</p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setShowFaqForm(true)}
                  >
                    最初のFAQを登録
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-500">検索条件に一致するFAQが見つかりません</p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      setFaqSearchQuery('');
                      setSelectedCategory('all');
                    }}
                  >
                    フィルターをクリア
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          {faq.category}
                        </span>
                        {faq.tags && faq.tags.length > 0 && (
                          <div className="flex gap-1">
                            {faq.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                {tag}
                              </span>
                            ))}
                            {faq.tags.length > 3 && (
                              <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                +{faq.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold mb-2 text-gray-900">Q: {faq.question}</h3>
                      <p className="text-gray-700 mb-3">A: {faq.answer}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>作成日: {faq.createdAt ? new Date(faq.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
                        {faq.updatedAt && (
                          <span>更新日: {new Date(faq.updatedAt).toLocaleDateString('ja-JP')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => {
                          setEditingFaq(faq);
                          setFaqForm({
                            question: faq.question,
                            answer: faq.answer,
                            category: faq.category,
                            tags: faq.tags || [],
                            isPublic: faq.isPublic !== false
                          });
                          setShowFaqForm(true);
                        }}
                      >
                        編集
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger"
                        onClick={() => {
                          if (window.confirm('このFAQを削除しますか？')) {
                            deleteFaq(faq.id);
                          }
                        }}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAQチャット機能 */}
      {showFaqChat && (
        <div className="mt-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">FAQチャット</h3>
                <button
                  onClick={() => setShowFaqChat(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="h-96">
              <FaqChat faqs={faqs} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaqTab;
