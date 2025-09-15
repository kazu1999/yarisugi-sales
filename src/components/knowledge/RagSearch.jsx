import React from 'react';
import { 
  Search, 
  MessageSquare, 
  Brain,
  X,
  FileText,
  ExternalLink,
  Tag
} from 'lucide-react';

const RagSearch = ({
  // 状態
  showRagSearch,
  setShowRagSearch,
  ragQuery,
  setRagQuery,
  ragResult,
  setRagResult,
  isSearching,
  
  // 関数
  performRagSearch
}) => {

  // 検索実行
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!ragQuery.trim()) {
      alert('検索クエリを入力してください');
      return;
    }
    
    try {
      await performRagSearch(ragQuery);
    } catch (err) {
      console.error('RAG search error:', err);
    }
  };


  if (!showRagSearch) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6" />
              <h3 className="text-lg font-semibold">AI ナレッジ検索</h3>
              <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
                RAG powered
              </span>
            </div>
            <p className="text-sm text-white text-opacity-90 ml-9">入力されたナレッジをもとに検索</p>
          </div>
          <button
            onClick={() => {
              setShowRagSearch(false);
              setRagResult(null);
              setRagQuery('');
            }}
            className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20 bg-white bg-opacity-10"
            title="閉じる"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* 左側: 検索パネル */}
          <div className="w-1/3 border-r border-gray-200 p-6 space-y-6">
            {/* 検索フォーム */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  質問を入力してください
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    rows={4}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="例：料金体系について詳しく教えてください"
                    disabled={isSearching}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching || !ragQuery.trim()}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    検索中...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    検索実行
                  </>
                )}
              </button>
            </form>


          </div>

          {/* 右側: 結果表示パネル */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!ragResult && !isSearching && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Brain className="w-16 h-16 text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-600 mb-2">
                  AIナレッジ検索へようこそ
                </h4>
                <p className="text-gray-500 max-w-md">
                  左側の検索フォームに質問を入力して、
                  ナレッジベースから最適な回答を見つけましょう。
                </p>
              </div>
            )}

            {isSearching && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-600">AIが最適な回答を生成中...</p>
              </div>
            )}

            {ragResult && (
              <div className="space-y-6">
                {/* 質問表示 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    あなたの質問
                  </h4>
                  <p className="text-gray-900">{ragQuery}</p>
                </div>

                {/* AI回答 */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    AI回答
                  </h4>
                  <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                    {ragResult.answer}
                  </div>
                </div>

                {/* 参考ナレッジ */}
                {ragResult.referencedKnowledge && ragResult.referencedKnowledge.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      参考にしたナレッジ
                    </h4>
                    <div className="space-y-3">
                      {ragResult.referencedKnowledge.map((knowledge, index) => (
                        <div 
                          key={knowledge.knowledgeId} 
                          className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-2">
                                {knowledge.title}
                              </h5>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  <Tag className="w-3 h-3" />
                                  {knowledge.category}
                                </span>
                                {ragResult.similarityScores && ragResult.similarityScores[index] && (
                                  <span className="text-xs text-gray-500">
                                    関連度: {Math.round(ragResult.similarityScores[index] * 100)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <button className="text-blue-600 hover:text-blue-800 transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagSearch;
