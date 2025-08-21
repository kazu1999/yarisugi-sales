import { useState, useEffect, useMemo } from 'react';
import { awsApiClient } from '../utils/awsApiClient';
import { s3Uploader } from '../utils/s3Upload';
import { useAuth } from '../contexts/AuthContext';
import { getAuthToken } from '../utils/cognitoAuth';

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

  // 認証情報
  const { user } = useAuth();

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

  // 個別のナレッジエントリ取得（S3リンク付き）
  const fetchKnowledgeEntry = async (knowledgeId) => {
    if (!knowledgeId) {
      console.error('❌ Knowledge ID is required for fetching');
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('📖 Fetching knowledge entry:', knowledgeId);
      const response = await awsApiClient.request(`/knowledge/${knowledgeId}`, 'GET');
      
      if (response.knowledgeEntry) {
        console.log('✅ Knowledge entry fetched successfully');
        return response.knowledgeEntry;
      }
    } catch (err) {
      console.error('❌ Error fetching knowledge entry:', err);
      setError(err.message || 'ナレッジエントリの取得に失敗しました');
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
      
      // ファイルサイズ制限を100MBに拡張
      if (file.size > 100 * 1024 * 1024) { // 100MB制限
        alert(`ファイル ${file.name} が大きすぎます（最大100MB）`);
        continue;
      }
      
      try {
        let knowledgeData;
        
        // PDFファイルまたは5MB以上のファイルはS3を使用
        if (file.type === 'application/pdf' || file.size > 5 * 1024 * 1024) {
          console.log('📤 PDF file or large file detected, using S3 upload...');
          
          // S3にアップロード
          // 認証トークンからユーザーIDを取得
          const token = await getAuthToken();
          let userId = 'unknown';
          
          if (token) {
            try {
              // JWTトークンをデコードしてユーザーIDを取得
              const payload = JSON.parse(atob(token.split('.')[1]));
              userId = payload.sub || payload['cognito:username'] || 'unknown';
            } catch (e) {
              console.error('トークンデコードエラー:', e);
            }
          }
          
          console.log('👤 User ID for S3 key:', userId, 'User object:', user, 'Token available:', !!token);
          const key = s3Uploader.generateKey(userId, file.name);
          const uploadResult = await s3Uploader.uploadFile(file, key);
          
          knowledgeData = {
            title: file.name,
            category: 'general',
            fileType: file.type,
            s3Bucket: uploadResult.bucket,
            s3Key: uploadResult.key
          };
        } else {
          // テキストファイルのみ直接アップロード
          console.log('📖 Reading text file content for direct upload...');
          const content = await readFileContent(file);
          
          knowledgeData = {
            title: file.name,
            content: content,
            category: 'general',
            fileType: file.type
          };
        }
        
        console.log('📋 Prepared knowledge data:', { 
          title: knowledgeData.title, 
          contentLength: knowledgeData.content ? knowledgeData.content.length : 'S3 file',
          category: knowledgeData.category,
          s3Bucket: knowledgeData.s3Bucket,
          s3Key: knowledgeData.s3Key,
          fileType: knowledgeData.fileType
        });
        
        console.log('🚀 About to create knowledge entry...');
        await createKnowledgeEntry(knowledgeData);
        console.log('✅ Knowledge entry created successfully');
        newFiles.push(file);
      } catch (err) {
        console.error('❌ Error processing file:', file.name, err);
        alert(`ファイル ${file.name} の処理に失敗しました: ${err.message}`);
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
