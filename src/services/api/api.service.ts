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
  SearchResponse,
  ChatRequest,
  ChatResponse,
  LLMQueryRequest,
  LLMResponse,
  LLMStreamingRequest,
  StreamingLLMResponse
} from './types';
import { getApiConfig } from '../../utils/config.util';

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
    const apiConfig = getApiConfig();
    const apiBaseFromEnv = apiConfig.apiBaseUrl;
    
    // Make sure the URL doesn't have a trailing slash
    const baseUrlWithoutTrailingSlash = (baseUrl || apiBaseFromEnv).replace(/\/$/, '');
    
    // Add /api/v1 to the base URL if it doesn't already have it
    this.baseUrl = baseUrlWithoutTrailingSlash.endsWith('/api/v1') 
      ? baseUrlWithoutTrailingSlash 
      : `${baseUrlWithoutTrailingSlash}/api/v1`;
    
    console.log(`API Client initialized with baseURL: ${this.baseUrl} (from env: ${apiConfig.apiBaseUrl || 'not defined, using default'})`);
    
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
      
      // URLエンコードをせず、そのままパラメータとして渡す
      // バックエンドでURLエンコードが行われる場合、二重エンコードを避ける
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

  /**
   * LLMとのチャット
   * @param request チャットリクエスト
   * @returns チャットレスポンス
   */
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.post<ChatResponse>('/chat/message', request);
  }

  /**
   * LLMにクエリを送信
   * @param request LLMクエリリクエスト
   * @returns LLMレスポンス
   */
  async sendLLMQuery(request: LLMQueryRequest): Promise<LLMResponse> {
    return this.post<LLMResponse>('/llm/query', request);
  }

  /**
   * LLMの機能を取得
   * @param provider プロバイダー名（オプション）
   * @returns LLM機能情報
   */
  async getLLMCapabilities(provider?: string): Promise<Record<string, any>> {
    const params = provider ? { provider } : {};
    return this.get<Record<string, any>>('/llm/capabilities', { params });
  }

  /**
   * 利用可能なテンプレート一覧を取得
   * @returns テンプレートID配列
   */
  async getLLMTemplates(): Promise<string[]> {
    return this.get<string[]>('/llm/templates');
  }

  /**
   * プロンプトテンプレートをフォーマット
   * @param templateId テンプレートID
   * @param variables テンプレート変数
   * @returns フォーマットされたプロンプト
   */
  async formatPrompt(
    templateId: string, 
    variables: Record<string, any>
  ): Promise<string> {
    return this.post<string>(
      `/llm/format-prompt?template_id=${templateId}`, 
      variables
    );
  }

  /**
   * LLMにストリーミングクエリを送信
   * @param request LLMストリーミングリクエスト
   * @param callbacks ストリーミングイベントのコールバック関数
   * @returns イベントソースを閉じるためのクリーンアップ関数
   */
  streamLLMQuery(
    request: LLMStreamingRequest, 
    callbacks: {
      onStart?: (data: StreamingLLMResponse['data']) => void;
      onToken?: (token: string) => void;
      onError?: (error: string) => void;
      onEnd?: (data: StreamingLLMResponse['data']) => void;
    }
  ): () => void {
    // リクエストがストリーミングを要求していることを確認
    const streamingRequest = {
      ...request,
      stream: true
    };
    
    // URL構築
    const baseUrl = this.baseUrl.endsWith('/') 
      ? this.baseUrl.slice(0, -1) 
      : this.baseUrl;
    const url = `${baseUrl}/api/v1/llm/stream`;
    
    // クエリパラメータの構築
    const params = new URLSearchParams();
    if (request.provider) params.append('provider', request.provider);
    if (request.model) params.append('model', request.model);
    if (request.disable_cache) params.append('disable_cache', 'true');
    
    // URLにクエリパラメータを追加
    const fullUrl = `${url}?${params.toString()}`;
    
    // イベントソースの作成
    const eventSource = new EventSource(fullUrl);
    
    // 開始イベントハンドラ
    eventSource.addEventListener('start', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onStart?.(data);
      } catch (error) {
        console.error('SSE start event parsing error:', error);
      }
    });
    
    // トークンイベントハンドラ
    eventSource.addEventListener('token', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onToken?.(data.content || '');
      } catch (error) {
        console.error('SSE token event parsing error:', error);
      }
    });
    
    // エラーイベントハンドラ
    eventSource.addEventListener('error', (event) => {
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          callbacks.onError?.(data.error || 'Unknown streaming error');
        } else {
          callbacks.onError?.('Connection error');
        }
      } catch (error) {
        console.error('SSE error event parsing error:', error);
        callbacks.onError?.('Error parsing error event');
      }
      // エラー時にはイベントソースを閉じる
      eventSource.close();
    });
    
    // 終了イベントハンドラ
    eventSource.addEventListener('end', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onEnd?.(data);
      } catch (error) {
        console.error('SSE end event parsing error:', error);
      }
      // 終了時にはイベントソースを閉じる
      eventSource.close();
    });
    
    // イベントソースの一般的なエラーハンドラ
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      callbacks.onError?.('EventSource connection error');
      eventSource.close();
    };
    
    // POST本文のJSONデータ
    const jsonData = JSON.stringify(streamingRequest);
    
    // fetchを使用してPOSTリクエストを送信し、EventSourceを開始
    fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
    }).catch((error) => {
      console.error('Fetch error for streaming request:', error);
      callbacks.onError?.(`Failed to initiate streaming request: ${error.message}`);
      eventSource.close();
    });
    
    // クリーンアップ関数を返す
    return () => {
      eventSource.close();
    };
  }

  /**
   * LLMにストリーミングチャットメッセージを送信
   * @param request チャットリクエスト
   * @param callbacks ストリーミングイベントのコールバック関数
   * @returns イベントソースを閉じるためのクリーンアップ関数
   */
  streamChatMessage(
    request: ChatRequest & { stream?: boolean }, 
    callbacks: {
      onStart?: (data: StreamingLLMResponse['data']) => void;
      onToken?: (token: string) => void;
      onError?: (error: string) => void;
      onEnd?: (data: StreamingLLMResponse['data']) => void;
    }
  ): () => void {
    // リクエストがストリーミングを要求していることを確認
    const streamingRequest = {
      ...request,
      stream: true
    };
    
    // URL構築
    const baseUrl = this.baseUrl.endsWith('/') 
      ? this.baseUrl.slice(0, -1) 
      : this.baseUrl;
    const url = `${baseUrl}/api/v1/chat/stream`;
    
    // クエリパラメータの構築
    const params = new URLSearchParams();
    if (request.model) params.append('model', request.model);
    
    // URLにクエリパラメータを追加
    const fullUrl = `${url}?${params.toString()}`;
    
    // イベントソースの作成
    const eventSource = new EventSource(fullUrl);
    
    // 開始イベントハンドラ
    eventSource.addEventListener('start', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onStart?.(data);
      } catch (error) {
        console.error('SSE start event parsing error:', error);
      }
    });
    
    // トークンイベントハンドラ
    eventSource.addEventListener('token', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onToken?.(data.content || '');
      } catch (error) {
        console.error('SSE token event parsing error:', error);
      }
    });
    
    // エラーイベントハンドラ
    eventSource.addEventListener('error', (event) => {
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          callbacks.onError?.(data.error || 'Unknown streaming error');
        } else {
          callbacks.onError?.('Connection error');
        }
      } catch (error) {
        console.error('SSE error event parsing error:', error);
        callbacks.onError?.('Error parsing error event');
      }
      // エラー時にはイベントソースを閉じる
      eventSource.close();
    });
    
    // 終了イベントハンドラ
    eventSource.addEventListener('end', (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onEnd?.(data);
      } catch (error) {
        console.error('SSE end event parsing error:', error);
      }
      // 終了時にはイベントソースを閉じる
      eventSource.close();
    });
    
    // イベントソースの一般的なエラーハンドラ
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      callbacks.onError?.('EventSource connection error');
      eventSource.close();
    };
    
    // POST本文のJSONデータ
    const jsonData = JSON.stringify(streamingRequest);
    
    // fetchを使用してPOSTリクエストを送信し、EventSourceを開始
    fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
    }).catch((error) => {
      console.error('Fetch error for streaming request:', error);
      callbacks.onError?.(`Failed to initiate streaming request: ${error.message}`);
      eventSource.close();
    });
    
    // クリーンアップ関数を返す
    return () => {
      eventSource.close();
    };
  }
}

// デフォルトのAPIクライアントインスタンスをエクスポート
const apiClient = new ApiClient();
export default apiClient;
