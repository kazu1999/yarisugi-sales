import { useState, useEffect, useMemo } from 'react';
import { awsApiClient } from '../utils/awsApiClient';

export const useFaqManagement = () => {
  // 基本状態
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 検索・フィルタリング状態
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // フォーム状態
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: '料金',
    tags: [],
    isPublic: true
  });

  // AI生成関連状態
  const [aiGeneratedFaqs, setAiGeneratedFaqs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedContent, setUploadedContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // モーダル状態
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  // カテゴリオプション
  const categories = [
    { value: 'all', label: '全て' },
    { value: '料金', label: '料金・プラン' },
    { value: 'サポート', label: 'サポート' },
    { value: '契約', label: '契約・解約' },
    { value: '機能', label: '機能・仕様' },
    { value: '導入', label: '導入・設定' },
    { value: 'セキュリティ', label: 'セキュリティ' },
    { value: 'その他', label: 'その他' }
  ];

  // FAQデータ取得
  const fetchFaqs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await awsApiClient.getFaqs();
      console.log('📋 FAQデータ取得結果:', response);
      if (response.faqs) {
        setFaqs(response.faqs);
      } else {
        setFaqs([]);
      }
    } catch (err) {
      console.error('❌ FAQデータ取得エラー:', err);
      setError(err.message || 'FAQデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 単一FAQ取得
  const fetchFaq = async (faqId) => {
    try {
      const response = await awsApiClient.getFaq(faqId);
      return response.faq;
    } catch (err) {
      console.error('❌ FAQ取得エラー:', err);
      throw err;
    }
  };

  // FAQ作成
  const createFaq = async (faqData) => {
    try {
      const response = await awsApiClient.createFaq(faqData);
      console.log('✅ FAQ作成成功:', response);
      await fetchFaqs(); // 一覧を再取得
      return response;
    } catch (err) {
      console.error('❌ FAQ作成エラー:', err);
      throw err;
    }
  };

  // FAQ更新
  const updateFaq = async (faqId, faqData) => {
    try {
      const response = await awsApiClient.updateFaq(faqId, faqData);
      console.log('✅ FAQ更新成功:', response);
      await fetchFaqs(); // 一覧を再取得
      return response;
    } catch (err) {
      console.error('❌ FAQ更新エラー:', err);
      throw err;
    }
  };

  // FAQ削除
  const deleteFaq = async (faqId) => {
    try {
      const response = await awsApiClient.deleteFaq(faqId);
      console.log('✅ FAQ削除成功:', response);
      await fetchFaqs(); // 一覧を再取得
      return response;
    } catch (err) {
      console.error('❌ FAQ削除エラー:', err);
      throw err;
    }
  };

  // AI自動生成
  const generateFaqsFromContent = async (content) => {
    console.log('📥 generateFaqsFromContent関数が呼び出されました');
    console.log('📝 受信コンテンツ:', content ? content.substring(0, 100) + '...' : 'なし');
    setIsGenerating(true);
    try {
      console.log('🤖 AI生成開始:', content.substring(0, 100) + '...');
      console.log('🌐 awsApiClient呼び出し前');
      
      const response = await awsApiClient.generateFaqsFromContent(content, 'text', false);
      console.log('✅ AI生成成功:', response);
      
      if (response.faqs && Array.isArray(response.faqs)) {
        console.log('🔄 setAiGeneratedFaqs呼び出し前:', response.faqs.length);
        setAiGeneratedFaqs(response.faqs);
        console.log('🔄 setAiGeneratedFaqs呼び出し後');
      } else {
        console.error('❌ AI生成レスポンス形式エラー:', response);
        throw new Error('Invalid response format from AI generation');
      }
      
      setIsGenerating(false);
      return response;
    } catch (err) {
      console.error('❌ AI生成エラー:', err);
      setIsGenerating(false);
      throw err;
    }
  };

  // ファイルからAI自動生成
  const generateFaqsFromFile = async (file) => {
    setIsGenerating(true);
    try {
      console.log('📁 ファイルからAI生成開始:', file.name);
      
      const response = await awsApiClient.generateFaqsFromFile(file, false);
      console.log('✅ ファイルAI生成成功:', response);
      
      if (response.faqs && Array.isArray(response.faqs)) {
        setAiGeneratedFaqs(response.faqs);
      } else {
        console.error('❌ ファイルAI生成レスポンス形式エラー:', response);
        throw new Error('Invalid response format from file AI generation');
      }
      
      setIsGenerating(false);
      return response;
    } catch (err) {
      console.error('❌ ファイルAI生成エラー:', err);
      setIsGenerating(false);
      throw err;
    }
  };

  // 生成されたFAQを個別保存
  const saveGeneratedFaq = async (faq) => {
    try {
      console.log('💾 個別保存開始:', faq.question);
      
      const faqData = {
        question: faq.question,
        answer: faq.answer,
        category: faq.category || 'その他',
        tags: faq.tags || [],
        isPublic: faq.isPublic !== false
      };
      
      await awsApiClient.createFaq(faqData);
      
      // 保存済みマークを付ける
      setAiGeneratedFaqs(prev =>
        prev.map(f => f.id === faq.id ? { ...f, status: 'saved' } : f)
      );
      
      console.log('✅ 個別保存完了:', faq.question);
      await fetchFaqs(); // FAQ一覧を再取得
    } catch (error) {
      console.error('❌ 個別保存エラー:', error);
    }
  };

  // 生成されたFAQを一括保存
  const saveAllGeneratedFaqs = async () => {
    try {
      // 未保存のFAQのみを抽出
      const unsavedFaqs = aiGeneratedFaqs.filter(faq => faq.status !== 'saved');
      console.log('💾 生成FAQ一括保存開始:', unsavedFaqs.length + '件');
      console.log('🔍 全FAQs:', aiGeneratedFaqs.map(f => ({ id: f.id, question: f.question, status: f.status })));
      console.log('🔍 未保存FAQs:', unsavedFaqs.map(f => ({ id: f.id, question: f.question, status: f.status })));
      
      if (unsavedFaqs.length === 0) {
        console.log('📋 保存するFAQがありません');
        return;
      }
      
      // 順番に保存（同時実行を避ける）
      const savedFaqIds = [];
      for (let i = 0; i < unsavedFaqs.length; i++) {
        const faq = unsavedFaqs[i];
        try {
          console.log(`💾 保存中 ${i + 1}/${unsavedFaqs.length}:`, faq.question);
          console.log('🔍 保存データ:', {
            id: faq.id,
            question: faq.question,
            answer: faq.answer?.substring(0, 50) + '...',
            category: faq.category,
            status: faq.status
          });
          
          const faqData = {
            question: faq.question,
            answer: faq.answer,
            category: faq.category || 'その他',
            tags: faq.tags || [],
            isPublic: faq.isPublic !== false
          };
          
          const result = await awsApiClient.createFaq(faqData);
          console.log('🔍 API結果:', result);
          savedFaqIds.push(faq.id);
          console.log(`✅ 保存完了 ${i + 1}/${unsavedFaqs.length}:`, faq.question);
          
          // レート制限回避のため待機（最後の項目以外）
          if (i < unsavedFaqs.length - 1) {
            console.log('⏳ API レート制限回避のため1秒待機...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error(`❌ 個別保存エラー ${i + 1}/${unsavedFaqs.length}:`, faq.question, error);
          console.error('🔍 エラー詳細:', error.message, error.stack);
          // エラーが発生しても続行
        }
      }
      
      // 保存済みマークを付ける
      console.log('🔄 保存済みマーク付け開始. 保存成功ID:', savedFaqIds);
      setAiGeneratedFaqs(prev => {
        const updated = prev.map(faq => {
          const isSuccess = savedFaqIds.includes(faq.id);
          console.log(`🔍 FAQ ${faq.id}: 保存成功=${isSuccess}, 現在status=${faq.status}`);
          return isSuccess ? { ...faq, status: 'saved' } : faq;
        });
        console.log('🔄 更新後のFAQs:', updated.map(f => ({ id: f.id, question: f.question, status: f.status })));
        return updated;
      });
      
      console.log(`📊 保存結果サマリー: ${savedFaqIds.length}/${unsavedFaqs.length} 件保存成功`);
      
      // 結果通知
      if (savedFaqIds.length === 0) {
        console.error('❌ 全ての保存が失敗しました');
        alert('❌ FAQ保存に失敗しました。しばらく待ってから再試行してください。');
        return;
      } else if (savedFaqIds.length === unsavedFaqs.length) {
        console.log('✅ 生成FAQ一括保存完了:', savedFaqIds.length + '件保存');
        alert(`✅ ${savedFaqIds.length}件のFAQを全て保存しました！`);
      } else {
        console.warn(`⚠️ 一部保存失敗: ${savedFaqIds.length}/${unsavedFaqs.length}件保存`);
        alert(`⚠️ ${savedFaqIds.length}/${unsavedFaqs.length}件のFAQを保存しました。失敗した項目がある場合は個別保存をお試しください。`);
      }
      
      // FAQ一覧を再取得（メインのFAQリスト用）
      await fetchFaqs();
      
    } catch (err) {
      console.error('❌ 生成FAQ一括保存エラー:', err);
      throw err;
    }
  };

  // 生成されたFAQを更新
  const updateGeneratedFaq = (id, field, value) => {
    setAiGeneratedFaqs(prev =>
      prev.map(faq => faq.id === id ? { ...faq, [field]: value } : faq)
    );
  };

  // 生成されたFAQを削除
  const removeGeneratedFaq = (id) => {
    setAiGeneratedFaqs(prev => prev.filter(faq => faq.id !== id));
  };

  // 新しい空のFAQを生成リストに追加
  const addNewGeneratedFaq = () => {
    const newFaq = {
      id: Date.now().toString(),
      question: '',
      answer: '',
      category: '料金',
      tags: [],
      isPublic: true
    };
    setAiGeneratedFaqs(prev => [...prev, newFaq]);
  };

  // フォームリセット
  const resetFaqForm = () => {
    setFaqForm({
      question: '',
      answer: '',
      category: '料金',
      tags: [],
      isPublic: true
    });
    setEditingFaq(null);
  };

  // フィルタリングされたFAQ
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [faqs, selectedCategory, searchQuery]);

  // カテゴリ別カウント
  const categoryCounts = useMemo(() => {
    const counts = {};
    faqs.forEach(faq => {
      counts[faq.category] = (counts[faq.category] || 0) + 1;
    });
    return counts;
  }, [faqs]);

  // 初期データ取得
  useEffect(() => {
    fetchFaqs();
  }, []);

  return {
    // 基本状態
    faqs,
    loading,
    error,
    
    // 検索・フィルタリング
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    showFilters,
    setShowFilters,
    filteredFaqs,
    categoryCounts,
    categories,
    
    // フォーム
    faqForm,
    setFaqForm,
    showFaqForm,
    setShowFaqForm,
    editingFaq,
    setEditingFaq,
    
    // AI生成
    aiGeneratedFaqs,
    isGenerating,
    uploadedContent,
    setUploadedContent,
    uploadedFiles,
    setUploadedFiles,
    showAiGenerator,
    setShowAiGenerator,
    
    // 関数
    fetchFaqs,
    fetchFaq,
    createFaq,
    updateFaq,
    deleteFaq,
    generateFaqsFromContent,
    generateFaqsFromFile,
    saveGeneratedFaq,
    saveAllGeneratedFaqs,
    updateGeneratedFaq,
    removeGeneratedFaq,
    addNewGeneratedFaq,
    resetFaqForm,
    setAiGeneratedFaqs
  };
}; 