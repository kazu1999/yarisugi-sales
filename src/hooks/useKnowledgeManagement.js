import { useState, useEffect, useMemo } from 'react';
import { awsApiClient } from '../utils/awsApiClient';

export const useKnowledgeManagement = () => {
  // 基本状態
  const [knowledgeEntries, setKnowledgeEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 検索・フィルタリング状態
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // フォーム状態
  const [knowledgeForm, setKnowledgeForm] = useState({
    title: '',
    content: '',
    category: 'general',
    fileType: null
  });

  // RAG検索状態
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // モーダル状態
  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [showRagSearch, setShowRagSearch] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState(null);

  // ファイルアップロード状態
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // カテゴリオプション
  const categories = [
    { value: 'all', label: '全て' },
    { value: 'general', label: '一般' },
    { value: 'technical', label: '技術' },
    { value: 'product', label: '製品情報' },
    { value: 'policy', label: 'ポリシー' },
    { value: 'procedure', label: '手順書' },
    { value: 'faq', label: 'FAQ' },
    { value: 'training', label: '研修資料' },
    { value: 'other', label: 'その他' }
  ];

  // ナレッジエントリ取得
  const fetchKnowledgeEntries = async (category = null) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📚 Fetching knowledge entries...');
      const params = category && category !== 'all' ? { category } : {};
      const response = await awsApiClient.request('/knowledge', 'GET', null, params);
      
      if (response.knowledgeEntries) {
        setKnowledgeEntries(response.knowledgeEntries);
        console.log(`📚 Retrieved ${response.knowledgeEntries.length} knowledge entries`);
      }
    } catch (err) {
      console.error('❌ Error fetching knowledge entries:', err);
      setError(err.message || 'ナレッジエントリの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ナレッジエントリ作成
  const createKnowledgeEntry = async (knowledgeData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Creating knowledge entry:', knowledgeData.title);
      const response = await awsApiClient.request('/knowledge', 'POST', knowledgeData);
      
      if (response.knowledgeEntry) {
        await fetchKnowledgeEntries(); // リフレッシュ
        console.log('✅ Knowledge entry created successfully');
        return response.knowledgeEntry;
      }
    } catch (err) {
      console.error('❌ Error creating knowledge entry:', err);
      setError(err.message || 'ナレッジエントリの作成に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ナレッジエントリ削除
  const deleteKnowledgeEntry = async (knowledgeId) => {
    if (!knowledgeId) {
      console.error('❌ Knowledge ID is required for deletion');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🗑️ Deleting knowledge entry:', knowledgeId);
      const response = await awsApiClient.request(`/knowledge/${knowledgeId}`, 'DELETE');
      
      if (response.message) {
        await fetchKnowledgeEntries(); // リフレッシュ
        console.log('✅ Knowledge entry deleted successfully');
        return response;
      }
    } catch (err) {
      console.error('❌ Error deleting knowledge entry:', err);
      setError(err.message || 'ナレッジエントリの削除に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // RAG検索実行
  const performRagSearch = async (query, topK = 5) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      console.log('🔍 Performing RAG search for:', query);
      const response = await awsApiClient.request('/rag-search', 'POST', {
        query: query.trim(),
        top_k: topK
      });
      
      setRagResult(response);
      console.log('✅ RAG search completed');
      return response;
    } catch (err) {
      console.error('❌ Error performing RAG search:', err);
      setError(err.message || 'RAG検索に失敗しました');
      setRagResult(null);
      throw err;
    } finally {
      setIsSearching(false);
    }
  };

  // ファイルアップロード処理
  const handleFileUpload = async (files) => {
    console.log('📁 Starting file upload process, files:', files.length);
    const newFiles = [];
    
    for (const file of files) {
      console.log('📄 Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      if (file.size > 10 * 1024 * 1024) { // 10MB制限
        alert(`ファイル ${file.name} が大きすぎます（最大10MB）`);
        continue;
      }
      
      try {
        console.log('📖 Reading file content...');
        const content = await readFileContent(file);
        console.log('✅ File content read, length:', content ? content.length : 'null');
        
        const knowledgeData = {
          title: file.name,
          content: content,
          category: 'general',
          fileType: file.type
        };
        console.log('📋 Prepared knowledge data:', { title: knowledgeData.title, contentLength: knowledgeData.content ? knowledgeData.content.length : 'null', category: knowledgeData.category });
        
        console.log('🚀 About to create knowledge entry...');
        await createKnowledgeEntry(knowledgeData);
        console.log('✅ Knowledge entry created successfully');
        newFiles.push(file);
      } catch (err) {
        console.error('❌ Error processing file:', file.name, err);
        alert(`ファイル ${file.name} の処理に失敗しました`);
      }
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    return newFiles;
  };

  // ファイル内容読み取り
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
            resolve(e.target.result);
          } else {
            // バイナリファイルはBase64エンコード
            resolve(e.target.result);
          }
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error('ファイル読み取りに失敗しました'));
      
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  // ドラッグ&ドロップハンドラー
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // フィルタリングされたナレッジエントリ
  const filteredKnowledgeEntries = useMemo(() => {
    let filtered = knowledgeEntries;

    // カテゴリフィルタ
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(entry => entry.category === selectedCategory);
    }

    // 検索クエリフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.title?.toLowerCase().includes(query) ||
        entry.content?.toLowerCase().includes(query) ||
        entry.summary?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [knowledgeEntries, selectedCategory, searchQuery]);

  // カテゴリ別カウント
  const categoryCounts = useMemo(() => {
    const counts = { all: knowledgeEntries.length };
    
    categories.forEach(category => {
      if (category.value !== 'all') {
        counts[category.value] = knowledgeEntries.filter(
          entry => entry.category === category.value
        ).length;
      }
    });

    return counts;
  }, [knowledgeEntries, categories]);

  // フォームリセット
  const resetKnowledgeForm = () => {
    setKnowledgeForm({
      title: '',
      content: '',
      category: 'general',
      fileType: null
    });
    setEditingKnowledge(null);
  };

  // 初期データ取得
  useEffect(() => {
    fetchKnowledgeEntries();
  }, []);

  return {
    // 基本状態
    knowledgeEntries,
    loading,
    error,
    
    // 検索・フィルタリング
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    showFilters,
    setShowFilters,
    filteredKnowledgeEntries,
    categoryCounts,
    categories,
    
    // フォーム
    knowledgeForm,
    setKnowledgeForm,
    showKnowledgeForm,
    setShowKnowledgeForm,
    editingKnowledge,
    setEditingKnowledge,
    
    // RAG検索
    ragQuery,
    setRagQuery,
    ragResult,
    setRagResult,
    isSearching,
    showRagSearch,
    setShowRagSearch,
    
    // ファイルアップロード
    uploadedFiles,
    setUploadedFiles,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    // 関数
    fetchKnowledgeEntries,
    createKnowledgeEntry,
    deleteKnowledgeEntry, // 追加
    performRagSearch,
    handleFileUpload,
    resetKnowledgeForm
  };
};
