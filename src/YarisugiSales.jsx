import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { 
  Search, Plus, Upload, Send, Calendar, Phone, Mail, ChevronRight, 
  FileText, AlertCircle, Check, X, MessageSquare, Clock, User, 
  Building, Globe, DollarSign, TrendingUp, Activity, BarChart3, 
  PieChart, Users, Target, Award, Zap, Filter, Download, RefreshCw, 
  Settings, Bell, Menu, ArrowUp, ArrowDown, MoreVertical, Edit, 
  Trash2, Eye, Share2, Copy, Bookmark, Tag, Paperclip, Image, 
  Mic, Smile, ThumbsUp, Heart, Star, Flag, Archive, FolderOpen, 
  Database, Shield, Lock, Unlock, Key, Info, HelpCircle, CheckCircle, 
  XCircle, AlertTriangle, Brain, LineChart, GitBranch, LogOut
} from 'lucide-react';

// 新しいコンポーネントとカスタムフックのインポート
import { useCustomerManagement } from './hooks/useCustomerManagement';
// import CustomerDetail from './components/customer/CustomerDetail';

const YarisugiDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  
  // 顧客管理フックを使用
  const {
    customers,
    loading,
    error,
    customerForm: hookCustomerForm,
    setCustomerForm: setHookCustomerForm,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    fetchCustomer
  } = useCustomerManagement();
  
  const [activePage, setActivePage] = useState('top');
  const [showApproval, setShowApproval] = useState(false);
  const [customersPerPage, setCustomersPerPage] = useState(50);
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [showAddDatabase, setShowAddDatabase] = useState(false);
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [newFaq, setNewFaq] = useState({
    question: '',
    answer: '',
    category: '料金'
  });
  const [databaseText, setDatabaseText] = useState('');
  const [databaseFiles, setDatabaseFiles] = useState([]);
  const [aiFiles, setAiFiles] = useState([]);
  const [aiGeneratedFaqs, setAiGeneratedFaqs] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [faqCategories, setFaqCategories] = useState(['全て', '料金', 'サポート', '契約', '機能', 'その他']);
  // FAQBuilder関連の状態
  const [uploadedContent, setUploadedContent] = useState('');
  const [generatedFaqs, setGeneratedFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 顧客管理システムの状態
  const [activeTab, setActiveTab] = useState('概要');
  const [showProcessSettings, setShowProcessSettings] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showLineComposer, setShowLineComposer] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  
  // 顧客フォーム関連
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // 顧客登録フォーム（フックから取得）
  const customerForm = hookCustomerForm;
  const setCustomerForm = setHookCustomerForm;

  // 業種オプション
  const industryOptions = [
    '製造業',
    'IT・通信',
    '小売・流通',
    '建設・不動産',
    'サービス業',
    '金融・保険',
    '医療・福祉',
    'その他'
  ];

  // SNS運用状況オプション
  const snsStatusOptions = [
    '積極的に運用中（毎日投稿）',
    '定期的に運用中（週2-3回）',
    'たまに更新（月数回）',
    'アカウントはあるが更新なし',
    'SNS未運用'
  ];

  // ステータスオプション
  const customerStatuses = [
    '新規',
    '商談中',
    '成約',
    '失注'
  ];

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

  // プロセスタイプ
  const processTypes = [
    { value: 'lead', label: 'リード獲得', icon: Users },
    { value: 'meeting', label: '商談', icon: Calendar },
    { value: 'questionnaire', label: 'アンケート', icon: FileText },
    { value: 'proposal', label: '提案', icon: FileText },
    { value: 'quote', label: '見積もり', icon: DollarSign },
    { value: 'contract', label: '契約', icon: Award },
    { value: 'demo', label: 'デモ', icon: Activity },
    { value: 'follow', label: 'フォローアップ', icon: Phone }
  ];

  // プロセステンプレート
  const [processTemplates, setProcessTemplates] = useState([
    {
      id: 1,
      name: 'B2B標準プロセス',
      steps: ['リード獲得', '初回商談', 'ヒアリング', '提案書作成', '見積もり提出', '契約締結'],
      isDefault: true
    },
    {
      id: 2,
      name: 'B2Cサービス',
      steps: ['問い合わせ', '資料送付', '無料トライアル', '本契約'],
      isDefault: true
    },
    {
      id: 3,
      name: 'エンタープライズ',
      steps: ['リード獲得', '事前調査', '初回商談', 'RFP対応', 'PoC実施', 'デモ実施', '見積もり', '契約交渉', '契約締結'],
      isDefault: true
    }
  ]);

  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // アンケート項目
  const [questionnaireItems, setQuestionnaireItems] = useState([
    { 
      id: 1, 
      question: '現在のシステムの課題は何ですか？', 
      type: 'text', 
      required: true 
    },
    { 
      id: 2, 
      question: '導入予定時期はいつですか？', 
      type: 'select', 
      options: ['1ヶ月以内', '3ヶ月以内', '6ヶ月以内', '1年以内', '未定'],
      required: true 
    },
    { 
      id: 3, 
      question: 'ご予算はどのくらいですか？', 
      type: 'select',
      options: ['100万円未満', '100-300万円', '300-500万円', '500万円以上'],
      required: false 
    }
  ]);

  // ID管理関連の状態
  const [selectedCount, setSelectedCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    customerName: '',
    location: '',
    industry: '',
    siteUrl: '',
    snsStatus: '',
    lineId: '',
    email: '',
    salesPerson: '山田太郎',
    status: '新規'
  });
  const [showReport, setShowReport] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showReportPreview = () => {
    setShowReport(true);
  };

  const regenerateReport = () => {
    setShowReport(false);
    // 少し遅延を入れて再生成の演出
    setTimeout(() => {
      setShowReport(true);
    }, 500);
  };

  const showApprovalScreen = () => {
    setShowApproval(true);
  };

  const handleAddFaq = () => {
    const finalCategory = isCustomCategory && customCategory.trim() 
      ? customCategory.trim() 
      : newFaq.category;
    
    if (isCustomCategory && customCategory.trim() && !faqCategories.includes(customCategory.trim())) {
      setFaqCategories(prev => [...prev, customCategory.trim()]);
    }

    if (newFaq.question.trim() && newFaq.answer.trim()) {
      alert(`FAQ追加完了！\n質問: ${newFaq.question}\n回答: ${newFaq.answer}\nカテゴリ: ${finalCategory}`);
      setNewFaq({ question: '', answer: '', category: '料金' });
      setCustomCategory('');
      setIsCustomCategory(false);
      setShowAddFaq(false);
    }
  };

  const handleAiFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      type: file.name.split('.').pop(),
      size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
      processed: false
    }));
    
    setAiFiles(prev => [...prev, ...newFiles]);
    
    setTimeout(() => {
      const generatedFaqs = [];
      files.forEach((file, fileIndex) => {
        const faqTemplates = [
          {
            category: '料金・価格',
            question: `基本料金はいくらですか？`,
            answer: `基本料金は月額50,000円からとなっております。ご利用規模やオプション機能により価格が変動いたします。詳細なお見積りについてはお問い合わせください。`
          },
          {
            category: '料金・価格',
            question: `初期費用は必要ですか？`,
            answer: `初期導入費用として100,000円を頂戴しております。これには初回設定、データ移行、操作研修が含まれます。`
          },
          {
            category: 'サービス内容・機能',
            question: `どのような機能が利用できますか？`,
            answer: `顧客管理、売上分析、レポート作成、自動化機能、API連携など、豊富な機能をご利用いただけます。詳細な機能一覧は資料をご確認ください。`
          },
          {
            category: 'サービス内容・機能',
            question: `カスタマイズは可能ですか？`,
            answer: `はい、お客様のご要望に応じてカスタマイズ対応が可能です。追加開発費用については別途お見積りいたします。`
          },
          {
            category: '導入・設定',
            question: `導入までどのくらいの期間が必要ですか？`,
            answer: `標準的な導入期間は2-4週間程度です。お客様の環境やデータ量により前後する場合があります。`
          }
        ];

        const numFaqs = Math.floor(Math.random() * 5) + 8;
        const selectedFaqs = faqTemplates
          .sort(() => 0.5 - Math.random())
          .slice(0, numFaqs)
          .map((template, index) => ({
            id: Date.now() + fileIndex * 100 + index,
            category: template.category,
            question: template.question,
            answer: template.answer,
            source: file.name,
            editable: true
          }));

        generatedFaqs.push(...selectedFaqs);
      });
      
      setAiGeneratedFaqs(generatedFaqs);
      
      const newCategories = [...new Set(generatedFaqs.map(faq => faq.category))];
      newCategories.forEach(category => {
        if (!faqCategories.includes(category)) {
          setFaqCategories(prev => [...prev, category]);
        }
      });
      
      setAiFiles(prev => 
        prev.map(f => newFiles.find(nf => nf.id === f.id) ? {...f, processed: true} : f)
      );
    }, 3000);
  };

  const updateAiFaq = (id, field, value) => {
    setAiGeneratedFaqs(prev => 
      prev.map(faq => 
        faq.id === id ? { ...faq, [field]: value } : faq
      )
    );
  };

  const addAiFaq = (faq) => {
    alert(`FAQ追加完了！\nカテゴリ: ${faq.category}\n質問: ${faq.question}`);
    setAiGeneratedFaqs(prev => prev.filter(f => f.id !== faq.id));
  };

  const removeAiFaq = (id) => {
    setAiGeneratedFaqs(prev => prev.filter(faq => faq.id !== id));
  };

  const handleDatabaseFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      type: file.name.split('.').pop(),
      date: new Date().toISOString().split('T')[0],
      size: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
      processed: false
    }));
    
    setDatabaseFiles(prev => [...prev, ...newFiles]);
    
    setTimeout(() => {
      setDatabaseFiles(prev => 
        prev.map(f => newFiles.find(nf => nf.id === f.id) ? {...f, processed: true} : f)
      );
      alert(`${files.length}個のファイルからFAQを自動生成しました！`);
    }, 2000);
  };

  const handleDatabaseTextSubmit = () => {
    if (databaseText.trim()) {
      alert(`テキストからFAQを自動生成しました！\n入力文字数: ${databaseText.length}文字`);
      setDatabaseText('');
      setShowAddDatabase(false);
    }
  };

  // FAQBuilder関連の関数
  const generateComprehensiveFAQs = () => {
    setIsGenerating(true);
        
    setTimeout(() => {
      const comprehensiveFaqs = [
        { id: 1, category: '基本情報', question: 'サービスの概要を教えてください', answer: '当社のサービスは、クラウドベースの統合管理システムです。', status: 'new', similarity: 0 },
        { id: 2, category: '基本情報', question: '対応業種は何ですか？', answer: '製造業、小売業、サービス業など幅広い業種に対応しています。', status: 'new', similarity: 0 },
        { id: 3, category: '基本情報', question: '会社の設立はいつですか？', answer: '2010年に設立し、15年以上の実績があります。', status: 'new', similarity: 0 },
        { id: 4, category: '料金・プラン', question: '料金プランの種類を教えてください', answer: 'スタータープラン、スタンダードプラン、エンタープライズプランの3種類をご用意しています。', status: 'new', similarity: 0 },
        { id: 5, category: '料金・プラン', question: '無料トライアルはありますか？', answer: '30日間の無料トライアルをご利用いただけます。', status: 'new', similarity: 0 },
        { id: 6, category: '料金・プラン', question: '支払い方法は何がありますか？', answer: '銀行振込、クレジットカード、口座振替に対応しています。', status: 'new', similarity: 0 },
        { id: 7, category: '料金・プラン', question: '月払いと年払いの違いは？', answer: '年払いの場合、2ヶ月分の割引が適用されます。', status: 'new', similarity: 0 },
        { id: 8, category: '機能・仕様', question: '主要機能を教えてください', answer: '顧客管理、在庫管理、売上分析、レポート作成などの機能があります。', status: 'new', similarity: 0 },
        { id: 9, category: '機能・仕様', question: 'モバイル対応していますか？', answer: 'iOS/Androidアプリをご用意しており、外出先でも利用可能です。', status: 'new', similarity: 0 },
        { id: 10, category: '機能・仕様', question: 'API連携は可能ですか？', answer: 'RESTful APIを提供しており、他システムとの連携が可能です。', status: 'new', similarity: 0 },
        { id: 11, category: '機能・仕様', question: 'データのエクスポートはできますか？', answer: 'CSV、Excel、PDF形式でのエクスポートに対応しています。', status: 'new', similarity: 0 },
        { id: 12, category: '導入・設定', question: '導入に必要な期間は？', answer: '規模により異なりますが、通常2-4週間で導入完了します。', status: 'new', similarity: 0 },
        { id: 13, category: '導入・設定', question: '既存システムからの移行は可能ですか？', answer: '専門チームがデータ移行をサポートいたします。', status: 'new', similarity: 0 },
        { id: 14, category: '導入・設定', question: '必要な環境を教えてください', answer: 'インターネット接続環境があれば利用可能です。', status: 'new', similarity: 0 },
        { id: 15, category: 'セキュリティ', question: 'セキュリティ対策について教えてください', answer: 'SSL暗号化、二要素認証、定期的なセキュリティ監査を実施しています。', status: 'new', similarity: 0 },
        { id: 16, category: 'セキュリティ', question: 'データのバックアップは？', answer: '毎日自動バックアップを実施し、過去30日分を保持しています。', status: 'new', similarity: 0 },
        { id: 17, category: 'セキュリティ', question: 'アクセス権限の管理は？', answer: '役職・部署単位での細かなアクセス権限設定が可能です。', status: 'new', similarity: 0 },
        { id: 18, category: 'サポート', question: 'サポート体制について教えてください', answer: '平日9-18時の電話・メールサポートに加え、24時間対応の緊急窓口もあります。', status: 'new', similarity: 0 },
        { id: 19, category: 'サポート', question: '操作マニュアルはありますか？', answer: 'オンラインマニュアルと動画チュートリアルをご用意しています。', status: 'new', similarity: 0 },
        { id: 20, category: 'サポート', question: '研修は受けられますか？', answer: '導入時研修と定期的なフォローアップ研修を実施しています。', status: 'new', similarity: 0 },
        { id: 21, category: '契約・解約', question: '契約期間の縛りはありますか？', answer: '最低契約期間は1年間、その後は月単位での更新となります。', status: 'new', similarity: 85 },
        { id: 22, category: '契約・解約', question: '解約時のデータはどうなりますか？', answer: '解約後30日間はデータのダウンロードが可能です。', status: 'new', similarity: 0 },
        { id: 23, category: '契約・解約', question: 'プラン変更は可能ですか？', answer: 'いつでも上位プランへの変更が可能です。', status: 'new', similarity: 0 },
      ];

      const uniqueCategories = [...new Set(comprehensiveFaqs.map(faq => faq.category))];
      setCategories(uniqueCategories);
      setGeneratedFaqs(comprehensiveFaqs);
      setIsGenerating(false);
    }, 2000);
  };

  const handleFaqFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedContent(`ファイル: ${file.name} がアップロードされました`);
    }
  };

  const handleFaqTextInput = (text) => {
    if (text.trim()) {
      setUploadedContent(text);
    }
  };

  const updateGeneratedFaq = (id, field, value) => {
    setGeneratedFaqs(prev =>
      prev.map(faq => faq.id === id ? { ...faq, [field]: value, status: 'edited' } : faq)
    );
  };

  const deleteGeneratedFaq = (id) => {
    setGeneratedFaqs(prev => prev.filter(faq => faq.id !== id));
  };

  const addNewGeneratedFaq = () => {
    const newFaq = {
      id: Date.now(),
      category: selectedCategory === 'all' ? '新規カテゴリ' : selectedCategory,
      question: '',
      answer: '',
      status: 'new',
      similarity: 0
    };
    setGeneratedFaqs(prev => [newFaq, ...prev]);
  };

  const saveGeneratedFaq = (faq) => {
    if (faq.similarity > 80) {
      setShowDuplicateWarning({ ...showDuplicateWarning, [faq.id]: true });
      return;
    }
        
    alert(`FAQ登録完了:\nカテゴリ: ${faq.category}\n質問: ${faq.question}`);
    setGeneratedFaqs(prev => prev.map(f =>
      f.id === faq.id ? { ...f, status: 'saved' } : f
    ));
  };

  const saveAllGeneratedFaqs = () => {
    const newFaqs = generatedFaqs.filter(faq => faq.status !== 'saved' && faq.similarity < 80);
    alert(`${newFaqs.length}件のFAQを一括登録しました`);
    setGeneratedFaqs(prev => prev.map(faq => ({ ...faq, status: 'saved' })));
  };

  const filteredFaqs = generatedFaqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // uploadedContentが変更されたときにFAQ生成を実行
  React.useEffect(() => {
    if (uploadedContent) {
      generateComprehensiveFAQs();
    }
  }, [uploadedContent]);

  const showCustomerDetails = (customer) => {
    navigate(`/customer/${customer.id}`);
  };

  const handleCheckout = async () => {
    alert(`決済処理：${selectedCount} ID（¥${selectedCount * 3500}）`);
    // 実際のStripe決済処理はここに実装
  };

  const generateProposal = () => {
    alert('レポートを抽出しています...');
  };

  const StatCard = ({ value, label, icon }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm flex justify-between items-center">
      <div className="flex-1">
        <div className="text-2xl font-bold text-indigo-600 mb-1">{value}</div>
        <div className="text-gray-500 text-sm">{label}</div>
      </div>
      <div className="w-15 h-15 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl">
        {icon}
      </div>
    </div>
  );

  const FormGroup = ({ label, children }) => (
    <div className="mb-6">
      <label className="block font-semibold mb-2 text-gray-700">{label}</label>
      {children}
    </div>
  );

  const Input = ({ value, onChange, placeholder, type = "text" }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-100"
    />
  );

  const Select = ({ value, onChange, options, placeholder }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-100 bg-white cursor-pointer"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option, index) => (
        <option key={index} value={option}>{option}</option>
      ))}
    </select>
  );

  const Button = ({ onClick, variant = 'primary', size = 'md', children }) => {
    const baseClasses = "font-semibold cursor-pointer transition-all border-none rounded-lg";
    const variants = {
      primary: "bg-indigo-500 text-white hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300",
      secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      danger: "bg-red-500 text-white hover:bg-red-600"
    };
    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base"
    };
    
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
      >
        {children}
      </button>
    );
  };

  const NavItem = ({ label, page, active, onClick }) => (
    <>
      <div
        onClick={() => onClick(page)}
        className={`flex items-center px-6 py-4 cursor-pointer transition-all text-sm relative ${
          active 
            ? 'bg-indigo-500 text-white before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-purple-400' 
            : 'text-slate-300 hover:bg-slate-700'
        }`}
      >
        <span>{label}</span>
      </div>
      <div className="border-b border-slate-600/30 mx-4"></div>
    </>
  );

  // 顧客管理システムの関数
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

  // 顧客フォームのリセット
  const resetCustomerForm = () => {
    setCustomerForm({
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
    setEditingCustomer(null);
  };

  // 顧客作成・更新ハンドラー
  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        // 更新
        await updateCustomer(editingCustomer.id, customerForm);
        alert('顧客情報を更新しました');
      } else {
        // 作成
        await createCustomer(customerForm);
        alert('顧客を登録しました');
      }
      
      setShowCustomerForm(false);
      resetCustomerForm();
    } catch (error) {
      console.error('顧客保存エラー:', error);
      alert('顧客の保存に失敗しました');
    }
  };

  // 顧客編集ハンドラー
  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      companyName: customer.companyName || '',
      customerName: customer.customerName || '',
      location: customer.location || '',
      industry: customer.industry || '',
      siteUrl: customer.siteUrl || '',
      snsStatus: customer.snsStatus || '',
      lineId: customer.lineId || '',
      email: customer.email || '',
      salesPerson: customer.salesPerson || '',
      status: customer.status || '新規'
    });
    setShowCustomerForm(true);
  };

  return (
    <div className="h-screen w-full bg-gray-50 font-sans text-gray-800 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow-md px-4 sm:px-8 py-4 flex justify-between items-center flex-shrink-0">
        <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Yarisugi
        </div>
        <div className="flex gap-2 sm:gap-4 items-center">
          <div className="relative cursor-pointer text-lg sm:text-xl">
            🔔
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">3</span>
          </div>
          
          {/* ユーザー情報 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-gray-900">
                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'ユーザー'}
              </div>
              <div className="text-xs text-gray-500">
                {currentUser?.email}
              </div>
            </div>
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
            </div>
          </div>
          
          <Button size="sm">CSVエクスポート</Button>
          
          {/* ログアウトボタン */}
          <button
            onClick={async () => {
              try {
                await logout();
                navigate('/login');
              } catch (error) {
                console.error('ログアウトエラー:', error);
              }
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="ログアウト"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <div className="w-48 sm:w-64 lg:w-72 bg-slate-800 text-slate-200 py-6 overflow-y-auto flex-shrink-0">
          <NavItem label="トップページ" page="top" active={activePage === 'top'} onClick={setActivePage} />
          <NavItem label="顧客一覧" page="customers" active={activePage === 'customers'} onClick={setActivePage} />
          <NavItem label="FAQ設定" page="faq" active={activePage === 'faq'} onClick={setActivePage} />
          <NavItem label="ナレッジ検索" page="search" active={activePage === 'search'} onClick={setActivePage} />
          <NavItem label="ナレッジDB" page="database" active={activePage === 'database'} onClick={setActivePage} />
          <NavItem label="基本情報入力" page="profile" active={activePage === 'profile'} onClick={setActivePage} />
          <NavItem label="ID追加・プラン変更" page="idManage" active={activePage === 'idManage'} onClick={setActivePage} />
          {/* 機能追加要望フォーム（強調） */}
          <div className="mt-2 mx-3">
            <button
              className={`w-full text-left px-3 sm:px-4 py-2 rounded-md font-semibold text-sm ${
                activePage === 'featureRequest'
                  ? 'bg-yellow-500 text-slate-900'
                  : 'bg-yellow-200 text-yellow-900 hover:bg-yellow-300'
              }`}
              onClick={() => setActivePage('featureRequest')}
            >
              💬 機能追加要望フォーム
            </button>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activePage === 'top' && (
            <div>
              {/* 新規顧客登録 */}
              <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">新規顧客登録</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormGroup label="会社名">
                    <Input
                      value={formData.companyName}
                      onChange={(value) => handleInputChange('companyName', value)}
                      placeholder="株式会社〇〇"
                    />
                  </FormGroup>
                  
                  <FormGroup label="顧客名（担当者名）">
                    <Input
                      value={formData.customerName}
                      onChange={(value) => handleInputChange('customerName', value)}
                      placeholder="田中一郎"
                    />
                  </FormGroup>
                  
                  <FormGroup label="所在地">
                    <Input
                      value={formData.location}
                      onChange={(value) => handleInputChange('location', value)}
                      placeholder="東京都渋谷区"
                    />
                  </FormGroup>
                  
                  <FormGroup label="業種">
                    <Select
                      value={formData.industry}
                      onChange={(value) => handleInputChange('industry', value)}
                      placeholder="選択してください"
                      options={['製造業', 'IT・通信', '小売・流通', '建設・不動産', 'サービス業', '金融・保険', '医療・福祉', 'その他']}
                    />
                  </FormGroup>
                  
                  <FormGroup label="サイトURL">
                    <Input
                      type="url"
                      value={formData.siteUrl}
                      onChange={(value) => handleInputChange('siteUrl', value)}
                      placeholder="https://example.com"
                    />
                  </FormGroup>
                  
                  <FormGroup label="SNS運用状況">
                    <Select
                      value={formData.snsStatus}
                      onChange={(value) => handleInputChange('snsStatus', value)}
                      placeholder="選択してください"
                      options={[
                        '積極的に運用中（毎日投稿）',
                        '定期的に運用中（週2-3回）',
                        'たまに更新（月数回）',
                        'アカウントはあるが更新なし',
                        'SNS未運用'
                      ]}
                    />
                  </FormGroup>
                  
                  <FormGroup label="LINE ID">
                    <Input
                      value={formData.lineId}
                      onChange={(value) => handleInputChange('lineId', value)}
                      placeholder="@example_line"
                    />
                  </FormGroup>
                  
                  <FormGroup label="メールアドレス">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(value) => handleInputChange('email', value)}
                      placeholder="example@email.com"
                    />
                  </FormGroup>
                  
                  <FormGroup label="担当営業">
                    <Select
                      value={formData.salesPerson}
                      onChange={(value) => handleInputChange('salesPerson', value)}
                      options={['山田太郎', '佐藤花子', '鈴木一郎']}
                    />
                  </FormGroup>
                  
                  <FormGroup label="ステータス">
                    <Select
                      value={formData.status}
                      onChange={(value) => handleInputChange('status', value)}
                      options={['新規', '商談中', '成約', '失注']}
                    />
                  </FormGroup>
                </div>
                
                <div className="flex gap-4 mt-6">
                  <Button>登録</Button>
                  <Button onClick={showReportPreview}>レポートを抽出</Button>
                  <Button variant="secondary">キャンセル</Button>
                </div>
              </div>

              {/* メール自動化セクション */}
              <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">📧 メール・LINE自動化</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 最新の受信メール */}
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-blue-700 mb-4 flex items-center gap-2">
                      <span>🔔</span>
                      <span>最新の受信メール</span>
                    </h3>
                    <div className="bg-white rounded-md p-4 mb-4 cursor-pointer hover:bg-gray-50" onClick={showApprovalScreen}>
                      <p className="font-semibold mb-2">株式会社テックソリューション</p>
                      <p className="text-sm text-gray-600">件名: 見積もりについて問い合わせ</p>
                      <p className="text-xs text-gray-400">受信: 10分前</p>
                    </div>
                    <Button size="sm">返信テンプレート選択</Button>
                  </div>

                  {/* 最新のLINEメッセージ */}
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-green-700 mb-4 flex items-center gap-2">
                      <span>💬</span>
                      <span>最新のLINEメッセージ</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-white rounded-md p-4 cursor-pointer hover:bg-gray-50">
                        <p className="font-semibold mb-2">佐藤花子（グローバル商事）</p>
                        <p className="text-sm text-gray-600">メッセージ: 来週の打ち合わせの件で...</p>
                        <p className="text-xs text-gray-400">受信: 25分前</p>
                      </div>
                      <div className="bg-white rounded-md p-4 cursor-pointer hover:bg-gray-50">
                        <p className="font-semibold mb-2">鈴木次郎（製造工業）</p>
                        <p className="text-sm text-gray-600">メッセージ: 資料ありがとうございました</p>
                        <p className="text-xs text-gray-400">受信: 1時間前</p>
                      </div>
                    </div>
                    <Button size="sm">個別LINE選択</Button>
                  </div>
                </div>
              </div>

              {/* レポートプレビュー */}
              {showReport && (
                <div className="bg-gray-100 rounded-xl p-8 mt-8">
                  <div className="bg-white rounded-lg p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">提案資料予測レポート</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={regenerateReport}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          🔄 再生成
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-8">
                      <h3 className="text-blue-600 mb-4">🎯 最適な提案フォーマット予測</h3>
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="font-semibold text-blue-800 mb-2">推奨提案書構成:</p>
                        <ul className="space-y-2 pl-4">
                          <li>• <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">導入効果重視型</span> - ROI計算とコスト削減効果を前面に</li>
                          <li>• 業界特化セクション: IT・通信業界向けソリューション事例</li>
                          <li>• 競合比較表: 主要3社との機能・価格比較</li>
                          <li>• 導入スケジュール: 段階的導入プランの提示</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-blue-600 mb-4">💰 価格戦略予測</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">推奨価格帯</h4>
                          <ul className="space-y-2 pl-4 text-green-700">
                            <li>• 初期費用: <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">¥800,000-¥1,200,000</span></li>
                            <li>• 月額費用: <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">¥150,000-¥200,000</span></li>
                            <li>• 年間契約割引: 2ヶ月分無料</li>
                          </ul>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-yellow-800 mb-2">価格正当化要素</h4>
                          <ul className="space-y-2 pl-4 text-yellow-700">
                            <li>• 24時間サポート体制</li>
                            <li>• 業界特化カスタマイズ</li>
                            <li>• データ移行・研修費用込み</li>
                            <li>• 1年間の保守・更新無料</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-blue-600 mb-4">📊 成約確率分析</h3>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">78%</div>
                            <div className="text-sm text-purple-700">3ヶ月以内成約確率</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">¥1,800,000</div>
                            <div className="text-sm text-purple-700">予想年間契約額</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">High</div>
                            <div className="text-sm text-purple-700">優先度ランク</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-blue-600 mb-4">🎯 提案戦略アドバイス</h3>
                      <div className="space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-indigo-800 mb-2">✅ 強調すべきポイント</h4>
                          <ul className="space-y-1 pl-4 text-indigo-700">
                            <li>• 他社システムとの API連携による業務効率化</li>
                            <li>• IT業界特有の課題解決事例（開発プロジェクト管理など）</li>
                            <li>• スケーラブルな料金体系でビジネス成長に対応</li>
                            <li>• セキュリティ強化による信頼性向上</li>
                          </ul>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-orange-800 mb-2">⚠️ 懸念点と対策</h4>
                          <ul className="space-y-1 pl-4 text-orange-700">
                            <li>• 既存システムからの移行リスク → 段階移行プランを提示</li>
                            <li>• 初期投資の負担感 → ROI試算と分割払いオプション</li>
                            <li>• 運用定着の不安 → 充実した研修・サポート体制をアピール</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-blue-600 mb-4">📋 次のアクションプラン</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-2">即実行項目</h4>
                            <ul className="space-y-1 pl-4 text-gray-700">
                              <li>• 業界特化デモ環境の準備</li>
                              <li>• 競合比較資料の最新化</li>
                              <li>• ROI計算シートの作成</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-2">今週中実行項目</h4>
                            <ul className="space-y-1 pl-4 text-gray-700">
                              <li>• 提案書ドラフト作成</li>
                              <li>• 技術担当者との事前打ち合わせ</li>
                              <li>• 契約条件の詳細検討</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
                        📄 提案書テンプレート生成
                      </button>
                      <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                        📊 詳細分析レポート出力
                      </button>
                      <button 
                        onClick={() => setShowReport(false)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activePage === 'faq' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">FAQ管理システム</h1>
                <p className="text-gray-600 mt-2">FAQ追加とデータベース作成のモーダル機能</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex gap-4 mb-8">
                  <button 
                    onClick={() => setShowAddFaq(true)}
                    className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    + FAQ追加
                  </button>
                  <button 
                    onClick={() => setShowAddDatabase(true)}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    📚 データベース作成
                  </button>
                  <button 
                    onClick={() => setShowAiAssist(true)}
                    className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                  >
                    ✨ AIアシスト FAQ作成
                  </button>
                </div>

                {/* 既存FAQ表示エリア */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">既存のFAQ</h2>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">料金</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">手動追加</span>
                    </div>
                    <h3 className="font-semibold mb-2">Q: 基本プランの料金はいくらですか？</h3>
                    <p className="text-gray-700 mb-2">A: 基本プランは月額50,000円で10ユーザーまでご利用いただけます。</p>
                    <div className="text-sm text-gray-500">使用回数: 15回</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 顧客詳細ダッシュボード */}
          {/* {showCustomerDetail && selectedCustomer && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                      <p className="text-gray-600">{selectedCustomer.contact} • {selectedCustomer.industry}</p>
                    </div>
                    <button 
                      onClick={() => setShowCustomerDetail(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">基本情報</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-600">会社名:</span>
                          <span className="ml-2">{selectedCustomer.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">担当者:</span>
                          <span className="ml-2">{selectedCustomer.contact}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">メール:</span>
                          <span className="ml-2">{selectedCustomer.email}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">電話番号:</span>
                          <span className="ml-2">{selectedCustomer.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">業種:</span>
                          <span className="ml-2">{selectedCustomer.industry}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">営業情報</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-gray-600">ステータス:</span>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">商談中</span>
                        </div>
                        <div>
                          <span className="text-gray-600">担当営業:</span>
                          <span className="ml-2">山田太郎</span>
                        </div>
                        <div>
                          <span className="text-gray-600">登録日:</span>
                          <span className="ml-2">2024-01-15</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold mb-3">アクション</h4>
                    <div className="flex gap-3">
                      <Button variant="primary">メール送信</Button>
                      <Button variant="secondary">LINE送信</Button>
                      <Button variant="secondary">商談記録</Button>
                      <Button variant="secondary">見積もり作成</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* FAQ追加モーダル */}
          {showAddFaq && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">FAQ追加</h3>
                    <button 
                      onClick={() => setShowAddFaq(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="existing-category"
                          name="category-type"
                          checked={!isCustomCategory}
                          onChange={() => setIsCustomCategory(false)}
                          className="text-indigo-600"
                        />
                        <label htmlFor="existing-category" className="text-sm">既存カテゴリから選択</label>
                      </div>
                      {!isCustomCategory && (
                        <select 
                          value={newFaq.category}
                          onChange={(e) => setNewFaq(prev => ({...prev, category: e.target.value}))}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {faqCategories.slice(1).map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="custom-category"
                          name="category-type"
                          checked={isCustomCategory}
                          onChange={() => setIsCustomCategory(true)}
                          className="text-indigo-600"
                        />
                        <label htmlFor="custom-category" className="text-sm">新しいカテゴリを作成</label>
                      </div>
                      {isCustomCategory && (
                        <input
                          type="text"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          placeholder="新しいカテゴリ名を入力"
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">質問</label>
                    <input 
                      type="text"
                      value={newFaq.question}
                      onChange={(e) => setNewFaq(prev => ({...prev, question: e.target.value}))}
                      placeholder="よくある質問を入力してください"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">回答</label>
                    <textarea 
                      value={newFaq.answer}
                      onChange={(e) => setNewFaq(prev => ({...prev, answer: e.target.value}))}
                      rows="6"
                      placeholder="回答を入力してください"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={handleAddFaq}
                      className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                    >
                      追加
                    </button>
                    <button 
                      onClick={() => setShowAddFaq(false)}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* データベース作成モーダル */}
          {showAddDatabase && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">データベース作成 - FAQ自動生成</h3>
                    <button 
                      onClick={() => setShowAddDatabase(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {!uploadedContent ? (
                    <div>
                      <h1 className="text-3xl font-bold mb-8 text-center">FAQ自動生成システム</h1>
                      
                      <div className="grid md:grid-cols-2 gap-8">
                        {/* ファイルアップロード */}
                        <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-dashed border-blue-300 hover:border-blue-500 transition-colors">
                          <div className="text-center">
                            <div className="text-6xl mb-4">📁</div>
                            <h2 className="text-xl font-bold mb-2">ファイルをアップロード</h2>
                            <p className="text-gray-600 mb-4">PDF, Word, Excel, PowerPoint対応</p>
                            <input
                              type="file"
                              onChange={handleFaqFileUpload}
                              className="hidden"
                              id="faq-file-upload"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                            />
                            <label
                              htmlFor="faq-file-upload"
                              className="bg-blue-500 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors inline-block"
                            >
                              ファイルを選択
                            </label>
                          </div>
                        </div>

                        {/* テキスト入力 */}
                        <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-dashed border-green-300 hover:border-green-500 transition-colors">
                          <div className="text-center">
                            <div className="text-6xl mb-4">📝</div>
                            <h2 className="text-xl font-bold mb-2">テキストを入力</h2>
                            <p className="text-gray-600 mb-4">サービス情報を直接入力</p>
                            <button
                              onClick={() => {
                                const text = prompt('サービス情報を入力してください');
                                if (text) handleFaqTextInput(text);
                              }}
                              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                            >
                              テキスト入力を開始
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h1 className="text-2xl font-bold">FAQ編集・登録画面</h1>
                          <p className="text-gray-600 mt-1">アップロードされた内容: {uploadedContent}</p>
                        </div>
                        <button
                          onClick={() => setUploadedContent('')}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ← 戻る
                        </button>
                      </div>

                      {/* コントロールバー */}
                      <div className="flex flex-wrap gap-4 mb-6">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">全カテゴリ</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>

                        <input
                          type="text"
                          placeholder="🔍 質問・回答を検索"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                          onClick={addNewGeneratedFaq}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          ➕ 新規FAQ追加
                        </button>

                        <button
                          onClick={saveAllGeneratedFaqs}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          💾 すべて保存 ({generatedFaqs.filter(f => f.status !== 'saved' && f.similarity < 80).length}件)
                        </button>
                      </div>

                      {/* 統計情報 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{generatedFaqs.length}</div>
                          <div className="text-sm text-gray-600">総FAQ数</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {generatedFaqs.filter(f => f.status === 'saved').length}
                          </div>
                          <div className="text-sm text-gray-600">保存済み</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {generatedFaqs.filter(f => f.status === 'edited').length}
                          </div>
                          <div className="text-sm text-gray-600">編集済み</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {generatedFaqs.filter(f => f.similarity > 80).length}
                          </div>
                          <div className="text-sm text-gray-600">重複の可能性</div>
                        </div>
                      </div>

                      {/* FAQ一覧 */}
                      <div className="space-y-4">
                        {isGenerating ? (
                          <div className="text-center py-12">
                            <div className="text-4xl mb-4">🤖</div>
                            <p className="text-lg font-medium">AI分析中...</p>
                            <p className="text-gray-600">網羅的なFAQを生成しています</p>
                          </div>
                        ) : (
                          filteredFaqs.map((faq) => (
                            <div
                              key={faq.id}
                              className={`border rounded-lg p-4 transition-all ${
                                faq.status === 'saved' ? 'bg-gray-50 border-gray-300' :
                                faq.status === 'edited' ? 'bg-yellow-50 border-yellow-300' :
                                faq.similarity > 80 ? 'bg-red-50 border-red-300' :
                                'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={faq.category}
                                      onChange={(e) => updateGeneratedFaq(faq.id, 'category', e.target.value)}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium focus:ring-2 focus:ring-blue-500"
                                      placeholder="カテゴリ"
                                    />
                                    {faq.status === 'edited' && (
                                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">編集済</span>
                                    )}
                                    {faq.status === 'saved' && (
                                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">保存済</span>
                                    )}
                                    {faq.similarity > 80 && (
                                      <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                                        類似度: {faq.similarity}% - 重複の可能性
                                      </span>
                                    )}
                                  </div>

                                  <input
                                    type="text"
                                    value={faq.question}
                                    onChange={(e) => updateGeneratedFaq(faq.id, 'question', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                                    placeholder="質問を入力"
                                  />

                                  <textarea
                                    value={faq.answer}
                                    onChange={(e) => updateGeneratedFaq(faq.id, 'answer', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
                                    placeholder="回答を入力"
                                    rows={3}
                                  />

                                  {showDuplicateWarning[faq.id] && (
                                    <div className="bg-red-100 border border-red-300 p-3 rounded-lg text-sm">
                                      <p className="font-medium text-red-800">⚠️ 重複の可能性があります</p>
                                      <p className="text-red-700">既存のFAQと類似度が高いため、内容を確認してください。</p>
                                      <button
                                        onClick={() => {
                                          setShowDuplicateWarning({ ...showDuplicateWarning, [faq.id]: false });
                                          saveGeneratedFaq({ ...faq, similarity: 0 });
                                        }}
                                        className="mt-2 text-red-600 underline text-sm"
                                      >
                                        それでも保存する
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveGeneratedFaq(faq)}
                                    disabled={faq.status === 'saved'}
                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={() => deleteGeneratedFaq(faq.id)}
                                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AIアシストFAQ作成モーダル */}
          {showAiAssist && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✨</span>
                      <h3 className="text-xl font-bold">AIアシスト FAQ作成</h3>
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">おすすめ</span>
                    </div>
                    <button 
                      onClick={() => setShowAiAssist(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* ファイルアップロード セクション */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">📋</span>
                      <h4 className="text-lg font-semibold text-gray-800">事業内容・提案資料をアップロード</h4>
                    </div>
                    
                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center bg-purple-50">
                      <div className="text-4xl mb-4">📄</div>
                      <p className="text-gray-700 mb-2 font-medium">事業紹介資料や提案書をアップロードしてください</p>
                      <p className="text-sm text-gray-600 mb-4">AIが資料を分析して、よくある質問と回答を自動生成します</p>
                      <label className="bg-purple-500 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-purple-600 transition-colors inline-block">
                        <input 
                          type="file" 
                          multiple 
                          onChange={handleAiFileUpload}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                        />
                        📂 資料をアップロード
                      </label>
                    </div>

                    {/* アップロード済みファイル */}
                    {aiFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h5 className="font-medium text-gray-700">アップロード済み資料:</h5>
                        <div className="grid md:grid-cols-2 gap-3">
                          {aiFiles.map(file => (
                            <div key={file.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                📄
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{file.name}</div>
                                <div className="text-xs text-gray-500">{file.size}</div>
                              </div>
                              {file.processed ? (
                                <div className="text-xs text-green-600 font-medium">✅ 分析完了</div>
                              ) : (
                                <div className="text-xs text-purple-600">🔄 AI分析中...</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI生成FAQ一覧 */}
                  {aiGeneratedFaqs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <span className="text-xl">🤖</span>
                        <h4 className="text-lg font-semibold text-gray-800">AI生成FAQ ({aiGeneratedFaqs.length}件)</h4>
                        <span className="text-sm text-gray-600">- 内容を確認・編集してFAQに追加できます</span>
                      </div>

                      <div className="grid gap-4">
                        {aiGeneratedFaqs.map((faq, index) => (
                          <div key={faq.id} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                                <input
                                  type="text"
                                  value={faq.category}
                                  onChange={(e) => updateAiFaq(faq.id, 'category', e.target.value)}
                                  className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium border-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                                />
                                <span className="text-xs text-gray-500">ソース: {faq.source}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => addAiFaq(faq)}
                                  className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors text-xs flex items-center gap-1"
                                >
                                  ✓ 追加
                                </button>
                                <button
                                  onClick={() => removeAiFaq(faq.id)}
                                  className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">質問</label>
                                <input
                                  type="text"
                                  value={faq.question}
                                  onChange={(e) => updateAiFaq(faq.id, 'question', e.target.value)}
                                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">回答</label>
                                <textarea
                                  value={faq.answer}
                                  onChange={(e) => updateAiFaq(faq.id, 'answer', e.target.value)}
                                  rows="3"
                                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-vertical"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-green-600">💡</span>
                          <h5 className="font-semibold text-green-800">AIアシスト機能の特徴</h5>
                        </div>
                        <ul className="text-green-700 text-sm space-y-1">
                          <li>• 事業資料から自動的にFAQを生成</li>
                          <li>• カテゴリの自動分類と新規作成</li>
                          <li>• 質問と回答の編集が可能</li>
                          <li>• 一括でFAQデータベースに追加</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {aiGeneratedFaqs.length === 0 && aiFiles.some(f => f.processed) && (
                    <div className="text-center py-8 text-gray-500">
                      <p>資料の分析が完了しました。FAQが生成されませんでした。</p>
                      <p className="text-sm mt-2">別の資料をアップロードしてみてください。</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-6 border-t">
                    <button 
                      onClick={() => setShowAiAssist(false)}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      閉じる
                    </button>
                    {aiGeneratedFaqs.length > 0 && (
                      <button 
                        onClick={() => {
                          const count = aiGeneratedFaqs.length;
                          alert(`${count}件のFAQを一括追加しました！`);
                          setAiGeneratedFaqs([]);
                          setShowAiAssist(false);
                        }}
                        className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        すべてのFAQを追加 ({aiGeneratedFaqs.length}件)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === 'customers' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">顧客一覧</h1>
                <p className="text-gray-600 mt-2">登録されている顧客の管理</p>
              </div>

              {/* デバッグ情報 */}
              <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p>Debug: customers.length = {customers.length}</p>
                <p>Debug: loading = {loading.toString()}</p>
                <p>Debug: error = {error || 'なし'}</p>
                <button 
                  onClick={() => {
                    console.log('🔄 手動でデータ再取得');
                    fetchCustomers();
                  }}
                  className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
                >
                  データ再取得
                </button>
              </div>

              {/* エラーメッセージ */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">顧客リスト</h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="顧客名・会社名で検索..."
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button size="sm" onClick={() => setShowCustomerForm(true)}>新規登録</Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <p className="mt-2 text-gray-600">顧客データを読み込み中...</p>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">登録されている顧客がありません</p>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setShowCustomerForm(true)}
                      >
                        最初の顧客を登録
                      </Button>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会社名</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当者</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">業種</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当営業</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最終更新</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {customers.map((customer) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{customer.companyName}</div>
                              {customer.siteUrl && (
                                <div className="text-sm text-gray-500">{customer.siteUrl}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{customer.customerName}</div>
                              {customer.email && (
                                <div className="text-sm text-gray-500">{customer.email}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.industry || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                customer.status === '新規' ? 'bg-blue-100 text-blue-800' :
                                customer.status === '商談中' ? 'bg-yellow-100 text-yellow-800' :
                                customer.status === '成約' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {customer.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.salesPerson || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('ja-JP') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => handleEditCustomer(customer)}
                              >
                                編集
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => navigate(`/customer/${customer.id}`)}
                              >
                                詳細
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {showApproval && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">承認待ち</h2>
                  <button
                    onClick={() => setShowApproval(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <h3 className="font-semibold text-blue-900">新規メール受信</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">承認待ち</span>
                    </div>
                    <div className="ml-6">
                      <p className="text-sm text-gray-700 mb-2"><strong>送信者:</strong> 株式会社テックソリューション (tanaka@tech-solution.com)</p>
                      <p className="text-sm text-gray-700 mb-2"><strong>件名:</strong> 見積もりについて問い合わせ</p>
                      <p className="text-sm text-gray-700 mb-4"><strong>受信時刻:</strong> 2024-01-15 14:30</p>
                      
                      <div className="bg-white rounded p-3 border text-sm">
                        <p>いつもお世話になっております。</p>
                        <p>弊社のシステム導入について、詳細な見積もりをお願いしたく連絡いたします。</p>
                        <p>ご検討のほど、よろしくお願いいたします。</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">推奨する返信内容</h4>
                    <div className="bg-white rounded p-3 border text-sm">
                      <p>田中様</p>
                      <p className="mt-2">いつもお世話になっております。</p>
                      <p className="mt-2">見積もりのご依頼をいただき、ありがとうございます。</p>
                      <p>詳細な要件をお聞かせいただけますでしょうか。</p>
                      <p className="mt-2">お時間のある時にお打ち合わせの機会をいただけますと幸いです。</p>
                      <p className="mt-2">よろしくお願いいたします。</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button>承認して送信</Button>
                    <Button variant="secondary">編集</Button>
                    <Button variant="danger">却下</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === 'search' && (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
              <div className="p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">ナレッジ検索</h1>
                  <p className="text-gray-600">困った時の頼れる相談相手</p>
                </div>

                {/* 検索セクション */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">自由検索</h2>
                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="例：価格、競合、契約条件..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none bg-white"
                    />
                    <Button>検索</Button>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h3 className="text-md font-semibold text-slate-800 mb-3">検索のヒント</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-2">
                        <p className="font-medium text-slate-700">基本情報</p>
                        <ul className="space-y-1 text-slate-600">
                          <li>• 価格・値引き</li>
                          <li>• 競合・比較</li>
                          <li>• 契約・条件</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-slate-700">サポート</p>
                        <ul className="space-y-1 text-slate-600">
                          <li>• トラブル・障害</li>
                          <li>• 導入・研修</li>
                          <li>• 機能・実績</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 状況別ナレッジ */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">よくある状況</h2>
                  <div className="space-y-3">
                    <button className="w-full bg-white hover:shadow-md p-4 rounded-lg border-2 border-gray-300 text-left transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-medium mb-1">価格を下げろと言われた</div>
                          <div className="flex items-center space-x-2">
                            <span className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-sm text-red-600">要注意</span>
                          </div>
                        </div>
                        <div className="text-2xl text-gray-400">→</div>
                      </div>
                    </button>
                    
                    <button className="w-full bg-white hover:shadow-md p-4 rounded-lg border-2 border-gray-300 text-left transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-medium mb-1">競合他社の方が安いと言われた</div>
                        </div>
                        <div className="text-2xl text-gray-400">→</div>
                      </div>
                    </button>
                    
                    <button className="w-full bg-white hover:shadow-md p-4 rounded-lg border-2 border-gray-300 text-left transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-medium mb-1">決裁者がいないと言われた</div>
                        </div>
                        <div className="text-2xl text-gray-400">→</div>
                      </div>
                    </button>
                    
                    <button className="w-full bg-white hover:shadow-md p-4 rounded-lg border-2 border-gray-300 text-left transition-all duration-200 ring-2 ring-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-medium mb-1">システムトラブルのクレーム</div>
                          <div className="flex items-center space-x-2">
                            <span className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-sm text-red-600">要注意</span>
                          </div>
                        </div>
                        <div className="text-2xl text-gray-400">→</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === 'database' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">ナレッジDB</h1>
                <p className="text-gray-600 mt-2">データアップロードとテキスト入力でナレッジベースを構築</p>
              </div>

              {/* アップロードエリア */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* ファイルアップロード */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">📁 ファイルアップロード</h2>
                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center bg-purple-50">
                    <div className="text-4xl mb-4">📄</div>
                    <p className="text-gray-700 mb-2 font-medium">事業資料をアップロード</p>
                    <p className="text-sm text-gray-600 mb-4">PDF、Word、Excel、PowerPointファイル対応</p>
                    <label className="bg-purple-500 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-purple-600 transition-colors inline-block">
                      <input 
                        type="file" 
                        multiple 
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      />
                      📂 ファイル選択
                    </label>
                  </div>
                </div>

                {/* テキスト入力 */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 テキスト入力</h2>
                  <textarea 
                    rows="12"
                    placeholder="製品の特徴、サービス内容、価格情報、操作方法、よくある問題と解決策など、ナレッジとして活用したい情報を入力してください。

例：
- 製品名：○○システム
- 価格：月額50,000円〜
- 機能：顧客管理、売上分析、レポート作成
- サポート：平日9-18時
- 導入期間：約2週間
- 実績：1000社以上の導入実績..."
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-vertical"
                  />
                  <Button className="w-full mt-4">🤖 テキストからナレッジ生成</Button>
                </div>
              </div>

              {/* 既存ナレッジ一覧 */}
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">登録済みナレッジ</h2>
                  <div className="flex gap-3">
                    <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option>全カテゴリ</option>
                      <option>製品情報</option>
                      <option>価格・契約</option>
                      <option>技術情報</option>
                      <option>サポート</option>
                    </select>
                    <input
                      type="text"
                      placeholder="ナレッジを検索..."
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  <div className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">製品情報</span>
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">PDF</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">Yarisugiシステム概要資料</h3>
                        <p className="text-sm text-gray-600">システムの基本機能、価格体系、導入事例を含む包括的な資料。営業活動で最も利用頻度の高いドキュメント。</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="secondary">編集</Button>
                        <Button size="sm" variant="secondary">削除</Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span>アップロード日: 2024-01-10</span> • <span>ファイルサイズ: 2.3MB</span>
                    </div>
                  </div>

                  <div className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">価格・契約</span>
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">テキスト</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">料金体系と契約条件</h3>
                        <p className="text-sm text-gray-600">基本料金、オプション料金、支払い条件、契約期間、解約条件などの詳細情報。顧客からの価格に関する質問への回答に使用。</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="secondary">編集</Button>
                        <Button size="sm" variant="secondary">削除</Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span>登録日: 2024-01-08</span> • <span>文字数: 1,250文字</span>
                    </div>
                  </div>

                  <div className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">技術情報</span>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Word</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">API連携仕様書</h3>
                        <p className="text-sm text-gray-600">外部システムとのAPI連携に関する技術仕様、連携可能なシステム一覧、設定方法などの技術文書。</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="secondary">編集</Button>
                        <Button size="sm" variant="secondary">削除</Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span>アップロード日: 2024-01-05</span> • <span>ファイルサイズ: 1.8MB</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    全 28 件のナレッジが登録されています
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary">前へ</Button>
                    <Button size="sm" variant="secondary">次へ</Button>
                  </div>
                </div>
              </div>

              {/* 説明 */}
              <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-600">🤖</span>
                  <h5 className="font-semibold text-purple-800">ナレッジDB機能について</h5>
                </div>
                <p className="text-purple-700 text-sm mb-2">
                  アップロードされたファイルやテキストをAIが解析し、検索しやすい形でナレッジベースに蓄積します。
                </p>
                <ul className="text-purple-700 text-sm space-y-1">
                  <li>• ファイル：PDF、Word、Excel、PowerPointから情報を抽出・構造化</li>
                  <li>• テキスト：入力内容を自動でカテゴライズして保存</li>
                  <li>• 検索：キーワード検索、カテゴリ検索で必要な情報を素早く発見</li>
                  <li>• FAQ連携：ナレッジからFAQを自動生成することも可能</li>
                </ul>
              </div>
            </div>
          )}

          {activePage === 'profile' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">自社情報・提案内容管理</h1>
                <p className="text-gray-600 mt-2">自社の基本情報と提案内容を管理します</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <form className="space-y-8">
                  {/* 自社情報 */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b-2 border-gray-200">自社情報</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">自社名</label>
                        <input 
                          type="text" 
                          placeholder="例：株式会社SKYVILLAGE"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">自己紹介文（あいさつ文）</label>
                        <textarea 
                          rows="3" 
                          placeholder="例：私たちは◯◯業界に特化した業務改善サービスを提供しています..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">サービス構成</label>
                        <textarea 
                          rows="2" 
                          placeholder="例：Yarisugi事務DX、広告DX、営業支援、自動レポート作成など"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">過去の導入実績・事例</label>
                        <textarea 
                          rows="2" 
                          placeholder="例：◯◯工務店様での導入により、見積もり作成時間を50%短縮"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 提案内容 */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b-2 border-gray-200">提案内容</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">提案目的</label>
                        <input 
                          type="text" 
                          placeholder="例：営業効率の改善、CV率向上、現場情報の一元化など"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">提案内容（1）</label>
                          <input 
                            type="text" 
                            placeholder="例：Yarisugi営業の導入による顧客対応の自動化"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">想定金額（1）</label>
                          <input 
                            type="text" 
                            placeholder="例：月額10万円＋初期費用25万円"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">提案資料URL（1）</label>
                        <input 
                          type="url" 
                          placeholder="例：https://drive.google.com/file/d/xxxxx/view"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">提案内容（2）</label>
                          <input 
                            type="text" 
                            placeholder="例：レポート自動生成ツールの提供による提案書作成時間の短縮"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">想定金額（2）</label>
                          <input 
                            type="text" 
                            placeholder="例：月額3万円＋初期費用10万円"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">提案資料URL（2）</label>
                        <input 
                          type="url" 
                          placeholder="例：https://drive.google.com/file/d/yyyyy/view"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button type="submit" size="md">保存する</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activePage === 'idManage' && (
            <div className="max-w-xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h1 className="text-2xl font-bold mb-4">ID追加・プラン変更</h1>
                <label className="block font-semibold mb-2">追加したいID数を選んでください：</label>
                <select
                  value={selectedCount}
                  onChange={(e) => setSelectedCount(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
                >
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} ID（¥{n * 3500}）
                    </option>
                  ))}
                </select>
                <Button onClick={handleCheckout}>決済に進む</Button>
              </div>

              {/* モーダル表示（5ID以上） */}
              {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-white max-w-md mx-auto rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold mb-2 text-blue-700">
                      アドバンスプランの方がお得です！
                    </h3>
                    <div className="text-gray-700 mb-4">
                      選択された {selectedCount} ID の追加は ¥{selectedCount * 3500}になります。
                      <br />
                      アドバンスプラン（月額 ¥79,800）なら…
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>初期付与 5ID つき！</li>
                        <li>ファイルクレジット 500pt付与</li>
                        <li>データベース機能が利用可能</li>
                      </ul>
                    </div>
                    <div className="flex justify-between items-center mt-6">
                      <button
                        onClick={() => setShowModal(false)}
                        className="text-gray-600 hover:underline"
                      >
                        このまま追加する
                      </button>
                      <button
                        onClick={() => alert('アドバンスプランに変更します')}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded font-semibold"
                      >
                        アドバンスプランに変更する
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activePage === 'featureRequest' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h1 className="text-2xl font-bold mb-2">💬 ご要望フォーム</h1>
                <p className="text-gray-700 mb-6">
                  「こんな機能があったらいいな〜」を気軽に書いてください！<br />
                  思いつきでもOK、あなたのアイデアがサービスを育てます 🚀
                </p>
                <form className="space-y-6">
                  {/* テキストエリア */}
                  <div>
                    <label className="block font-medium mb-1">📝 どんな機能が欲しいですか？</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="例：FAQをチャット形式で表示したい、PDFから自動でナレッジ化したい など"
                    />
                  </div>
                  {/* 緊急度 */}
                  <div>
                    <label className="block font-medium mb-1">⭐ 緊急度</label>
                    <div className="space-y-1">
                      <label className="block">
                        <input type="radio" name="priority" value="high" className="mr-2" /> すぐ欲しい！
                      </label>
                      <label className="block">
                        <input type="radio" name="priority" value="medium" className="mr-2" /> そのうち欲しい
                      </label>
                      <label className="block">
                        <input type="radio" name="priority" value="idea" className="mr-2" /> アイデアとして共有
                      </label>
                    </div>
                  </div>
                  {/* 添付ファイル */}
                  <div>
                    <label className="block font-medium mb-1">📎 添付ファイル（任意）</label>
                    <input 
                      type="file" 
                      className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                    />
                  </div>
                  {/* 送信ボタン */}
                  <div>
                    <button
                      type="submit"
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-2 rounded shadow transition-colors"
                    >
                      ご要望を送信する
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* メール作成モーダル */}
          {showEmailComposer && selectedProcess && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-blue-500" />
                      メール作成 - {selectedProcess.name}
                    </h2>
                    <button
                      onClick={() => setShowEmailComposer(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">宛先</label>
                      <input
                        type="email"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        defaultValue={customerForm.email}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        defaultValue={`【${selectedProcess.name}】のご案内`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">テンプレート</label>
                      <select className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500">
                        <option>自動生成テンプレート（AI推奨）</option>
                        <option>標準テンプレート</option>
                        <option>カスタムテンプレート</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
                      <textarea
                        className="w-full p-3 border rounded h-64 focus:ring-2 focus:ring-blue-500"
                        defaultValue={`${customerForm.customerName || ''}様

いつもお世話になっております。
${customerForm.salesPerson || ''}です。

${selectedProcess.name}についてご連絡させていただきました。

[AIが商談履歴から自動生成した内容がここに挿入されます]

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">添付ファイル</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">ファイルをドラッグ&ドロップまたは</p>
                        <button className="text-sm text-blue-600 hover:text-blue-800">ファイルを選択</button>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <Brain className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">AI分析による推奨事項</p>
                          <p className="text-sm text-blue-700 mt-1">
                            前回の商談内容から、{selectedProcess.name}に関する具体的な提案内容を自動生成しました。
                            送信前に内容をご確認ください。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEmailComposer(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    下書き保存
                  </button>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    送信
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LINE作成モーダル */}
          {showLineComposer && selectedProcess && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-green-500" />
                      LINE作成 - {selectedProcess.name}
                    </h2>
                    <button
                      onClick={() => setShowLineComposer(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">送信先: {customerForm.customerName || '-'}</p>
                      <p className="text-sm text-gray-600">LINE ID: {customerForm.lineId || '-'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">メッセージタイプ</label>
                      <select className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500">
                        <option>テキストメッセージ</option>
                        <option>画像付きメッセージ</option>
                        <option>リッチメッセージ</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">メッセージ内容</label>
                      <textarea
                        className="w-full p-3 border rounded h-48 focus:ring-2 focus:ring-green-500"
                        defaultValue={`${customerForm.customerName || ''}様

お疲れさまです！😊

${selectedProcess.name}の件でご連絡させていただきました。

[商談履歴に基づく内容]

ご都合の良い時にご確認いただけますと幸いです。
何かご不明な点がございましたら、お気軽にメッセージください！`}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center">
                        <Smile className="w-4 h-4 mr-2" />
                        スタンプ追加
                      </button>
                      <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center">
                        <Image className="w-4 h-4 mr-2" />
                        画像追加
                      </button>
                      <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center">
                        <Paperclip className="w-4 h-4 mr-2" />
                        ファイル添付
                      </button>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <Brain className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-900">AI推奨</p>
                          <p className="text-sm text-green-700 mt-1">
                            LINEでのコミュニケーションはカジュアルに。絵文字を使って親しみやすさを演出しています。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t flex justify-end space-x-3">
                  <button
                    onClick={() => setShowLineComposer(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    下書き保存
                  </button>
                  <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    送信
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 営業プロセス設定モーダル */}
          {showProcessSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">営業プロセス設定</h2>
                    <button
                      onClick={() => setShowProcessSettings(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                  {/* 契約想定日時 */}
                  <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">契約想定日時</h3>
                          <p className="text-sm text-gray-600">目標とする契約締結日を設定してください</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">残り日数</p>
                        <p className="text-2xl font-bold text-blue-600">45日</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <input
                        type="date"
                        className="flex-1 px-4 py-3 text-lg border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        defaultValue="2025-09-15"
                      />
                      <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        日付を更新
                      </button>
                    </div>
                  </div>

                  {/* テンプレート選択 */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">テンプレートから選択</h3>
                      <button
                        onClick={() => setShowTemplateSaveModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        現在の設定をテンプレートに保存
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {processTemplates.map(template => (
                        <div key={template.id} className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer relative">
                          {!template.isDefault && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplate(template.id);
                              }}
                              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <h4 className="font-medium mb-2">{template.name}</h4>
                          {template.isDefault && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">デフォルト</span>
                          )}
                          <div className="space-y-1 mt-2">
                            {template.steps.map((step, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-600">
                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2">
                                  {index + 1}
                                </div>
                                {step}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => applyProcessTemplate(template)}
                            className="mt-3 w-full px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                          >
                            適用
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-medium mb-3">カスタム設定</h3>
                    <div className="space-y-3">
                      {salesProcess.map((step, index) => (
                        <div key={step.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <select
                            value={step.type}
                            onChange={(e) => updateProcessStep(step.id, 'type', e.target.value)}
                            className="px-3 py-2 border rounded"
                          >
                            {processTypes.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => updateProcessStep(step.id, 'name', e.target.value)}
                            placeholder="ステップ名"
                            className="flex-1 px-3 py-2 border rounded"
                          />
                          <input
                            type="date"
                            value={step.targetDate}
                            onChange={(e) => updateProcessStep(step.id, 'targetDate', e.target.value)}
                            className="px-3 py-2 border rounded"
                          />
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={step.reminder}
                              onChange={(e) => updateProcessStep(step.id, 'reminder', e.target.checked)}
                              className="mr-2"
                            />
                            <Bell className="w-4 h-4 text-gray-500" />
                          </label>
                          <button
                            onClick={() => removeProcessStep(step.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={addProcessStep}
                      className="mt-3 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 w-full flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      ステップを追加
                    </button>
                  </div>
                </div>

                <div className="p-6 border-t flex justify-end space-x-3">
                  <button
                    onClick={() => setShowProcessSettings(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => setShowProcessSettings(false)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* テンプレート保存モーダル */}
          {showTemplateSaveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-md p-6">
                <h3 className="text-lg font-bold mb-4">テンプレートとして保存</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    テンプレート名
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="例: カスタム営業プロセス"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">保存されるプロセス:</p>
                  <div className="bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
                    {salesProcess.filter(p => p.name).map((process, index) => (
                      <div key={process.id} className="flex items-center text-sm text-gray-700 mb-1">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs mr-2">
                          {index + 1}
                        </div>
                        {process.name}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowTemplateSaveModal(false);
                      setNewTemplateName('');
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveAsTemplate}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 顧客作成・編集フォームモーダル */}
          {showCustomerForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <h3 className="text-lg font-bold mb-4">
                  {editingCustomer ? '顧客情報編集' : '新規顧客登録'}
                </h3>
                
                <form onSubmit={handleSubmitCustomer} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        会社名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerForm.companyName}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, companyName: e.target.value }))}
                        required
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="株式会社サンプル"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        担当者名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerForm.customerName}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, customerName: e.target.value }))}
                        required
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="田中太郎"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        所在地
                      </label>
                      <input
                        type="text"
                        value={customerForm.location}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="東京都渋谷区"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        業種
                      </label>
                      <select
                        value={customerForm.industry}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, industry: e.target.value }))}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">選択してください</option>
                        {industryOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        サイトURL
                      </label>
                      <input
                        type="url"
                        value={customerForm.siteUrl}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, siteUrl: e.target.value }))}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        メールアドレス
                      </label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="contact@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LINE ID
                      </label>
                      <input
                        type="text"
                        value={customerForm.lineId}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, lineId: e.target.value }))}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="example_line_id"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        営業担当者
                      </label>
                      <input
                        type="text"
                        value={customerForm.salesPerson}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, salesPerson: e.target.value }))}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="山田花子"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ステータス
                      </label>
                      <select
                        value={customerForm.status}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        {customerStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SNS運用状況
                      </label>
                      <select
                        value={customerForm.snsStatus}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, snsStatus: e.target.value }))}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">選択してください</option>
                        {snsStatusOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerForm(false);
                        resetCustomerForm();
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      {editingCustomer ? '更新' : '登録'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YarisugiDashboard;