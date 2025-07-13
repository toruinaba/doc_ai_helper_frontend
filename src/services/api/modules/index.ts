/**
 * API Services Module Index
 * 
 * 機能ベースに分割されたAPIサービスモジュールの統合エクスポート
 */

// 統一LLMサービス（新アーキテクチャ）
export { llmService } from '../llm.service';

// LLMコア機能（後方互換性のため保持）
export {
  sendLLMQuery,
  getLLMCapabilities,
  getLLMTemplates,
  formatPrompt
} from './llm-core.service';

// 会話履歴管理
export {
  createConversationWithSystemPrompt,
  addUserMessageToConversation,
  createConversationWithUserMessage,
  filterConversationHistory,
  createConversationSummary
} from './conversation.service';

// ストリーミング機能
export {
  streamLLMQuery,
  createStreamingStatsTracker,
  type StreamingCallbacks,
  type StreamingStats
} from './streaming.service';

// MCPツール関連
export {
  getMCPTools,
  getMCPToolInfo,
  shouldUseMCPTools,
  integrateMCPToolResults,
  sendLLMQueryWithTools,
  streamLLMQueryWithTools
} from './tools.service';

// ユーティリティ機能
export {
  getNormalizedApiUrl,
  normalizeUrl,
  getStreamingUrl
} from './utils.service';

// モック機能
export {
  getMockDocument,
  getMockLLMResponseWithContext,
  getMockLLMResponse,
  getMockLLMCapabilities,
  getMockLLMTemplates,
  getMockFormattedPrompt
} from './mock.service';

// 設定管理
export {
  getStreamingConfig,
  updateStreamingConfig,
  getEffectiveStreamingType,
  StreamingType
} from './config.service';

// ドキュメントユーティリティ
export {
  createDocumentMetadataInput,
  createRepositoryContext,
  createDocumentSummary,
  detectDocumentLanguage,
  calculateDocumentStats,
  analyzeDocumentType
} from './document.service';

// 後方互換性のためのデフォルトエクスポート
export default {
  // LLMコア機能
  sendLLMQuery: () => import('./llm-core.service').then(m => m.sendLLMQuery),
  getLLMCapabilities: () => import('./llm-core.service').then(m => m.getLLMCapabilities),
  getLLMTemplates: () => import('./llm-core.service').then(m => m.getLLMTemplates),
  formatPrompt: () => import('./llm-core.service').then(m => m.formatPrompt),
  
  // 会話履歴管理
  createConversationWithSystemPrompt: () => import('./conversation.service').then(m => m.createConversationWithSystemPrompt),
  addUserMessageToConversation: () => import('./conversation.service').then(m => m.addUserMessageToConversation),
  createConversationWithUserMessage: () => import('./conversation.service').then(m => m.createConversationWithUserMessage),
  
  // ストリーミング機能
  streamLLMQuery: () => import('./streaming.service').then(m => m.streamLLMQuery),
  
  // MCPツール関連
  sendLLMQueryWithTools: () => import('./tools.service').then(m => m.sendLLMQueryWithTools),
  streamLLMQueryWithTools: () => import('./tools.service').then(m => m.streamLLMQueryWithTools),
  getMCPTools: () => import('./tools.service').then(m => m.getMCPTools),
  getMCPToolInfo: () => import('./tools.service').then(m => m.getMCPToolInfo),
  shouldUseMCPTools: () => import('./tools.service').then(m => m.shouldUseMCPTools),
  integrateMCPToolResults: () => import('./tools.service').then(m => m.integrateMCPToolResults),
  
  // ユーティリティ機能
  getNormalizedApiUrl: () => import('./utils.service').then(m => m.getNormalizedApiUrl),
  normalizeUrl: () => import('./utils.service').then(m => m.normalizeUrl),
  getStreamingUrl: () => import('./utils.service').then(m => m.getStreamingUrl),
  
  // モック機能
  getMockDocument: () => import('./mock.service').then(m => m.getMockDocument),
  getMockLLMResponseWithContext: () => import('./mock.service').then(m => m.getMockLLMResponseWithContext),
  getMockLLMResponse: () => import('./mock.service').then(m => m.getMockLLMResponse),
  getMockLLMCapabilities: () => import('./mock.service').then(m => m.getMockLLMCapabilities),
  getMockLLMTemplates: () => import('./mock.service').then(m => m.getMockLLMTemplates),
  getMockFormattedPrompt: () => import('./mock.service').then(m => m.getMockFormattedPrompt),
  
  // 設定管理
  getStreamingConfig: () => import('./config.service').then(m => m.getStreamingConfig),
  updateStreamingConfig: () => import('./config.service').then(m => m.updateStreamingConfig),
  getEffectiveStreamingType: () => import('./config.service').then(m => m.getEffectiveStreamingType),
  StreamingType: () => import('./config.service').then(m => m.StreamingType),
  
  // ドキュメントユーティリティ
  createDocumentMetadataInput: () => import('./document.service').then(m => m.createDocumentMetadataInput),
  createRepositoryContext: () => import('./document.service').then(m => m.createRepositoryContext)
};
