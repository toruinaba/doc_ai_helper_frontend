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

    // リンクのレンダリングをカスタマイズ
    link(token) {
      // トークンからhref、title、テキストを取得
      const { href, title, text } = token;
      
      // hrefが存在しない場合や文字列でない場合の対策
      const hrefStr = href ? String(href) : '';
      
      // API URL形式かどうか判定
      const isApiUrl = hrefStr.match(/\/api\/v1\/documents\/contents\//i) || 
                       hrefStr.match(/^http(s)?:\/\/[^/]+\/api\/v1\/documents\/contents\//i);
      
      // 相対パスかどうかの判定を厳密に行う
      const isAbsoluteUrl = hrefStr.match(/^(https?:\/\/|\/\/|mailto:|tel:)/i);
      const isAnchor = hrefStr.startsWith('#');
      
      // 既にAPIエンドポイントのURLになっていないか確認
      const containsApiEndpoint = hrefStr.includes('/api/v1/documents/contents/');
      
      // 外部リンク判定
      const isExternal = isAbsoluteUrl && !containsApiEndpoint && (
        // 現在のホスト名を含まないURLは外部リンクとみなす
        !hrefStr.includes(window.location.hostname) ||
        // 特定のプロトコル形式は外部リンクとみなす
        hrefStr.startsWith('mailto:') || 
        hrefStr.startsWith('tel:')
      );
      
      // リンククラスを決定
      let linkClass = '';
      let processedHref = hrefStr;
      
      if (isExternal) {
        linkClass = 'external-link';
      } else if (isAnchor) {
        linkClass = 'anchor-link';
      } else if (isApiUrl || containsApiEndpoint) {
        linkClass = 'absolute-link';
        
        // APIリンクの場合、ドキュメントパスのみを抽出する
        
        // URL内に完全なAPIパスが含まれている場合（http://localhost:8000/api/v1/documents/contents/mock/example/docs-project/path）
        const fullUrlMatch = hrefStr.match(/https?:\/\/[^/]+\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
        if (fullUrlMatch && fullUrlMatch[1]) {
          processedHref = fullUrlMatch[1];
          console.log(`Extracted path from full API URL: ${processedHref} (original: ${hrefStr})`);
        } else {
          // /api/v1/documents/contents/service/owner/repo/path 形式のURLからパスだけを抽出
          const pathMatch = hrefStr.match(/\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
          if (pathMatch && pathMatch[1]) {
            // APIパスからドキュメントパスだけを抽出
            processedHref = pathMatch[1];
            console.log(`Extracted path from API URL: ${processedHref} (original: ${hrefStr})`);
          } else if (hrefStr.match(/^https?:\/\//)) {
            // それ以外の完全なURL形式で、APIパスが含まれていない場合
            // おそらくhttp://localhost:8000/getting-started.mdのような形式
            try {
              const url = new URL(hrefStr);
              // パスだけを取得（先頭の/は除去）
              processedHref = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
              console.log(`Extracted path from absolute URL: ${processedHref} (original: ${hrefStr})`);
            } catch (e) {
              console.error(`Failed to parse URL: ${hrefStr}`, e);
            }
          }
        }
      } else if (isAbsoluteUrl) {
        // 絶対URLだがAPI URLではないもの
        linkClass = 'absolute-link';
      } else {
        // 上記以外は内部リンク (相対パス) として扱う
        linkClass = 'internal-link';
      }
      
      // 相対パスの場合はそのまま使用し、Vue Routerで処理できるようにする
      const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      const titleAttr = title ? ` title="${title}"` : '';
      
      console.log('Rendering link:', {
        href: hrefStr,
        processedHref,
        text,
        isExternal,
        isAnchor,
        isAbsoluteUrl,
        isApiUrl,
        linkClass,
        title: title || null,
        timestamp: new Date().toISOString()
      });
      
      return `<a href="${processedHref}"${target}${titleAttr} class="${linkClass}" data-original-href="${hrefStr}" data-link-type="${linkClass.replace('-link', '')}">${text}</a>`;
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
