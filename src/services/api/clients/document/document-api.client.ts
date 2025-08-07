/**
 * Document API Client
 * 
 * ドキュメント取得とリポジトリ構造の操作を担当
 */
import { BaseHttpClient } from '../base'
import type { components } from '../../types.auto'
// TransformLinksMode removed - now using boolean

type DocumentResponse = components['schemas']['DocumentResponse']
type RepositoryStructureResponse = components['schemas']['RepositoryStructureResponse']

export class DocumentApiClient extends BaseHttpClient {
  /**
   * ドキュメントを取得
   * @param service Gitサービス（github, gitlab等）
   * @param owner リポジトリ所有者
   * @param repo リポジトリ名
   * @param path ドキュメントパス
   * @param ref ブランチまたはタグ名（デフォルト: main）
   * @param transformLinks リンク変換モード - 'true'(画像CDNのみ変換), 'false'(変換なし) - バックエンド仕様変更対応
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
    // バックエンド仕様変更対応: transform_links=true は実質的に images-only
    const transformLinksParam = transformLinks;
    
    const params: Record<string, string | boolean | undefined> = {
      ref,
      transform_links: transformLinksParam,
    }

    if (baseUrl) {
      // Make sure the base URL doesn't have /api/v1 at the end
      // Backend expects just the domain part of the URL
      const cleanedBaseUrl = baseUrl.replace(/\/api\/v1\/?$/, '')
      
      // URLエンコードをせず、そのままパラメータとして渡す
      // バックエンドでURLエンコードが行われる場合、二重エンコードを避ける
      params.base_url = cleanedBaseUrl
      console.log(`Using cleaned base URL for links: ${cleanedBaseUrl}`)
    }

    return this.get<DocumentResponse>(
      `/documents/contents/${service}/${owner}/${repo}/${path}`,
      { params }
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
    return this.get<RepositoryStructureResponse>(
      `/documents/structure/${service}/${owner}/${repo}`,
      {
        params: {
          ref,
          path,
        },
      }
    )
  }
}