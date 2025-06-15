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
      <div class="document-header">
        <h1 class="document-title">{{ documentTitle }}</h1>
        <div class="document-meta">
          <span v-if="document.metadata.last_modified" class="last-modified">
            <i class="pi pi-calendar"></i> 
            {{ formatDate(document.metadata.last_modified) }}
          </span>
        </div>
      </div>
      
      <FrontmatterDisplay v-if="frontmatter" :frontmatter="frontmatter" />
      
      <div class="rendered-content" v-html="renderedContent" @click="handleLinkClick"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDocumentStore } from '@/stores/document.store';
import { renderMarkdown, extractFrontmatter } from '@/utils/markdown.util';
import FrontmatterDisplay from './FrontmatterDisplay.vue';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import { types } from '@/services/api';

const documentStore = useDocumentStore();

// 状態を参照
const document = computed(() => documentStore.currentDocument);
const isLoading = computed(() => documentStore.isLoading);
const error = computed(() => documentStore.error);

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

// マークダウンコンテンツとフロントマターを抽出
const renderedContent = computed(() => {
  if (!document.value || !document.value.content.content) {
    return '';
  }

  // トランスフォーム済みコンテンツがある場合はそれを使う
  const content = document.value.transformed_content || document.value.content.content;
  
  // フロントマターを抽出
  const { content: bodyContent } = extractFrontmatter(content);
  
  // マークダウンをレンダリング
  return renderMarkdown(bodyContent);
});

const frontmatter = computed(() => {
  if (!document.value || !document.value.content.content) {
    return null;
  }

  // トランスフォーム済みコンテンツがある場合はそれを使う
  const content = document.value.transformed_content || document.value.content.content;
  
  // フロントマターを抽出
  const { frontmatter } = extractFrontmatter(content);
  
  return frontmatter;
});

/**
 * 日付をフォーマットする
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
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
  padding: 1rem;
  overflow-y: auto;
  background-color: #fff;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.loading-text {
  margin-top: 1rem;
  color: #666;
}

.empty-state-card {
  margin: 2rem auto;
  max-width: 600px;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #999;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.document-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.document-title {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.document-meta {
  color: #666;
  font-size: 0.9rem;
}

.last-modified {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

/* マークダウンコンテンツのスタイル */
.rendered-content {
  line-height: 1.6;
}

.rendered-content :deep(h1),
.rendered-content :deep(h2),
.rendered-content :deep(h3),
.rendered-content :deep(h4),
.rendered-content :deep(h5),
.rendered-content :deep(h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.rendered-content :deep(h1) {
  font-size: 1.8rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.rendered-content :deep(h2) {
  font-size: 1.5rem;
  border-bottom: 1px solid #eee;
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
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
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
  padding: 0.5em 1em;
  border: 1px solid #dfe2e5;
}

.rendered-content :deep(table th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

.rendered-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.rendered-content :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.rendered-content :deep(a:hover) {
  text-decoration: underline;
}

.rendered-content :deep(a.external-link::after) {
  content: '↗';
  display: inline-block;
  margin-left: 0.25em;
  font-size: 0.8em;
}
</style>
