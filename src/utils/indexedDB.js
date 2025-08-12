// IndexedDBベースのデータベースシステム

const DB_NAME = 'YarisugiSalesDB';
const DB_VERSION = 1;

// データベース初期化
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB初期化エラー:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('IndexedDB初期化成功');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('IndexedDBアップグレード開始');

      // ユーザーテーブル
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('email', 'email', { unique: true });
        userStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('ユーザーテーブル作成完了');
      }

      // 顧客テーブル
      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
        customerStore.createIndex('userId', 'userId', { unique: false });
        customerStore.createIndex('companyName', 'companyName', { unique: false });
        customerStore.createIndex('status', 'status', { unique: false });
        customerStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('顧客テーブル作成完了');
      }

      // FAQテーブル
      if (!db.objectStoreNames.contains('faqs')) {
        const faqStore = db.createObjectStore('faqs', { keyPath: 'id' });
        faqStore.createIndex('userId', 'userId', { unique: false });
        faqStore.createIndex('category', 'category', { unique: false });
        faqStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('FAQテーブル作成完了');
      }

      // ナレッジベーステーブル
      if (!db.objectStoreNames.contains('knowledge')) {
        const knowledgeStore = db.createObjectStore('knowledge', { keyPath: 'id' });
        knowledgeStore.createIndex('userId', 'userId', { unique: false });
        knowledgeStore.createIndex('title', 'title', { unique: false });
        knowledgeStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('ナレッジベーステーブル作成完了');
      }

      // 営業プロセステーブル
      if (!db.objectStoreNames.contains('salesProcesses')) {
        const processStore = db.createObjectStore('salesProcesses', { keyPath: 'id' });
        processStore.createIndex('userId', 'userId', { unique: false });
        processStore.createIndex('name', 'name', { unique: false });
        processStore.createIndex('createdAt', 'createdAt', { unique: false });
        console.log('営業プロセステーブル作成完了');
      }

      // セッションテーブル（現在のユーザー情報）
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('userId', 'userId', { unique: true });
        console.log('セッションテーブル作成完了');
      }
    };
  });
};

// データベース接続を取得
export const getDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// 汎用CRUD操作
export const dbOperations = {
  // データ追加
  add: async (storeName, data) => {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // データ更新
  update: async (storeName, data) => {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // データ取得（ID指定）
  get: async (storeName, id) => {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // 全データ取得
  getAll: async (storeName) => {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // インデックスによる検索
  getByIndex: async (storeName, indexName, value) => {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // データ削除
  delete: async (storeName, id) => {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // ストア内の全データ削除
  clear: async (storeName) => {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};

// データベースの状態確認
export const getDatabaseInfo = async () => {
  try {
    const db = await getDatabase();
    const stores = db.objectStoreNames;
    const info = {};

    for (let storeName of stores) {
      const count = await new Promise((resolve) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
      });
      info[storeName] = count;
    }

    return info;
  } catch (error) {
    console.error('データベース情報取得エラー:', error);
    return null;
  }
}; 