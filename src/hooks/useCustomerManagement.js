import { useState, useEffect } from 'react';
import { 
  industryOptions, 
  snsStatusOptions, 
  customerStatuses, 
  processTypes, 
  defaultProcessTemplates, 
  defaultQuestionnaireItems 
} from '../utils/constants';
import { awsApiClient } from '../utils/awsApiClient';

export const useCustomerManagement = () => {
  // 顧客管理システムの状態
  const [activeTab, setActiveTab] = useState('概要');
  const [showProcessSettings, setShowProcessSettings] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showLineComposer, setShowLineComposer] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  
  // 顧客データの状態
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 顧客登録フォーム
  const [customerForm, setCustomerForm] = useState({
    companyName: '',
    customerName: '',
    location: '',
    industry: '',
    siteUrl: '',
    snsStatus: '',
    lineId: '',
    email: '',
    salesPerson: '',
    status: '新規'
  });

  // AI自動化設定
  const [aiSettings, setAiSettings] = useState({
    immediateConfirmation: true,
    aiAutoReply: true,
    faqAutoReply: false
  });

  // メール履歴
  const [emailHistory, setEmailHistory] = useState([
    {
      id: 1,
      type: '受信',
      from: 'tanaka@techsolution.co.jp',
      to: 'sales@yourcompany.com',
      subject: 'Re: お打ち合わせの件について',
      content: 'ありがとうございます。来週火曜日14:00で調整お願いします。',
      date: '2025-07-28 10:30',
      attachments: []
    },
    {
      id: 2,
      type: '送信',
      from: 'sales@yourcompany.com',
      to: 'tanaka@techsolution.co.jp',
      subject: 'お打ち合わせの件について',
      content: 'いつもお世話になっております。次回の打ち合わせについてご相談したく...',
      date: '2025-07-28 09:15',
      attachments: ['proposal_v1.pdf']
    }
  ]);

  // LINE履歴
  const [lineHistory, setLineHistory] = useState([
    {
      id: 1,
      type: '受信',
      from: '田中太郎',
      content: 'お疲れ様です。先日の提案書について質問があります。',
      date: '2025-07-28 15:30',
      attachments: []
    },
    {
      id: 2,
      type: '送信',
      to: '田中太郎',
      content: 'お疲れ様です。どのようなご質問でしょうか？',
      date: '2025-07-28 15:35',
      attachments: []
    }
  ]);

  // 承認待ち項目
  const [approvalItems, setApprovalItems] = useState([
    {
      id: 1,
      type: '見積書',
      customer: '田中太郎',
      amount: 500000,
      status: '承認待ち',
      date: '2025-07-28'
    },
    {
      id: 2,
      type: '契約書',
      customer: '佐藤花子',
      amount: 800000,
      status: '承認待ち',
      date: '2025-07-27'
    }
  ]);

  // 営業プロセス
  const [salesProcess, setSalesProcess] = useState([
    {
      id: 1,
      name: '初回接触',
      status: '完了',
      date: '2025-07-25',
      notes: '電話で初回接触を実施'
    },
    {
      id: 2,
      name: '提案書作成',
      status: '進行中',
      date: '2025-07-28',
      notes: '要件定義に基づいて提案書を作成中'
    },
    {
      id: 3,
      name: '最終提案',
      status: '未開始',
      date: null,
      notes: ''
    }
  ]);

  // プロセステンプレート
  const [processTemplates, setProcessTemplates] = useState(defaultProcessTemplates);

  // テンプレート保存モーダル
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // アンケート項目
  const [questionnaireItems, setQuestionnaireItems] = useState(defaultQuestionnaireItems);

  // 顧客データの取得
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 顧客データ取得開始');
      
      const response = await awsApiClient.getCustomers();
      console.log('📦 APIレスポンス:', response);
      console.log('📋 顧客データ:', response.customers);
      
      setCustomers(response.customers || []);
      console.log('✅ 顧客データ設定完了:', response.customers || []);
      console.log('📊 顧客データ詳細:', JSON.stringify(response.customers, null, 2));
    } catch (err) {
      console.error('❌ 顧客データ取得エラー:', err);
      setError('顧客データの取得に失敗しました');
      setCustomers([]);
    } finally {
      setLoading(false);
      console.log('🏁 顧客データ取得完了');
    }
  };

  // 顧客作成
  const createCustomer = async (customerData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await awsApiClient.createCustomer(customerData);
      await fetchCustomers(); // 一覧を再取得
      return response;
    } catch (err) {
      console.error('顧客作成エラー:', err);
      setError('顧客の作成に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 顧客更新
  const updateCustomer = async (customerId, customerData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await awsApiClient.updateCustomer(customerId, customerData);
      await fetchCustomers(); // 一覧を再取得
      return response;
    } catch (err) {
      console.error('顧客更新エラー:', err);
      setError('顧客の更新に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 顧客削除
  const deleteCustomer = async (customerId) => {
    try {
      setLoading(true);
      setError(null);
      await awsApiClient.deleteCustomer(customerId);
      await fetchCustomers(); // 一覧を再取得
    } catch (err) {
      console.error('顧客削除エラー:', err);
      setError('顧客の削除に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 顧客詳細取得
  const fetchCustomer = async (customerId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await awsApiClient.getCustomer(customerId);
      return response;
    } catch (err) {
      console.error('顧客詳細取得エラー:', err);
      setError('顧客詳細の取得に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    fetchCustomers();
  }, []);

  // 進捗計算
  const calculateProgress = (process) => {
    const completed = process.filter(step => step.status === '完了').length;
    return Math.round((completed / process.length) * 100);
  };

  // プロセスステップ更新
  const updateProcessStep = (stepId, updates) => {
    setSalesProcess(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  // プロセスステップ追加
  const addProcessStep = (step) => {
    setSalesProcess(prev => [...prev, { ...step, id: Date.now() }]);
  };

  // プロセスステップ削除
  const removeProcessStep = (stepId) => {
    setSalesProcess(prev => prev.filter(step => step.id !== stepId));
  };

  // アンケート項目更新
  const updateQuestionnaireItem = (itemId, updates) => {
    setQuestionnaireItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  // アンケート項目追加
  const addQuestionnaireItem = (item) => {
    setQuestionnaireItems(prev => [...prev, { ...item, id: Date.now() }]);
  };

  // アンケート項目削除
  const removeQuestionnaireItem = (itemId) => {
    setQuestionnaireItems(prev => prev.filter(item => item.id !== itemId));
  };

  // テンプレートとして保存
  const saveAsTemplate = (name) => {
    const newTemplate = {
      id: Date.now(),
      name,
      process: [...salesProcess],
      questionnaire: [...questionnaireItems]
    };
    setProcessTemplates(prev => [...prev, newTemplate]);
    setShowTemplateSaveModal(false);
    setNewTemplateName('');
  };

  // 返答期限更新
  const updateReplyDueDate = (itemId, dueDate) => {
    setApprovalItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, dueDate } : item
    ));
  };

  // プロセステンプレート適用
  const applyProcessTemplate = (templateId) => {
    const template = processTemplates.find(t => t.id === templateId);
    if (template) {
      setSalesProcess([...template.process]);
      setQuestionnaireItems([...template.questionnaire]);
    }
  };

  // テンプレート削除
  const deleteTemplate = (templateId) => {
    setProcessTemplates(prev => prev.filter(template => template.id !== templateId));
  };

  return {
    // 状態
    activeTab,
    setActiveTab,
    showProcessSettings,
    setShowProcessSettings,
    activeSubTab,
    setActiveSubTab,
    showEmailComposer,
    setShowEmailComposer,
    showLineComposer,
    setShowLineComposer,
    selectedProcess,
    setSelectedProcess,
    customerForm,
    setCustomerForm,
    aiSettings,
    setAiSettings,
    emailHistory,
    setEmailHistory,
    lineHistory,
    setLineHistory,
    approvalItems,
    setApprovalItems,
    salesProcess,
    setSalesProcess,
    processTemplates,
    setProcessTemplates,
    showTemplateSaveModal,
    setShowTemplateSaveModal,
    newTemplateName,
    setNewTemplateName,
    questionnaireItems,
    setQuestionnaireItems,
    customers,
    loading,
    error,
    
    // 関数
    calculateProgress,
    updateProcessStep,
    addProcessStep,
    removeProcessStep,
    updateQuestionnaireItem,
    addQuestionnaireItem,
    removeQuestionnaireItem,
    saveAsTemplate,
    updateReplyDueDate,
    applyProcessTemplate,
    deleteTemplate,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomer,
    
    // 定数
    industryOptions,
    snsStatusOptions,
    customerStatuses,
    processTypes
  };
}; 