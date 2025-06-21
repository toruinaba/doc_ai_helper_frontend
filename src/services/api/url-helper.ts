/**
 * API URLヘルパー関数
 * 
 * APIエンドポイントのURLを正しく構築するためのヘルパー関数群
 */
import apiClient from '.';

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
  const baseUrl = apiClient['baseUrl'] as string;
  
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
  let normalizedBase = baseUrl.replace(/\/$/, '')
  
  // endpointの先頭のスラッシュを確保
  let normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  
  // /api/v1が重複しないようにする
  if (normalizedBase.endsWith('/api/v1')) {
    normalizedBase = normalizedBase.slice(0, -7)
  }
  
  const result = `${normalizedBase}/api/v1${normalizedEndpoint}`
  console.log(`URL正規化: 元のURL=${baseUrl}, 正規化後=${normalizedBase}, エンドポイント=${normalizedEndpoint}`)
  return result
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
