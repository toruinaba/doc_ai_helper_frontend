/**
 * Async Operation Composable
 * 
 * 非同期操作の共通パターン（loading状態、エラーハンドリング）を統一化
 */
import { ref, type Ref } from 'vue';

export interface AsyncOperationOptions {
  /** エラー発生時のデフォルトメッセージ */
  defaultErrorMessage?: string;
  /** ローディング状態を自動管理するか */
  autoLoading?: boolean;
  /** エラーログを出力するか */
  enableErrorLogging?: boolean;
  /** エラーログのプレフィックス */
  logPrefix?: string;
}

export interface AsyncOperationState {
  /** ローディング状態 */
  isLoading: Ref<boolean>;
  /** エラー状態 */
  error: Ref<string | null>;
  /** エラーをクリア */
  clearError: () => void;
  /** ローディング状態をリセット */
  reset: () => void;
}

export interface AsyncExecutor {
  /** 非同期操作を実行 */
  execute: <T>(operation: () => Promise<T>) => Promise<T | undefined>;
  /** ローディング状態管理付きで非同期操作を実行 */
  executeWithLoading: <T>(operation: () => Promise<T>) => Promise<T | undefined>;
}

/**
 * 非同期操作の共通パターンを提供するコンポーザブル
 */
export function useAsyncOperation(options: AsyncOperationOptions = {}): AsyncOperationState & AsyncExecutor {
  const {
    defaultErrorMessage = '操作に失敗しました',
    autoLoading = true,
    enableErrorLogging = true,
    logPrefix = 'AsyncOperation'
  } = options;

  // 状態
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * エラーをクリア
   */
  const clearError = () => {
    error.value = null;
  };

  /**
   * 状態をリセット
   */
  const reset = () => {
    isLoading.value = false;
    error.value = null;
  };

  /**
   * エラーを処理
   */
  const handleError = (err: unknown, customMessage?: string): void => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error.value = customMessage || errorMessage || defaultErrorMessage;
    
    if (enableErrorLogging) {
      console.error(`${logPrefix}:`, err);
    }
  };

  /**
   * 基本的な非同期操作実行（ローディング状態管理なし）
   */
  const execute = async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    clearError();
    
    try {
      const result = await operation();
      return result;
    } catch (err) {
      handleError(err);
      return undefined;
    }
  };

  /**
   * ローディング状態管理付きで非同期操作を実行
   */
  const executeWithLoading = async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (autoLoading) {
      isLoading.value = true;
    }
    clearError();
    
    try {
      const result = await operation();
      return result;
    } catch (err) {
      handleError(err);
      return undefined;
    } finally {
      if (autoLoading) {
        isLoading.value = false;
      }
    }
  };

  return {
    // 状態
    isLoading,
    error,
    
    // メソッド
    clearError,
    reset,
    execute,
    executeWithLoading
  };
}

/**
 * ローディング状態管理に特化したコンポーザブル
 */
export function useAsyncState<T = unknown>(options: AsyncOperationOptions = {}) {
  const {
    defaultErrorMessage = '操作に失敗しました',
    enableErrorLogging = true,
    logPrefix = 'AsyncState'
  } = options;

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<T | null>(null) as Ref<T | null>;

  /**
   * データを設定してローディングを終了
   */
  const setData = (value: T) => {
    data.value = value;
    error.value = null;
    isLoading.value = false;
  };

  /**
   * エラーを設定してローディングを終了
   */
  const setError = (err: unknown, customMessage?: string) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error.value = customMessage || errorMessage || defaultErrorMessage;
    isLoading.value = false;

    if (enableErrorLogging) {
      console.error(`${logPrefix}:`, err);
    }
  };

  /**
   * ローディング開始
   */
  const startLoading = () => {
    isLoading.value = true;
    error.value = null;
  };

  /**
   * 非同期操作を実行してデータを管理
   */
  const executeAsync = async <R = T>(operation: () => Promise<R>): Promise<R | undefined> => {
    startLoading();
    
    try {
      const result = await operation();
      if (result !== undefined) {
        setData(result as unknown as T);
      }
      return result;
    } catch (err) {
      setError(err);
      return undefined;
    }
  };

  /**
   * 状態をリセット
   */
  const reset = () => {
    isLoading.value = false;
    error.value = null;
    data.value = null;
  };

  return {
    // 状態
    isLoading,
    error,
    data,
    
    // メソッド
    setData,
    setError,
    startLoading,
    executeAsync,
    reset
  };
}

/**
 * 既存のストアで使用している典型的なパターン用のショートカット
 */
export function useStoreAsyncPattern(logPrefix: string) {
  return useAsyncOperation({
    enableErrorLogging: true,
    logPrefix,
    autoLoading: true
  });
}