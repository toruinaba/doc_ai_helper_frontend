import { ref, type Ref } from 'vue'
import type { components } from '@/services/api/types.auto'
import { useDocumentStore } from '@/stores/document.store'
import { llmService } from '@/services/api/llm.service'
import { getLLMConfig } from '@/utils/config.util'
import type { ClientMessage } from '@/composables/useMessageManagement'
import type { DocumentContextConfig } from './useStreamingWithConfig'

type MessageItem = components['schemas']['MessageItem']

export interface StreamingWithToolsOperations {
  isStreamingWithTools: Ref<boolean>
  currentStreamController: Ref<AbortController | (() => void) | null>
  sendStreamingMessageWithToolsAndConfig: (
    content: string, 
    config?: Partial<DocumentContextConfig>,
    onToken?: (token: string) => void,
    forceToolChoice?: string
  ) => Promise<void>
  stopStreaming: () => void
}

export function useStreamingWithTools(
  messages: Ref<ClientMessage[]>,
  addUserMessage: (content: string) => ClientMessage,
  addAssistantMessage: (content: string) => ClientMessage,
  addSystemMessage: (content: string) => ClientMessage,
  getConversationHistory: () => any[],
  mcpToolsConfig: Ref<any>,
  shouldUseMCPTools: (content: string, autoDetect: boolean) => { recommended: boolean; reasons: string[] },
  activeToolExecutions: Ref<any[]>,
  startToolExecution: (toolCall: any) => any,
  updateToolExecutionStatus: (executionId: string, status: 'pending' | 'running' | 'completed' | 'error', result?: any, error?: string, progress?: number) => void
): StreamingWithToolsOperations {
  const documentStore = useDocumentStore()
  const llmConfig = getLLMConfig()
  
  const isStreamingWithTools = ref(false)
  const currentStreamController = ref<AbortController | (() => void) | null>(null)

  // 新しいバックエンド仕様に対応したMCPツール付きストリーミングメッセージ送信
  async function sendStreamingMessageWithToolsAndConfig(
    content: string, 
    config?: Partial<DocumentContextConfig>,
    onToken?: (token: string) => void,
    forceToolChoice?: string
  ) {
    console.log('Start streaming message with MCP tools and config:', content, config)
    isStreamingWithTools.value = true
    
    // 前のストリーミングがあれば中止
    if (currentStreamController.value) {
      if (typeof currentStreamController.value === 'function') {
        currentStreamController.value()
      } else {
        currentStreamController.value.abort()
      }
    }
    
    try {
      // ユーザーメッセージを追加
      const userMessage = addUserMessage(content)
      
      // 設定とデフォルトをマージ
      const effectiveConfig = {
        includeDocumentInSystemPrompt: true,
        systemPromptTemplate: 'contextual_document_assistant_ja',
        enableRepositoryContext: true,
        enableDocumentMetadata: true,
        completeToolFlow: true,
        ...config
      }
      
      console.log('📋 Streaming MCP tools with document context config:', effectiveConfig)
      
      // ツール使用の判定
      const toolRecommendation = shouldUseMCPTools(content, mcpToolsConfig.value.autoDetect)
      const useTools = mcpToolsConfig.value.enabled && toolRecommendation.recommended
      
      // executionModeに基づいてtoolChoiceを設定
      let toolChoice: string
      if (forceToolChoice) {
        toolChoice = forceToolChoice
      } else if (useTools) {
        // MCPツールが有効な場合は、toolChoiceを使用（'auto', 'none', 'required', または特定のツール名）
        toolChoice = mcpToolsConfig.value.toolChoice
      } else {
        toolChoice = 'none'
      }
      
      console.log('Streaming with tools - Tool recommendation:', toolRecommendation)
      console.log('Using tools:', useTools, 'Tool choice:', toolChoice)
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません')
      }
      
      // 会話履歴を構築（最適化履歴を優先使用）
      const conversationHistory = getConversationHistory()
      
      // 新しいバックエンド仕様に合わせた処理を開始
      console.log('🌊🛠️ Preparing streaming MCP tools request:', {
        useTools,
        toolChoice
      })
      
      // ストリーミング用のアシスタントメッセージを作成
      const assistantMessage = addAssistantMessage('')
      let accumulatedContent = ''
      
      // 新しい統一サービスでストリーミング
      await llmService.stream(
        {
          prompt: content,
          provider: llmConfig.defaultProvider,
          model: llmConfig.defaultModel,
          conversationHistory,
          includeDocument: true,
          enableTools: useTools,
          toolChoice,
          completeToolFlow: true
        },
        currentDoc,
        {
          onStart: () => {
            console.log('🚀 MCP tools streaming started')
          },
          onChunk: (chunk) => {
            console.log('🎯 MCP tools chunk received:', chunk)
            accumulatedContent += chunk
            
            // アシスタントメッセージを更新
            const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id)
            if (messageIndex !== -1) {
              messages.value[messageIndex] = {
                ...messages.value[messageIndex],
                content: accumulatedContent
              }
            }
            
            // 外部のコールバック関数があれば呼び出し
            onToken?.(chunk)
          },
          onToolCall: (toolCall: any) => {
            console.log('🛠️ Tool call detected during streaming:', toolCall)
            const execution = startToolExecution(toolCall)
            updateToolExecutionStatus(execution.id, 'running')
          },
          onToolResult: (result: any) => {
            console.log('🎯 Tool result received during streaming:', result)
            
            // 対応するツール実行を完了状態に更新
            const execution = activeToolExecutions.value.find(exec => 
              exec.toolCall.function.name === result.function_name
            )
            if (execution) {
              updateToolExecutionStatus(execution.id, 'completed', result)
            }
          },
          onError: (error) => {
            console.error('🚨 MCP tools streaming error:', error)
            const errorMsg = error.message || 'Unknown streaming error'
            addSystemMessage(`MCPツールストリーミングエラー: ${errorMsg}`)
            isStreamingWithTools.value = false
          },
          onEnd: (data) => {
            console.log('✅ MCP tools streaming ended')
            console.log('Final accumulated content:', accumulatedContent)
            
            // 会話履歴の最適化があった場合は適用
            if (data?.optimized_conversation_history && data.optimized_conversation_history.length > 0) {
              console.log('🗂️ Server provided optimized conversation history for MCP tools streaming:', 
                data.optimized_conversation_history.length, 'messages')
            }
            
            isStreamingWithTools.value = false
          }
        }
      )
      
      console.log('MCP tools streaming message sent successfully')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Error sending streaming message with MCP tools and config:', err)
      
      // エラーメッセージを表示
      addSystemMessage(`MCPツールストリーミングエラーが発生しました: ${errorMessage}`)
      isStreamingWithTools.value = false
    }
  }

  // ストリーミングを停止
  function stopStreaming() {
    if (currentStreamController.value) {
      if (typeof currentStreamController.value === 'function') {
        currentStreamController.value()
      } else {
        currentStreamController.value.abort()
      }
      currentStreamController.value = null
    }
    isStreamingWithTools.value = false
  }

  return {
    isStreamingWithTools,
    currentStreamController,
    sendStreamingMessageWithToolsAndConfig,
    stopStreaming
  }
}