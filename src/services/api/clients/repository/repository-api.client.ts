/**
 * Repository API Client
 * 
 * リポジトリCRUD操作と検索機能を担当
 */
import { BaseHttpClient } from '../base'
import type { components } from '../../types.auto'

// Fallback types for repository operations (not defined in current API spec)
interface RepositoryResponse {
  id: number
  name: string
  owner: string
  service: string
  created_at: string
  updated_at: string
}

interface RepositoryCreate {
  name: string
  owner: string
  service: string
  description?: string
}

interface RepositoryUpdate {
  name?: string
  description?: string
}

type SearchQuery = components['schemas']['SearchQuery']
type SearchResponse = components['schemas']['SearchResponse']

export class RepositoryApiClient extends BaseHttpClient {
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
    })
  }

  /**
   * リポジトリを作成
   * @param data リポジトリ作成データ
   * @returns 作成されたリポジトリレスポンス
   */
  async createRepository(data: RepositoryCreate): Promise<RepositoryResponse> {
    return this.post<RepositoryResponse>('/repositories/', data)
  }

  /**
   * リポジトリを取得
   * @param repositoryId リポジトリID
   * @returns リポジトリレスポンス
   */
  async getRepository(repositoryId: number): Promise<RepositoryResponse> {
    return this.get<RepositoryResponse>(`/repositories/${repositoryId}`)
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
    return this.put<RepositoryResponse>(`/repositories/${repositoryId}`, data)
  }

  /**
   * リポジトリを削除
   * @param repositoryId リポジトリID
   */
  async deleteRepository(repositoryId: number): Promise<void> {
    return this.delete(`/repositories/${repositoryId}`)
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
    )
  }
}