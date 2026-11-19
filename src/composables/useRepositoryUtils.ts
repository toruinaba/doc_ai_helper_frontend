import type { components } from '@/services/api/types.auto'

type RepositoryCreate = components['schemas']['RepositoryCreate']
type RepositoryResponse = components['schemas']['RepositoryResponse']

/**
 * リポジトリユーティリティ composable
 * ヘルパー関数・変換処理を管理
 */
export function useRepositoryUtils() {

  /**
   * リポジトリをクローン（新規作成用にコピー）
   */
  function cloneRepository(repository: RepositoryResponse): RepositoryCreate {
    return {
      name: `${repository.name}-copy`,
      owner: repository.owner,
      service_type: repository.service_type,
      url: '', // URLは空にして手動入力を促す
      base_url: repository.base_url,
      default_branch: repository.default_branch,
      repository_root: repository.repository_root,
      document_root_directory: repository.document_root_directory,
      root_document_path: repository.root_document_path,
      root_path: repository.root_path,
      description: `${repository.description || ''} (コピー)`.trim(),
      is_public: repository.is_public,
      access_token: null, // セキュリティのため空にする
      metadata: { ...repository.metadata }
    }
  }

  /**
   * リポジトリ設定からドキュメントパスを構築
   */
  function buildDocumentPath(repository: RepositoryResponse): string {
    // 新しいフィールド構造: document_root_directory + root_document_path
    if (repository.document_root_directory && repository.root_document_path) {
      const baseDir = repository.document_root_directory.endsWith('/') 
        ? repository.document_root_directory 
        : repository.document_root_directory + '/'
      return baseDir + repository.root_document_path
    }
    
    // root_document_pathのみが設定されている場合
    if (repository.root_document_path) {
      return repository.root_document_path
    }
    
    // レガシーフィールド: root_path
    if (repository.root_path) {
      return repository.root_path
    }
    
    // デフォルト
    return 'README.md'
  }

  return {
    // Utility functions
    cloneRepository,
    buildDocumentPath
  }
}