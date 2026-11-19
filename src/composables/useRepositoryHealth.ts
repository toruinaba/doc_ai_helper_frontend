import { ref, computed } from 'vue'
import { useRepositoryStore } from '@/stores/repository.store'
import { useRepositoryErrorHandler } from './useErrorHandler'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']

/**
 * リポジトリヘルスチェック composable
 * 健全性チェック・状態監視を管理
 */
export function useRepositoryHealth() {
  const repositoryStore = useRepositoryStore()
  const { handleError } = useRepositoryErrorHandler()

  // ローカル状態
  const loadingRepositories = ref<number[]>([])

  /**
   * 個別リポジトリのヘルスチェック
   */
  async function refreshRepositoryHealth(repository: RepositoryResponse): Promise<void> {
    if (loadingRepositories.value.includes(repository.id)) return

    loadingRepositories.value.push(repository.id)
    
    try {
      await repositoryStore.checkRepositoryHealth(repository)
    } catch (error) {
      await handleError(error, `${repository.name}のヘルスチェック`, {
        showToast: false // 個別のヘルスチェックエラーはトースト表示しない
      })
    } finally {
      loadingRepositories.value = loadingRepositories.value.filter(id => id !== repository.id)
    }
  }

  /**
   * 全リポジトリのヘルスチェック
   */
  async function checkRepositoriesHealth(): Promise<void> {
    try {
      await repositoryStore.checkMultipleRepositoryHealth()
    } catch (error) {
      await handleError(error, 'ヘルスチェック', {
        showToast: false // 全体のヘルスチェックエラーもトースト表示しない
      })
    }
  }

  /**
   * リポジトリのヘルス状態を取得
   */
  function getRepositoryHealthStatus(repository: RepositoryResponse | null): 'healthy' | 'unhealthy' | 'unknown' {
    if (!repository) return 'unknown'
    
    const healthStatusValue = repositoryStore.healthStatus[repository.id]
    
    // healthStatus is boolean or undefined
    if (healthStatusValue === true) return 'healthy'
    if (healthStatusValue === false) return 'unhealthy'
    return 'unknown'
  }

  // コンピューテッド
  const healthStatus = computed(() => repositoryStore.healthStatus)

  return {
    // State
    loadingRepositories,
    healthStatus,
    
    // Health check operations
    refreshRepositoryHealth,
    checkRepositoriesHealth,
    getRepositoryHealthStatus
  }
}