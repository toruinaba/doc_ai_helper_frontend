/**
 * Repository Service
 * 
 * リポジトリ管理の統合サービス層
 * 既存のリポジトリクライアントを使用してCRUD操作、検索、コンテキスト生成を提供
 */
import { RepositoryApiClient } from './clients/repository/repository-api.client'
import type { components } from './types.auto'

// OpenAPIから自動生成された型を使用
type RepositoryResponse = components['schemas']['RepositoryResponse']
type RepositoryCreate = components['schemas']['RepositoryCreate']
type RepositoryUpdate = components['schemas']['RepositoryUpdate']
type RepositoryContext = components['schemas']['RepositoryContext']
type SearchQuery = components['schemas']['SearchQuery']
type SearchResponse = components['schemas']['SearchResponse']

export interface RepositoryListOptions {
  skip?: number
  limit?: number
}

export interface RepositoryContextOptions {
  ref?: string
  current_path?: string
}

export class RepositoryService {
  private repositoryClient: RepositoryApiClient

  constructor() {
    this.repositoryClient = new RepositoryApiClient()
  }

  // ===== CRUD Operations =====

  /**
   * リポジトリ一覧を取得
   */
  async listRepositories(options: RepositoryListOptions = {}): Promise<RepositoryResponse[]> {
    const { skip = 0, limit = 100 } = options
    return this.repositoryClient.listRepositories(skip, limit)
  }

  /**
   * リポジトリを作成
   */
  async createRepository(data: RepositoryCreate): Promise<RepositoryResponse> {
    return this.repositoryClient.createRepository(data)
  }

  /**
   * リポジトリを取得
   */
  async getRepository(id: number): Promise<RepositoryResponse> {
    return this.repositoryClient.getRepository(id)
  }

  /**
   * リポジトリを更新
   */
  async updateRepository(id: number, data: RepositoryUpdate): Promise<RepositoryResponse> {
    return this.repositoryClient.updateRepository(id, data)
  }

  /**
   * リポジトリを削除
   */
  async deleteRepository(id: number): Promise<void> {
    return this.repositoryClient.deleteRepository(id)
  }

  // ===== Search Operations =====

  /**
   * リポジトリ内コンテンツを検索
   */
  async searchContent(
    service: string,
    owner: string,
    repo: string,
    query: SearchQuery
  ): Promise<SearchResponse> {
    return this.repositoryClient.searchRepository(service, owner, repo, query)
  }

  // ===== Context Operations =====

  /**
   * リポジトリコンテキストを取得
   * LLM統合用のコンテキスト情報を生成
   */
  async getRepositoryContext(
    repositoryId: number,
    options: RepositoryContextOptions = {}
  ): Promise<RepositoryContext> {
    // repository-api.client.ts のAPIエンドポイントを使用
    // /api/v1/repositories/{repository_id}/context
    const params = new URLSearchParams()
    
    if (options.ref) {
      params.append('ref', options.ref)
    }
    
    if (options.current_path) {
      params.append('current_path', options.current_path)
    }

    const url = `/repositories/${repositoryId}/context${params.toString() ? `?${params.toString()}` : ''}`
    
    return this.repositoryClient.get<RepositoryContext>(url)
  }

  // ===== Utility Methods =====

  /**
   * リポジトリの状態を確認
   * 接続テストやヘルスチェック用
   */
  async checkRepositoryHealth(repository: RepositoryResponse): Promise<boolean> {
    try {
      // 実際の接続テストは後で実装
      // とりあえずリポジトリ情報の取得で代用
      await this.getRepository(repository.id)
      return true
    } catch (error) {
      console.warn(`Repository health check failed for ${repository.name}:`, error)
      return false
    }
  }

  /**
   * リポジトリからRepositoryContextを生成
   * ドキュメントビューアとの統合用
   */
  createContextFromRepository(
    repository: RepositoryResponse,
    options: RepositoryContextOptions = {}
  ): RepositoryContext {
    return {
      service: repository.service_type,
      owner: repository.owner,
      repo: repository.name,
      ref: options.ref || repository.default_branch,
      current_path: options.current_path || null,
      base_url: repository.base_url || null
    }
  }

  /**
   * 複数リポジトリの一括ヘルスチェック
   */
  async checkMultipleRepositoryHealth(repositories: RepositoryResponse[]): Promise<Record<number, boolean>> {
    const results: Record<number, boolean> = {}
    
    // 並列実行で効率化
    const healthChecks = repositories.map(async (repo) => {
      const isHealthy = await this.checkRepositoryHealth(repo)
      results[repo.id] = isHealthy
      return { id: repo.id, healthy: isHealthy }
    })

    await Promise.allSettled(healthChecks)
    return results
  }
}

// シングルトンインスタンスをエクスポート
export const repositoryService = new RepositoryService()