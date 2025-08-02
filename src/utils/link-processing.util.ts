/**
 * Link Processing Utilities
 * 
 * ドキュメント内のリンク処理に関するユーティリティ関数
 * DocumentViewerのhandleLinkClickロジックを整理・分離
 */

/**
 * リンクの種類を判定する
 */
export type LinkType = 'external' | 'anchor' | 'api-transformed' | 'absolute' | 'internal';

/**
 * リンク解析結果
 */
export interface LinkAnalysisResult {
  type: LinkType;
  href: string;
  documentPath?: string;
  shouldPreventDefault: boolean;
}

/**
 * HTMLAnchorElementからリンク情報を解析する
 * @param link HTMLAnchorElement
 * @returns リンク解析結果
 */
export function analyzeLinkElement(link: HTMLAnchorElement): LinkAnalysisResult {
  const href = link.getAttribute('href') || '';
  
  // 1. 外部リンク
  if (link.classList.contains('external-link')) {
    return {
      type: 'external',
      href,
      shouldPreventDefault: false
    };
  }
  
  // 2. アンカーリンク（ページ内ジャンプ）
  if (link.classList.contains('anchor-link')) {
    return {
      type: 'anchor',
      href,
      shouldPreventDefault: false
    };
  }
  
  // 3. バックエンドAPI変換済みリンク
  if (href.includes('/api/v1/documents/contents/')) {
    const documentPath = extractPathFromApiUrl(href);
    return {
      type: 'api-transformed',
      href,
      documentPath,
      shouldPreventDefault: true
    };
  }
  
  // 4. 絶対パスだがサイト内リンク
  if (link.classList.contains('absolute-link')) {
    const documentPath = extractPathFromAbsoluteUrl(href);
    return {
      type: 'absolute',
      href,
      documentPath,
      shouldPreventDefault: true
    };
  }
  
  // 5. 内部リンク（相対パス含む）
  if (link.classList.contains('internal-link')) {
    const documentPath = processInternalLinkPath(href);
    return {
      type: 'internal',
      href,
      documentPath,
      shouldPreventDefault: true
    };
  }
  
  // デフォルト：処理しない
  return {
    type: 'external',
    href,
    shouldPreventDefault: false
  };
}

/**
 * API URLからドキュメントパスを抽出
 * @param apiUrl API URL
 * @returns ドキュメントパス
 */
export function extractPathFromApiUrl(apiUrl: string): string {
  // "/api/v1/documents/contents/service/owner/repo/path" 形式のURLからパスだけを抽出
  const pathMatch = apiUrl.match(/\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]);
  }
  return apiUrl;
}

/**
 * 絶対URLからドキュメントパスを抽出
 * @param absoluteUrl 絶対URL
 * @returns ドキュメントパス
 */
export function extractPathFromAbsoluteUrl(absoluteUrl: string): string {
  // 完全なURL形式で、APIパスが含まれていない場合（例：http://localhost:8000/getting-started.md）
  if (absoluteUrl.match(/^https?:\/\//)) {
    try {
      const url = new URL(absoluteUrl);
      // パスだけを取得（先頭の/は除去）
      return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    } catch (e) {
      console.error(`Failed to parse URL: ${absoluteUrl}`, e);
      return absoluteUrl;
    }
  }
  
  return absoluteUrl;
}

/**
 * 内部リンクのパスを処理
 * @param href リンクのhref
 * @returns 処理されたドキュメントパス
 */
export function processInternalLinkPath(href: string): string {
  let documentPath = href;
  
  // API URLパターンのチェック (絶対URL形式)
  const fullUrlMatch = documentPath.match(/https?:\/\/[^/]+\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
  if (fullUrlMatch && fullUrlMatch[1]) {
    return decodeURIComponent(fullUrlMatch[1]);
  }
  
  // API URLパターンのチェック (相対パス形式)
  const pathMatch = documentPath.match(/\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]);
  }
  
  return documentPath;
}

/**
 * 相対パスを絶対パスに解決
 * @param relativePath 相対パス
 * @param currentPath 現在のドキュメントパス
 * @returns 解決された絶対パス
 */
export function resolveRelativePath(relativePath: string, currentPath: string): string {
  // 既に絶対パスの場合
  if (relativePath.startsWith('/')) {
    return relativePath;
  }
  
  // APIパスが含まれている場合はそのまま返す
  if (relativePath.includes('/api/v1/')) {
    return relativePath;
  }
  
  const currentDir = currentPath.split('/').slice(0, -1).join('/');
  
  if (relativePath.startsWith('./')) {
    // ./path 形式 -> 現在のディレクトリからの相対パス
    const cleanPath = relativePath.substring(2);
    return currentDir ? `${currentDir}/${cleanPath}` : cleanPath;
  }
  
  if (relativePath.startsWith('../')) {
    // ../path 形式 -> 親ディレクトリからの相対パス
    const parentDir = currentDir.split('/').slice(0, -1).join('/');
    const cleanPath = relativePath.substring(3);
    return parentDir ? `${parentDir}/${cleanPath}` : cleanPath;
  }
  
  // path 形式 -> 現在のディレクトリからの相対パス
  return currentDir ? `${currentDir}/${relativePath}` : relativePath;
}

/**
 * リンクが相対パスかどうかを判定
 * @param path パス
 * @returns 相対パスの場合true
 */
export function isRelativePath(path: string): boolean {
  return (
    path.startsWith('./') || 
    path.startsWith('../') || 
    (!path.startsWith('/') && !path.includes('/api/v1/'))
  );
}