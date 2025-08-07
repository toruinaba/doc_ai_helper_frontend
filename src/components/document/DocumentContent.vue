<template>
  <div class="rendered-content" v-html="renderedContent" @click="handleLinkClick"></div>
</template>

<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { renderMarkdown, extractFrontmatter } from '@/utils/markdown.util';
import { sanitizeHtml, sanitizeQuartoHtml, escapeHtml, processHtmlLinksWithResponsibilityBoundary } from '@/utils/html.util';
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

// ドキュメントタイプ別のレンダリング処理 - 責任分界アプローチ対応
const renderedContent = computed(() => {
  if (!props.document || !props.document.content.content) {
    return '';
  }

  // トランスフォーム済みコンテンツがある場合はそれを使う
  const content = props.document.transformed_content || props.document.content.content;
  
  // ドキュメントタイプに応じてレンダリング方法を切り替え
  switch (props.document.type) {
    case 'markdown':
      // マークダウンの場合 - quartoと同様に常にDOM処理を使用
      const { content: bodyContent } = extractFrontmatter(content);
      
      // 既存のMarkdown変換を使用し、DOM後処理で強制的にリンク属性を修正
      const baseHtml = renderMarkdown(bodyContent);
      
      // 強制的なリンク属性修正を含むDOM処理
      return processHtmlLinksWithResponsibilityBoundary(baseHtml, props.currentPath, props.documentRoot);
      
    case 'quarto':
      // Quartoの場合：HTMLかマークダウンかを判定
      if (content.trim().startsWith('<!DOCTYPE html') || content.trim().startsWith('<html')) {
        // レンダリング済みHTML → Quarto特有の処理でサニタイゼーション
        const sanitizedHtml = sanitizeQuartoHtml(content);
        
        // Quarto HTMLでは常にリンク処理を適用（レガシーモードでも）
        return processHtmlLinksWithResponsibilityBoundary(sanitizedHtml, props.currentPath, props.documentRoot);
      } else {
        // QMD形式 → マークダウンとして処理
        const { content: qmdContent } = extractFrontmatter(content);
        
        // markdownと同じ方式でDOM後処理を適用
        const qmdHtml = renderMarkdown(qmdContent);
        return processHtmlLinksWithResponsibilityBoundary(qmdHtml, props.currentPath, props.documentRoot);
      }
      
    case 'html':
      // HTMLの場合はサニタイゼーション後に表示
      const sanitizedHtml = sanitizeHtml(content);
      
      // HTMLでは常にリンク処理を適用（レガシーモードでも）
      return processHtmlLinksWithResponsibilityBoundary(sanitizedHtml, props.currentPath, props.documentRoot);
      
    default:
      // その他の場合はプレーンテキストとして表示
      return `<pre><code>${escapeHtml(content)}</code></pre>`;
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