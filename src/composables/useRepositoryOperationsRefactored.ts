import { computed } from 'vue'
import { useRepositoryStore } from '@/stores/repository.store'
import { useRepositoryCrud } from './useRepositoryCrud'
import { useRepositoryNavigation } from './useRepositoryNavigation'
import { useRepositoryHealth } from './useRepositoryHealth'
import { useRepositoryUtils } from './useRepositoryUtils'

/**
 * リポジトリ操作を統合する composable（リファクタリング版）
 * 各専門composableを組み合わせて統一インターフェースを提供
 * 
 * 使用例:
 * const { createRepository, updateRepository, deleteRepository, openRepository, ... } = useRepositoryOperations()
 */
export function useRepositoryOperations() {
  const repositoryStore = useRepositoryStore()

  // 専門composablesを使用
  const {
    isSubmitting,
    createRepository,
    updateRepository,
    deleteRepository,
    refreshRepositories
  } = useRepositoryCrud()

  const {
    openRepository,
    buildDocumentPath
  } = useRepositoryNavigation()

  const {
    loadingRepositories,
    healthStatus,
    refreshRepositoryHealth,
    checkRepositoriesHealth,
    getRepositoryHealthStatus
  } = useRepositoryHealth()

  const {
    cloneRepository
  } = useRepositoryUtils()

  // 統合ヘルスチェック付きCRUD操作
  async function createRepositoryWithHealth(data: any): Promise<boolean> {
    const success = await createRepository(data)
    if (success) {
      await checkRepositoriesHealth()
    }
    return success
  }

  async function updateRepositoryWithHealth(id: number, data: any): Promise<boolean> {
    const success = await updateRepository(id, data)
    if (success) {
      await checkRepositoriesHealth()
    }
    return success
  }

  async function refreshRepositoriesWithHealth(): Promise<void> {
    await refreshRepositories()
    await checkRepositoriesHealth()
  }

  // コンピューテッド（ストア経由）
  const repositories = computed(() => repositoryStore.repositories)
  const isLoading = computed(() => repositoryStore.isLoading)
  const error = computed(() => repositoryStore.error)

  return {
    // State
    isSubmitting,
    loadingRepositories,
    repositories,
    isLoading,
    error,
    healthStatus,

    // Repository CRUD operations
    createRepository: createRepositoryWithHealth,
    updateRepository: updateRepositoryWithHealth,
    deleteRepository,
    
    // Navigation operations
    openRepository,
    cloneRepository,
    
    // Health check operations
    refreshRepositoryHealth,
    checkRepositoriesHealth,
    refreshRepositories: refreshRepositoriesWithHealth,
    
    // Utility functions
    buildDocumentPath,
    getRepositoryHealthStatus
  }
}