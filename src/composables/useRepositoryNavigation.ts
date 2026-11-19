import { useRouter } from 'vue-router'
import { useRepositoryStore } from '@/stores/repository.store'
import { useDocumentStore } from '@/stores/document.store'
import { useRepositoryErrorHandler } from './useErrorHandler'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']

/**
 * リポジトリナビゲーション composable
 * ルーティング・画面遷移を管理
 */
export function useRepositoryNavigation() {
  const router = useRouter()
  const repositoryStore = useRepositoryStore()
  const documentStore = useDocumentStore()
  const { handleError } = useRepositoryErrorHandler()

  /**
   * リポジトリを開く（ドキュメントビューに遷移）
   */
  async function openRepository(repository: RepositoryResponse): Promise<void> {
    try {
      // リポジトリを選択
      repositoryStore.selectRepository(repository)
      
      // ドキュメントストアにリポジトリ情報を設定
      documentStore.currentService = repository.service_type
      documentStore.currentOwner = repository.owner
      documentStore.currentRepo = repository.name
      documentStore.currentRef = repository.default_branch
      documentStore.currentPath = buildDocumentPath(repository)
      
      // ドキュメントビューに遷移
      await router.push({
        name: 'document',
        params: {
          repositoryId: repository.id.toString(),
          documentPath: encodeURIComponent(buildDocumentPath(repository)),
          ref: repository.default_branch
        }
      })
    } catch (error) {
      await handleError(error, 'リポジトリを開く')
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
    // Navigation operations
    openRepository,
    
    // Utility functions
    buildDocumentPath
  }
}