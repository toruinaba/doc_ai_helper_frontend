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
import { ref, computed, onMounted, watch } from 'vue';
import { useDocumentStore } from '@/stores/document.store';
import { useRepositoryStore } from '@/stores/repository.store';
import { renderMarkdown, extractFrontmatter } from '@/utils/markdown.util';
import { sanitizeHtml, escapeHtml } from '@/utils/html.util';
import { DateFormatter } from '@/utils/date-formatter.util';
import FrontmatterDisplay from './FrontmatterDisplay.vue';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import { types } from '@/services/api';

const documentStore = useDocumentStore();
const repositoryStore = useRepositoryStore();

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

// ドキュメントタイプ別のレンダリング処理
const renderedContent = computed(() => {
  if (!document.value || !document.value.content.content) {
    return '';
  }

  // トランスフォーム済みコンテンツがある場合はそれを使う
  const content = document.value.transformed_content || document.value.content.content;
  
  // ドキュメントタイプに応じてレンダリング方法を切り替え
  switch (document.value.type) {
    case 'markdown':
    case 'quarto':
      // マークダウン/Quartoの場合は既存の処理
      const { content: bodyContent } = extractFrontmatter(content);
      return renderMarkdown(bodyContent);
      
    case 'html':
      // HTMLの場合はサニタイゼーション後に表示
      return sanitizeHtml(content);
      
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
  // リポジトリのroot_pathが設定されている場合はそれを使用（ファイルパス想定）
  const selectedRepo = repositoryStore.selectedRepository;
  if (selectedRepo?.root_path) {
    return selectedRepo.root_path;
  }
  
  // デフォルトドキュメントの候補（優先順位順）
  return 'README.md'; // 最も一般的なルートドキュメント
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
    command: !isRootDocument.value ? () => navigateToRoot() : undefined
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
 * リンククリック時の処理
 */
function handleLinkClick(event: MouseEvent) {
  // リンク要素をクリックした場合の処理
  if (event.target instanceof HTMLAnchorElement) {
    const link = event.target;
    const href = link.getAttribute('href');
    
    console.log('Link clicked:', {
      href,
      classList: Array.from(link.classList),
      isExternal: link.classList.contains('external-link'),
      isInternal: link.classList.contains('internal-link'),
      isAnchor: link.classList.contains('anchor-link'),
      isAbsolute: link.classList.contains('absolute-link'),
      timestamp: new Date().toISOString(),
      clientX: event.clientX,
      clientY: event.clientY,
      elementText: link.textContent,
      currentPath: documentStore.currentPath
    });
    
    // リンク種類ごとの処理
    if (!href) {
      // hrefが存在しない場合は何もしない
      return;
    }
    
    // 1. 外部リンク: デフォルトの挙動（新しいタブで開く）
    if (link.classList.contains('external-link')) {
      console.log('Opening external link:', href);
      return; // デフォルトの挙動を許可
    }
    
    // 2. アンカーリンク: ページ内ジャンプ
    if (link.classList.contains('anchor-link')) {
      console.log('Navigating to anchor:', href);
      // デフォルトの挙動を許可（ページ内ジャンプ）
      return;
    }
    
    // 3. 絶対パスだがサイト内リンク: フロントエンドで処理
    if (link.classList.contains('absolute-link')) {
      event.preventDefault();
      
      // 絶対パスからドキュメントのパス部分だけを抽出
      let documentPath = href || '';
      
      // "/api/v1/documents/contents/service/owner/repo/path" 形式のURLからパスだけを抽出
      const pathMatch = documentPath.match(/\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
      if (pathMatch && pathMatch[1]) {
        documentPath = pathMatch[1];
        console.log(`Extracted path from API URL pattern: ${documentPath}`);
      }
      // http(s)://host/api/v1/documents/contents/... 形式のURLからも抽出
      else {
        const fullUrlMatch = documentPath.match(/https?:\/\/[^/]+\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
        if (fullUrlMatch && fullUrlMatch[1]) {
          documentPath = fullUrlMatch[1];
          console.log(`Extracted path from full API URL pattern: ${documentPath}`);
        }
        // 完全なURL形式で、APIパスが含まれていない場合（例：http://localhost:8000/getting-started.md）
        else if (documentPath.match(/^https?:\/\//)) {
          try {
            const url = new URL(documentPath);
            // パスだけを取得（先頭の/は除去）
            documentPath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
            console.log(`Extracted path from absolute URL: ${documentPath}`);
          } catch (e) {
            console.error(`Failed to parse URL: ${documentPath}`, e);
          }
        }
      }
      
      console.log('Navigating to absolute path within site:', {
        href,
        extractedPath: documentPath,
        from: documentStore.currentPath,
        timestamp: new Date().toISOString()
      });
      
      // 直接fetchDocumentを呼び出す代わりに、currentPathを更新する
      // watchがパスの変更を検知して自動的にfetchDocumentを呼び出す
      documentStore.currentPath = documentPath;
      return;
    }
    
    // 4. 内部リンク: ドキュメントを取得
    if (link.classList.contains('internal-link')) {
      event.preventDefault();
      
      // 内部リンクの場合、相対パスが与えられているので、そのままfetchDocumentに渡す
      // ただしAPIパスが含まれている可能性があるのでチェック
      let documentPath = href || '';
      
      // API URLパターンのチェック (絶対URL形式)
      const fullUrlMatch = documentPath.match(/https?:\/\/[^/]+\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
      if (fullUrlMatch && fullUrlMatch[1]) {
        documentPath = fullUrlMatch[1];
        console.log(`Extracted path from full URL in internal link: ${documentPath}`);
      }
      
      // API URLパターンのチェック (相対パス形式)
      const pathMatch = documentPath.match(/\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
      if (pathMatch && pathMatch[1]) {
        documentPath = pathMatch[1];
        console.log(`Extracted path from API path in internal link: ${documentPath}`);
      }
      
      // 相対パス解決: 現在のドキュメントのパスを基準に相対パスを解決
      if (documentPath.startsWith('./') || documentPath.startsWith('../') || !documentPath.startsWith('/')) {
        const currentDir = documentStore.currentPath.split('/').slice(0, -1).join('/');
        let resolvedPath = documentPath;
        
        if (documentPath.startsWith('./')) {
          // ./path 形式 -> 現在のディレクトリからの相対パス
          resolvedPath = documentPath.substring(2);
          if (currentDir) {
            resolvedPath = `${currentDir}/${resolvedPath}`;
          }
        } else if (documentPath.startsWith('../')) {
          // ../path 形式 -> 親ディレクトリからの相対パス
          // 簡易的な実装のため、複数の ../が連続する場合は完全には対応しない
          resolvedPath = currentDir.split('/').slice(0, -1).join('/') + '/' + documentPath.substring(3);
        } else if (!documentPath.startsWith('/')) {
          // path 形式 -> 現在のディレクトリからの相対パス
          if (currentDir) {
            resolvedPath = `${currentDir}/${documentPath}`;
          }
        }
        
        console.log(`Resolved relative path: ${resolvedPath} from ${documentPath} (current: ${documentStore.currentPath})`);
        documentPath = resolvedPath;
      }
      
      console.log('Navigating to internal link:', {
        href,
        cleanedPath: documentPath,
        from: documentStore.currentPath,
        timestamp: new Date().toISOString()
      });
      
      // 直接fetchDocumentを呼び出す代わりに、currentPathを更新する
      // watchがパスの変更を検知して自動的にfetchDocumentを呼び出す
      documentStore.currentPath = documentPath;
    }
  }
}

/**
 * ルートドキュメントに移動
 */
async function navigateToRoot() {
  const selectedRepo = repositoryStore.selectedRepository;
  if (!selectedRepo) {
    console.warn('No repository selected');
    return;
  }

  try {
    console.log(`Navigating to root document: ${rootPath.value}`);
    
    // ドキュメントストアのcurrentPathを更新（watcherが自動的にドキュメントを取得）
    documentStore.currentPath = rootPath.value;
    
  } catch (error) {
    console.error('Failed to navigate to root document:', error);
  }
}

// パラメータが変更されたときにドキュメントを再取得
watch(
  () => [
    documentStore.currentService,
    documentStore.currentOwner,
    documentStore.currentRepo,
    documentStore.currentPath
  ],
  ([service, owner, repo, path], oldValues) => {
    // サービス、オーナー、リポジトリ、パスがすべて設定されていて、かつ
    // パスが変更された場合のみフェッチする
    if (service && owner && repo && path) {
      const [oldService, oldOwner, oldRepo, oldPath] = oldValues || [];
      
      // 同じパスへのリクエストは無視（二重リクエスト防止）
      if (path !== oldPath || service !== oldService || owner !== oldOwner || repo !== oldRepo) {
        console.log(`Path or repository changed, fetching document: ${path} (previous: ${oldPath})`, {
          service, oldService,
          owner, oldOwner,
          repo, oldRepo,
          timestamp: new Date().toISOString()
        });
        documentStore.fetchDocument(path);
      } else {
        console.log(`Ignoring duplicate request for the same path: ${path}`, {
          timestamp: new Date().toISOString()
        });
      }
    }
  }
);
</script>

<style scoped>
.document-viewer-container {
  height: 100%;
  padding: var(--app-spacing-base);
  overflow-y: auto;
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
</style>
