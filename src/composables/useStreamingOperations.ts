import { type Ref } from 'vue'
import type { ClientMessage } from '@/composables/useMessageManagement'
import { 
  useBasicStreaming, 
  useStreamingWithConfig, 
  useStreamingWithTools,
  type BasicStreamingOperations,
  type StreamingWithConfigOperations,
  type StreamingWithToolsOperations,
  type DocumentContextConfig,
  type StreamingCallbacks
} from '@/composables/streaming'

export interface StreamingOperations extends 
  BasicStreamingOperations, 
  StreamingWithConfigOperations, 
  StreamingWithToolsOperations {
}

export function useStreamingOperations(
  messages: Ref<ClientMessage[]>,
  addUserMessage: (content: string) => ClientMessage,
  addAssistantMessage: (content: string) => ClientMessage,
  addSystemMessage: (content: string) => ClientMessage,
  generateMessageId: () => string,
  mcpToolsConfig: Ref<any>,
  shouldUseMCPTools: (content: string, autoDetect: boolean) => { recommended: boolean; reasons: string[] },
  activeToolExecutions: Ref<any[]>,
  startToolExecution: (toolCall: any) => any,
  updateToolExecutionStatus: (executionId: string, status: 'pending' | 'running' | 'completed' | 'error', result?: any, error?: string, progress?: number) => void
): StreamingOperations {
  
  // 基本ストリーミング機能
  const basicStreaming = useBasicStreaming(
    messages,
    addUserMessage,
    addAssistantMessage,
    addSystemMessage,
    generateMessageId
  )
  
  // 設定付きストリーミング機能
  const streamingWithConfig = useStreamingWithConfig(
    messages,
    addUserMessage,
    addAssistantMessage,
    addSystemMessage
  )
  
  // MCPツール対応ストリーミング機能
  const streamingWithTools = useStreamingWithTools(
    messages,
    addUserMessage,
    addAssistantMessage,
    addSystemMessage,
    mcpToolsConfig,
    shouldUseMCPTools,
    activeToolExecutions,
    startToolExecution,
    updateToolExecutionStatus
  )

  return {
    // 基本ストリーミング
    ...basicStreaming,
    
    // 設定付きストリーミング
    ...streamingWithConfig,
    
    // MCPツール対応ストリーミング
    ...streamingWithTools
  }
}

// Re-export types for convenience
export { type DocumentContextConfig, type StreamingCallbacks }