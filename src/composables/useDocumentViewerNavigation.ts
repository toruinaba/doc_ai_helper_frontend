import { useDocumentRouter } from '@/composables/useDocumentRouter'
import { useRepositoryStore } from '@/stores/repository.store'
import { useDocumentStore } from '@/stores/document.store'

export interface DocumentViewerNavigationProps {
  repositoryId?: string
  documentPath?: string
  ref?: string
}

/**
 * DocumentViewer専用のナビゲーション composable
 * リンクナビゲーション、ルートドキュメント移動を管理
 */
export function useDocumentViewerNavigation(props: DocumentViewerNavigationProps) {
  const { navigateToDocument } = useDocumentRouter()
  const repositoryStore = useRepositoryStore()
  const documentStore = useDocumentStore()

  /**
   * 現在のリポジトリIDを取得
   */
  function getCurrentRepositoryId(): string {
    // props優先、なければstoreから取得
    if (props.repositoryId) {
      return props.repositoryId
    }
    
    // repositoryStoreから取得
    const selectedRepo = repositoryStore.selectedRepository
    if (selectedRepo) {
      return selectedRepo.id.toString()
    }
    
    return ''
  }

  /**
   * 現在のドキュメントパスを取得
   */
  function getCurrentDocumentPath(): string {
    // props優先、なければstoreから取得
    if (props.documentPath) {
      return props.documentPath
    }
    
    return documentStore.currentPath || ''
  }

  /**
   * 現在のrefを取得
   */
  function getCurrentRef(): string {
    // props優先、なければstoreから取得
    if (props.ref) {
      return props.ref
    }
    
    return documentStore.currentRef || 'main'
  }

  /**
   * リンククリック時の処理（責任分界アプローチ対応）
   */
  async function handleLinkClick(event: MouseEvent) {
    if (!(event.target instanceof HTMLAnchorElement)) {
      return
    }

    const link = event.target
    const href = link.getAttribute('href')
    const documentPath = link.getAttribute('data-document-path')
    const linkType = link.getAttribute('data-link-type')
    const originalHref = link.getAttribute('data-original-href')

    // 内部リンクの判定と処理
    if (linkType === 'internal' && documentPath) {
      // 内部リンク: フロントエンドでナビゲーション処理
      event.preventDefault()
      await handleInternalNavigation(documentPath, originalHref || href || '#')
      return
    }
  }

  /**
   * 内部ナビゲーションの処理
   */
  async function handleInternalNavigation(documentPath: string, originalHref: string) {
    try {
      // 現在のリポジトリ情報を取得
      const repositoryId = getCurrentRepositoryId()
      const currentRef = getCurrentRef()
      
      if (!repositoryId) {
        console.error('Cannot navigate: repositoryId is not available')
        return
      }

      // useDocumentRouterを使用してナビゲーション
      await navigateToDocument({
        repositoryId,
        path: documentPath,
        ref: currentRef
      })

    } catch (error) {
      console.error('Failed to handle internal navigation:', error, {
        documentPath,
        originalHref,
        stack: (error as Error).stack
      })
    }
  }

  /**
   * ルートドキュメントに移動（新しい設計）
   */
  async function navigateToRootDocument() {
    try {
      const repositoryId = getCurrentRepositoryId()
      const currentRef = getCurrentRef()
      
      if (!repositoryId) {
        console.warn('Cannot navigate to root: repositoryId is not available')
        return
      }

      // ルートパス計算
      const selectedRepo = repositoryStore.selectedRepository
      let rootDocumentPath = 'README.md'
      
      if (selectedRepo) {
        // フィールド構造: document_root_directory + root_document_path
        if (selectedRepo.document_root_directory && selectedRepo.root_document_path) {
          const baseDir = selectedRepo.document_root_directory.endsWith('/') 
            ? selectedRepo.document_root_directory 
            : selectedRepo.document_root_directory + '/'
          rootDocumentPath = baseDir + selectedRepo.root_document_path
        } else if (selectedRepo.root_document_path) {
          rootDocumentPath = selectedRepo.root_document_path
        }
      }
      
      // ルートドキュメントへナビゲーション
      await navigateToDocument({
        repositoryId,
        path: rootDocumentPath,
        ref: currentRef
      })
      
    } catch (error) {
      console.error('Failed to navigate to root document:', error)
    }
  }

  return {
    // Navigation functions
    handleLinkClick,
    navigateToRootDocument,
    
    // Helper functions
    getCurrentRepositoryId,
    getCurrentDocumentPath,
    getCurrentRef
  }
}