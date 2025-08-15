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
    setIsGenerating(true);
    try {
      // 簡易的なAI生成シミュレーション
      setTimeout(() => {
        const generatedFaqs = [
          {
            id: Date.now() + 1,
            question: 'サービスの概要を教えてください',
            answer: '当社のサービスは、クラウドベースの統合管理システムです。',
            category: '機能',
            confidence: 0.95
          },
          {
            id: Date.now() + 2,
            question: '料金プランの種類を教えてください',
            answer: 'スタータープラン、スタンダードプラン、エンタープライズプランの3種類をご用意しています。',
            category: '料金',
            confidence: 0.88
          },
          {
            id: Date.now() + 3,
            question: 'サポート体制について教えてください',
            answer: '平日9-18時の電話・メールサポートに加え、24時間対応の緊急窓口もあります。',
            category: 'サポート',
            confidence: 0.92
          }
        ];
        setAiGeneratedFaqs(generatedFaqs);
        setIsGenerating(false);
      }, 2000);
    } catch (err) {
      console.error('❌ AI生成エラー:', err);
      setIsGenerating(false);
      throw err;
    }
  };

  // 生成されたFAQを保存
  const saveGeneratedFaq = async (faq) => {
    try {
      const faqData = {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        tags: [],
        isPublic: true
      };
      await createFaq(faqData);
      setAiGeneratedFaqs(prev => prev.filter(f => f.id !== faq.id));
    } catch (err) {
      console.error('❌ 生成FAQ保存エラー:', err);
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
    saveGeneratedFaq,
    updateGeneratedFaq,
    removeGeneratedFaq,
    resetFaqForm
  };
}; 