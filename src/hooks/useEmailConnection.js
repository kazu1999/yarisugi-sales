import { useState, useEffect, useCallback } from 'react';
import { awsApiClient } from '../utils/awsApiClient';

const useEmailConnection = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await awsApiClient.request('/email/connections', {
        method: 'GET'
      });

      if (response.success) {
        setConnections(response.connections || []);
      } else {
        setError(response.error || '接続一覧の取得に失敗しました。');
      }
    } catch (err) {
      setError('接続一覧の取得中にエラーが発生しました。');
      console.error('Fetch connections error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConnection = useCallback(async (connectionData) => {
    setLoading(true);
    setError('');

    try {
      const response = await awsApiClient.request('/email/save-connection', {
        method: 'POST',
        body: connectionData
      });

      if (response.success) {
        await fetchConnections();
        return { success: true, connectionId: response.connectionId };
      } else {
        setError(response.error || '接続の保存に失敗しました。');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMsg = '接続の保存中にエラーが発生しました。';
      setError(errorMsg);
      console.error('Save connection error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [fetchConnections]);

  const testConnection = async (connectionData) => {
    setLoading(true);
    setError('');

    try {
      const response = await awsApiClient.request('/email/test-connection', {
        method: 'POST',
        body: connectionData
      });

      if (response.success) {
        return { success: true };
      } else {
        setError(response.error || '接続テストに失敗しました。');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMsg = '接続テスト中にエラーが発生しました。';
      setError(errorMsg);
      console.error('Test connection error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async (connectionId, folder = 'INBOX', limit = 50) => {
    setLoading(true);
    setError('');

    try {
      const response = await awsApiClient.request('/email/messages', {
        method: 'GET',
        params: {
          connectionId,
          folder,
          limit
        }
      });

      if (response.success) {
        return { success: true, emails: response.emails || [] };
      } else {
        setError(response.error || 'メール一覧の取得に失敗しました。');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMsg = 'メール一覧の取得中にエラーが発生しました。';
      setError(errorMsg);
      console.error('Fetch emails error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailDetail = async (connectionId, messageId) => {
    setLoading(true);
    setError('');

    try {
      const response = await awsApiClient.request(`/email/messages/${messageId}`, {
        method: 'GET',
        params: { connectionId }
      });

      if (response.success) {
        return { success: true, email: response.email };
      } else {
        setError(response.error || 'メール詳細の取得に失敗しました。');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMsg = 'メール詳細の取得中にエラーが発生しました。';
      setError(errorMsg);
      console.error('Fetch email detail error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // 自動的な接続一覧取得は削除（必要に応じて手動で呼び出し）

  return {
    connections,
    loading,
    error,
    fetchConnections,
    saveConnection,
    testConnection,
    fetchEmails,
    fetchEmailDetail
  };
};

export default useEmailConnection;
