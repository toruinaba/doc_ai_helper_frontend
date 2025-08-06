/**
 * Markdownユーティリティ
 * 
 * Markdownのレンダリングとシンタックスハイライトを行うユーティリティ関数
 */
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // GitHub風のスタイル
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { shouldProcessDocumentLinksInFrontend, getLinkProcessingConfig } from './config.util';
import { analyzeRawMarkdownLink, isRelativePath, resolveRelativePath } from './link-processing.util';
import { processHtmlLinksWithResponsibilityBoundary } from './html.util';

// Mermaidの初期化
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose'
});

// マークダウンレンダリングの設定
marked.use({
  // カスタムレンダラーの設定
  renderer: {
    // テキストのレンダリングをカスタマイズ（KaTeX処理用）
    text(token) {
      let { text } = token;
      
      // インライン数式 $...$
      text = text.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
        try {
          return katex.renderToString(formula, { throwOnError: false });
        } catch (error) {
          console.error('KaTeX inline error:', error);
          return match;
        }
      });
      
      return text;
    },
    // コードブロックのレンダリングをカスタマイズ
    code(token) {
      // トークンから言語とコードを取得
      const { text: code, lang } = token;
      
      // KaTeX数式ブロックの場合
      if (lang === 'math' || lang === 'latex') {
        try {
          const renderedMath = katex.renderToString(code, { 
            throwOnError: false,
            displayMode: true 
          });
          return `<div class="katex-display">${renderedMath}</div>`;
        } catch (error) {
          console.error('KaTeX block error:', error);
          return `<div class="math-error">Math rendering failed: ${(error as Error).message}</div>`;
        }
      }
      
      // Mermaidダイアグラムの場合
      if (lang === 'mermaid') {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        // レンダリングを次のTickで実行
        setTimeout(async () => {
          try {
            const { svg } = await mermaid.render(id + '-svg', code);
            const element = document.getElementById(id);
            if (element) {
              element.innerHTML = svg;
              element.classList.add('mermaid-rendered');
            }
          } catch (error) {
            console.error('Mermaid rendering error:', error as Error);
            const element = document.getElementById(id);
            if (element) {
              element.innerHTML = `<div class="mermaid-error">Diagram rendering failed: ${(error as Error).message}</div>`;
            }
          }
        }, 0);
        return `<div id="${id}" class="mermaid-diagram">${code}</div>`;
      }
      
      // 言語が指定されている場合はシンタックスハイライトを適用
      const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlightedCode = validLanguage
        ? hljs.highlight(code, { language: validLanguage }).value
        : hljs.highlightAuto(code).value;

      return `<pre class="hljs"><code class="language-${validLanguage}">${highlightedCode}</code></pre>`;
    },

    // リンクのレンダリングをカスタマイズ - 責任分界アプローチ対応
    link(token) {
      // トークンからhref、title、テキストを取得
      const { href, title, text } = token;
      const hrefStr = href ? String(href) : '';
      
      // グローバルに設定された現在のドキュメントパスとドキュメントルートを取得
      const currentPath = (globalThis as any).__currentDocumentPath || '';
      const documentRoot = (globalThis as any).__documentRoot || '';
      
      return renderLinkWithResponsibilityBoundary(hrefStr, text, title || undefined, currentPath, documentRoot);
    }
  },
  // 拡張マークダウン構文（GitHub風）を有効化
  gfm: true,
  // 改行時の動作
  breaks: false,
  // pedanticモード（元のMarkdownの仕様に厳密に従う）を無効化
  pedantic: false
  }
);

/**
 * Markdownをレンダリングしてシンタックスハイライトを適用する
 * @param markdown マークダウン文字列
 * @returns HTMLとして描画される文字列
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) {
    return '';
  }
  
  // $$...$$形式のブロック数式を処理
  let processedMarkdown = markdown.replace(/\$\$([^$]+?)\$\$/g, (match, formula) => {
    try {
      const renderedMath = katex.renderToString(formula.trim(), { 
        throwOnError: false,
        displayMode: true 
      });
      return `<div class="katex-display">${renderedMath}</div>`;
    } catch (error) {
      console.error('KaTeX block error:', error);
      return `<div class="math-error">Math rendering failed: ${(error as Error).message}</div>`;
    }
  });
  
  return marked.parse(processedMarkdown) as string;
}

/**
 * フロントマターを抽出する
 * @param markdown マークダウン文字列
 * @returns フロントマターオブジェクトと本文
 */
export function extractFrontmatter(markdown: string): { 
  frontmatter: Record<string, any> | null; 
  content: string 
} {
  if (!markdown) {
    return { frontmatter: null, content: '' };
  }
  
  // 簡易的なフロントマター抽出（YAMLフロントマターを想定）
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);
  
  if (match) {
    try {
      // この実装では簡易的にフロントマターを処理
      // 実際のアプリケーションではjs-yamlなどのライブラリを使用することを推奨
      const frontmatterLines = match[1].split('\n');
      const frontmatter: Record<string, any> = {};
      
      frontmatterLines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();
          frontmatter[key] = value;
        }
      });
      
      return {
        frontmatter,
        content: match[2]
      };
    } catch (error) {
      console.error('フロントマターのパースに失敗しました', error);
    }
  }
  
  return {
    frontmatter: null,
    content: markdown
  };
}

/**
 * 責任分界アプローチに基づいたリンクレンダリング
 * バックエンド仕様変更対応: transform_links=true は画像CDNのみ変換
 * @param href リンクURL
 * @param text リンクテキスト
 * @param title リンクタイトル
 * @param currentPath 現在のドキュメントパス
 * @returns レンダリングされたHTML
 */
export function renderLinkWithResponsibilityBoundary(
  href: string, 
  text: string, 
  title?: string, 
  currentPath: string = '',
  documentRoot: string = ''
): string {
  const config = getLinkProcessingConfig();
  const shouldProcessDocLinks = shouldProcessDocumentLinksInFrontend();
  
  // バックエンド仕様変更対応: 
  // - transform_links=true: 画像CDNはバックエンドで変換済み
  // - ドキュメントリンクは生のままのためフロントエンドで処理必要
  
  // 1. 外部リンク判定
  if (href.startsWith('http://') || href.startsWith('https://')) {
    const target = ' target="_blank" rel="noopener noreferrer"';
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${target}${titleAttr} class="external-link" data-link-type="external">${text}</a>`;
  }
  
  // 2. アンカーリンク
  if (href.startsWith('#')) {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr} class="anchor-link" data-link-type="anchor">${text}</a>`;
  }
  
  // 3. バックエンドで変換済みAPI URL (レガシーモードや一部ケース)
  if (href.includes('/api/v1/documents/contents/')) {
    // API URLからドキュメントパスを抽出
    const pathMatch = href.match(/\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
    const documentPath = pathMatch && pathMatch[1] ? decodeURIComponent(pathMatch[1]) : href;
    
    if (config.debugMode) {
      console.log(`Processing API URL link: ${href} -> ${documentPath}`);
    }
    
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${documentPath}"${titleAttr} class="internal-link" data-link-type="internal" data-original-href="${href}">${text}</a>`;
  }
  
  // 4. フロントエンドでドキュメントリンク処理が必要な場合
  if (shouldProcessDocLinks) {
    // 生のMarkdownリンクを処理する
    try {
      const linkAnalysis = analyzeRawMarkdownLink(href, currentPath, documentRoot);
      
      if (config.debugMode) {
        console.log(`Processing raw markdown link:`, {
          href,
          currentPath,
          analysis: linkAnalysis,
          mode: config.mode
        });
      }
      
      const titleAttr = title ? ` title="${title}"` : '';
      
      if (linkAnalysis.type === 'external') {
        const target = ' target="_blank" rel="noopener noreferrer"';
        return `<a href="${linkAnalysis.href}"${target}${titleAttr} class="external-link" data-link-type="external">${text}</a>`;
      } else if (linkAnalysis.type === 'anchor') {
        return `<a href="${linkAnalysis.href}"${titleAttr} class="anchor-link" data-link-type="anchor">${text}</a>`;
      } else if (linkAnalysis.type === 'internal' && linkAnalysis.documentPath) {
        // 内部リンク: data-document-path 属性でパス情報を保持
        // ブラウザの相対パス解決を防ぐため、JavaScriptで処理するhrefを使用
        return `<a href="#" data-document-path="${linkAnalysis.documentPath}"${titleAttr} class="internal-link" data-link-type="internal" data-original-href="${href}">${text}</a>`;
      }
    } catch (error) {
      console.error(`Failed to analyze link: ${href}`, error);
      
      // フォールバック: レガシー処理
      if (config.enableFallback) {
        return renderLegacyLink(href, text, title);
      }
    }
  }
  
  // 5. デフォルト: レガシー処理
  return renderLegacyLink(href, text, title);
}

/**
 * レガシーリンク処理 (フォールバック用)
 * @param href リンクURL
 * @param text リンクテキスト
 * @param title リンクタイトル
 * @returns レンダリングされたHTML
 */
function renderLegacyLink(href: string, text: string, title?: string): string {
  const titleAttr = title ? ` title="${title}"` : '';
  
  // 簡単な判定でリンククラスを決定
  if (href.startsWith('http://') || href.startsWith('https://')) {
    const target = ' target="_blank" rel="noopener noreferrer"';
    return `<a href="${href}"${target}${titleAttr} class="external-link">${text}</a>`;
  } else if (href.startsWith('#')) {
    return `<a href="${href}"${titleAttr} class="anchor-link">${text}</a>`;
  } else {
    // フォールバック: data-document-path でパス情報を保持
    // ブラウザの相対パス解決を防ぐため、JavaScriptで処理するhrefを使用
    return `<a href="#" data-document-path="${href}"${titleAttr} class="internal-link" data-original-href="${href}">${text}</a>`;
  }
}

/**
 * 責任分界アプローチ対応のMarkdownレンダリング
 * @param markdown マークダウン文字列
 * @param currentPath 現在のドキュメントパス　(相対パス解決用)
 * @returns HTML文字列
 */
export function renderMarkdownWithResponsibilityBoundary(
  markdown: string, 
  currentPath: string = '',
  documentRoot: string = ''
): string {
  if (!markdown) {
    return '';
  }
  
  // リンク処理をDOM後処理に移行するため、グローバル変数は不要
  // (globalThis as any).__currentDocumentPath = currentPath;
  // (globalThis as any).__documentRoot = documentRoot;
  
  // $$...$$形式のブロック数式を処理
  let processedMarkdown = markdown.replace(/\$\$([^$]+?)\$\$/g, (match, formula) => {
    try {
      const renderedMath = katex.renderToString(formula.trim(), { 
        throwOnError: false,
        displayMode: true 
      });
      return `<div class="katex-display">${renderedMath}</div>`;
    } catch (error) {
      console.error('KaTeX block error:', error);
      return `<div class="math-error">Math rendering failed: ${(error as Error).message}</div>`;
    }
  });
  
  const result = marked.parse(processedMarkdown) as string;
  
  // DOM処理でリンクを変換（quartoと同じ方式）
  const processedHtml = processHtmlLinksWithResponsibilityBoundary(result, currentPath, documentRoot);
  
  return processedHtml;
}
