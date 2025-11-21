import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'

export interface ErrorDetails {
  status?: number
  message?: string
  detail?: string | any[]
  code?: string
  operation?: string
  context?: Record<string, any>
}

export interface ErrorHandlerOptions {
  /** トーストを自動表示するか */
  showToast?: boolean
  /** エラーログを出力するか */
  logError?: boolean
  /** カスタムエラーメッセージマッピング */
  customMessages?: Record<number, string>
  /** デフォルトのエラーメッセージ */
  defaultMessage?: string
}

/**
 * 統一エラーハンドリング composable
 * 
 * 使用例:
 * const { handleError, clearError, lastError, formatErrorMessage } = useErrorHandler({
 *   showToast: true,
 *   logError: true
 * })
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showToast = true,
    logError = true,
    customMessages = {},
    defaultMessage = '操作に失敗しました'
  } = options

  const toast = showToast ? useToast() : null
  const lastError = ref<ErrorDetails | null>(null)
  const isHandlingError = ref(false)

  /**
   * HTTPステータスコードに基づくエラーメッセージマッピング
   */
  const statusMessages: Record<number, string> = {
    400: '入力データに問題があります',
    401: '認証が必要です',
    403: 'アクセス権限がありません',
    404: 'リソースが見つかりません',
    409: '競合が発生しました',
    422: '入力値が正しくありません',
    429: 'リクエストが多すぎます。しばらく時間をおいて再試行してください',
    500: 'サーバーエラーが発生しました',
    502: 'サーバーへの接続に失敗しました',
    503: 'サービスが一時的に利用できません',
    504: 'リクエストがタイムアウトしました',
    ...customMessages
  }

  /**
   * エラーオブジェクトから詳細情報を抽出
   */
  function extractErrorDetails(error: any): ErrorDetails {
    const details: ErrorDetails = {
      message: error.message,
      code: error.code
    }

    // Axiosエラーレスポンスの場合
    if (error.response) {
      details.status = error.response.status
      details.detail = error.response.data?.detail
      
      // FastAPIバリデーションエラーの場合
      if (details.status === 422 && Array.isArray(details.detail)) {
        details.context = {
          validationErrors: details.detail
        }
      }
    }

    // ネットワークエラーの場合
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      details.code = 'NETWORK_ERROR'
    }

    return details
  }

  /**
   * エラー詳細からユーザー向けメッセージを生成
   */
  function formatErrorMessage(error: ErrorDetails, operation?: string): string {
    const context = operation ? ` (${operation})` : ''

    // カスタムメッセージがある場合
    if (error.status && customMessages[error.status]) {
      return customMessages[error.status] + context
    }

    // HTTPステータスベースのメッセージ
    if (error.status && statusMessages[error.status]) {
      let message = statusMessages[error.status]

      // 詳細メッセージの追加
      if (error.detail) {
        if (typeof error.detail === 'string') {
          message += `: ${error.detail}`
        } else if (Array.isArray(error.detail)) {
          // バリデーションエラーの詳細
          const validationErrors = error.detail.map((err: any) => 
            `${err.loc?.[1] || 'フィールド'}: ${err.msg}`
          ).join(', ')
          message += `: ${validationErrors}`
        }
      }

      return message + context
    }

    // ネットワークエラー
    if (error.code === 'NETWORK_ERROR') {
      return 'ネットワークエラーが発生しました。接続状態を確認してください' + context
    }

    // その他のエラー
    return error.message || defaultMessage + context
  }

  /**
   * エラーをハンドリング
   */
  async function handleError(
    error: any, 
    operation?: string,
    options: {
      showToast?: boolean
      logError?: boolean
      severity?: 'error' | 'warn' | 'info'
      life?: number
    } = {}
  ): Promise<string> {
    isHandlingError.value = true

    try {
      const errorDetails = extractErrorDetails(error)
      errorDetails.operation = operation
      
      lastError.value = errorDetails
      
      const userMessage = formatErrorMessage(errorDetails, operation)

      // ログ出力
      if ((options.logError ?? logError) && console) {
        console.error(`Error in ${operation || 'operation'}:`, {
          error,
          details: errorDetails,
          userMessage
        })
      }

      // トースト表示
      if ((options.showToast ?? showToast) && toast) {
        toast.add({
          severity: options.severity || 'error',
          summary: 'エラー',
          detail: userMessage,
          life: options.life || 5000
        })
      }

      return userMessage
    } finally {
      isHandlingError.value = false
    }
  }

  /**
   * 成功メッセージを表示
   */
  function showSuccess(
    message: string, 
    options: {
      summary?: string
      life?: number
    } = {}
  ): void {
    if (toast) {
      toast.add({
        severity: 'success',
        summary: options.summary || '成功',
        detail: message,
        life: options.life || 3000
      })
    }
  }

  /**
   * 警告メッセージを表示
   */
  function showWarning(
    message: string,
    options: {
      summary?: string
      life?: number
    } = {}
  ): void {
    if (toast) {
      toast.add({
        severity: 'warn',
        summary: options.summary || '警告',
        detail: message,
        life: options.life || 4000
      })
    }
  }

  /**
   * 情報メッセージを表示
   */
  function showInfo(
    message: string,
    options: {
      summary?: string
      life?: number
    } = {}
  ): void {
    if (toast) {
      toast.add({
        severity: 'info',
        summary: options.summary || '情報',
        detail: message,
        life: options.life || 3000
      })
    }
  }

  /**
   * 最後のエラーをクリア
   */
  function clearError(): void {
    lastError.value = null
  }

  /**
   * CRUD操作用のエラーハンドラー
   */
  const crudErrorHandler = {
    create: (error: any) => handleError(error, 'リソース作成', {
      showToast: true,
      severity: 'error'
    }),
    
    update: (error: any) => handleError(error, 'リソース更新', {
      showToast: true,
      severity: 'error'
    }),
    
    delete: (error: any) => handleError(error, 'リソース削除', {
      showToast: true,
      severity: 'error'
    }),
    
    fetch: (error: any) => handleError(error, 'データ取得', {
      showToast: false, // 取得エラーは通常トーストを表示しない
      severity: 'error'
    })
  }

  /**
   * 非同期操作のラッパー
   */
  async function withErrorHandling<T>(
    operation: () => Promise<T>,
    operationName?: string,
    options?: {
      successMessage?: string
      showSuccessToast?: boolean
    }
  ): Promise<T | null> {
    try {
      const result = await operation()
      
      if (options?.showSuccessToast && options?.successMessage) {
        showSuccess(options.successMessage)
      }
      
      return result
    } catch (error) {
      await handleError(error, operationName)
      return null
    }
  }

  // コンピューテッド
  const hasError = computed(() => Boolean(lastError.value))
  const errorMessage = computed(() => 
    lastError.value ? formatErrorMessage(lastError.value) : null
  )

  return {
    // State
    lastError,
    isHandlingError,
    hasError,
    errorMessage,
    
    // Core methods
    handleError,
    clearError,
    formatErrorMessage,
    
    // Convenience methods
    showSuccess,
    showWarning,
    showInfo,
    withErrorHandling,
    
    // Specialized handlers
    crudErrorHandler
  }
}

/**
 * リポジトリ操作専用のエラーハンドラー
 */
export function useRepositoryErrorHandler() {
  return useErrorHandler({
    showToast: true,
    logError: true,
    customMessages: {
      409: '同じ名前またはURLのリポジトリが既に存在します',
      400: 'リポジトリの設定に問題があります',
      422: 'リポジトリの入力値を確認してください'
    },
    defaultMessage: 'リポジトリ操作に失敗しました'
  })
}