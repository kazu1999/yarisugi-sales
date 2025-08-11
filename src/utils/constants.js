// 業種オプション
export const industryOptions = [
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
export const snsStatusOptions = [
  '積極的に運用中（毎日投稿）',
  '定期的に運用中（週2-3回）',
  'たまに更新（月数回）',
  'アカウントはあるが更新なし',
  'SNS未運用'
];

// ステータスオプション
export const customerStatuses = [
  '新規',
  '商談中',
  '成約',
  '失注'
];

// プロセスタイプ
export const processTypes = [
  { value: 'lead', label: 'リード獲得', icon: 'Users' },
  { value: 'meeting', label: '商談', icon: 'Calendar' },
  { value: 'questionnaire', label: 'アンケート', icon: 'FileText' },
  { value: 'proposal', label: '提案', icon: 'FileText' },
  { value: 'quote', label: '見積もり', icon: 'DollarSign' },
  { value: 'contract', label: '契約', icon: 'Award' },
  { value: 'demo', label: 'デモ', icon: 'Activity' },
  { value: 'follow', label: 'フォローアップ', icon: 'Phone' }
];

// プロセステンプレート
export const defaultProcessTemplates = [
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
];

// アンケート項目のデフォルト
export const defaultQuestionnaireItems = [
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
]; 