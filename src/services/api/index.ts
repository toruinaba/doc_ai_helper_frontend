/**
 * API Service exports
 * 
 * 新しいドメイン駆動構造でのAPIサービスエクスポート
 */
import apiClient, { ApiClient } from './api.service'
import * as types from './types'

// 新しい統一LLMサービスとビルダー
export { llmService } from './llm.service'
export { LLMRequestBuilder, createLLMRequest, LLMRequestPresets } from './builders/llm-request.builder'

// ドメイン別サービスエクスポート
export * as llm from './llm'
export * as document from './document'
export * as infrastructure from './infrastructure'
export * as testing from './testing'

// 後方互換性のためのレガシーエクスポート (aliased to llm domain)
export * as modules from './llm'

export { ApiClient, types }
export default apiClient