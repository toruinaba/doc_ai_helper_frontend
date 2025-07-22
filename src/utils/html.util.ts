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
  // 危険なタグを除去
  const dangerousTags = [
    'script', 'iframe', 'embed', 'object', 'applet', 'form', 
    'input', 'button', 'textarea', 'select', 'option',
    'meta', 'link', 'style', 'base'
  ];
  
  // 危険な属性を除去
  const dangerousAttributes = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onreset', 'onselect', 'onunload'
  ];
  
  let sanitized = html;
  
  // 危険なタグの除去
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // 危険な属性の除去
  dangerousAttributes.forEach(attr => {
    const regex = new RegExp(`\\s*${attr}[^\\s>]*`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // javascript:やdata:URLの除去
  sanitized = sanitized.replace(/href\s*=\s*["']?javascript:/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']?javascript:/gi, 'src="#"');
  sanitized = sanitized.replace(/href\s*=\s*["']?data:/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']?data:/gi, 'src="#"');
  
  return sanitized;
}