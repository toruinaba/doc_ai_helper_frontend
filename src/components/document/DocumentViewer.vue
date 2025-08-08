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
      :show="isLoading"
      :layout="'content'"
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
import StatusMessage from '@/components/common/StatusMessage.vue';
import ListLoadingState from '@/components/common/ListLoadingState.vue';
import ListEmptyState from '@/components/common/ListEmptyState.vue';
import DocumentBreadcrumb from './DocumentBreadcrumb.vue';
import DocumentMetaInfo from './DocumentMetaInfo.vue';
import DocumentContent from './DocumentContent.vue';

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

// Composables
const {
  document,
  isLoading,
  error,
  repositoryContext,
  frontmatter,
  currentPath,
  documentRoot,
  isRootDocument
} = useDocumentViewerContext();

const {
  handleLinkClick,
  navigateToRootDocument
} = useDocumentViewerNavigation(props);


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
