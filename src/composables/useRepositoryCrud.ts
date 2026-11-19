import { ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useRepositoryStore } from '@/stores/repository.store'
import { useRepositoryErrorHandler } from './useErrorHandler'
import type { components } from '@/services/api/types.auto'

type RepositoryCreate = components['schemas']['RepositoryCreate']
type RepositoryUpdate = components['schemas']['RepositoryUpdate']
type RepositoryResponse = components['schemas']['RepositoryResponse']

/**
 * リポジトリCRUD操作 composable
 * 作成・更新・削除・一覧取得を管理
 */
export function useRepositoryCrud() {
  const confirm = useConfirm()
  const repositoryStore = useRepositoryStore()
  const { showSuccess, crudErrorHandler } = useRepositoryErrorHandler()

  // ローカル状態
  const isSubmitting = ref(false)

  /**
   * リポジトリ作成
   */
  async function createRepository(data: RepositoryCreate): Promise<boolean> {
    isSubmitting.value = true
    try {
      await repositoryStore.createRepository(data)
      showSuccess('リポジトリが作成されました')
      return true
    } catch (error) {
      await crudErrorHandler.create(error)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * リポジトリ更新
   */
  async function updateRepository(id: number, data: RepositoryUpdate): Promise<boolean> {
    isSubmitting.value = true
    try {
      await repositoryStore.updateRepository(id, data)
      showSuccess('リポジトリが更新されました')
      return true
    } catch (error) {
      await crudErrorHandler.update(error)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * リポジトリ削除
   */
  async function deleteRepository(repository: RepositoryResponse): Promise<boolean> {
    return new Promise((resolve) => {
      confirm.require({
        message: `「${repository.name}」を削除しますか？この操作は取り消せません。`,
        header: 'リポジトリ削除の確認',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'キャンセル',
        acceptLabel: '削除',
        accept: async () => {
          try {
            await repositoryStore.deleteRepository(repository.id)
            showSuccess('リポジトリが削除されました')
            resolve(true)
          } catch (error) {
            await crudErrorHandler.delete(error)
            resolve(false)
          }
        },
        reject: () => {
          resolve(false)
        }
      })
    })
  }

  /**
   * リポジトリ一覧の更新
   */
  async function refreshRepositories(): Promise<void> {
    try {
      await repositoryStore.fetchRepositories()
    } catch (error) {
      await crudErrorHandler.fetch(error)
    }
  }

  return {
    // State
    isSubmitting,
    
    // CRUD operations
    createRepository,
    updateRepository,
    deleteRepository,
    refreshRepositories
  }
}