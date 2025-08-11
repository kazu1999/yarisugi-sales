import React from 'react';
import Button from '../common/Button';

const TemplateSaveModal = ({
  showTemplateSaveModal,
  setShowTemplateSaveModal,
  newTemplateName,
  setNewTemplateName,
  salesProcess,
  saveAsTemplate
}) => {
  if (!showTemplateSaveModal) return null;

  return (
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
          <Button 
            variant="secondary"
            onClick={() => {
              setShowTemplateSaveModal(false);
              setNewTemplateName('');
            }}
          >
            キャンセル
          </Button>
          <Button 
            variant="primary"
            onClick={saveAsTemplate}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSaveModal; 