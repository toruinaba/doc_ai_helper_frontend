// Add metadata type to the axios config
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime?: number;
      endTime?: number;
      [key: string]: any;
    };
  }
}

/**
 * API Service
 * 
 * doc_ai_helper_backendとの通信を担当するサービス
 */
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  DocumentResponse,
  RepositoryStructureResponse,
  RepositoryResponse,
  RepositoryCreate,
  RepositoryUpdate,
  SearchQuery,
  SearchResponse
} from './types';

/**
 * APIクライアントクラス
 */
export class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  /**
   * コンストラクタ
   * @param baseUrl APIのベースURL
   */
  constructor(baseUrl: string = '') {
    // Get the base URL from environment variable or use default
    const apiBaseFromEnv = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
    // Make sure the URL doesn't have a trailing slash
    const baseUrlWithoutTrailingSlash = (baseUrl || apiBaseFromEnv).replace(/\/$/, '');
    
    // Add /api/v1 to the base URL if it doesn't already have it
    this.baseUrl = baseUrlWithoutTrailingSlash.endsWith('/api/v1') 
      ? baseUrlWithoutTrailingSlash 
      : `${baseUrlWithoutTrailingSlash}/api/v1`;
    
    console.log(`API Client initialized with baseURL: ${this.baseUrl} (from env: ${import.meta.env.VITE_API_BASE_URL || 'not defined, using default'})`);
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        const fullUrl = `${config.baseURL}${config.url}`;
        console.log(`API Request: ${config.method?.toUpperCase()} ${fullUrl}`, {
          params: config.params || {},
          headers: config.headers || {},
          data: config.data || {}
        });
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        const fullUrl = `${response.config.baseURL}${response.config.url}`;
        console.log(`API Response (${response.status}) from ${fullUrl}:`, {
          data: response.data,
          headers: response.headers,
          timing: `${(response.config.metadata?.endTime || 0) - (response.config.metadata?.startTime || 0)}ms`
        });
        return response;
      },
      (error) => {
        const config = error.config || {};
        const fullUrl = config.baseURL && config.url ? `${config.baseURL}${config.url}` : 'unknown URL';
        console.error(`API Error (${error.response?.status || 'network error'}) from ${fullUrl}:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          stack: error.stack
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * GETリクエストを送信
   * @param url エンドポイントURL
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  private async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POSTリクエストを送信
   * @param url エンドポイントURL
   * @param data リクエストデータ
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  private async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUTリクエストを送信
   * @param url エンドポイントURL
   * @param data リクエストデータ
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  private async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETEリクエストを送信
   * @param url エンドポイントURL
   * @param config リクエスト設定
   */
  private async delete(url: string, config?: AxiosRequestConfig): Promise<void> {
    await this.client.delete(url, config);
  }

  /**
   * ヘルスチェック
   * @returns ヘルスチェック結果
   */
  async healthCheck(): Promise<Record<string, string>> {
    return this.get<Record<string, string>>('/health/');
  }

  /**
   * ドキュメントを取得
   * @param service Gitサービス（github, gitlab等）
   * @param owner リポジトリ所有者
   * @param repo リポジトリ名
   * @param path ドキュメントパス
   * @param ref ブランチまたはタグ名（デフォルト: main）
   * @param transformLinks 相対リンクを絶対リンクに変換するかどうか（デフォルト: true）
   * @param baseUrl リンク変換のベースURL
   * @returns ドキュメントレスポンス
   */
  async getDocument(
    service: string,
    owner: string,
    repo: string,
    path: string,
    ref: string = 'main',
    transformLinks: boolean = true,
    baseUrl?: string
  ): Promise<DocumentResponse> {
    const params: Record<string, string | boolean | undefined> = {
      ref,
      transform_links: transformLinks,
    };

    if (baseUrl) {
      // Make sure the base URL doesn't have /api/v1 at the end
      // Backend expects just the domain part of the URL
      const cleanedBaseUrl = baseUrl.replace(/\/api\/v1\/?$/, '');
      params.base_url = cleanedBaseUrl;
      console.log(`Using cleaned base URL for links: ${cleanedBaseUrl}`);
    }

    return this.get<DocumentResponse>(
      `/documents/contents/${service}/${owner}/${repo}/${path}`,
      { params }
    );
  }

  /**
   * リポジトリ構造を取得
   * @param service Gitサービス（github, gitlab等）
   * @param owner リポジトリ所有者
   * @param repo リポジトリ名
   * @param ref ブランチまたはタグ名（デフォルト: main）
   * @param path パスプレフィックス（デフォルト: ''）
   * @returns リポジトリ構造レスポンス
   */
  async getRepositoryStructure(
    service: string,
    owner: string,
    repo: string,
    ref: string = 'main',
    path: string = ''
  ): Promise<RepositoryStructureResponse> {
    return this.get<RepositoryStructureResponse>(
      `/documents/structure/${service}/${owner}/${repo}`,
      {
        params: {
          ref,
          path,
        },
      }
    );
  }

  /**
   * リポジトリ一覧を取得
   * @param skip スキップ数（デフォルト: 0）
   * @param limit 最大取得数（デフォルト: 100）
   * @returns リポジトリレスポンスの配列
   */
  async listRepositories(
    skip: number = 0,
    limit: number = 100
  ): Promise<RepositoryResponse[]> {
    return this.get<RepositoryResponse[]>('/repositories/', {
      params: {
        skip,
        limit,
      },
    });
  }

  /**
   * リポジトリを作成
   * @param data リポジトリ作成データ
   * @returns 作成されたリポジトリレスポンス
   */
  async createRepository(data: RepositoryCreate): Promise<RepositoryResponse> {
    return this.post<RepositoryResponse>('/repositories/', data);
  }

  /**
   * リポジトリを取得
   * @param repositoryId リポジトリID
   * @returns リポジトリレスポンス
   */
  async getRepository(repositoryId: number): Promise<RepositoryResponse> {
    return this.get<RepositoryResponse>(`/repositories/${repositoryId}`);
  }

  /**
   * リポジトリを更新
   * @param repositoryId リポジトリID
   * @param data リポジトリ更新データ
   * @returns 更新されたリポジトリレスポンス
   */
  async updateRepository(
    repositoryId: number,
    data: RepositoryUpdate
  ): Promise<RepositoryResponse> {
    return this.put<RepositoryResponse>(`/repositories/${repositoryId}`, data);
  }

  /**
   * リポジトリを削除
   * @param repositoryId リポジトリID
   */
  async deleteRepository(repositoryId: number): Promise<void> {
    return this.delete(`/repositories/${repositoryId}`);
  }

  /**
   * リポジトリを検索
   * @param service Gitサービス（github, gitlab等）
   * @param owner リポジトリ所有者
   * @param repo リポジトリ名
   * @param query 検索クエリ
   * @returns 検索結果レスポンス
   */
  async searchRepository(
    service: string,
    owner: string,
    repo: string,
    query: SearchQuery
  ): Promise<SearchResponse> {
    return this.post<SearchResponse>(
      `/search/${service}/${owner}/${repo}`,
      query
    );
  }
}

// デフォルトのAPIクライアントインスタンスをエクスポート
const apiClient = new ApiClient();
export default apiClient;
