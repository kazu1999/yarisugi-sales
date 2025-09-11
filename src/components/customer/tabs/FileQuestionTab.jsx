import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Clock, User, RefreshCw } from 'lucide-react';
import { awsApiClient } from '../../../utils/awsApiClient';

const FileQuestionTab = ({ file, customerId, currentUser }) => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);

  useEffect(() => {
    if (file && file.fileId) {
      fetchQuestions();
    }
  }, [file]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await awsApiClient.request(
        `/files/questions?fileId=${file.fileId}&customerId=${customerId}`,
        'GET'
      );
      
      if (response.success) {
        setQuestions(response.questions || []);
      }
    } catch (error) {
      console.error('質問履歴の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await awsApiClient.request('/files/question', 'POST', {
        fileId: file.fileId,
        customerId: customerId,
        question: newQuestion.trim(),
        userId: currentUser.userId
      });

      if (response.success) {
        // 新しい質問をリストに追加
        const newQ = {
          questionId: response.questionId,
          question: newQuestion.trim(),
          answer: response.answer,
          createdAt: new Date().toISOString()
        };
        setQuestions(prev => [newQ, ...prev]);
        setNewQuestion('');
      }
    } catch (error) {
      console.error('質問の送信に失敗しました:', error);
      alert('質問の送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateFileText = async () => {
    if (!file || !customerId) return;

    setGeneratingText(true);

    try {
      const response = await awsApiClient.request('/files/generate-text', 'POST', {
        fileId: file.fileId,
        customerId: customerId
      });

      if (response.success) {
        alert('ファイルテキストの生成が完了しました。質問機能が利用可能になりました。');
        // ページをリロードして最新の状態を反映
        window.location.reload();
      } else {
        alert(response.error || 'ファイルテキストの生成に失敗しました');
      }
    } catch (error) {
      console.error('ファイルテキストの生成に失敗しました:', error);
      alert('ファイルテキストの生成に失敗しました。もう一度お試しください。');
    } finally {
      setGeneratingText(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!file) {
    return (
      <div className="p-6 text-center text-gray-500">
        ファイルが選択されていません
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {file.fileName} への質問
            </h3>
          </div>
          <button
            onClick={handleGenerateFileText}
            disabled={generatingText}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingText ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                テキスト生成
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          このファイルの内容について質問してください。AIが回答を生成します。
        </p>
      </div>

      {/* 質問入力フォーム */}
      <div className="border-b border-gray-200 p-4">
        <form onSubmit={handleSubmitQuestion} className="space-y-3">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              質問を入力してください
            </label>
            <textarea
              id="question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="例: この文書の要点は何ですか？"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newQuestion.trim() || submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  質問を送信
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 質問履歴 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>まだ質問がありません</p>
            <p className="text-sm">上記のフォームから質問を送信してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.questionId} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* 質問 */}
                <div className="mb-3">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">質問</p>
                      <p className="text-gray-700">{q.question}</p>
                    </div>
                  </div>
                </div>

                {/* 回答 */}
                <div className="mb-3">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">回答</p>
                      <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                        {q.answer}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 日時 */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(q.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileQuestionTab;
