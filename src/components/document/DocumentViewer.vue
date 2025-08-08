<template>
  <div class="document-viewer-container">
    <Message v-if="error" severity="error" :closable="true" :sticky="true">
      {{ error }}
    </Message>
    
    <div v-if="isLoading" class="p-d-flex p-jc-center p-ai-center loading-container">
      <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="5" />
      <span class="loading-text">ドキュメントを読み込み中...</span>
    </div>

    <Card v-else-if="!document" class="empty-state-card">
      <template #content>
        <div class="empty-state-content">
          <i class="pi pi-file-o empty-icon"></i>
          <h3>ドキュメントを読み込んでいます</h3>
          <p>しばらくお待ちください...</p>
        </div>
      </template>
    </Card>

    <div v-else class="document-content">
      <!-- Breadcrumb行 -->
      <DocumentBreadcrumb 
        :repository-context="repositoryContext"
        :current-path="currentPath"
        :is-root-document="isRootDocument"
        :navigate-to-root="navigateToRootDocument"
      />
      
      <!-- メタ情報行 -->
      <DocumentMetaInfo 
        :repository-context="repositoryContext"
        :document="document"
      />
      
      <MetaDisplay v-if="frontmatter" :data="frontmatter" title="フロントマター" />
      
      <DocumentContent 
        :document="document"
        :current-path="currentPath"
        :document-root="documentRoot"
        :on-link-click="handleLinkClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDocumentStore } from '@/stores/document.store';
import { useRepositoryStore } from '@/stores/repository.store';
import { useDocumentRouter } from '@/composables/useDocumentRouter';
import { extractFrontmatter } from '@/utils/markdown.util';
import MetaDisplay from '@/components/common/MetaDisplay.vue';
import DocumentBreadcrumb from './DocumentBreadcrumb.vue';
import DocumentMetaInfo from './DocumentMetaInfo.vue';
import DocumentContent from './DocumentContent.vue';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Card from 'primevue/card';

// Props definition for better component interface
interface DocumentViewerProps {
  // Optional props for external control (when used in isolation)
  repositoryId?: string;
  documentPath?: string;
  ref?: string;
}

// Optional props for external control
const props = withDefaults(defineProps<DocumentViewerProps>(), {
  repositoryId: '',
  documentPath: '',
  ref: 'main'
});

const documentStore = useDocumentStore();
const repositoryStore = useRepositoryStore();
const { navigateToDocument } = useDocumentRouter();

// 状態を参照
const document = computed(() => documentStore.currentDocument);
const isLoading = computed(() => documentStore.isLoading);
const error = computed(() => documentStore.error);

// リポジトリコンテキスト
const repositoryContext = computed(() => {
  // 選択されたリポジトリがある場合はそれを使用
  if (repositoryStore.selectedRepository) {
    return repositoryStore.selectedRepositoryContext;
  }
  
  // ドキュメントにリポジトリ情報が含まれている場合はそれを使用
  if (document.value) {
    return {
      service: document.value.service,
      owner: document.value.owner,
      repo: document.value.repository,
      ref: document.value.ref,
      current_path: document.value.path
    };
  }
  
  return null;
});

// ドキュメントタイトル
const documentTitle = computed(() => {
  if (!document.value) return '';
  
  // フロントマターにタイトルがあればそれを使用
  if (frontmatter.value && frontmatter.value.title) {
    return frontmatter.value.title;
  }
  
  // それ以外の場合はファイル名を使用（拡張子を除く）
  return document.value.name.replace(/\.[^/.]+$/, '');
});


const frontmatter = computed(() => {
  if (!document.value || !document.value.content.content) {
    return null;
  }

  // HTMLドキュメントの場合はフロントマターを抽出しない
  if (document.value.type === 'html') {
    return null;
  }

  // トランスフォーム済みコンテンツがある場合はそれを使う
  const content = document.value.content.transformed_content || document.value.content.content;
  
  // フロントマターを抽出（markdown/quartoのみ）
  const { frontmatter } = extractFrontmatter(content);
  
  return frontmatter;
});

// 現在のパスとルートパス
const currentPath = computed(() => {
  return repositoryContext.value?.current_path || document.value?.path || '';
});

// ドキュメントルート
const documentRoot = computed(() => {
  const selectedRepo = repositoryStore.selectedRepository;
  return selectedRepo?.document_root_directory || 
         currentPath.value.split('/').slice(0, -1).join('/');
});

const rootPath = computed(() => {
  const selectedRepo = repositoryStore.selectedRepository;
  if (!selectedRepo) {
    return 'README.md';
  }
  
  // フィールド構造: document_root_directory + root_document_path
  if (selectedRepo.document_root_directory && selectedRepo.root_document_path) {
    const baseDir = selectedRepo.document_root_directory.endsWith('/') 
      ? selectedRepo.document_root_directory 
      : selectedRepo.document_root_directory + '/';
    return baseDir + selectedRepo.root_document_path;
  }
  
  // root_document_pathのみが設定されている場合
  if (selectedRepo.root_document_path) {
    return selectedRepo.root_document_path;
  }
  
  // デフォルト
  return 'README.md';
});

// ルートドキュメントかどうかの判定
const isRootDocument = computed(() => {
  return currentPath.value === rootPath.value || 
         currentPath.value === '' || 
         currentPath.value === '/' ||
         currentPath.value.endsWith('/index.md') ||
         currentPath.value.endsWith('/README.md');
});



/**
 * リンククリック時の処理（責任分界アプローチ対応）
 */
async function handleLinkClick(event: MouseEvent) {
  if (!(event.target instanceof HTMLAnchorElement)) {
    return;
  }

  const link = event.target;
  const href = link.getAttribute('href');
  const documentPath = link.getAttribute('data-document-path');
  const linkType = link.getAttribute('data-link-type');
  const originalHref = link.getAttribute('data-original-href');


  // 内部リンクの判定と処理
  if (linkType === 'internal' && documentPath) {
    // 内部リンク: フロントエンドでナビゲーション処理
    event.preventDefault();
    await handleInternalNavigation(documentPath, originalHref || href || '#');
    return;
  }

}

/**
 * 内部ナビゲーションの処理
 */
async function handleInternalNavigation(documentPath: string, originalHref: string) {
  try {
    // 現在のリポジトリ情報を取得
    const repositoryId = props.repositoryId || getCurrentRepositoryId();
    const currentPath = getCurrentDocumentPath();
    const currentRef = props.ref || getCurrentRef();
    
    
    if (!repositoryId) {
      console.error('Cannot navigate: repositoryId is not available');
      return;
    }

    // useDocumentRouterを使用してナビゲーション
    await navigateToDocument({
      repositoryId,
      path: documentPath,
      ref: currentRef
    });

  } catch (error) {
    console.error('Failed to handle internal navigation:', error, {
      documentPath,
      originalHref,
      stack: (error as Error).stack
    });
  }
}

/**
 * 現在のリポジトリIDを取得
 */
function getCurrentRepositoryId(): string {
  // props優先、なければstoreから取得
  if (props.repositoryId) {
    return props.repositoryId;
  }
  
  // repositoryStoreから取得
  const selectedRepo = repositoryStore.selectedRepository;
  if (selectedRepo) {
    return selectedRepo.id.toString();
  }
  
  return '';
}

/**
 * 現在のドキュメントパスを取得
 */
function getCurrentDocumentPath(): string {
  // props優先、なければstoreから取得
  if (props.documentPath) {
    return props.documentPath;
  }
  
  return documentStore.currentPath || '';
}

/**
 * 現在のrefを取得
 */
function getCurrentRef(): string {
  // props優先、なければstoreから取得
  if (props.ref) {
    return props.ref;
  }
  
  return documentStore.currentRef || 'main';
}

/**
 * ルートドキュメントに移動（新しい設計）
 */
async function navigateToRootDocument() {
  try {
    const repositoryId = getCurrentRepositoryId();
    const rootDocumentPath = rootPath.value;
    const currentRef = getCurrentRef();
    
    if (!repositoryId) {
      console.warn('Cannot navigate to root: repositoryId is not available');
      return;
    }

    
    // ルートドキュメントへナビゲーション
    await navigateToDocument({
      repositoryId,
      path: rootDocumentPath,
      ref: currentRef
    });
    
  } catch (error) {
    console.error('Failed to navigate to root document:', error);
  }
}


// 新しい設計: DocumentViewerは純粋なビューコンポーネント
// ドキュメント取得はDocumentViewで管理され、propsとして渡される
// これにより複雑なwatcherと状態管理の問題を解決
</script>

<style scoped>
.document-viewer-container {
  height: 100%;
  padding: var(--app-spacing-base);
  overflow: visible; /* SplitterPanelでスクロール管理 */
  background-color: var(--app-surface-0);
  display: flex;
  flex-direction: column;
  width: 100%;
}

.document-content {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.repository-info {
  margin-bottom: var(--app-spacing-base);
  padding: var(--app-spacing-md) var(--app-spacing-base);
  background: var(--app-surface-0);
  border-radius: var(--app-border-radius);
  border: 1px solid var(--app-surface-border);
  box-shadow: var(--app-shadow-sm);
  
  .repo-badge {
    display: flex;
    align-items: center;
    gap: var(--app-spacing-md);
    font-size: var(--app-font-size-sm);
    
    i {
      color: var(--app-primary-color);
    }
    
    .repo-name {
      font-weight: 500;
      color: var(--app-text-color);
    }
    
    .repo-branch {
      display: flex;
      align-items: center;
      gap: var(--app-spacing-xs);
      color: var(--app-text-color-secondary);
      font-size: var(--app-font-size-xs);
      margin-left: auto;
      
      i {
        font-size: var(--app-font-size-xs);
      }
    }
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--app-spacing-xl);
}

.loading-text {
  margin-top: var(--app-spacing-base);
  color: var(--app-text-color-secondary);
}

.empty-state-card {
  margin: var(--app-spacing-xl) auto;
  max-width: 800px;
  width: 100%;
  box-shadow: var(--app-shadow-card);
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--app-spacing-xl);
  color: var(--app-text-color-muted);
  text-align: center;
}

.empty-icon {
  font-size: var(--app-font-size-3xl);
  margin-bottom: var(--app-spacing-base);
  color: var(--app-text-color-muted);
}


</style>
