import { useState, useEffect } from 'react';
import { 
  industryOptions, 
  snsStatusOptions, 
  customerStatuses, 
  processTypes, 
  defaultProcessTemplates, 
  defaultQuestionnaireItems 
} from '../utils/constants';

export const useCustomerManagement = () => {
  // 顧客管理システムの状態
  const [activeTab, setActiveTab] = useState('概要');
  const [showProcessSettings, setShowProcessSettings] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showLineComposer, setShowLineComposer] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  
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
    status: ''
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
      sender: 'customer',
      message: 'お見積もりの件、確認させていただきました。',
      timestamp: '2025-07-20 14:30',
      read: true
    },
    {
      id: 2,
      sender: 'sales',
      message: 'ご確認ありがとうございます。ご不明な点はございますか？',
      timestamp: '2025-07-20 14:35',
      read: true
    },
    {
      id: 3,
      sender: 'customer',
      message: '導入時期について相談したいです。',
      timestamp: '2025-07-20 14:40',
      read: true
    }
  ]);

  // 承認待ちアイテム
  const [approvalItems, setApprovalItems] = useState([
    {
      id: 1,
      type: 'メール返信',
      from: 'tanaka@techsolution.co.jp',
      subject: 'Re: お打ち合わせの件について',
      message: 'ありがとうございます。来週火曜日14:00で調整お願いします。',
      timestamp: '2025-07-28 10:30',
      confidence: 85,
      aiSuggestion: 'かしこまりました。来週火曜日14:00でお打ち合わせを設定いたします。場所はオンライン会議でよろしいでしょうか？'
    },
    {
      id: 2,
      type: 'FAQ応答',
      from: 'tanaka@techsolution.co.jp',
      subject: '料金プランについて',
      message: '基本プランと企業プランの違いを教えてください',
      timestamp: '2025-07-28 09:15',
      confidence: 95,
      aiSuggestion: '基本プランは月額50,000円で10ユーザーまで、企業プランは月額200,000円で無制限ユーザー＋カスタマイズ機能が含まれます。'
    }
  ]);

  // 営業プロセス
  const [salesProcess, setSalesProcess] = useState([
    { 
      id: 1, 
      name: 'リード獲得', 
      type: 'lead',
      completed: true, 
      date: '2025-06-15', 
      targetDate: '2025-06-20',
      reminder: true,
      replyDueDate: '',
      replyStatus: 'received',
      emailHistory: [
        { date: '2025-06-15', type: 'メール' },
        { date: '2025-06-16', type: 'LINE' }
      ]
    },
    { 
      id: 2, 
      name: '初回商談', 
      type: 'meeting',
      completed: true, 
      date: '2025-06-28', 
      targetDate: '2025-07-01',
      reminder: true,
      replyDueDate: '',
      replyStatus: 'received',
      emailHistory: [
        { date: '2025-06-28', type: 'メール' }
      ]
    },
    { 
      id: 3, 
      name: '商談前アンケート', 
      type: 'questionnaire',
      completed: false, 
      targetDate: '2025-07-25',
      reminder: true,
      replyDueDate: '2025-07-24',
      replyStatus: 'waiting',
      emailHistory: []
    },
    { 
      id: 4, 
      name: '提案書作成', 
      type: 'proposal',
      completed: false, 
      targetDate: '2025-08-05',
      reminder: false,
      replyDueDate: '2025-08-03',
      replyStatus: 'waiting',
      emailHistory: []
    },
    { 
      id: 5, 
      name: '見積もり提出', 
      type: 'quote',
      completed: false, 
      targetDate: '2025-08-15',
      reminder: false,
      replyDueDate: '',
      replyStatus: '',
      emailHistory: []
    },
    { 
      id: 6, 
      name: '契約締結', 
      type: 'contract',
      completed: false, 
      targetDate: '2025-08-30',
      reminder: false,
      replyDueDate: '',
      replyStatus: '',
      emailHistory: []
    }
  ]);

  // プロセステンプレート
  const [processTemplates, setProcessTemplates] = useState(defaultProcessTemplates);

  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // アンケート項目
  const [questionnaireItems, setQuestionnaireItems] = useState(defaultQuestionnaireItems);

  // 進捗率計算
  const calculateProgress = () => {
    const completed = salesProcess.filter(p => p.completed).length;
    return Math.round((completed / salesProcess.length) * 100);
  };

  // プロセスステップ更新
  const updateProcessStep = (id, field, value) => {
    setSalesProcess(prev => prev.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  // プロセスステップ追加
  const addProcessStep = () => {
    const newStep = {
      id: Date.now(),
      name: '',
      type: 'meeting',
      completed: false,
      targetDate: '',
      reminder: false
    };
    setSalesProcess(prev => [...prev, newStep]);
  };

  // プロセスステップ削除
  const removeProcessStep = (id) => {
    setSalesProcess(prev => prev.filter(step => step.id !== id));
  };

  // アンケート項目更新
  const updateQuestionnaireItem = (id, field, value) => {
    setQuestionnaireItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // アンケート項目追加
  const addQuestionnaireItem = () => {
    const newItem = {
      id: Date.now(),
      question: '',
      type: 'text',
      required: false,
      options: []
    };
    setQuestionnaireItems(prev => [...prev, newItem]);
  };

  // アンケート項目削除
  const removeQuestionnaireItem = (id) => {
    setQuestionnaireItems(prev => prev.filter(item => item.id !== id));
  };

  // テンプレート保存
  const saveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('テンプレート名を入力してください');
      return;
    }
    
    const newTemplate = {
      id: Date.now(),
      name: newTemplateName,
      steps: salesProcess.map(p => p.name).filter(name => name),
      isDefault: false
    };
    
    setProcessTemplates(prev => [...prev, newTemplate]);
    setNewTemplateName('');
    setShowTemplateSaveModal(false);
  };

  // 返信期限更新
  const updateReplyDueDate = (id, date) => {
    setSalesProcess(prev => prev.map(p =>
      p.id === id ? { ...p, replyDueDate: date, replyStatus: date ? 'waiting' : '' } : p
    ));
  };

  // 返信期限チェックとリマインド処理
  useEffect(() => {
    const checkReplyDueDates = () => {
      const now = new Date();
      
      setSalesProcess(prev => prev.map(p => {
        if (!p.replyDueDate || p.completed || p.replyStatus === 'received') return p;
        
        const due = new Date(p.replyDueDate);
        const pastDue = now > due;
        
        if (pastDue && p.replyStatus === 'waiting') {
          return {
            ...p,
            replyStatus: 'reminded',
            lastReminderSentAt: now.toISOString(),
            emailHistory: [...(p.emailHistory || []), { 
              date: now.toISOString().split('T')[0], 
              type: 'リマインド送信' 
            }]
          };
        }
        return p;
      }));
    };

    // 初回チェック
    checkReplyDueDates();
    
    // 1分ごとにチェック
    const interval = setInterval(checkReplyDueDates, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // テンプレート適用
  const applyProcessTemplate = (template) => {
    const newProcess = template.steps.map((step, index) => ({
      id: Date.now() + index,
      name: step,
      type: processTypes.find(t => t.label === step)?.value || 'meeting',
      completed: false,
      targetDate: '',
      reminder: false,
      replyDueDate: '',
      replyStatus: '',
      emailHistory: []
    }));
    setSalesProcess(newProcess);
    
    // モーダルを閉じて変更を反映
    alert(`「${template.name}」テンプレートを適用しました`);
  };

  // テンプレート削除
  const deleteTemplate = (id) => {
    setProcessTemplates(prev => prev.filter(template => template.id !== id));
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
    
    // 定数
    industryOptions,
    snsStatusOptions,
    customerStatuses,
    processTypes
  };
}; 