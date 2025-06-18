/**
 * 設定ユーティリティ
 * 
 * 環境変数からアプリケーション設定を取得するためのユーティリティ関数を提供
 */

/**
 * リポジトリのデフォルト設定
 */
export interface RepositoryConfig {
  service: string;
  owner: string;
  repo: string;
  ref: string;
  path: string;
}

/**
 * APIのデフォルト設定
 */
export interface ApiConfig {
  apiBaseUrl: string;
  backendUrl: string;
  useMockApi: boolean;
}

/**
 * 環境変数からリポジトリのデフォルト設定を取得
 * @returns リポジトリのデフォルト設定
 */
export function getDefaultRepositoryConfig(): RepositoryConfig {
  return {
    service: import.meta.env.VITE_DEFAULT_SERVICE || 'mock',
    owner: import.meta.env.VITE_DEFAULT_OWNER || 'example',
    repo: import.meta.env.VITE_DEFAULT_REPO || 'docs-project',
    ref: import.meta.env.VITE_DEFAULT_REF || 'main',
    path: import.meta.env.VITE_DEFAULT_PATH || 'index.md'
  };
}

/**
 * 環境変数からAPIの設定を取得
 * @returns APIの設定
 */
export function getApiConfig(): ApiConfig {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true'
  };
}
