<template>
  <div v-if="repositoryContext" class="meta-row">
    <span v-if="repositoryContext.ref" class="branch-info">
      <i class="pi pi-code-branch"></i>
      {{ repositoryContext.ref }} ブランチ
    </span>
    <span v-if="document?.metadata?.last_modified" class="last-modified">
      <i class="pi pi-calendar"></i>
      最終更新: {{ formatDate(document.metadata.last_modified) }}
    </span>
    <span v-if="document?.metadata?.size" class="file-size">
      <i class="pi pi-file"></i>
      {{ formatFileSize(document.metadata.size) }}
    </span>
    <span v-if="document?.type" class="document-type">
      <i class="pi pi-tag"></i>
      {{ getDocumentTypeLabel(document.type) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { DateFormatter } from '@/utils/date-formatter.util';

interface Props {
  /** リポジトリコンテキスト */
  repositoryContext: any;
  /** ドキュメント情報 */
  document: any;
}

defineProps<Props>();

/**
 * 日付をフォーマットする
 */
function formatDate(dateString: string): string {
  return DateFormatter.documentDate(dateString, { fallback: dateString });
}

/**
 * ファイルサイズをフォーマットする
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * ドキュメントタイプのラベルを取得
 */
function getDocumentTypeLabel(type: string): string {
  switch (type) {
    case 'markdown':
      return 'Markdown';
    case 'quarto':
      return 'Quarto';
    case 'html':
      return 'HTML';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
</script>

<style scoped>
.meta-row {
  display: flex;
  gap: var(--app-spacing-lg);
  flex-wrap: wrap;
  align-items: center;
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
  margin-bottom: var(--app-spacing-base);
  padding-bottom: var(--app-spacing-base);
  border-bottom: 1px solid var(--app-surface-border);
}

.meta-row > span {
  display: inline-flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}

.meta-row i {
  color: var(--app-primary-color);
}

.branch-info {
  font-weight: 500;
}

.document-type {
  font-weight: 500;
  color: var(--app-primary-color);
}

.last-modified,
.document-path {
  display: inline-flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}
</style>