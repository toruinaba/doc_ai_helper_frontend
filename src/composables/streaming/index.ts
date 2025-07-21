/**
 * Streaming Composables Export
 * 
 * Domain-driven streaming composables for different use cases
 */

export { useBasicStreaming, type BasicStreamingOperations } from './useBasicStreaming'
export { useStreamingWithConfig, type StreamingWithConfigOperations, type DocumentContextConfig } from './useStreamingWithConfig'
export { useStreamingWithTools, type StreamingWithToolsOperations } from './useStreamingWithTools'

// Re-export common streaming interfaces
export interface StreamingCallbacks {
  onStart?: () => void
  onChunk?: (chunk: string) => void
  onToolCall?: (toolCall: any) => void
  onToolResult?: (result: any) => void
  onError?: (error: Error) => void
  onEnd?: (data?: any) => void
}