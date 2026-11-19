/**
 * Router関連のタイプ定義
 */

/**
 * DocumentViewコンポーネントのProps
 */
export interface DocumentViewProps {
  repositoryId: string;
  documentPath: string;
  ref: string;
}

/**
 * ルートメタ情報
 */
export interface RouteMeta {
  requiresRepository?: boolean;
  description?: string;
}

/**
 * ドキュメント関連のルートパラメータ
 */
export interface DocumentRouteParams {
  repositoryId: string;
}

/**
 * ドキュメント関連のクエリパラメータ
 */
export interface DocumentRouteQuery {
  path?: string;
  ref?: string;
}

/**
 * リンク処理の結果
 */
export interface LinkProcessingResult {
  documentPath: string;
  isRelative: boolean;
  isApiUrl: boolean;
  originalHref: string;
}

/**
 * ナビゲーションの状態
 */
export type NavigationState = 
  | { status: 'idle' }
  | { status: 'navigating'; target: string }
  | { status: 'success'; url: string }
  | { status: 'error'; error: string };