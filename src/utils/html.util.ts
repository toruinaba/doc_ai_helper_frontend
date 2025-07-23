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