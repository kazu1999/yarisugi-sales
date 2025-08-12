// IndexedDBデータのエクスポート/インポート機能

import { dbOperations, getDatabaseInfo } from './indexedDB';

// 全データをエクスポート
export const exportAllData = async () => {
  try {
    console.log('データエクスポート開始');
    
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      database: {}
    };

    // 各テーブルのデータを取得
    const tables = ['users', 'customers', 'faqs', 'knowledge', 'salesProcesses'];
    
    for (const table of tables) {
      try {
        const tableData = await dbOperations.getAll(table);
        data.database[table] = tableData;
        console.log(`${table}テーブル: ${tableData.length}件エクスポート`);
      } catch (error) {
        console.error(`${table}テーブルエクスポートエラー:`, error);
        data.database[table] = [];
      }
    }

    // JSONファイルとしてダウンロード
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yarisugi-sales-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('データエクスポート完了');
    return { success: true, message: 'データのエクスポートが完了しました。' };
  } catch (error) {
    console.error('データエクスポートエラー:', error);
    throw new Error('データのエクスポートに失敗しました。');
  }
};

// データをインポート
export const importData = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        console.log('データインポート開始');
        
        const data = JSON.parse(event.target.result);
        
        // バージョンチェック
        if (!data.version || !data.database) {
          throw new Error('無効なバックアップファイルです。');
        }

        // 各テーブルのデータをインポート
        const tables = ['users', 'customers', 'faqs', 'knowledge', 'salesProcesses'];
        let importedCount = 0;
        
        for (const table of tables) {
          if (data.database[table] && Array.isArray(data.database[table])) {
            try {
              // 既存データをクリア
              await dbOperations.clear(table);
              
              // 新規データを追加
              for (const item of data.database[table]) {
                await dbOperations.add(table, item);
                importedCount++;
              }
              
              console.log(`${table}テーブル: ${data.database[table].length}件インポート`);
            } catch (error) {
              console.error(`${table}テーブルインポートエラー:`, error);
              throw new Error(`${table}テーブルのインポートに失敗しました。`);
            }
          }
        }

        console.log('データインポート完了');
        resolve({ 
          success: true, 
          message: `${importedCount}件のデータをインポートしました。` 
        });
      } catch (error) {
        console.error('データインポートエラー:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました。'));
    };
    
    reader.readAsText(file);
  });
};

// ユーザー固有のデータをエクスポート
export const exportUserData = async (userId) => {
  try {
    console.log('ユーザーデータエクスポート開始:', userId);
    
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId: userId,
      database: {}
    };

    // ユーザーに関連するデータを取得
    const tables = [
      { name: 'customers', index: 'userId' },
      { name: 'faqs', index: 'userId' },
      { name: 'knowledge', index: 'userId' },
      { name: 'salesProcesses', index: 'userId' }
    ];
    
    for (const table of tables) {
      try {
        const tableData = await dbOperations.getByIndex(table.name, table.index, userId);
        data.database[table.name] = tableData;
        console.log(`${table.name}テーブル: ${tableData.length}件エクスポート`);
      } catch (error) {
        console.error(`${table.name}テーブルエクスポートエラー:`, error);
        data.database[table.name] = [];
      }
    }

    // JSONファイルとしてダウンロード
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yarisugi-sales-user-${userId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('ユーザーデータエクスポート完了');
    return { success: true, message: 'ユーザーデータのエクスポートが完了しました。' };
  } catch (error) {
    console.error('ユーザーデータエクスポートエラー:', error);
    throw new Error('ユーザーデータのエクスポートに失敗しました。');
  }
};

// データベース情報を取得
export const getDatabaseStatistics = async () => {
  try {
    const info = await getDatabaseInfo();
    const stats = {
      totalRecords: 0,
      tables: {}
    };

    for (const [tableName, count] of Object.entries(info)) {
      stats.tables[tableName] = count;
      stats.totalRecords += count;
    }

    return stats;
  } catch (error) {
    console.error('データベース統計取得エラー:', error);
    return null;
  }
};

// データベースをクリア
export const clearAllData = async () => {
  try {
    console.log('全データクリア開始');
    
    const tables = ['users', 'customers', 'faqs', 'knowledge', 'salesProcesses', 'sessions'];
    
    for (const table of tables) {
      try {
        await dbOperations.clear(table);
        console.log(`${table}テーブルクリア完了`);
      } catch (error) {
        console.error(`${table}テーブルクリアエラー:`, error);
      }
    }

    console.log('全データクリア完了');
    return { success: true, message: '全データをクリアしました。' };
  } catch (error) {
    console.error('全データクリアエラー:', error);
    throw new Error('データのクリアに失敗しました。');
  }
}; 