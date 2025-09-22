import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Target, 
  Phone, 
  MessageCircle, 
  FileText, 
  Handshake, 
  CheckCircle, 
  Clock,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Loader2
} from 'lucide-react';
import { awsApiClient } from '../../../utils/awsApiClient';

const SalesFlowTab = ({ customerId, customerData }) => {
  const [salesStages, setSalesStages] = useState([]);
  const [currentStage, setCurrentStage] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium'
  });
  const [error, setError] = useState(null);

  // データ取得
  useEffect(() => {
    if (customerId) {
      fetchSalesFlowData();
    }
  }, [customerId]);

  const fetchSalesFlowData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await awsApiClient.request('/sales-flow', {
        method: 'POST',
        body: JSON.stringify({
          action: 'get',
          customerId: customerId
        })
      });

      if (response.success) {
        setCurrentStage(response.data.currentStage || 'lead_generation');
        setTasks(response.data.tasks || []);
      } else {
        setError(response.error || 'データの取得に失敗しました');
      }
    } catch (error) {
      console.error('営業フローデータ取得エラー:', error);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 営業ステージの定義
  const stageDefinitions = [
    {
      id: 'lead_generation',
      name: 'リード獲得',
      description: '新規見込み顧客の獲得',
      icon: Users,
      color: 'bg-blue-100 text-blue-800',
      nextStage: 'qualification'
    },
    {
      id: 'qualification',
      name: 'リード選別',
      description: '見込み顧客の評価・選別',
      icon: Target,
      color: 'bg-purple-100 text-purple-800',
      nextStage: 'approach'
    },
    {
      id: 'approach',
      name: 'アプローチ',
      description: '初回接触・関係構築',
      icon: Phone,
      color: 'bg-green-100 text-green-800',
      nextStage: 'needs_analysis'
    },
    {
      id: 'needs_analysis',
      name: 'ニーズヒアリング',
      description: '課題・ニーズの詳細確認',
      icon: MessageCircle,
      color: 'bg-yellow-100 text-yellow-800',
      nextStage: 'proposal'
    },
    {
      id: 'proposal',
      name: '提案・プレゼン',
      description: '解決策の提案・プレゼンテーション',
      icon: FileText,
      color: 'bg-orange-100 text-orange-800',
      nextStage: 'closing'
    },
    {
      id: 'closing',
      name: 'クロージング',
      description: '契約交渉・条件調整',
      icon: Handshake,
      color: 'bg-red-100 text-red-800',
      nextStage: 'contract'
    },
    {
      id: 'contract',
      name: '受注・契約',
      description: '契約締結・受注確定',
      icon: CheckCircle,
      color: 'bg-emerald-100 text-emerald-800',
      nextStage: 'follow_up'
    },
    {
      id: 'follow_up',
      name: 'アフターフォロー',
      description: '納品・フォロー・継続関係構築',
      icon: TrendingUp,
      color: 'bg-teal-100 text-teal-800',
      nextStage: null
    }
  ];

  useEffect(() => {
    loadSalesFlowData();
  }, [customerId]);

  const loadSalesFlowData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await awsApiClient.request('/sales-flow', {
        method: 'POST',
        body: JSON.stringify({
          action: 'get',
          customerId: customerId
        })
      });

      if (response.success) {
        setCurrentStage(response.data.currentStage || 'lead_generation');
        setTasks(response.data.tasks || []);
      } else {
        setError(response.error || 'データの取得に失敗しました');
        // フォールバック用のモックデータ
        const mockData = {
          currentStage: 'needs_analysis',
          tasks: [
            {
              id: 1,
              title: '課題ヒアリング実施',
              description: '顧客の現在の課題を詳細にヒアリング',
              dueDate: '2025-09-25',
              priority: 'high',
              completed: false
            },
            {
              id: 2,
              title: '競合他社の調査',
              description: '顧客が検討している競合他社の情報収集',
              dueDate: '2025-09-22',
              priority: 'medium',
              completed: false
            },
            {
              id: 3,
              title: '初回アプローチ完了',
              description: '電話での初回接触を実施',
              dueDate: '2025-09-20',
              priority: 'high',
              completed: true
            }
          ]
        };
        
        setCurrentStage(mockData.currentStage);
        setTasks(mockData.tasks);
      }
    } catch (error) {
      console.error('営業フローデータの読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStageInfo = () => {
    return stageDefinitions.find(stage => stage.id === currentStage);
  };

  const getNextStageInfo = () => {
    const current = getCurrentStageInfo();
    if (current && current.nextStage) {
      return stageDefinitions.find(stage => stage.id === current.nextStage);
    }
    return null;
  };

  const moveToNextStage = async () => {
    const nextStage = getNextStageInfo();
    if (nextStage) {
      try {
        setLoading(true);
        setError(null);
        
        const response = await awsApiClient.request('/sales-flow', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_stage',
            customerId: customerId,
            stage: nextStage.id,
            note: `ステージを${nextStage.name}に変更`
          })
        });

        if (response.success) {
          setCurrentStage(nextStage.id);
          console.log(`ステージを ${nextStage.name} に移動しました`);
        } else {
          setError(response.error || 'ステージの更新に失敗しました');
        }
      } catch (error) {
        console.error('ステージ移動エラー:', error);
        setError('ステージの更新に失敗しました');
      } finally {
        setLoading(false);
      }
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await awsApiClient.request('/sales-flow', {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_task',
          customerId: customerId,
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          priority: newTask.priority
        })
      });

      if (response.success) {
        // タスクを再取得
        await loadSalesFlowData();
        setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
        setShowAddTask(false);
      } else {
        setError(response.error || 'タスクの追加に失敗しました');
      }
    } catch (error) {
      console.error('タスク追加エラー:', error);
      setError('タスクの追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId) => {
    try {
      setLoading(true);
      setError(null);
      
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const response = await awsApiClient.request('/sales-flow', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_task',
          customerId: customerId,
          taskId: taskId,
          updates: {
            completed: !task.completed
          }
        })
      });

      if (response.success) {
        setTasks(prev => 
          prev.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        );
      } else {
        setError(response.error || 'タスクの更新に失敗しました');
      }
    } catch (error) {
      console.error('タスク更新エラー:', error);
      setError('タスクの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await awsApiClient.request('/sales-flow', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_task',
          customerId: customerId,
          taskId: taskId
        })
      });

      if (response.success) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
      } else {
        setError(response.error || 'タスクの削除に失敗しました');
      }
    } catch (error) {
      console.error('タスク削除エラー:', error);
      setError('タスクの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '中';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && !tasks.find(t => t.dueDate === dueDate)?.completed;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentStageInfo = getCurrentStageInfo();
  const nextStageInfo = getNextStageInfo();

  return (
    <div className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">営業フロー管理</h2>
          <p className="text-gray-600">顧客の営業プロセスを管理・追跡</p>
        </div>
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500">進捗可視化</span>
        </div>
      </div>

      {/* 現在のステージ */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">現在のステージ</h3>
          {nextStageInfo && (
            <button
              onClick={moveToNextStage}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  処理中...
                </>
              ) : (
                '次のステージへ'
              )}
            </button>
          )}
        </div>
        
        {currentStageInfo && (
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${currentStageInfo.color}`}>
              <currentStageInfo.icon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {currentStageInfo.name}
              </h4>
              <p className="text-gray-600">{currentStageInfo.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* タスク管理 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">タスク管理</h3>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>タスク追加</span>
          </button>
        </div>

        {/* タスク追加フォーム */}
        {showAddTask && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">新しいタスク</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="タスクタイトル"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                placeholder="タスクの詳細"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
              <div className="flex space-x-3">
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">優先度: 低</option>
                  <option value="medium">優先度: 中</option>
                  <option value="high">優先度: 高</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={addTask}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      追加中...
                    </>
                  ) : (
                    '追加'
                  )}
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* タスクリスト */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center space-x-3 p-4 border rounded-lg ${
                task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
              }`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  task.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {task.completed && <CheckCircle className="w-3 h-3" />}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                    {getPriorityText(task.priority)}
                  </span>
                  {isOverdue(task.dueDate) && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(task.dueDate)}</span>
                  </div>
                  {isOverdue(task.dueDate) && (
                    <span className="text-red-500 font-medium">期限超過</span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => deleteTask(task.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>タスクがありません</p>
              <p className="text-sm">新しいタスクを追加してください</p>
            </div>
          )}
        </div>
      </div>

      {/* 営業フロー全体の可視化 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">営業フロー全体</h3>
        <div className="overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
            {stageDefinitions.map((stage, index) => {
              const isActive = stage.id === currentStage;
              const isCompleted = stageDefinitions.findIndex(s => s.id === currentStage) > index;
              
              return (
                <div key={stage.id} className="flex flex-col items-center space-y-2 min-w-[120px]">
                  <div className={`p-3 rounded-lg ${
                    isActive 
                      ? stage.color 
                      : isCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    <stage.icon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h4 className={`text-sm font-medium ${
                      isActive ? 'text-gray-900' : isCompleted ? 'text-green-800' : 'text-gray-400'
                    }`}>
                      {stage.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{stage.description}</p>
                  </div>
                  {index < stageDefinitions.length - 1 && (
                    <div className={`w-8 h-0.5 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesFlowTab;
