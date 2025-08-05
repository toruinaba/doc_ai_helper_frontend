/**
 * HTML処理ユーティリティ
 * HTMLドキュメントの表示とセキュリティ対策のための関数群
 */

/**
 * HTMLエスケープ
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 基本的なHTMLサニタイゼーション
 * セキュリティリスクのあるタグと属性を除去
 */
export function sanitizeHtml(html: string): string {
  let sanitized = html;
  
  // 1. script タグとその内容を完全に除去
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 2. style タグとその内容を完全に除去（インラインスタイルは保持）
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // 3. 危険なタグを除去（タグのみ、内容が残らないように）
  const dangerousTagsWithContent = [
    'iframe', 'embed', 'object', 'applet', 'form'
  ];
  
  dangerousTagsWithContent.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // 4. 危険なタグを除去（単一タグ）
  const dangerousSingleTags = [
    'input', 'button', 'textarea', 'select', 'option',
    'meta', 'link', 'base'
  ];
  
  dangerousSingleTags.forEach(tag => {
    const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // 5. 危険な属性を除去
  const dangerousAttributes = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onreset', 'onselect', 'onunload',
    'onmousedown', 'onmouseup', 'ondblclick', 'oncontextmenu'
  ];
  
  dangerousAttributes.forEach(attr => {
    const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // 6. javascript:やdata:URLの除去
  sanitized = sanitized.replace(/href\s*=\s*["']?javascript:[^"'\s>]*/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']?javascript:[^"'\s>]*/gi, 'src="#"');
  sanitized = sanitized.replace(/href\s*=\s*["']?data:[^"'\s>]*/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']?data:[^"'\s>]*/gi, 'src="#"');
  
  return sanitized;
}

/**
 * Quarto特有の要素を処理
 * Quartoドキュメントの表示に必要な要素を保持しつつ、不要な要素を除去
 */
export function sanitizeQuartoHtml(html: string): string {
  let sanitized = sanitizeHtml(html);
  
  // Quartoの検索設定JSONを除去（表示されてしまう問題を解決）
  sanitized = sanitized.replace(/<script[^>]*id=["']quarto-search-options["'][^>]*>[\s\S]*?<\/script>/gi, '');
  
  // その他のQuarto設定スクリプトも除去
  sanitized = sanitized.replace(/<script[^>]*id=["']quarto-[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
  
  // 不要なQuarto要素を除去
  sanitized = sanitized.replace(/<div[^>]*id=["']quarto-search-results["'][^>]*><\/div>/gi, '');
  
  return sanitized;
}

/**
 * HTMLドキュメント内のリンクを処理する
 * 責任分界アプローチで内部リンクにdata-document-path属性を追加
 * @param html HTML文字列
 * @param currentPath 現在のドキュメントパス
 * @returns リンク処理済みHTML
 */
export function processHtmlLinksWithResponsibilityBoundary(html: string, currentPath: string = ''): string {
  if (!html) return html;
  
  console.log('Processing HTML links with responsibility boundary:', {
    currentPath,
    htmlLength: html.length,
    timestamp: new Date().toISOString()
  });
  
  // HTMLをDOMとして解析
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = doc.querySelectorAll('a[href]');
  
  console.log(`Found ${links.length} links to process`);
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    // 外部リンク
    if (href.startsWith('http://') || href.startsWith('https://')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.classList.add('external-link');
      link.setAttribute('data-link-type', 'external');
      return;
    }
    
    // アンカーリンク
    if (href.startsWith('#')) {
      link.classList.add('anchor-link');
      link.setAttribute('data-link-type', 'anchor');
      return;
    }
    
    // API URL
    if (href.includes('/api/v1/documents/contents/')) {
      const pathMatch = href.match(/\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
      const documentPath = pathMatch && pathMatch[1] ? decodeURIComponent(pathMatch[1]) : href;
      
      link.setAttribute('href', '#');
      link.setAttribute('data-document-path', documentPath);
      link.classList.add('internal-link');
      link.setAttribute('data-link-type', 'internal');
      link.setAttribute('data-original-href', href);
      return;
    }
    
    // 内部リンク（相対パス・絶対パス）
    // Quartoでよく使われるパターンを含む判定
    const isRelative = href.startsWith('./') || href.startsWith('../') || 
                      (!href.startsWith('/') && !href.includes('/api/v1/') && !href.startsWith('http'));
    const isAbsolute = href.startsWith('/') && !href.includes('/api/v1/');
    
    console.log(`Link analysis: ${href} - isRelative: ${isRelative}, isAbsolute: ${isAbsolute}`);
    
    if (isRelative || isAbsolute) {
      let documentPath = href;
      
      // 相対パスを解決
      if (isRelative) {
        documentPath = resolveRelativePath(href, currentPath);
        console.log(`Resolved relative path: ${href} -> ${documentPath} (currentPath: ${currentPath})`);
      } else if (isAbsolute) {
        documentPath = href.startsWith('/') ? href.substring(1) : href;
        console.log(`Processed absolute path: ${href} -> ${documentPath}`);
      }
      
      // Quartoの拡張子なしリンクに .html または .qmd を追加する場合の処理
      // （必要に応じて）
      if (!documentPath.includes('.') && !documentPath.endsWith('/')) {
        console.log(`Adding .html extension to extensionless link: ${documentPath}`);
        documentPath = documentPath + '.html';
      }
      
      link.setAttribute('href', '#');
      link.setAttribute('data-document-path', documentPath);
      link.classList.add('internal-link');
      link.setAttribute('data-link-type', 'internal');
      link.setAttribute('data-original-href', href);
    }
  });
  
  // bodyの内容のみを返す
  return doc.body.innerHTML;
}

/**
 * 相対パスを絶対パスに解決（HTML用）- Quarto対応改善版
 * @param relativePath 相対パス
 * @param currentPath 現在のドキュメントパス
 * @returns 解決された絶対パス
 */
function resolveRelativePath(relativePath: string, currentPath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath.substring(1);
  }
  
  // 現在のディレクトリパスを取得（ファイル名を除く）
  const currentParts = currentPath.split('/').slice(0, -1);
  let targetParts = relativePath.split('/');
  
  // './'で始まる場合は削除
  if (targetParts[0] === '.') {
    targetParts = targetParts.slice(1);
  }
  
  // '../'の処理 - 複数レベル対応
  while (targetParts.length > 0 && targetParts[0] === '..') {
    if (currentParts.length > 0) {
      currentParts.pop(); // 一つ上のディレクトリに移動
    }
    targetParts.shift(); // '../'を削除
  }
  
  // 最終パスを構築
  const resolvedParts = [...currentParts, ...targetParts];
  return resolvedParts.join('/');
}