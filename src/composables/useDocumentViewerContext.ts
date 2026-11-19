import { computed } from 'vue'
import { useDocumentStore } from '@/stores/document.store'
import { useRepositoryStore } from '@/stores/repository.store'
import { extractFrontmatter } from '@/utils/markdown.util'

/**
 * DocumentViewer専用のコンテキスト管理 composable
 * リポジトリ情報、パス計算、メタデータを統合管理
 */
export function useDocumentViewerContext() {
  const documentStore = useDocumentStore()
  const repositoryStore = useRepositoryStore()

  // ドキュメント基本情報
  const document = computed(() => documentStore.currentDocument)
  const isLoading = computed(() => documentStore.isLoading)
  const error = computed(() => documentStore.error)

  // リポジトリコンテキスト
  const repositoryContext = computed(() => {
    // 選択されたリポジトリがある場合はそれを使用
    if (repositoryStore.selectedRepository) {
      return repositoryStore.selectedRepositoryContext
    }
    
    // ドキュメントにリポジトリ情報が含まれている場合はそれを使用
    if (document.value) {
      return {
        service: document.value.service,
        owner: document.value.owner,
        repo: document.value.repository,
        ref: document.value.ref,
        current_path: document.value.path
      }
    }
    
    return null
  })

  // フロントマター情報
  const frontmatter = computed(() => {
    if (!document.value?.content?.content) {
      return null
    }

    // HTMLドキュメントの場合はフロントマターを抽出しない
    if (document.value.type === 'html') {
      return null
    }

    // トランスフォーム済みコンテンツがある場合はそれを使う
    const content = document.value.content.transformed_content || document.value.content.content
    
    // フロントマターを抽出（markdown/quartoのみ）
    const { frontmatter } = extractFrontmatter(content)
    
    return frontmatter
  })

  // ドキュメントタイトル
  const documentTitle = computed(() => {
    if (!document.value) return ''
    
    // フロントマターにタイトルがあればそれを使用
    if (frontmatter.value?.title) {
      return frontmatter.value.title
    }
    
    // それ以外の場合はファイル名を使用（拡張子を除く）
    return document.value.name.replace(/\.[^/.]+$/, '')
  })

  // パス関連の計算
  const currentPath = computed(() => {
    return repositoryContext.value?.current_path || document.value?.path || ''
  })

  const documentRoot = computed(() => {
    const selectedRepo = repositoryStore.selectedRepository
    return selectedRepo?.document_root_directory || 
           currentPath.value.split('/').slice(0, -1).join('/')
  })

  const rootPath = computed(() => {
    const selectedRepo = repositoryStore.selectedRepository
    if (!selectedRepo) {
      return 'README.md'
    }
    
    // フィールド構造: document_root_directory + root_document_path
    if (selectedRepo.document_root_directory && selectedRepo.root_document_path) {
      const baseDir = selectedRepo.document_root_directory.endsWith('/') 
        ? selectedRepo.document_root_directory 
        : selectedRepo.document_root_directory + '/'
      return baseDir + selectedRepo.root_document_path
    }
    
    // root_document_pathのみが設定されている場合
    if (selectedRepo.root_document_path) {
      return selectedRepo.root_document_path
    }
    
    // デフォルト
    return 'README.md'
  })

  // ルートドキュメントかどうかの判定
  const isRootDocument = computed(() => {
    return currentPath.value === rootPath.value || 
           currentPath.value === '' || 
           currentPath.value === '/' ||
           currentPath.value.endsWith('/index.md') ||
           currentPath.value.endsWith('/README.md')
  })

  return {
    // Document state
    document,
    isLoading,
    error,
    
    // Context information
    repositoryContext,
    documentTitle,
    frontmatter,
    
    // Path calculations
    currentPath,
    documentRoot,
    rootPath,
    isRootDocument
  }
}