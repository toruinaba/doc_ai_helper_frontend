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
      <div v-if="repositoryContext" class="breadcrumb-row">
        <Breadcrumb :model="breadcrumbItems" class="document-breadcrumb">
          <template #item="{ item }">
            <span v-if="!item.command" class="p-menuitem-text">
              <i v-if="item.icon" :class="item.icon"></i>
              <span v-if="item.label">{{ item.label }}</span>
            </span>
            <span v-else @click="item.command" class="p-menuitem-link" style="cursor: pointer;">
              <i v-if="item.icon" :class="item.icon"></i>
              <span v-if="item.label" class="p-menuitem-text">{{ item.label }}</span>
            </span>
          </template>
        </Breadcrumb>
      </div>
      
      <!-- メタ情報行 -->
      <div v-if="repositoryContext" class="meta-row">
        <span v-if="repositoryContext.ref" class="branch-info">
          <i class="pi pi-code-branch"></i>
          {{ repositoryContext.ref }} ブランチ
        </span>
        <span v-if="document.metadata.last_modified" class="last-modified">
          <i class="pi pi-calendar"></i>
          最終更新: {{ formatDate(document.metadata.last_modified) }}
        </span>
        <span v-if="document.metadata.size" class="file-size">
          <i class="pi pi-file"></i>
          {{ formatFileSize(document.metadata.size) }}
        </span>
        <span v-if="document.type" class="document-type">
          <i class="pi pi-tag"></i>
          {{ getDocumentTypeLabel(document.type) }}
        </span>
      </div>
      
      <FrontmatterDisplay v-if="frontmatter" :frontmatter="frontmatter" />
      
      <div class="rendered-content" v-html="renderedContent" @click="handleLinkClick"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useDocumentStore } from '@/stores/document.store';
import { useRepositoryStore } from '@/stores/repository.store';
import { useDocumentRouter } from '@/composables/useDocumentRouter';
import { renderMarkdown, extractFrontmatter } from '@/utils/markdown.util';
import { sanitizeHtml, sanitizeQuartoHtml, escapeHtml, processHtmlLinksWithResponsibilityBoundary } from '@/utils/html.util';
import mermaid from 'mermaid';
import { DateFormatter } from '@/utils/date-formatter.util';
import FrontmatterDisplay from './FrontmatterDisplay.vue';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Breadcrumb from 'primevue/breadcrumb';

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

// ドキュメントタイプ別のレンダリング処理 - 責任分界アプローチ対応
const renderedContent = computed(() => {
  if (!document.value || !document.value.content.content) {
    return '';
  }

  // トランスフォーム済みコンテンツがある場合はそれを使う
  const content = document.value.transformed_content || document.value.content.content;
  
  // 現在のドキュメントパスを取得 (相対パス解決用)
  const currentPath = document.value.path || '';
  
  // ドキュメントルートを取得
  const selectedRepo = repositoryStore.selectedRepository;
  const documentRoot = selectedRepo?.document_root_directory || 
                      currentPath.split('/').slice(0, -1).join('/');
  
  // フィールド構造：
  // 1. document_root_directory: ドキュメントベースディレクトリ（例："docs"）
  // 2. root_document_path: メインドキュメントファイル（例："walkthrough.html"）
  
  // ドキュメントタイプに応じてレンダリング方法を切り替え
  switch (document.value.type) {
    case 'markdown':
      // マークダウンの場合 - quartoと同様に常にDOM処理を使用
      const { content: bodyContent } = extractFrontmatter(content);
      
      // 既存のMarkdown変換を使用し、DOM後処理で強制的にリンク属性を修正
      const baseHtml = renderMarkdown(bodyContent);
      
      // 強制的なリンク属性修正を含むDOM処理
      return processHtmlLinksWithResponsibilityBoundary(baseHtml, currentPath, documentRoot);
      
    case 'quarto':
      // Quartoの場合：HTMLかマークダウンかを判定
      if (content.trim().startsWith('<!DOCTYPE html') || content.trim().startsWith('<html')) {
        // レンダリング済みHTML → Quarto特有の処理でサニタイゼーション
        const sanitizedHtml = sanitizeQuartoHtml(content);
        
        // Quarto HTMLでは常にリンク処理を適用（レガシーモードでも）
        return processHtmlLinksWithResponsibilityBoundary(sanitizedHtml, currentPath, documentRoot);
      } else {
        // QMD形式 → マークダウンとして処理
        const { content: qmdContent } = extractFrontmatter(content);
        
        // markdownと同じ方式でDOM後処理を適用
        const qmdHtml = renderMarkdown(qmdContent);
        return processHtmlLinksWithResponsibilityBoundary(qmdHtml, currentPath, documentRoot);
      }
      
    case 'html':
      // HTMLの場合はサニタイゼーション後に表示
      const sanitizedHtml = sanitizeHtml(content);
      
      // HTMLでは常にリンク処理を適用（レガシーモードでも）
      return processHtmlLinksWithResponsibilityBoundary(sanitizedHtml, currentPath, documentRoot);
      
    default:
      // その他の場合はプレーンテキストとして表示
      return `<pre><code>${escapeHtml(content)}</code></pre>`;
  }
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
  const content = document.value.transformed_content || document.value.content.content;
  
  // フロントマターを抽出（markdown/quartoのみ）
  const { frontmatter } = extractFrontmatter(content);
  
  return frontmatter;
});

// 現在のパスとルートパス
const currentPath = computed(() => {
  return repositoryContext.value?.current_path || document.value?.path || '';
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

// Breadcrumbアイテム
const breadcrumbItems = computed(() => {
  const items: Array<{
    label?: string;
    icon?: string;
    command?: () => void;
  }> = [];
  
  if (!currentPath.value) {
    return items;
  }

  // リポジトリルートを追加（アイコンのみ）
  items.push({
    icon: 'pi pi-home',
    command: !isRootDocument.value ? async () => await navigateToRootDocument() : undefined
  });

  // パスを分割してBreadcrumbを構築
  const pathParts = currentPath.value.split('/').filter(part => part !== '');
  
  if (pathParts.length > 1) {
    // ディレクトリ部分（最後のファイル以外）
    for (let i = 0; i < pathParts.length - 1; i++) {
      items.push({
        label: pathParts[i],
        // 途中のディレクトリにはナビゲーション機能は付けない（要求仕様通り）
      });
    }
  }
  
  // 現在のファイル
  if (pathParts.length > 0) {
    const fileName = pathParts[pathParts.length - 1];
    items.push({
      label: fileName.replace(/\.[^/.]+$/, ''), // 拡張子を除去
    });
  }

  return items;
});

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
      stack: error.stack
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

// レンダリングされたコンテンツが変更されたときにMermaidダイアグラムを処理
watch(renderedContent, () => {
  nextTick(() => {
    // 新しいMermaidダイアグラムがある場合は再レンダリング
    const mermaidElements = document.querySelectorAll('.mermaid-diagram:not(.mermaid-rendered)');
    if (mermaidElements.length > 0) {
      try {
        mermaid.run();
      } catch (error) {
        console.error('Error running mermaid:', error);
      }
    }
  });
});

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

.breadcrumb-row {
  margin-bottom: var(--app-spacing-xs);
  padding-bottom: var(--app-spacing-xs);
}

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

.document-meta {
  color: var(--app-text-color-secondary);
  font-size: var(--app-font-size-sm);
  display: flex;
  gap: var(--app-spacing-base);
  flex-wrap: wrap;
}

.document-breadcrumb {
  width: 100%;
}

.breadcrumb-row :deep(.p-breadcrumb) {
  background: none;
  border: none;
  padding: 0;
}

.breadcrumb-row :deep(.p-breadcrumb .p-breadcrumb-list) {
  margin: 0;
}

.breadcrumb-row :deep(.p-menuitem-text) {
  font-size: var(--app-font-size-base);
  color: var(--app-text-color);
  font-weight: 500;
}

.breadcrumb-row :deep(.p-menuitem-link) {
  color: var(--app-primary-color);
  text-decoration: none;
  border-radius: var(--app-border-radius-sm);
  padding: var(--app-spacing-xs) var(--app-spacing-sm);
  transition: var(--app-transition-fast);
}

.breadcrumb-row :deep(.p-menuitem-link:hover) {
  background-color: var(--app-primary-50);
}

.breadcrumb-row :deep(.p-menuitem-text i) {
  font-size: 1.1rem;
  color: var(--app-primary-color);
  margin-right: var(--app-spacing-xs);
}

.breadcrumb-row :deep(.p-menuitem-link i) {
  font-size: 1.1rem;
  color: var(--app-primary-color);
  transition: var(--app-transition-fast);
}

.breadcrumb-row :deep(.p-menuitem-link:hover i) {
  color: var(--app-primary-600);
}

.last-modified,
.document-path {
  display: inline-flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}

/* レンダリング済みコンテンツのスタイル（マークダウン・HTML共通） */
.rendered-content {
  line-height: 1.6;
}

/* HTML表示用の基本スタイル */
.rendered-content :deep(body) {
  margin: 0;
  padding: 0;
  font-family: inherit;
  line-height: inherit;
  color: inherit;
  background: transparent;
}

.rendered-content :deep(html) {
  font-size: inherit;
  color: inherit;
  background: transparent;
}

.rendered-content :deep(h1),
.rendered-content :deep(h2),
.rendered-content :deep(h3),
.rendered-content :deep(h4),
.rendered-content :deep(h5),
.rendered-content :deep(h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: var(--app-text-color);
}

.rendered-content :deep(h1) {
  font-size: var(--app-font-size-2xl);
  border-bottom: 1px solid var(--app-surface-border);
  padding-bottom: 0.3em;
}

.rendered-content :deep(h2) {
  font-size: var(--app-font-size-xl);
  border-bottom: 1px solid var(--app-surface-border);
  padding-bottom: 0.3em;
}

.rendered-content :deep(p) {
  margin: 1em 0;
}

.rendered-content :deep(ul),
.rendered-content :deep(ol) {
  padding-left: 2em;
  margin: 1em 0;
}

.rendered-content :deep(li) {
  margin: 0.5em 0;
}

.rendered-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0 var(--app-spacing-base);
  color: var(--app-text-color-secondary);
  border-left: 0.25em solid var(--app-surface-border);
}

.rendered-content :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
}

.rendered-content :deep(pre) {
  margin: 1em 0;
  border-radius: 3px;
}

.rendered-content :deep(pre code) {
  padding: 0;
  background-color: transparent;
}

.rendered-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.rendered-content :deep(table th),
.rendered-content :deep(table td) {
  padding: var(--app-spacing-sm) var(--app-spacing-base);
  border: 1px solid var(--app-surface-border);
}

.rendered-content :deep(table th) {
  background-color: var(--app-surface-100);
  font-weight: 600;
  color: var(--app-text-color);
}

.rendered-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.rendered-content :deep(a) {
  color: var(--app-primary-color);
  text-decoration: none;
  transition: var(--app-transition-fast);
}

.rendered-content :deep(a:hover) {
  text-decoration: underline;
  color: var(--app-primary-600);
}

.rendered-content :deep(a.external-link::after) {
  content: '↗';
  display: inline-block;
  margin-left: var(--app-spacing-xs);
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-muted);
}

/* HTML特有の要素のスタイル調整 */
.rendered-content :deep(div),
.rendered-content :deep(section),
.rendered-content :deep(article),
.rendered-content :deep(aside),
.rendered-content :deep(header),
.rendered-content :deep(footer),
.rendered-content :deep(main),
.rendered-content :deep(nav) {
  margin: 0;
  padding: 0;
}

.rendered-content :deep(figure) {
  margin: 1em 0;
}

.rendered-content :deep(figcaption) {
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
  text-align: center;
  margin-top: var(--app-spacing-xs);
}

/* Quarto特有の要素のスタイル調整 */
.rendered-content :deep(.quarto-container) {
  max-width: 100%;
  margin: 0 auto;
}

.rendered-content :deep(.quarto-title-block) {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--app-surface-border);
}

.rendered-content :deep(.quarto-title) h1 {
  font-size: var(--app-font-size-3xl);
  margin-bottom: 0.5rem;
  color: var(--app-text-color);
}

.rendered-content :deep(.quarto-title-meta) {
  color: var(--app-text-color-secondary);
  font-size: var(--app-font-size-sm);
}

.rendered-content :deep(.quarto-alternate-formats) {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--app-surface-100);
  border-radius: var(--app-border-radius);
}

.rendered-content :deep(.quarto-alternate-formats) h2 {
  font-size: var(--app-font-size-lg);
  margin-bottom: 0.5rem;
  color: var(--app-text-color);
}

.rendered-content :deep(.quarto-alternate-formats) ul {
  margin: 0;
  padding-left: 1.5rem;
}

.rendered-content :deep(.quarto-alternate-formats) a {
  color: var(--app-primary-color);
  text-decoration: none;
}

.rendered-content :deep(.quarto-alternate-formats) a:hover {
  text-decoration: underline;
}

/* Quarto margin sidebar（サイドバー要素）の調整 */
.rendered-content :deep(.quarto-margin-sidebar) {
  display: none; /* フロントエンドでは非表示 */
}

/* Quarto アンカーリンクの調整 */
.rendered-content :deep(.anchored) {
  position: relative;
}

.rendered-content :deep(.anchored:hover::after) {
  content: '🔗';
  position: absolute;
  left: -1.5em;
  color: var(--app-text-color-muted);
  font-size: 0.8em;
}

/* KaTeX数式のスタイル */
.rendered-content :deep(.katex) {
  font-size: 1.1em;
}

.rendered-content :deep(.katex-display) {
  margin: 1em 0;
  text-align: center;
}

/* Mermaidダイアグラムのスタイル */
.rendered-content :deep(.mermaid-diagram) {
  text-align: center;
  margin: 1.5em 0;
  padding: var(--app-spacing-base);
  background-color: var(--app-surface-0);
  border-radius: var(--app-border-radius);
  border: 1px solid var(--app-surface-border);
}

.rendered-content :deep(.mermaid-diagram svg) {
  max-width: 100%;
  height: auto;
}

.rendered-content :deep(.mermaid-error) {
  color: var(--app-text-color-error, #dc3545);
  background-color: var(--app-surface-error, #f8d7da);
  border: 1px solid var(--app-border-error, #f5c6cb);
  border-radius: var(--app-border-radius);
  padding: var(--app-spacing-base);
  margin: 1em 0;
  font-family: monospace;
  font-size: var(--app-font-size-sm);
}

.rendered-content :deep(.math-error) {
  color: var(--app-text-color-error, #dc3545);
  background-color: var(--app-surface-error, #f8d7da);
  border: 1px solid var(--app-border-error, #f5c6cb);
  border-radius: var(--app-border-radius);
  padding: var(--app-spacing-base);
  margin: 1em 0;
  font-family: monospace;
  font-size: var(--app-font-size-sm);
}
</style>
