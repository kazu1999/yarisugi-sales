// S3アップロードユーティリティ

import { awsConfig } from './awsConfig';
import { getAuthToken } from './cognitoAuth';

class S3Uploader {
  constructor() {
    this.bucketName = 'yarisugi-sales-uploads-dev';
    this.region = awsConfig.apiGateway.region;
  }

  // 署名付きURLを取得
  async getSignedUrl(key, contentType) {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('認証トークンが取得できません');
      }

      const response = await fetch(`${awsConfig.apiGateway.endpoint}/knowledge/s3-presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key,
          contentType,
          bucket: this.bucketName
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('署名付きURL取得エラー詳細:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`署名付きURL取得エラー: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.signedUrl;
    } catch (error) {
      console.error('署名付きURL取得エラー:', error);
      throw error;
    }
  }

  // ファイルをS3にアップロード
  async uploadFile(file, key) {
    try {
      console.log(`📤 S3アップロード開始: ${file.name} (${file.size} bytes)`);
      
      // 署名付きURLを取得
      const signedUrl = await this.getSignedUrl(key, file.type);
      
                        // ファイルをアップロード
                  const uploadResponse = await fetch(signedUrl, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': file.type,
                      'x-amz-acl': 'private'
                    },
                    body: file
                  });

      if (!uploadResponse.ok) {
        throw new Error(`S3アップロードエラー: ${uploadResponse.status}`);
      }

      console.log(`✅ S3アップロード完了: ${key}`);
      return {
        bucket: this.bucketName,
        key,
        url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`
      };
    } catch (error) {
      console.error('S3アップロードエラー:', error);
      throw error;
    }
  }

  // ファイルキーを生成
  generateKey(userId, fileName) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop();
    return `${userId}/${timestamp}_${randomId}.${extension}`;
  }
}

export const s3Uploader = new S3Uploader();
