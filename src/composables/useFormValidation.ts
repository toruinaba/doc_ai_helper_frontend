import { reactive, computed } from 'vue'
import type { components } from '@/services/api/types.auto'

type RepositoryCreate = components['schemas']['RepositoryCreate']
type GitServiceType = components['schemas']['GitServiceType']

export interface ValidationRule {
  required?: boolean
  pattern?: RegExp
  patternMessage?: string
  minLength?: number
  maxLength?: number
  custom?: (value: any, formData: any) => string | null
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface UseFormValidationOptions<T = any> {
  schema: ValidationSchema
  formData: T
  existingItems?: T[]
  excludeId?: number | string
}

/**
 * フォームバリデーション用コンポーザブル
 * 
 * 使用例:
 * const { errors, validateField, validateForm, hasErrors } = useFormValidation({
 *   schema: repositoryValidationSchema,
 *   formData: formData,
 *   existingItems: repositories,
 *   excludeId: editingRepo?.id
 * })
 */
export function useFormValidation<T extends Record<string, any>>(
  options: UseFormValidationOptions<T>
) {
  const { schema, formData, existingItems = [], excludeId } = options
  
  const errors = reactive<Record<string, string>>({})
  
  /**
   * 単一フィールドのバリデーション
   */
  function validateField(fieldName: string): boolean {
    errors[fieldName] = ''
    
    const rule = schema[fieldName]
    if (!rule) return true
    
    const value = formData[fieldName]
    
    // 必須チェック
    if (rule.required && (!value || value === '')) {
      errors[fieldName] = `${getFieldDisplayName(fieldName)}は必須です`
      return false
    }
    
    // 値が空の場合、必須でなければバリデーション通過
    if (!value || value === '') return true
    
    // 最小長チェック
    if (rule.minLength && String(value).length < rule.minLength) {
      errors[fieldName] = `${getFieldDisplayName(fieldName)}は${rule.minLength}文字以上で入力してください`
      return false
    }
    
    // 最大長チェック
    if (rule.maxLength && String(value).length > rule.maxLength) {
      errors[fieldName] = `${getFieldDisplayName(fieldName)}は${rule.maxLength}文字以下で入力してください`
      return false
    }
    
    // パターンチェック
    if (rule.pattern && !rule.pattern.test(String(value))) {
      errors[fieldName] = rule.patternMessage || `${getFieldDisplayName(fieldName)}の形式が正しくありません`
      return false
    }
    
    // カスタムバリデーション
    if (rule.custom) {
      const customError = rule.custom(value, formData)
      if (customError) {
        errors[fieldName] = customError
        return false
      }
    }
    
    return true
  }
  
  /**
   * 全フィールドのバリデーション
   */
  function validateForm(fieldsToValidate?: string[]): boolean {
    const fields = fieldsToValidate || Object.keys(schema)
    
    let isValid = true
    fields.forEach(fieldName => {
      if (!validateField(fieldName)) {
        isValid = false
      }
    })
    
    return isValid
  }
  
  /**
   * エラーをクリア
   */
  function clearErrors(fieldNames?: string[]): void {
    if (fieldNames) {
      fieldNames.forEach(field => {
        errors[field] = ''
      })
    } else {
      Object.keys(errors).forEach(key => {
        errors[key] = ''
      })
    }
  }
  
  /**
   * フィールド名の表示用名称を取得
   */
  function getFieldDisplayName(fieldName: string): string {
    const displayNames: Record<string, string> = {
      name: 'リポジトリ名',
      owner: '所有者',
      url: 'URL',
      service_type: 'サービスタイプ',
      access_token: 'アクセストークン',
      default_branch: 'デフォルトブランチ',
      base_url: 'ベースURL',
      repository_root: 'リポジトリルート',
      document_root_directory: 'ドキュメントルートディレクトリ',
      root_document_path: 'ルートドキュメントパス',
      description: '説明'
    }
    
    return displayNames[fieldName] || fieldName
  }
  
  /**
   * 重複チェック用ヘルパー
   */
  function createDuplicateValidator<T extends Record<string, any>>(
    checkFields: string[],
    items: T[] = (existingItems as unknown) as T[],
    excludeId?: number | string
  ) {
    return (value: any, formData: any) => {
      const duplicate = items.find(item => {
        // 編集時は自分自身を除外
        if (excludeId && item.id === excludeId) return false
        
        // 指定されたフィールドの組み合わせで重複チェック
        return checkFields.every(field => item[field] === formData[field])
      })
      
      return duplicate ? 'この組み合わせは既に存在します' : null
    }
  }
  
  // コンピューテッド
  const hasErrors = computed(() => 
    Object.values(errors).some(error => error !== '')
  )
  
  const errorCount = computed(() => 
    Object.values(errors).filter(error => error !== '').length
  )
  
  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    hasErrors,
    errorCount,
    createDuplicateValidator,
    getFieldDisplayName
  }
}

// リポジトリ用のバリデーションスキーマ
export const createRepositoryValidationSchema = (
  repositories: any[] = [],
  editingRepo?: any
): ValidationSchema => ({
  name: {
    required: true,
    pattern: /^[a-zA-Z0-9._-]+$/,
    patternMessage: 'リポジトリ名は英数字、ピリオド、ハイフン、アンダースコアのみ使用可能です',
    custom: (value, formData) => {
      if (!formData.owner) return null
      
      const duplicate = repositories.find(repo => 
        repo.name === value && 
        repo.owner === formData.owner && 
        (!editingRepo || repo.id !== editingRepo.id)
      )
      
      return duplicate ? 'この名前とオーナーの組み合わせは既に存在します' : null
    }
  },
  
  owner: {
    required: true,
    pattern: /^[a-zA-Z0-9._-]+$/,
    patternMessage: '所有者名は英数字、ピリオド、ハイフン、アンダースコアのみ使用可能です',
    custom: (value, formData) => {
      if (!formData.name) return null
      
      const duplicate = repositories.find(repo => 
        repo.name === formData.name && 
        repo.owner === value && 
        (!editingRepo || repo.id !== editingRepo.id)
      )
      
      return duplicate ? 'この名前とオーナーの組み合わせは既に存在します' : null
    }
  },
  
  url: {
    required: true,
    pattern: /^https?:\/\/.+/,
    patternMessage: '有効なHTTP/HTTPS URLを入力してください',
    custom: (value, formData) => {
      const duplicate = repositories.find(repo => 
        repo.url === value && 
        (!editingRepo || repo.id !== editingRepo.id)
      )
      
      return duplicate ? 'このURLのリポジトリは既に存在します' : null
    }
  },
  
  service_type: {
    required: true
  },
  
  access_token: {
    custom: (value, formData) => {
      if (!formData.is_public && !value) {
        return 'プライベートリポジトリにはアクセストークンが必要です'
      }
      return null
    }
  },
  
  default_branch: {
    pattern: /^[a-zA-Z0-9._/-]+$/,
    patternMessage: 'ブランチ名に無効な文字が含まれています'
  }
})