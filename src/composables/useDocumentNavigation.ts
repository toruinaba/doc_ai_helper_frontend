import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document.store'
import { useRepositoryStore } from '@/stores/repository.store'
import { useErrorHandler } from './useErrorHandler'
import { getLogger } from '@/utils/logger.util'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']

export interface DocumentNavigationParams {
  repositoryId: string
  documentPath: string
  ref: string
}

export interface DocumentViewProps extends DocumentNavigationParams {}

/**
 * ドキュメントナビゲーション composable
 * ルーター駆動のドキュメント表示とナビゲーション機能を統合
 * 
 * 使用例:
 * const { currentRepository, isLoading, navigateToDocument, ... } = useDocumentNavigation(props)
 */
export function useDocumentNavigation(props: DocumentViewProps) {
  const route = useRoute()
  const router = useRouter()
  const documentStore = useDocumentStore()
  const repositoryStore = useRepositoryStore()
  const { handleError, showWarning } = useErrorHandler({ showToast: true })
  
  const logger = getLogger('DocumentNavigation')

  // 状態管理
  const isInitializing = ref(false)
  const isLoadingDocument = ref(false)
  const initializationError = ref<string | null>(null)

  /**
   * 現在のリポジトリ情報
   */
  const currentRepository = computed((): RepositoryResponse | undefined => {
    const repositoryId = parseInt(props.repositoryId)
    return repositoryStore.repositories.find(r => r.id === repositoryId)
  })

  /**
   * 読み込み状態の統合
   */
  const isLoading = computed(() => 
    isInitializing.value || 
    isLoadingDocument.value || 
    documentStore.isLoading
  )

  /**
   * ルートパラメータの有効性チェック
   */
  const isValidRoute = computed(() => {
    const repositoryId = parseInt(props.repositoryId)
    return (
      !isNaN(repositoryId) && 
      repositoryId > 0 &&
      props.documentPath && 
      props.ref
    )
  })

  /**
   * 現在のドキュメント状態
   */
  const currentDocumentState = computed(() => ({
    repositoryId: props.repositoryId,
    documentPath: props.documentPath,
    ref: props.ref,
    repository: currentRepository.value,
    isLoading: isLoading.value,
    error: initializationError.value || documentStore.error,
    content: documentStore.content,
    metadata: documentStore.metadata
  }))

  /**
   * リポジトリの初期化処理
   */
  async function initializeRepository(repositoryId: string): Promise<RepositoryResponse> {
    isInitializing.value = true
    initializationError.value = null
    
    try {
      logger.debug('Initializing repository:', { repositoryId })

      // リポジトリ一覧を取得（キャッシュされていない場合）
      if (repositoryStore.repositories.length === 0) {
        logger.debug('Fetching repositories list')
        await repositoryStore.fetchRepositories()
      }
      
      // 指定されたリポジトリを検索
      const repository = repositoryStore.repositories.find(r => r.id === parseInt(repositoryId))
      if (!repository) {
        throw new Error(`Repository with ID ${repositoryId} not found`)
      }
      
      // リポジトリを選択
      repositoryStore.selectRepository(repository)
      
      // ドキュメントストアにリポジトリ情報を設定
      documentStore.currentService = repository.service_type
      documentStore.currentOwner = repository.owner
      documentStore.currentRepo = repository.name
      documentStore.currentRef = props.ref
      
      logger.debug('Repository initialized successfully:', {
        repositoryId,
        service: repository.service_type,
        owner: repository.owner,
        repo: repository.name,
        ref: props.ref
      })
      
      return repository
    } catch (error) {
      const errorMessage = `リポジトリの初期化に失敗しました (ID: ${repositoryId})`
      initializationError.value = errorMessage
      await handleError(error, errorMessage)
      throw error
    } finally {
      isInitializing.value = false
    }
  }

  /**
   * ドキュメントの読み込み処理
   */
  async function loadDocument(path: string, ref: string): Promise<void> {
    isLoadingDocument.value = true
    
    try {
      logger.debug('Loading document:', { path, ref })
      
      await documentStore.fetchDocument(path, ref)
      
      logger.debug('Document loaded successfully')
    } catch (error) {
      await handleError(error, 'ドキュメントの読み込み')
      throw error
    } finally {
      isLoadingDocument.value = false
    }
  }

  /**
   * ドキュメントへのナビゲーション
   */
  function navigateToDocument(params: Partial<DocumentNavigationParams>): void {
    const navigationParams = {
      repositoryId: params.repositoryId || props.repositoryId,
      documentPath: params.documentPath || props.documentPath,
      ref: params.ref || props.ref
    }
    
    logger.debug('Navigating to document:', navigationParams)
    
    router.push({
      name: 'document',
      params: {
        repositoryId: navigationParams.repositoryId,
        documentPath: encodeURIComponent(navigationParams.documentPath),
        ref: navigationParams.ref
      }
    })
  }

  /**
   * ブランチ変更時の処理
   */
  function onBranchChange(branch: string): void {
    logger.debug('Branch changed:', { from: props.ref, to: branch })
    
    navigateToDocument({
      ref: branch
    })
  }

  /**
   * ドキュメントパス変更時の処理
   */
  function onDocumentPathChange(newPath: string): void {
    logger.debug('Document path changed:', { from: props.documentPath, to: newPath })
    
    navigateToDocument({
      documentPath: newPath
    })
  }

  /**
   * エラー時のフォールバック処理
   */
  function handleNavigationError(error: any): void {
    logger.error('Navigation error occurred:', error)
    
    // 重要なエラーの場合はホームページにリダイレクト
    const errorMessage = error?.message || 'Unknown error'
    
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('Invalid') ||
      errorMessage.includes('Failed to initialize')
    ) {
      showWarning('ページの読み込みに失敗しました。ホームページに戻ります。')
      router.push('/')
    }
  }

  /**
   * リポジトリ一覧の事前読み込み
   */
  async function preloadRepositories(): Promise<void> {
    if (repositoryStore.repositories.length === 0) {
      try {
        logger.debug('Preloading repositories')
        await repositoryStore.fetchRepositories()
      } catch (error) {
        logger.error('Failed to preload repositories:', error)
        // 事前読み込みの失敗は致命的ではないため、エラーを投げない
      }
    }
  }

  // ルートパラメータの監視とドキュメント読み込み
  watch(
    () => [props.repositoryId, props.documentPath, props.ref],
    async ([repositoryId, documentPath, ref], oldValues) => {
      logger.debug('Route parameters changed:', {
        new: { repositoryId, documentPath, ref },
        old: oldValues,
        isValidRoute: isValidRoute.value
      })
      
      // ルートパラメータが無効な場合はスキップ
      if (!isValidRoute.value) {
        logger.warn('Invalid route parameters, skipping document load')
        return
      }
      
      try {
        // リポジトリの初期化
        await initializeRepository(repositoryId)
        
        // ドキュメントの読み込み
        await loadDocument(documentPath, ref)
        
      } catch (error) {
        handleNavigationError(error)
      }
    },
    { immediate: true }
  )

  // 初期化時のリポジトリ事前読み込み
  onMounted(() => {
    preloadRepositories()
  })

  return {
    // State
    isLoading,
    isInitializing,
    isLoadingDocument,
    initializationError,
    currentRepository,
    currentDocumentState,
    isValidRoute,

    // Actions
    navigateToDocument,
    onBranchChange,
    onDocumentPathChange,
    initializeRepository,
    loadDocument,
    preloadRepositories,

    // Utilities
    handleNavigationError
  }
}

/**
 * ドキュメントルート用の軽量composable
 * ルートパラメータの検証のみ
 */
export function useDocumentRoute() {
  const route = useRoute()
  
  const isValidRoute = computed(() => {
    const repositoryId = parseInt(route.params.repositoryId as string)
    return (
      !isNaN(repositoryId) && 
      repositoryId > 0 &&
      route.params.documentPath && 
      route.params.ref
    )
  })

  return {
    isValidRoute,
    routeParams: computed(() => ({
      repositoryId: route.params.repositoryId as string,
      documentPath: decodeURIComponent(route.params.documentPath as string),
      ref: route.params.ref as string
    }))
  }
}