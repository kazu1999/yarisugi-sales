import React, { useState, useEffect } from 'react';
import { Upload, FileText, Music, Trash2, Download, Eye, Plus, X } from 'lucide-react';
import { awsApiClient } from '../../../utils/awsApiClient';

const FileManagementTab = ({ customerId, currentUser }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetail, setShowFileDetail] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    fileName: '',
    fileType: 'pdf',
    fileContent: null
  });

  useEffect(() => {
    console.log('FileManagementTab: customerId =', customerId);
    console.log('FileManagementTab: currentUser =', currentUser);
    if (customerId) {
      fetchFiles();
    }
  }, [customerId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await awsApiClient.request(`/files?customerId=${customerId}`, 'GET');
      
      if (response.success) {
        setFiles(response.files || []);
      }
    } catch (error) {
      console.error('ファイル一覧の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadForm.fileContent || !uploadForm.fileName) {
      alert('ファイルを選択してください');
      return;
    }

    try {
      setUploading(true);
      
      // ファイルをBase64エンコード
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = reader.result.split(',')[1];
        
        const response = await awsApiClient.request('/files/upload', 'POST', {
          customerId,
          fileName: uploadForm.fileName,
          fileType: uploadForm.fileType,
          fileContent: base64Content,
          userId: currentUser?.userId || 'unknown'
        });

        if (response.success) {
          alert('ファイルが正常にアップロードされました');
          setShowUploadModal(false);
          setUploadForm({ fileName: '', fileType: 'pdf', fileContent: null });
          fetchFiles(); // 一覧を更新
        } else {
          alert('アップロードに失敗しました');
        }
      };
      
      reader.readAsDataURL(uploadForm.fileContent);
    } catch (error) {
      console.error('ファイルアップロードエラー:', error);
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!confirm('このファイルを削除しますか？')) return;

    try {
      const response = await awsApiClient.request(`/files/${fileId}`, 'DELETE');

      if (response.success) {
        alert('ファイルが削除されました');
        fetchFiles(); // 一覧を更新
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('ファイル削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleFileDetail = async (fileId) => {
    try {
      console.log('ファイル詳細取得開始:', { fileId, customerId });
      const response = await awsApiClient.request(`/files/${fileId}?customerId=${customerId}`, 'GET');
      console.log('ファイル詳細取得レスポンス:', response);

      if (response.success) {
        setSelectedFile(response.file);
        setShowFileDetail(true);
        console.log('ファイル詳細モーダルを開きました');
      } else {
        console.error('ファイル詳細取得失敗:', response);
      }
    } catch (error) {
      console.error('ファイル詳細の取得に失敗しました:', error);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadForm(prev => ({
        ...prev,
        fileName: file.name,
        fileContent: file,
        fileType: file.type.includes('pdf') ? 'pdf' : 
                  file.type.includes('audio') ? 'audio' : 'pdf'
      }));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'pdf') return <FileText className="w-6 h-6 text-red-500" />;
    if (fileType.includes('audio')) return <Music className="w-6 h-6 text-blue-500" />;
    return <FileText className="w-6 h-6 text-gray-500" />;
  };

  if (!customerId) {
    return (
      <div className="text-center text-gray-500 py-8">
        顧客が選択されていません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">📁 ファイル管理</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          ファイルアップロード
        </button>
      </div>

      {/* ファイル一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">アップロード済みファイル</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ファイルがありません
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.fileId} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.fileType)}
                      <div>
                        <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>{formatDate(file.uploadedAt)}</span>
                          <span className="capitalize">{file.fileType}</span>
                        </div>
                        {file.summary && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {file.summary}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          console.log('目のマーククリック:', file.fileId);
                          handleFileDetail(file.fileId);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="詳細表示"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFileDelete(file.fileId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* アップロードモーダル */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">ファイルアップロード</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* ファイルタイプ選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ファイルタイプ
                </label>
                <select
                  value={uploadForm.fileType}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, fileType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="pdf">PDF</option>
                  <option value="audio">音声ファイル</option>
                </select>
              </div>

              {/* ファイル名入力 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ファイル名
                </label>
                <input
                  type="text"
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, fileName: e.target.value }))}
                  placeholder="ファイル名を入力"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* ファイルアップロードエリア */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ファイル選択
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    ファイルをドラッグ&ドロップまたは
                  </p>
                  <input
                    type="file"
                    accept={uploadForm.fileType === 'pdf' ? '.pdf' : '.mp3,.wav,.m4a,.aac'}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setUploadForm(prev => ({
                          ...prev,
                          fileName: file.name,
                          fileContent: file
                        }));
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    ファイルを選択
                  </label>
                  {uploadForm.fileContent && (
                    <p className="text-sm text-green-600 mt-2">
                      選択済み: {uploadForm.fileContent.name}
                    </p>
                  )}
                </div>
              </div>

              {/* アップロードボタン */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={uploading || !uploadForm.fileContent}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'アップロード中...' : 'アップロード'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ファイル詳細モーダル */}
      {console.log('モーダル表示状態:', { showFileDetail, selectedFile })}
      {showFileDetail && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">ファイル詳細</h3>
              <button
                onClick={() => setShowFileDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile.fileType)}
                <div>
                  <h4 className="text-lg font-medium">{selectedFile.fileName}</h4>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.fileSize)} • {formatDate(selectedFile.uploadedAt)}
                  </p>
                </div>
              </div>

              {selectedFile.summary && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">AI要約</h5>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedFile.summary}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    if (selectedFile.downloadUrl) {
                      window.open(selectedFile.downloadUrl, '_blank');
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  ダウンロード
                </button>
                <button
                  onClick={() => setShowFileDetail(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagementTab;
