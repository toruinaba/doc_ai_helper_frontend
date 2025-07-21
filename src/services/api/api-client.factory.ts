/**
 * API Client Factory
 * 
 * ドメイン別APIクライアントのファクトリークラス
 * シングルトンパターンでクライアントインスタンスを管理
 */
import { DocumentApiClient } from './clients/document'
import { RepositoryApiClient } from './clients/repository'
import { LLMApiClient } from './clients/llm'
import { MCPToolsApiClient } from './clients/tools'
import { StreamingApiClient } from './clients/streaming'
import { SystemApiClient } from './clients/infrastructure'

export class ApiClientFactory {
  private static instance: ApiClientFactory
  private clients: Map<string, any> = new Map()

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): ApiClientFactory {
    if (!ApiClientFactory.instance) {
      ApiClientFactory.instance = new ApiClientFactory()
    }
    return ApiClientFactory.instance
  }

  /**
   * Document API Client を取得
   */
  getDocumentClient(): DocumentApiClient {
    if (!this.clients.has('document')) {
      this.clients.set('document', new DocumentApiClient())
    }
    return this.clients.get('document')
  }

  /**
   * Repository API Client を取得
   */
  getRepositoryClient(): RepositoryApiClient {
    if (!this.clients.has('repository')) {
      this.clients.set('repository', new RepositoryApiClient())
    }
    return this.clients.get('repository')
  }

  /**
   * LLM API Client を取得
   */
  getLLMClient(): LLMApiClient {
    if (!this.clients.has('llm')) {
      this.clients.set('llm', new LLMApiClient())
    }
    return this.clients.get('llm')
  }

  /**
   * MCP Tools API Client を取得
   */
  getMCPToolsClient(): MCPToolsApiClient {
    if (!this.clients.has('tools')) {
      this.clients.set('tools', new MCPToolsApiClient())
    }
    return this.clients.get('tools')
  }

  /**
   * Streaming API Client を取得
   */
  getStreamingClient(): StreamingApiClient {
    if (!this.clients.has('streaming')) {
      this.clients.set('streaming', new StreamingApiClient())
    }
    return this.clients.get('streaming')
  }

  /**
   * System API Client を取得
   */
  getSystemClient(): SystemApiClient {
    if (!this.clients.has('system')) {
      this.clients.set('system', new SystemApiClient())
    }
    return this.clients.get('system')
  }

  /**
   * 全クライアントをリセット（テスト用）
   */
  resetClients(): void {
    this.clients.clear()
  }
}