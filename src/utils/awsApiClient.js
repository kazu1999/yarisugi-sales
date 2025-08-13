// AWS API Gateway クライアント

import { awsConfig } from './awsConfig';
import { getAuthToken } from './cognitoAuth';

class AwsApiClient {
  constructor() {
    this.baseUrl = awsConfig.apiGateway.endpoint;
    this.region = awsConfig.apiGateway.region;
  }

  // 認証トークンを取得
  async getAuthToken() {
    try {
      const token = await getAuthToken();
      return token;
    } catch (error) {
      console.error('認証トークン取得エラー:', error);
      return null;
    }
  }

  // APIリクエストを実行
  async request(endpoint, options = {}) {
    try {
      const token = await this.getAuthToken();
      console.log('🔑 認証トークン:', token ? '取得済み' : '未取得');
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const config = {
        method: 'GET',
        headers: {
          ...defaultHeaders,
          ...options.headers
        },
        ...options
      };

      const url = `${this.baseUrl}${endpoint}`;
      console.log('🌐 API Request:', { url, method: config.method, hasAuth: !!token });
      console.log('🔑 Authorization Header:', token ? `Bearer ${token.substring(0, 20)}...` : 'なし');

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 API Response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ API Request Error:', error);
      throw error;
    }
  }

  // ヘルスチェックAPI
  async healthCheck() {
    return this.request('/health');
  }

  // ユーザー関連API
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateUserProfile(updates) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // 顧客関連API
  async getCustomers() {
    console.log('🌐 GET /customers リクエスト開始');
    try {
      const result = await this.request('/customers');
      console.log('✅ GET /customers 成功:', result);
      return result;
    } catch (error) {
      console.error('❌ GET /customers エラー:', error);
      throw error;
    }
  }

  async getCustomer(customerId) {
    return this.request(`/customers/${customerId}`);
  }

  async createCustomer(customerData) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }

  async updateCustomer(customerId, customerData) {
    return this.request(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(customerData)
    });
  }

  async deleteCustomer(customerId) {
    return this.request(`/customers/${customerId}`, {
      method: 'DELETE'
    });
  }

  // FAQ関連API
  async getFaqs() {
    return this.request('/faqs');
  }

  async createFaq(faqData) {
    return this.request('/faqs', {
      method: 'POST',
      body: JSON.stringify(faqData)
    });
  }

  async updateFaq(faqId, faqData) {
    return this.request(`/faqs/${faqId}`, {
      method: 'PUT',
      body: JSON.stringify(faqData)
    });
  }

  async deleteFaq(faqId) {
    return this.request(`/faqs/${faqId}`, {
      method: 'DELETE'
    });
  }

  // ナレッジベース関連API
  async getKnowledge() {
    return this.request('/knowledge');
  }

  async createKnowledge(knowledgeData) {
    return this.request('/knowledge', {
      method: 'POST',
      body: JSON.stringify(knowledgeData)
    });
  }

  async updateKnowledge(knowledgeId, knowledgeData) {
    return this.request(`/knowledge/${knowledgeId}`, {
      method: 'PUT',
      body: JSON.stringify(knowledgeData)
    });
  }

  async deleteKnowledge(knowledgeId) {
    return this.request(`/knowledge/${knowledgeId}`, {
      method: 'DELETE'
    });
  }

  // 営業プロセス関連API
  async getSalesProcesses() {
    return this.request('/sales-processes');
  }

  async createSalesProcess(processData) {
    return this.request('/sales-processes', {
      method: 'POST',
      body: JSON.stringify(processData)
    });
  }

  async updateSalesProcess(processId, processData) {
    return this.request(`/sales-processes/${processId}`, {
      method: 'PUT',
      body: JSON.stringify(processData)
    });
  }

  async deleteSalesProcess(processId) {
    return this.request(`/sales-processes/${processId}`, {
      method: 'DELETE'
    });
  }

  // データ同期API
  async syncData(localData) {
    return this.request('/sync', {
      method: 'POST',
      body: JSON.stringify(localData)
    });
  }

  async getServerData() {
    return this.request('/sync');
  }
}

// シングルトンインスタンス
export const awsApiClient = new AwsApiClient(); 