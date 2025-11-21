<template>
  <div>
    <!-- エラー表示はPrimeVue Messageコンポーネント使用 -->
    <Message v-if="hasError" severity="error" :closable="false">
      <div>
        <h6 style="margin: 0 0 0.5rem 0; font-weight: 600;">{{ errorTitle }}</h6>
        <p style="margin: 0; font-size: 0.875rem;">{{ errorMessage }}</p>
      </div>
    </Message>
    
    <!-- 正常なコンテンツ表示 -->
    <div v-else class="rendered-content markdown-content" v-html="renderedContent" @click="handleLinkClick"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, watch, ref } from 'vue';
import { renderMarkdown, extractFrontmatter } from '@/utils/markdown.util';
import { sanitizeHtml, sanitizeQuartoHtml, escapeHtml, processHtmlLinksWithResponsibilityBoundary } from '@/utils/html.util';
import Message from 'primevue/message';
import mermaid from 'mermaid';

interface Props {
  /** ドキュメント情報 */
  document: any;
  /** 現在のパス */
  currentPath: string;
  /** ドキュメントルート */
  documentRoot: string;
  /** リンククリックハンドラー */
  onLinkClick?: (event: MouseEvent) => Promise<void>;
}

const props = defineProps<Props>();

// エラー状態管理
const errorTitle = ref('');
const errorMessage = ref('');
const hasError = computed(() => errorTitle.value || errorMessage.value);

// ドキュメントタイプ別のレンダリング処理
const renderedContent = computed(() => {
  const documentData = props.document.content || props.document;
  const documentContent = documentData?.content?.content || documentData?.content;
  
  const documentType = props.document.type || 
                      props.document?.content?.type || 
                      documentData?.type;
  
  if (!documentContent) {
    return '';
  }

  // エラー状態をクリア
  errorTitle.value = '';
  errorMessage.value = '';
  if (!documentType || documentType === 'unknown') {
    console.error('Document type is undefined or unknown:', documentType);
    errorTitle.value = 'ドキュメントタイプエラー';
    errorMessage.value = 'ドキュメントのタイプが特定できません。';
    return '';
  }

  const content = documentData.transformed_content || documentContent;
  
  switch (documentType) {
    case 'markdown':
      const { content: bodyContent } = extractFrontmatter(content);
      const baseHtml = renderMarkdown(bodyContent);
      return processHtmlLinksWithResponsibilityBoundary(baseHtml, props.currentPath, props.documentRoot);
      
    case 'quarto':
      const isHtml = content.trim().startsWith('<!DOCTYPE html') || content.trim().startsWith('<html');
      
      if (isHtml) {
        const sanitizedHtml = sanitizeQuartoHtml(content);
        return processHtmlLinksWithResponsibilityBoundary(sanitizedHtml, props.currentPath, props.documentRoot);
      } else {
        const { content: qmdContent } = extractFrontmatter(content);
        const qmdHtml = renderMarkdown(qmdContent);
        return processHtmlLinksWithResponsibilityBoundary(qmdHtml, props.currentPath, props.documentRoot);
      }
      
    case 'html':
      // HTMLの場合はサニタイゼーション後に表示
      const sanitizedHtml = sanitizeHtml(content);
      const processedHtml = processHtmlLinksWithResponsibilityBoundary(sanitizedHtml, props.currentPath, props.documentRoot);
      return processedHtml;
      
    case 'other':
      // 'other'の場合、ファイル拡張子から判定
      const filePath = props.currentPath || '';
      if (filePath.endsWith('.md') || filePath.endsWith('.markdown') || filePath.endsWith('.qmd')) {
        // マークダウンファイルの場合はマークダウンとして処理
        const { content: bodyContent } = extractFrontmatter(content);
        const baseHtml = renderMarkdown(bodyContent);
        return processHtmlLinksWithResponsibilityBoundary(baseHtml, props.currentPath, props.documentRoot);
      } else {
        // その他はプレーンテキストとして表示
        return `<pre><code>${escapeHtml(content)}</code></pre>`;
      }
      
    default:
      // 予期しないdocumentTypeの場合はエラー処理
      console.error('Unexpected document type:', documentType);
      errorTitle.value = '未対応のドキュメントタイプ';
      errorMessage.value = `ドキュメントタイプ '${documentType}' は対応していません。`;
      return '';
  }
});

/**
 * リンククリック時の処理
 */
async function handleLinkClick(event: MouseEvent) {
  if (props.onLinkClick) {
    await props.onLinkClick(event);
  }
}

// レンダリングされたコンテンツが変更されたときにMermaidダイアグラムを処理
watch(renderedContent, () => {
  nextTick(() => {
    // 新しいMermaidダイアグラムがある場合は再レンダリング
    const mermaidElements = globalThis.document.querySelectorAll('.mermaid-diagram:not(.mermaid-rendered)');
    if (mermaidElements.length > 0) {
      try {
        mermaid.run();
      } catch (error) {
        console.error('Error running mermaid:', error);
      }
    }
  });
});
</script>

<style scoped>
/* レンダリング済みコンテンツのスタイル（マークダウン・HTML共通） */
/* 基本的なマークダウンスタイルはmarkdown.cssから適用される */

/* コンポーネント固有のオーバーライド */
.rendered-content :deep(li) {
  margin: 0.5em 0; /* markdown.cssより広めのマージン */
}

.rendered-content :deep(blockquote) {
  padding: 0 var(--app-spacing-base);
  color: var(--app-text-color-secondary);
  border-left: 0.25em solid var(--app-surface-border);
}

.rendered-content :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
}

.rendered-content :deep(table th),
.rendered-content :deep(table td) {
  padding: var(--app-spacing-sm) var(--app-spacing-base);
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
}

.rendered-content :deep(.quarto-alternate-formats) {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--app-surface-100);
  border-radius: var(--app-border-radius);
}

.rendered-content :deep(.quarto-alternate-formats) ul {
  margin: 0;
  padding-left: 1.5rem;
}

.rendered-content :deep(.quarto-margin-sidebar) {
  display: none;
}

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

/* KaTeX数式のスタイル - markdown.cssでカバー済み */
.rendered-content :deep(.katex) {
  font-size: 1.1em; /* コンポーネント固有のサイズ調整 */
}

/* Mermaidダイアグラムのスタイル */
.rendered-content :deep(.mermaid-diagram) {
  margin: 1.5em 0;
  padding: var(--app-spacing-base);
  background-color: var(--app-surface-0);
  border-radius: var(--app-border-radius);
  border: 1px solid var(--app-surface-border);
}

/* エラー表示はPrimeVue Messageコンポーネントで処理済み */

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