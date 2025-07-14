/**
 * Unified API Service (Facade Pattern)
 * 
 * ドメイン別APIクライアントを統合するファサードクラス
 * 後方互換性を保ちつつ、内部的にはドメイン別クライアントを使用
 */
import { ApiClientFactory } from './api-client.factory'
import type {
  DocumentResponse,
  RepositoryStructureResponse,
  RepositoryResponse,
  RepositoryCreate,
  RepositoryUpdate,
  SearchQuery,
  SearchResponse,
  LLMQueryRequest,
  LLMResponse,
  LLMStreamingRequest,
  StreamingLLMResponse,
  MCPToolsResponse,
  MCPToolInfo
} from './types'

export class ApiService {
  private factory: ApiClientFactory

  constructor() {
    this.factory = ApiClientFactory.getInstance()
  }

  // ==========================================
  // System Operations
  // ==========================================

  /**
   * ヘルスチェック
   * @returns ヘルスチェック結果
   */
  async healthCheck(): Promise<Record<string, string>> {
    return this.factory.getSystemClient().healthCheck()
  }

  // ==========================================
  // Document Operations
  // ==========================================

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
    return this.factory.getDocumentClient().getDocument(
      service, owner, repo, path, ref, transformLinks, baseUrl
    )
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
    return this.factory.getDocumentClient().getRepositoryStructure(
      service, owner, repo, ref, path
    )
  }

  // ==========================================
  // Repository Operations
  // ==========================================

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
    return this.factory.getRepositoryClient().listRepositories(skip, limit)
  }

  /**
   * リポジトリを作成
   * @param data リポジトリ作成データ
   * @returns 作成されたリポジトリレスポンス
   */
  async createRepository(data: RepositoryCreate): Promise<RepositoryResponse> {
    return this.factory.getRepositoryClient().createRepository(data)
  }

  /**
   * リポジトリを取得
   * @param repositoryId リポジトリID
   * @returns リポジトリレスポンス
   */
  async getRepository(repositoryId: number): Promise<RepositoryResponse> {
    return this.factory.getRepositoryClient().getRepository(repositoryId)
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
    return this.factory.getRepositoryClient().updateRepository(repositoryId, data)
  }

  /**
   * リポジトリを削除
   * @param repositoryId リポジトリID
   */
  async deleteRepository(repositoryId: number): Promise<void> {
    return this.factory.getRepositoryClient().deleteRepository(repositoryId)
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
    return this.factory.getRepositoryClient().searchRepository(service, owner, repo, query)
  }

  // ==========================================
  // LLM Operations
  // ==========================================

  /**
   * LLMにクエリを送信
   * @param request LLMクエリリクエスト
   * @returns LLMレスポンス
   */
  async sendLLMQuery(request: LLMQueryRequest): Promise<LLMResponse> {
    return this.factory.getLLMClient().sendLLMQuery(request)
  }

  /**
   * LLMの機能を取得
   * @param provider プロバイダー名（オプション）
   * @returns LLM機能情報
   */
  async getLLMCapabilities(provider?: string): Promise<Record<string, any>> {
    return this.factory.getLLMClient().getLLMCapabilities(provider)
  }

  /**
   * 利用可能なテンプレート一覧を取得
   * @returns テンプレートID配列
   */
  async getLLMTemplates(): Promise<string[]> {
    return this.factory.getLLMClient().getLLMTemplates()
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
    return this.factory.getLLMClient().formatPrompt(templateId, variables)
  }

  // ==========================================
  // MCP Tools Operations
  // ==========================================

  /**
   * 利用可能なMCPツール一覧を取得
   * @returns MCPツール情報のレスポンス
   */
  async getMCPTools(): Promise<MCPToolsResponse> {
    return this.factory.getMCPToolsClient().getMCPTools()
  }

  /**
   * 特定のMCPツール情報を取得
   * @param toolName ツール名
   * @returns MCPツール情報
   */
  async getMCPTool(toolName: string): Promise<MCPToolInfo> {
    return this.factory.getMCPToolsClient().getMCPTool(toolName)
  }

  /**
   * MCPツールを有効にしたLLMクエリを送信
   * @param request LLMクエリリクエスト
   * @param enableTools ツールを有効にするかどうか
   * @param toolChoice ツール選択戦略
   * @returns LLMレスポンス（ツール実行結果を含む）
   */
  async sendLLMQueryWithTools(
    request: Omit<LLMQueryRequest, 'enable_tools' | 'tool_choice'>,
    enableTools: boolean = true,
    toolChoice: string = 'auto'
  ): Promise<LLMResponse> {
    return this.factory.getMCPToolsClient().sendLLMQueryWithTools(
      request, enableTools, toolChoice
    )
  }

  // ==========================================
  // Streaming Operations
  // ==========================================

  /**
   * LLMにストリーミングクエリを送信
   * @param request LLMストリーミングリクエスト
   * @param callbacks ストリーミングイベントのコールバック関数
   * @returns イベントソースを閉じるためのクリーンアップ関数
   */
  streamLLMQuery(
    request: LLMStreamingRequest, 
    callbacks: {
      onStart?: (data: StreamingLLMResponse['data']) => void
      onToken?: (token: string) => void
      onError?: (error: string) => void
      onEnd?: (data: StreamingLLMResponse['data']) => void
    }
  ): () => void {
    return this.factory.getStreamingClient().streamLLMQuery(request, callbacks)
  }

  /**
   * MCPツールを有効にしたLLMストリーミングクエリを送信
   * @param request LLMクエリリクエスト
   * @param enableTools ツールを有効にするかどうか
   * @param toolChoice ツール選択戦略
   * @param callbacks ストリーミングイベントのコールバック関数（MCPツール対応）
   * @returns ストリーミングを中止するためのAbortController
   */
  async streamLLMQueryWithTools(
    request: LLMQueryRequest,
    enableTools: boolean = true,
    toolChoice: string = 'auto',
    callbacks: {
      onStart?: (data?: any) => void
      onToken?: (token: string) => void
      onError?: (error: string) => void
      onEnd?: (data?: any) => void
      onToolCall?: (toolCall: any) => void
      onToolResult?: (result: any) => void
    }
  ): Promise<AbortController> {
    return this.factory.getStreamingClient().streamLLMQueryWithTools(
      request, enableTools, toolChoice, callbacks
    )
  }
}

// デフォルトエクスポート（後方互換性のため）
const apiService = new ApiService()
export { apiService as ApiClient }
export default apiService