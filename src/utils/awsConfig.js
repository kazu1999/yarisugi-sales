// AWS設定ファイル

import { Amplify } from 'aws-amplify';

// AWS設定（環境変数から取得）
export const awsConfig = {
  // Cognito設定
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    userPoolWebClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1'
  },
  
  // DynamoDB設定
  dynamodb: {
    region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
    tables: {
      users: import.meta.env.VITE_DYNAMODB_USERS_TABLE || 'yarisugi-users',
      customers: import.meta.env.VITE_DYNAMODB_CUSTOMERS_TABLE || 'yarisugi-customers',
      faqs: import.meta.env.VITE_DYNAMODB_FAQS_TABLE || 'yarisugi-faqs',
      knowledge: import.meta.env.VITE_DYNAMODB_KNOWLEDGE_TABLE || 'yarisugi-knowledge',
      salesProcesses: import.meta.env.VITE_DYNAMODB_SALES_PROCESSES_TABLE || 'yarisugi-sales-processes'
    }
  },
  
  // API Gateway設定
  apiGateway: {
    endpoint: import.meta.env.VITE_API_GATEWAY_ENDPOINT || '',
    region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1'
  }
};

// AWS Amplify設定
export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: awsConfig.cognito.userPoolId,
        userPoolClientId: awsConfig.cognito.userPoolWebClientId,
        region: awsConfig.cognito.region,
        loginWith: {
          email: true,
          username: false
        }
      }
    }
  });
};

// 設定の検証
export const validateAwsConfig = () => {
  const requiredFields = [
    'VITE_COGNITO_USER_POOL_ID',
    'VITE_COGNITO_CLIENT_ID',
    'VITE_AWS_REGION',
    'VITE_API_GATEWAY_ENDPOINT'
  ];

  const missingFields = requiredFields.filter(field => !import.meta.env[field]);
  
  if (missingFields.length > 0) {
    console.warn('AWS設定が不完全です:', missingFields);
    return false;
  }
  
  return true;
};

// 開発環境用のデフォルト設定
export const getDefaultConfig = () => {
  return {
    cognito: {
      userPoolId: 'ap-northeast-1_xxxxxxxxx',
      userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
      region: 'ap-northeast-1'
    },
    dynamodb: {
      region: 'ap-northeast-1',
      tables: {
        users: 'yarisugi-users-dev',
        customers: 'yarisugi-customers-dev',
        faqs: 'yarisugi-faqs-dev',
        knowledge: 'yarisugi-knowledge-dev',
        salesProcesses: 'yarisugi-sales-processes-dev'
      }
    },
    apiGateway: {
      endpoint: 'https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev',
      region: 'ap-northeast-1'
    }
  };
}; 