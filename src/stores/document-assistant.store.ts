/**
 * ドキュメントアシスタントストア
 * 
 * LLMとの対話状態を管理するPiniaストア
 * リファクタリング後：モジュラーコンポーザブルの統合
 */
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useMessageManagement } from '@/composables/useMessageManagement'
import { useDocumentContext } from '@/composables/useDocumentContext'
import { useMCPTools } from '@/composables/useMCPTools'
import { useLLMOperations } from '@/composables/useLLMOperations'
import { useStreamingOperations } from '@/composables/useStreamingOperations'
import { useAsyncOperation } from '@/composables/useAsyncOperation'
import { shouldUseMCPTools, formatPrompt } from '@/services/api/modules'

// 型定義は各composableから再エクスポート
export type { ClientMessage } from '@/composables/useMessageManagement'
export type { MCPToolExecution, MCPToolsConfig } from '@/composables/useMCPTools'
export type { DocumentContextConfig } from '@/composables/useDocumentContext'

export const useDocumentAssistantStore = defineStore('documentAssistant', () => {
  // 基本的な非同期操作管理
  const asyncOp = useAsyncOperation({
    defaultErrorMessage: 'ドキュメントアシスタント操作に失敗しました',
    logPrefix: 'DocumentAssistantStore'
  })
  
  // 全てのモジュラーコンポーザブルを統合
  const messageOps = useMessageManagement()
  const documentContext = useDocumentContext()
  const mcpTools = useMCPTools()
  const llmOps = useLLMOperations()
  const streamingOps = useStreamingOperations(
    messageOps.messages,
    messageOps.addUserMessage,
    messageOps.addAssistantMessage,
    messageOps.addSystemMessage,
    messageOps.generateMessageId,
    mcpTools.mcpToolsConfig,
    shouldUseMCPTools,
    mcpTools.activeToolExecutions,
    mcpTools.startToolExecution,
    mcpTools.updateToolExecutionStatus
  )
  
  // 非同期操作でラップされたLLM操作を作成
  const sendDirectQuery = async (prompt: string, options?: any) => {
    return await asyncOp.executeWithLoading(() => llmOps.sendDirectQuery(prompt, options))
  }
  
  const sendTemplateQuery = async (templateId: string, variables: Record<string, any>, options?: any) => {
    return await asyncOp.executeWithLoading(() => llmOps.sendTemplateQuery(templateId, variables, options))
  }
  
  const sendMessageWithTools = async (content: string, forceToolChoice?: string) => {
    return await asyncOp.executeWithLoading(() => llmOps.sendMessageWithTools(content, forceToolChoice))
  }

  return {
    // 基本状態
    messages: messageOps.messages,
    isLoading: asyncOp.isLoading,
    error: asyncOp.error,
    
    // MCPツール状態
    mcpToolsConfig: mcpTools.mcpToolsConfig,
    activeToolExecutions: mcpTools.activeToolExecutions,
    isStreamingWithTools: streamingOps.isStreamingWithTools,
    toolExecutionHistory: mcpTools.toolExecutionHistory,
    
    // Computed プロパティ
    hasActiveToolExecutions: mcpTools.hasActiveToolExecutions,
    isToolsEnabled: mcpTools.isToolsEnabled,
    runningToolExecutions: mcpTools.runningToolExecutions,
    completedToolExecutions: mcpTools.completedToolExecutions,
    failedToolExecutions: mcpTools.failedToolExecutions,
    
    // 基本メッセージ操作
    addUserMessage: messageOps.addUserMessage,
    addSystemMessage: messageOps.addSystemMessage,
    addAssistantMessage: messageOps.addAssistantMessage,
    clearMessages: messageOps.clearMessages,
    
    // LLMクエリ関数
    sendDirectQuery,
    sendTemplateQuery,
    sendStreamingMessage: streamingOps.sendStreamingMessage,
    sendStreamingMessageWithConfig: streamingOps.sendStreamingMessageWithConfig,
    sendMessageWithConfig: sendDirectQuery,
    
    // MCPツール対応関数
    sendMessageWithTools,
    sendStreamingMessageWithToolsAndConfig: streamingOps.sendStreamingMessageWithToolsAndConfig,
    
    // MCPツール管理
    updateMCPToolsConfig: mcpTools.updateMCPToolsConfig,
    toggleMCPTools: mcpTools.toggleMCPTools,
    startToolExecution: mcpTools.startToolExecution,
    updateToolExecutionStatus: mcpTools.updateToolExecutionStatus,
    clearToolExecutionHistory: mcpTools.clearToolExecutionHistory,
    
    // ストリーミング操作
    stopStreaming: streamingOps.stopStreaming,
    
    // ドキュメントコンテキスト
    createDocumentSystemPrompt: documentContext.createDocumentSystemPrompt,
    mergeConfig: documentContext.mergeConfig,
    validateDocumentContext: documentContext.validateDocumentContext
  }
})