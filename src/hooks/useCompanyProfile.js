import { useState, useEffect } from 'react';
import { awsApiClient } from '../utils/awsApiClient';

export const useCompanyProfile = () => {
  // 基本情報の状態
  const [companyProfile, setCompanyProfile] = useState({
    companyName: '',
    introduction: '',
    services: '',
    achievements: ''
  });

  // 提案内容の状態
  const [proposals, setProposals] = useState([]);

  // ローディング状態
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 基本情報を取得
  const fetchCompanyProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await awsApiClient.request('/company-profile', {
        method: 'GET'
      });

      if (response) {
        setCompanyProfile({
          companyName: response.companyName || '',
          introduction: response.introduction || '',
          services: response.services || '',
          achievements: response.achievements || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
      
      // 404エラーの場合は新規作成のためのデフォルト値を設定
      if (error.message && error.message.includes('404')) {
        setCompanyProfile({
          companyName: '',
          introduction: '',
          services: '',
          achievements: ''
        });
        setError(null); // エラーをクリア
      } else {
        setError('基本情報の取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  // 基本情報を更新
  const updateCompanyProfile = async (profileData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await awsApiClient.request('/company-profile', {
        method: 'PUT',
        body: profileData
      });

      if (response) {
        setCompanyProfile({
          companyName: response.companyName || '',
          introduction: response.introduction || '',
          services: response.services || '',
          achievements: response.achievements || ''
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update company profile:', error);
      setError('基本情報の更新に失敗しました');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 提案内容一覧を取得
  const fetchProposals = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await awsApiClient.request('/company-profile/proposals', {
        method: 'GET'
      });

      if (response && response.proposals) {
        // orderでソート
        const sortedProposals = response.proposals.sort((a, b) => a.order - b.order);
        setProposals(sortedProposals);
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      setError('提案内容の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 提案内容を追加
  const addProposal = async (proposalData) => {
    setLoading(true);
    setError(null);

    try {
      const newOrder = proposals.length + 1;
      const proposalWithOrder = {
        ...proposalData,
        order: newOrder
      };

      const response = await awsApiClient.request('/company-profile/proposals', {
        method: 'POST',
        body: proposalWithOrder
      });

      if (response) {
        // 提案内容一覧を再取得
        await fetchProposals();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to add proposal:', error);
      setError('提案内容の追加に失敗しました');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 提案内容を更新
  const updateProposal = async (proposalId, proposalData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await awsApiClient.request(`/company-profile/proposals/${proposalId}`, {
        method: 'PUT',
        body: proposalData
      });

      if (response) {
        // 提案内容一覧を再取得
        await fetchProposals();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update proposal:', error);
      setError('提案内容の更新に失敗しました');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 提案内容を削除
  const deleteProposal = async (proposalId) => {
    setLoading(true);
    setError(null);

    try {
      await awsApiClient.request(`/company-profile/proposals/${proposalId}`, {
        method: 'DELETE'
      });

      // 提案内容一覧を再取得
      await fetchProposals();

      return { success: true };
    } catch (error) {
      console.error('Failed to delete proposal:', error);
      setError('提案内容の削除に失敗しました');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 提案内容の順序を変更
  const reorderProposals = async (newOrder) => {
    setLoading(true);
    setError(null);

    try {
      // 各提案内容の順序を更新
      const updatePromises = newOrder.map((proposal, index) => {
        return updateProposal(proposal.id, { ...proposal, order: index + 1 });
      });

      await Promise.all(updatePromises);

      // 提案内容一覧を再取得
      await fetchProposals();

      return { success: true };
    } catch (error) {
      console.error('Failed to reorder proposals:', error);
      setError('提案内容の順序変更に失敗しました');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 初期化時にデータを取得
  useEffect(() => {
    fetchCompanyProfile();
    fetchProposals();
  }, []);

  return {
    // 状態
    companyProfile,
    proposals,
    loading,
    error,

    // 関数
    fetchCompanyProfile,
    updateCompanyProfile,
    fetchProposals,
    addProposal,
    updateProposal,
    deleteProposal,
    reorderProposals
  };
};

