import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Music, Trash2, Download, Eye, Plus, X, Mic, Square, Play, MessageCircle } from 'lucide-react';
import { awsApiClient } from '../../../utils/awsApiClient';
import FileQuestionTab from './FileQuestionTab';

const FileManagementTab = ({ customerId, currentUser }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetail, setShowFileDetail] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('summary');
  const [dragActive, setDragActive] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    fileType: 'pdf',
    fileContent: null
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    console.log('FileManagementTab: customerId =', customerId);
    console.log('FileManagementTab: currentUser =', currentUser);
    if (customerId) {
      fetchFiles();
    }
  }, [customerId]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await awsApiClient.request(`/files?customerId=${customerId}`, 'GET');
      
      if (response.success) {
        // 重複を除去（fileIdでユニークにする）
        const uniqueFiles = response.files ? response.files.filter((file, index, self) => 
          index === self.findIndex(f => f.fileId === file.fileId)
        ) : [];
        setFiles(uniqueFiles);
      }
    } catch (error) {
      console.error('ファイル一覧の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadForm.fileContent) {
      alert('ファイルを選択してください');
      return;
    }

    try {
      setUploading(true);
      
      // ファイルをBase64エンコード
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = reader.result.split(',')[1];
        
        console.log('アップロード情報:', {
          customerId,
          fileName: uploadForm.fileContent.name,
          fileType: uploadForm.fileType,
          fileSize: uploadForm.fileContent.size,
          fileMimeType: uploadForm.fileContent.type
        });
        
        const response = await awsApiClient.request('/files/upload', 'POST', {
          customerId,
          fileName: uploadForm.fileContent.name,
          fileType: uploadForm.fileType,
          fileContent: base64Content,
          userId: currentUser?.userId || 'unknown'
        });

        if (response.success) {
          alert('ファイルが正常にアップロードされました');
          setShowUploadModal(false);
          setUploadForm({ fileType: 'pdf', fileContent: null });
          resetRecording();
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

  const handleFileUpdate = async () => {
    if (selectedFile && selectedFile.fileId) {
      try {
        console.log('ファイル詳細を再取得中:', selectedFile.fileId);
        const response = await awsApiClient.request(`/files/${selectedFile.fileId}?customerId=${customerId}`, 'GET');
        
        if (response.success) {
          setSelectedFile(response.file);
          console.log('ファイル詳細を更新しました');
        }
      } catch (error) {
        console.error('ファイル詳細の再取得に失敗しました:', error);
      }
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
        fileContent: file,
        fileType: file.type.includes('pdf') ? 'pdf' : 
                  file.type.includes('audio') ? 'audio' : 'pdf'
      }));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '日付不明';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '日付不明' : date.toLocaleString('ja-JP');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      // 最適化された録音設定（Whisper推奨設定）
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,        // 16kHz（Whisper推奨）
          channelCount: 1,          // モノラル
          echoCancellation: true,   // エコーキャンセレーション
          noiseSuppression: true,   // ノイズ抑制
          autoGainControl: true     // 自動ゲイン制御
        } 
      });
      
      // WebM/Opus形式で録音（高圧縮率）
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // WebM形式でBlobを作成
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio({ blob: audioBlob, url: audioUrl });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 録音時間のカウント
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('録音の開始に失敗しました:', error);
      alert('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playRecordedAudio = () => {
    if (recordedAudio) {
      const audio = new Audio(recordedAudio.url);
      audio.play();
    }
  };

  const useRecordedAudio = () => {
    if (recordedAudio) {
      // BlobをFileオブジェクトに変換（WebM形式）
      const file = new File([recordedAudio.blob], `recording_${Date.now()}.webm`, {
        type: 'audio/webm;codecs=opus'
      });
      setUploadForm(prev => ({
        ...prev,
        fileContent: file,
        fileType: 'audio'
      }));
    }
  };

  const resetRecording = () => {
    setRecordedAudio(null);
    setRecordingTime(0);
    if (recordedAudio?.url) {
      URL.revokeObjectURL(recordedAudio.url);
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <FileText className="w-6 h-6 text-gray-500" />;
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
                        <h4 className="font-medium text-gray-900">{file.fileName || 'ファイル名不明'}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>{formatDate(file.uploadedAt)}</span>
                          <span className="capitalize">{file.fileType || 'タイプ不明'}</span>
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

              {/* 音声録音エリア */}
              {uploadForm.fileType === 'audio' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    音声録音
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4">
                    {!isRecording && !recordedAudio && (
                      <div className="text-center">
                        <button
                          onClick={startRecording}
                          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
                        >
                          <Mic className="w-5 h-5" />
                          録音開始
                        </button>
                        <p className="text-sm text-gray-500 mt-2">
                          マイクをクリックして録音を開始してください
                        </p>
                      </div>
                    )}

                    {isRecording && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-4 mb-4">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
                        </div>
                        <button
                          onClick={stopRecording}
                          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center gap-2 mx-auto"
                        >
                          <Square className="w-5 h-5" />
                          録音停止
                        </button>
                      </div>
                    )}

                    {recordedAudio && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-4 mb-4">
                          <button
                            onClick={playRecordedAudio}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            再生
                          </button>
                          <button
                            onClick={useRecordedAudio}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                          >
                            この録音を使用
                          </button>
                          <button
                            onClick={resetRecording}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                          >
                            再録音
                          </button>
                        </div>
                        <p className="text-sm text-green-600">
                          録音完了: {formatTime(recordingTime)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  onClick={() => {
                    setShowUploadModal(false);
                    resetRecording();
                  }}
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
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile.fileType)}
                <div>
                  <h3 className="text-lg font-semibold">{selectedFile.fileName}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.fileSize)} • {formatDate(selectedFile.uploadedAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFileDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* タブナビゲーション */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveDetailTab('summary')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeDetailTab === 'summary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                要約
              </button>
              <button
                onClick={() => setActiveDetailTab('questions')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeDetailTab === 'questions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageCircle className="w-4 h-4 inline mr-2" />
                質問
              </button>
            </div>

            {/* タブコンテンツ */}
            <div className="flex-1 overflow-hidden">
              {activeDetailTab === 'summary' && (
                <div className="p-6 overflow-y-auto h-full">
                  <div className="space-y-4">
                    {selectedFile.summary ? (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">AI要約</h5>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-700 whitespace-pre-wrap">{selectedFile.summary}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>要約が生成されていません</p>
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
              )}

              {activeDetailTab === 'questions' && (
                <div className="h-full">
                  <FileQuestionTab
                    file={selectedFile}
                    customerId={customerId}
                    currentUser={currentUser}
                    onFileUpdate={handleFileUpdate}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagementTab;
