/**
 * Utilities Service
 * 
 * API関連のユーティリティ機能を提供
 */
import { getApiConfig } from '../../../utils/config.util';

/**
 * baseURLを正規化し、二重の/api/v1を防止する
 * @param endpoint エンドポイント（/で始まる必要がある）
 * @returns 完全なAPI URL
 */
export function getNormalizedApiUrl(endpoint: string): string {
  if (!endpoint.startsWith('/')) {
    endpoint = `/${endpoint}`;
  }
  
  // APIクライアントのベースURLを取得
  const apiConfig = getApiConfig();
  const baseUrl = apiConfig.apiBaseUrl.endsWith('/api/v1') 
    ? apiConfig.apiBaseUrl 
    : `${apiConfig.apiBaseUrl}/api/v1`;
  
  // バックエンドのURLを正規化（/api/v1を含まないようにする）
  let baseUrlWithoutApiPath = baseUrl;
  if (baseUrl.endsWith('/api/v1')) {
    baseUrlWithoutApiPath = baseUrl.slice(0, -7);
  } else if (baseUrl.includes('/api/v1/')) {
    // /api/v1/の後に何か続く場合も対応
    const parts = baseUrl.split('/api/v1');
    baseUrlWithoutApiPath = parts[0];
  }
  
  // デバッグログ
  console.log(`URL正規化: 元のURL=${baseUrl}, 正規化後=${baseUrlWithoutApiPath}, エンドポイント=${endpoint}`);
  
  // URLを構築（ホスト部分 + /api/v1 + エンドポイント）
  return `${baseUrlWithoutApiPath}/api/v1${endpoint}`;
}

/**
 * baseURLとエンドポイントを結合して正規化されたURLを返す
 * @param baseUrl ベースURL
 * @param endpoint エンドポイント
 * @returns 正規化されたURL
 */
export function normalizeUrl(baseUrl: string, endpoint: string): string {
  // baseUrlの末尾のスラッシュを削除
  let normalizedBase = baseUrl.replace(/\/$/, '');
  
  // endpointの先頭のスラッシュを確保
  let normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // エンドポイントが既に/api/v1で始まっている場合は、baseUrlから/api/v1を削除
  if (normalizedEndpoint.startsWith('/api/v1')) {
    if (normalizedBase.endsWith('/api/v1')) {
      normalizedBase = normalizedBase.slice(0, -7);
    }
    // エンドポイントは既に完全なAPI パスなのでそのまま使用
    const result = `${normalizedBase}${normalizedEndpoint}`;
    console.log(`URL正規化 (API path included): 元のURL=${baseUrl}, 正規化後=${normalizedBase}, エンドポイント=${normalizedEndpoint}, 結果=${result}`);
    return result;
  } else {
    // エンドポイントが相対パスの場合は、/api/v1を追加
    if (normalizedBase.endsWith('/api/v1')) {
      normalizedBase = normalizedBase.slice(0, -7);
    }
    const result = `${normalizedBase}/api/v1${normalizedEndpoint}`;
    console.log(`URL正規化 (relative path): 元のURL=${baseUrl}, 正規化後=${normalizedBase}, エンドポイント=${normalizedEndpoint}, 結果=${result}`);
    return result;
  }
}

/**
 * SSEストリーミング用のURLを取得
 * @param endpoint ストリーミングエンドポイント（/で始まる必要がある）
 * @param params クエリパラメータ
 * @returns 完全なストリーミングURL
 */
export function getStreamingUrl(endpoint: string, params: Record<string, string> = {}): string {
  const baseUrl = getNormalizedApiUrl(endpoint);
  
  // クエリパラメータの構築
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
