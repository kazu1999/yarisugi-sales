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
    // 後方互換性のため、古い形式（文字列パラメータ）もサポート
    if (typeof options === 'string') {
      const method = options;
      const body = arguments[2] || null;
      const queryParams = arguments[3] || null;
      options = {
        method,
        ...(body && { body: JSON.stringify(body) }),
        ...(queryParams && { params: queryParams })
      };
    }
    try {
      const token = await this.getAuthToken();
      console.log('🔑 認証トークン:', token ? '取得済み' : '未取得');
      if (!token) {
        console.error('❌ 認証トークンが取得できません。ログインしていない可能性があります。');
      }
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token })
      };

      const config = {
        method: options.method || 'GET',
        headers: {
          ...defaultHeaders,
          ...options.headers
        },
        body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
      };

      // クエリパラメータを処理
      let url = `${this.baseUrl}${endpoint}`;
      if (options.params) {
        const queryString = new URLSearchParams(options.params).toString();
        url += `?${queryString}`;
      }
      
      console.log('🌐 API Request:', { url, method: config.method, hasAuth: !!token });
      console.log('🔑 Authorization Header:', token ? `${token.substring(0, 20)}...` : 'なし');
      if (config.body) {
        console.log('📤 Request Body:', typeof config.body === 'string' ? config.body.substring(0, 200) + '...' : config.body);
      }

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

  async getFaq(faqId) {
    return this.request(`/faqs/${faqId}`);
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

  // FAQチャット関連API
  async sendFaqChatMessage(question) {
    return this.request('/faq-chat', {
      method: 'POST',
      body: JSON.stringify({ question })
    });
  }

  // AI自動生成API
  async generateFaqsFromContent(content, contentType = 'text', saveToDb = false) {
    console.log('🚀 AI生成API呼び出し開始:', { 
      content: content.substring(0, 100) + '...', 
      contentType, 
      saveToDb,
      endpoint: `${this.baseURL}/ai-generate`
    });
    
    try {
      const result = await this.request('/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          content,
          contentType,
          saveToDb
        })
      });
      console.log('✅ AI生成API成功:', result);
      return result;
    } catch (error) {
      console.error('❌ AI生成API エラー:', error);
      throw error;
    }
  }

  // AI自動生成API（URL対応）
  async generateFaqs(data) {
    console.log('🚀 AI生成API呼び出し開始（URL対応）:', { 
      url: data.url || 'N/A',
      content: data.content ? data.content.substring(0, 100) + '...' : 'N/A', 
      contentType: data.contentType || 'text', 
      saveToDb: data.saveToDb || false,
      endpoint: `${this.baseURL}/ai-generate`
    });
    
    try {
      const result = await this.request('/ai-generate', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      console.log('✅ AI生成API成功（URL対応）:', result);
      return result;
    } catch (error) {
      console.error('❌ AI生成APIエラー（URL対応）:', error);
      throw error;
    }
  }

  async generateFaqsFromFile(file, saveToDb = false) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          const contentType = file.type === 'application/pdf' ? 'pdf' : 'text';
          const result = await this.generateFaqsFromContent(content, contentType, saveToDb);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  }

  // ファイル管理関連API
  async uploadFile(data) {
    return this.request('/files/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async uploadUrl(data) {
    return this.request('/files/upload-url', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getFiles(customerId) {
    return this.request(`/files?customerId=${customerId}`, 'GET');
  }

  async getFileDetail(fileId, customerId) {
    return this.request(`/files/${fileId}?customerId=${customerId}`, 'GET');
  }

  async deleteFile(fileId) {
    return this.request(`/files/${fileId}`, 'DELETE');
  }

  async askFileQuestion(data) {
    return this.request('/files/question', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getFileQuestions(customerId) {
    return this.request(`/files/questions?customerId=${customerId}`, 'GET');
  }

  async generateFileText(data) {
    return this.request('/files/generate-text', {
      method: 'POST',
      body: JSON.stringify(data)
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

  // ダッシュボードデータ取得
  async getDashboardData(params = {}) {
    console.log('📊 ダッシュボードデータ取得:', params);
    
    // user_idを認証トークンから取得
    const token = await this.getAuthToken();
    const userId = this.getUserIdFromToken(token);
    
    const requestBody = {
      ...params,
      user_id: userId
    };
    
    return this.request('/dashboard', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  }

  // JWTトークンからユーザーIDを取得
  getUserIdFromToken(token) {
    if (!token) {
      console.log('❌ トークンがありません');
      return null;
    }
    
    try {
      // JWTトークンをデコード（Base64URL対応）
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('❌ 無効なJWTトークン形式');
        return null;
      }
      
      // Base64URLデコード
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      console.log('🔍 トークンペイロード:', payload);
      const userId = payload.sub || payload.user_id;
      console.log('👤 ユーザーID:', userId);
      return userId;
    } catch (error) {
      console.error('❌ トークンデコードエラー:', error);
      return null;
    }
  }

  // Base64URLデコード関数
  base64UrlDecode(str) {
    // Base64URLをBase64に変換
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // パディングを追加
    while (str.length % 4) {
      str += '=';
    }
    
    return atob(str);
  }

  // 営業フロー統計データ取得
  async getSalesFlowStats() {
    console.log('📊 営業フロー統計データ取得開始');
    
    try {
      // user_idを認証トークンから取得
      const token = await this.getAuthToken();
      console.log('🔑 認証トークン取得:', token ? '成功' : '失敗');
      
      if (!token) {
        throw new Error('認証トークンが取得できません。ログインしてください。');
      }
      
      const userId = this.getUserIdFromToken(token);
      console.log('👤 ユーザーID:', userId);
      
      if (!userId) {
        throw new Error('ユーザーIDが取得できません。ログインしてください。');
      }
      
      const requestBody = {
        user_id: userId
      };
      
      console.log('📤 リクエストボディ:', requestBody);
      
      const response = await this.request('/sales-flow-stats', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      console.log('📦 営業フロー統計レスポンス:', response);
      return response;
      
    } catch (error) {
      console.error('❌ 営業フロー統計データ取得エラー:', error);
      throw error;
    }
  }

}

// シングルトンインスタンス
export const awsApiClient = new AwsApiClient(); 