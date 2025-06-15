/**
 * API Service
 * 
 * doc_ai_helper_backendとの通信を担当するサービス
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
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
  constructor(baseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response || error);
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
    return this.get<Record<string, string>>('/api/v1/health/');
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
      params.base_url = baseUrl;
    }

    return this.get<DocumentResponse>(
      `/api/v1/documents/contents/${service}/${owner}/${repo}/${path}`,
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
      `/api/v1/documents/structure/${service}/${owner}/${repo}`,
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
    return this.get<RepositoryResponse[]>('/api/v1/repositories/', {
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
    return this.post<RepositoryResponse>('/api/v1/repositories/', data);
  }

  /**
   * リポジトリを取得
   * @param repositoryId リポジトリID
   * @returns リポジトリレスポンス
   */
  async getRepository(repositoryId: number): Promise<RepositoryResponse> {
    return this.get<RepositoryResponse>(`/api/v1/repositories/${repositoryId}`);
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
    return this.put<RepositoryResponse>(`/api/v1/repositories/${repositoryId}`, data);
  }

  /**
   * リポジトリを削除
   * @param repositoryId リポジトリID
   */
  async deleteRepository(repositoryId: number): Promise<void> {
    return this.delete(`/api/v1/repositories/${repositoryId}`);
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
      `/api/v1/search/${service}/${owner}/${repo}`,
      query
    );
  }
}

// デフォルトのAPIクライアントインスタンスをエクスポート
const apiClient = new ApiClient();
export default apiClient;
