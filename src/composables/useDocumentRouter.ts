/**
 * Document Router Composable
 * 
 * ドキュメントナビゲーションをRouter駆動で管理するComposable
 * watcherベースの複雑な状態管理を置き換える
 */
import { useRouter, useRoute } from 'vue-router';
import { computed, type Ref } from 'vue';

/**
 * ドキュメントナビゲーションパラメータ
 */
export interface DocumentNavigationParams {
  repositoryId: string;
  path: string;
  ref?: string;
}

/**
 * 現在のドキュメント状態（URLから取得）
 */
export interface CurrentDocumentState {
  repositoryId: string | null;
  path: string | null;
  ref: string | null;
}

/**
 * ドキュメントRouter Composable
 */
export function useDocumentRouter() {
  const router = useRouter();
  const route = useRoute();

  /**
   * 現在のドキュメント状態（URLから導出）
   */
  const currentDocumentState = computed<CurrentDocumentState>(() => {
    return {
      repositoryId: route.params.repositoryId as string || null,
      path: route.query.path as string || null,
      ref: route.query.ref as string || null,
    };
  });

  /**
   * ドキュメントに移動する
   * @param params ナビゲーションパラメータ
   */
  const navigateToDocument = async (params: DocumentNavigationParams) => {
    const { repositoryId, path, ref = 'main' } = params;
    
    console.log('Navigating to document via router:', {
      repositoryId,
      path,
      ref,
      timestamp: new Date().toISOString()
    });

    try {
      await router.push({
        name: 'DocumentView',
        params: { repositoryId },
        query: { 
          path,
          ref 
        }
      });
    } catch (error) {
      console.error('Failed to navigate to document:', error);
      throw error;
    }
  };

  /**
   * 相対パスから絶対パスを解決する
   * @param relativePath 相対パス
   * @param currentPath 現在のパス
   * @returns 解決された絶対パス
   */
  const resolveRelativePath = (relativePath: string, currentPath: string): string => {
    if (relativePath.startsWith('/')) {
      // 既に絶対パス
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
  };

  /**
   * 内部リンクを処理してナビゲーションする
   * @param href リンクのhref属性
   * @param repositoryId 現在のリポジトリID
   * @param currentPath 現在のドキュメントパス
   * @param ref ブランチ/タグ（オプション）
   */
  const navigateToInternalLink = async (
    href: string,
    repositoryId: string,
    currentPath: string,
    ref?: string
  ) => {
    let documentPath = href;

    // API URLパターンのクリーンアップ
    const apiMatch = documentPath.match(/\/api\/v1\/documents\/contents\/[^/]+\/[^/]+\/[^/]+\/(.+?)(\?|$)/);
    if (apiMatch && apiMatch[1]) {
      documentPath = decodeURIComponent(apiMatch[1]);
    }

    // 相対パスの解決
    if (documentPath.startsWith('./') || documentPath.startsWith('../') || 
        (!documentPath.startsWith('/') && !documentPath.includes('/api/v1/'))) {
      documentPath = resolveRelativePath(documentPath, currentPath);
    }

    // ナビゲーション実行
    await navigateToDocument({
      repositoryId,
      path: documentPath,
      ref
    });
  };

  /**
   * ルートドキュメントに移動する
   * @param repositoryId リポジトリID
   * @param rootPath ルートドキュメントパス（デフォルト: README.md）
   * @param ref ブランチ/タグ（オプション）
   */
  const navigateToRoot = async (
    repositoryId: string,
    rootPath: string = 'README.md',
    ref?: string
  ) => {
    await navigateToDocument({
      repositoryId,
      path: rootPath,
      ref
    });
  };

  /**
   * URLが現在のドキュメント状態と一致するかチェック
   * @param params チェックするパラメータ
   * @returns 一致する場合true
   */
  const isCurrentDocument = (params: DocumentNavigationParams): boolean => {
    const current = currentDocumentState.value;
    return (
      current.repositoryId === params.repositoryId &&
      current.path === params.path &&
      current.ref === (params.ref || 'main')
    );
  };

  return {
    // 状態
    currentDocumentState,
    
    // ナビゲーション関数
    navigateToDocument,
    navigateToInternalLink,
    navigateToRoot,
    
    // ユーティリティ
    resolveRelativePath,
    isCurrentDocument,
  };
}

/**
 * ドキュメントルート用のComposable
 * DocumentView.vueで使用する
 */
export function useDocumentRoute() {
  const { currentDocumentState } = useDocumentRouter();
  
  /**
   * 現在のルートパラメータが有効かチェック
   */
  const isValidRoute = computed(() => {
    const state = currentDocumentState.value;
    return !!(state.repositoryId && state.path);
  });

  /**
   * デフォルトパラメータを取得
   */
  const getDefaultParams = (repositoryId: string): DocumentNavigationParams => {
    return {
      repositoryId,
      path: 'README.md',
      ref: 'main'
    };
  };

  return {
    currentDocumentState,
    isValidRoute,
    getDefaultParams,
  };
}