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
 * Base HTTP Client
 * 
 * 全てのAPIクライアントの基底クラス
 * 共通のHTTP機能、インターセプター、ログ処理を提供
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { getApiConfig } from '../../../../utils/config.util'

export abstract class BaseHttpClient {
  protected client: AxiosInstance
  protected baseUrl: string

  /**
   * コンストラクタ
   * @param baseUrl APIのベースURL
   */
  constructor(baseUrl: string = '') {
    // Get the base URL from environment variable or use default
    const apiConfig = getApiConfig()
    const apiBaseFromEnv = apiConfig.apiBaseUrl
    
    // Make sure the URL doesn't have a trailing slash
    const baseUrlWithoutTrailingSlash = (baseUrl || apiBaseFromEnv).replace(/\/$/, '')
    
    // Add /api/v1 to the base URL if it doesn't already have it
    this.baseUrl = baseUrlWithoutTrailingSlash.endsWith('/api/v1') 
      ? baseUrlWithoutTrailingSlash 
      : `${baseUrlWithoutTrailingSlash}/api/v1`
    
    console.log(`HTTP Client initialized with baseURL: ${this.baseUrl} (from env: ${apiConfig.apiBaseUrl || 'not defined, using default'})`)
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  /**
   * インターセプターをセットアップ
   */
  private setupInterceptors(): void {
    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        // タイミング計測開始
        config.metadata = { startTime: Date.now() }
        
        const fullUrl = `${config.baseURL}${config.url}`
        console.log(`API Request: ${config.method?.toUpperCase()} ${fullUrl}`, {
          params: config.params || {},
          headers: config.headers || {},
          data: config.data || {}
        })
        return config
      },
      (error) => {
        console.error('API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        // タイミング計測終了
        const endTime = Date.now()
        if (response.config.metadata) {
          response.config.metadata.endTime = endTime
        }
        
        const fullUrl = `${response.config.baseURL}${response.config.url}`
        const timing = response.config.metadata?.endTime && response.config.metadata?.startTime
          ? `${response.config.metadata.endTime - response.config.metadata.startTime}ms`
          : 'unknown'
        
        console.log(`API Response (${response.status}) from ${fullUrl}:`, {
          data: response.data,
          headers: response.headers,
          timing
        })
        return response
      },
      (error) => {
        const config = error.config || {}
        const fullUrl = config.baseURL && config.url ? `${config.baseURL}${config.url}` : 'unknown URL'
        console.error(`API Error (${error.response?.status || 'network error'}) from ${fullUrl}:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          stack: error.stack
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * GETリクエストを送信
   * @param url エンドポイントURL
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  /**
   * POSTリクエストを送信
   * @param url エンドポイントURL
   * @param data リクエストデータ
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  /**
   * PUTリクエストを送信
   * @param url エンドポイントURL
   * @param data リクエストデータ
   * @param config リクエスト設定
   * @returns レスポンスデータ
   */
  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  /**
   * DELETEリクエストを送信
   * @param url エンドポイントURL
   * @param config リクエスト設定
   */
  protected async delete(url: string, config?: AxiosRequestConfig): Promise<void> {
    await this.client.delete(url, config)
  }

  /**
   * 生のAxiosインスタンスを取得（特殊な用途向け）
   */
  protected getAxiosInstance(): AxiosInstance {
    return this.client
  }

  /**
   * ベースURLを取得
   */
  public getBaseUrl(): string {
    return this.baseUrl
  }
}