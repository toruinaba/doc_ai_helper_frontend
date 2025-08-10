<template>
  <div class="document-viewer-container">
    <!-- エラー表示 -->
    <StatusMessage
      v-if="error"
      :message="error"
      severity="error"
      :closable="true"
    />
    
    <!-- ローディング状態 -->
    <ListLoadingState
      v-else-if="isLoading"
      :show="true"
      :layout="'cards'"
      :message="'ドキュメントを読み込み中...'"
    />

    <!-- 空状態 -->
    <ListEmptyState
      v-else-if="!document"
      :type="'loading'"
      :message="'ドキュメントを読み込んでいます'"
      :description="'しばらくお待ちください...'"
      :icon="'pi pi-file-o'"
    />

    <div v-else class="document-content">
      <!-- Breadcrumb行 -->
      <template v-if="repositoryContext">
        <DocumentBreadcrumb 
          :repository-context="repositoryContext"
          :current-path="currentPath"
          :is-root-document="isRootDocument"
          :navigate-to-root="navigateToRootDocument"
        />
      </template>
      
      <!-- メタ情報行 -->
      <template v-if="document && repositoryContext">
        <DocumentMetaInfo 
          :repository-context="repositoryContext"
          :document="currentDocumentState"
        />
      </template>
      
      <template v-if="frontmatter && Object.keys(frontmatter).length > 0">
        <MetaDisplay :data="frontmatter" title="フロントマター" />
      </template>
      
      <template v-if="document">
        <DocumentContent 
          :document="currentDocumentState"
          :current-path="currentPath"
          :document-root="documentRoot"
          :onLinkClick="handleLinkClick"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { extractFrontmatter } from '@/utils/markdown.util';
import { getLogger } from '@/utils/logger.util';
import MetaDisplay from '@/components/common/MetaDisplay.vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import ListLoadingState from '@/components/common/ListLoadingState.vue';
import ListEmptyState from '@/components/common/ListEmptyState.vue';
import DocumentBreadcrumb from './DocumentBreadcrumb.vue';
import DocumentMetaInfo from './DocumentMetaInfo.vue';
import DocumentContent from './DocumentContent.vue';
import { useDocumentNavigation } from '@/composables/useDocumentNavigation';

const logger = getLogger('DocumentViewer');

// Props definition for better component interface
interface DocumentViewerProps {
  // Optional props for external control (when used in isolation)
  repositoryId?: string;
  documentPath?: string;
  refName?: string;  // 'ref' はVueの組み込み属性なので 'refName' に変更
}

// Optional props for external control
const props = withDefaults(defineProps<DocumentViewerProps>(), {
  repositoryId: '',
  documentPath: '',
  refName: 'main'
});

// Document navigation composable with reactive props
const { 
  isLoading,
  currentRepository,
  navigateToDocument,
  handleNavigationError,
  currentDocumentState
} = useDocumentNavigation({
  repositoryId: computed(() => props.repositoryId),
  documentPath: computed(() => props.documentPath),
  ref: computed(() => props.refName)
});

// Unified document data from navigation state
const document = computed(() => currentDocumentState.value?.content);
const error = computed(() => currentDocumentState.value?.error);
const repository = computed(() => currentDocumentState.value?.repository);

// Fallback navigation to root document
const navigateToRootDocument = async () => {
  if (repository.value?.default_branch) {
    await navigateToDocument({ 
      documentPath: 'README.md',  // Default to README
      ref: repository.value.default_branch 
    });
  }
};

// Template computed properties
const isRootDocument = computed(() => {
  return props.documentPath === 'README.md' || props.documentPath === '';
});

const repositoryContext = computed(() => ({
  service: repository.value?.service_type || '',
  owner: repository.value?.owner || '',
  name: repository.value?.name || '',
  path: props.documentPath || '',
  ref: props.refName || ''
}));

const currentPath = computed(() => props.documentPath);
const documentRoot = computed(() => '/');
const frontmatter = computed(() => {
  if (!document.value?.content) return {};
  const { frontmatter } = extractFrontmatter(document.value.content);
  return frontmatter || {};
});

// Simple link handler for DocumentContent
const handleLinkClick = async (event: MouseEvent) => {
  const target = event.target as HTMLAnchorElement;
  if (!target || !target.tagName || target.tagName.toLowerCase() !== 'a') {
    return;
  }

  const linkType = target.getAttribute('data-link-type');
  
  // 外部リンクは通常の動作を許可
  if (linkType === 'external') {
    return;
  }
  
  // アンカーリンクは通常の動作を許可（同一ページ内スクロール）
  if (linkType === 'anchor') {
    return;
  }
  
  // 内部リンクのみナビゲーション処理
  if (linkType === 'internal') {
    event.preventDefault();
    const documentPath = target.getAttribute('data-document-path');
    if (documentPath) {
      await navigateToDocument({ documentPath });
    }
  }
};

// DocumentViewerは純粋なビューコンポーネントとして設計されています
// composablesで状態管理とナビゲーションを分離し、コンポーネントをシンプルに保ちます
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



</style>
