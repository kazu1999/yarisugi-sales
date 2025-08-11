import React from 'react';
import { X, Calendar, Plus, Bell, Trash2 } from 'lucide-react';
import Button from '../common/Button';

const ProcessSettingsModal = ({
  showProcessSettings,
  setShowProcessSettings,
  processTemplates,
  salesProcess,
  processTypes,
  addProcessStep,
  removeProcessStep,
  updateProcessStep,
  applyProcessTemplate,
  deleteTemplate,
  setShowTemplateSaveModal
}) => {
  if (!showProcessSettings) return null;

  return (
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
              <Button variant="primary">
                日付を更新
              </Button>
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
          <Button 
            variant="secondary"
            onClick={() => setShowProcessSettings(false)}
          >
            キャンセル
          </Button>
          <Button variant="primary">
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessSettingsModal; 