import { ref, type Ref } from 'vue'
import type { components } from '@/services/api/types.auto'
import { useDocumentStore } from '@/stores/document.store'
import { llmService } from '@/services/api/llm.service'
import { useAsyncOperation } from '@/composables/useAsyncOperation'
import { getDefaultRepositoryConfig } from '@/utils/config.util'
import type { ClientMessage } from '@/composables/useMessageManagement'

type DocumentResponse = components['schemas']['DocumentResponse']
type MessageItem = components['schemas']['MessageItem']

export interface DocumentContextConfig {
  enableRepositoryContext?: boolean
  enableDocumentMetadata?: boolean
  includeDocumentInSystemPrompt?: boolean
  systemPromptTemplate?: string
}

export interface StreamingCallbacks {
  onStart?: () => void
  onChunk?: (chunk: string) => void
  onToolCall?: (toolCall: any) => void
  onToolResult?: (result: any) => void
  onError?: (error: Error) => void
  onEnd?: (data?: any) => void
}

export interface StreamingOperations {
  isStreamingWithTools: Ref<boolean>
  currentStreamController: Ref<AbortController | (() => void) | null>
  sendStreamingMessage: (content: string) => Promise<void>
  sendStreamingMessageWithConfig: (content: string, config?: Partial<DocumentContextConfig>) => Promise<void>
  sendStreamingMessageWithToolsAndConfig: (
    content: string, 
    config?: Partial<DocumentContextConfig>,
    onToken?: (token: string) => void,
    forceToolChoice?: string
  ) => Promise<void>
  stopStreaming: () => void
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
  updateToolExecutionStatus: (executionId: string, status: string, result?: any) => void
): StreamingOperations {
  const documentStore = useDocumentStore()
  const asyncOp = useAsyncOperation()
  
  const isStreamingWithTools = ref(false)
  const currentStreamController = ref<AbortController | (() => void) | null>(null)

  // ストリーミングモードでLLMにメッセージ送信
  async function sendStreamingMessage(content: string) {
    console.log('Start sending streaming message:', content)
    
    try {
      // ユーザーメッセージを追加
      addUserMessage(content)
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません')
      }
      
      // リポジトリ情報を取得 (ドキュメントストアの値があればそれを使用し、なければデフォルト値を使用)
      const defaultConfig = getDefaultRepositoryConfig()
      const service = documentStore.currentService || defaultConfig.service
      const owner = documentStore.currentOwner || defaultConfig.owner
      const repo = documentStore.currentRepo || defaultConfig.repo
      const path = documentStore.currentPath || defaultConfig.path
      const ref = documentStore.currentRef || defaultConfig.ref
      
      // 会話履歴の準備（クライアントメッセージをAPIの形式に変換）
      const conversationHistory = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))
      
      console.log('Sending streaming chat message with conversation history:', conversationHistory.length, 'messages')
      
      // アシスタントの空メッセージを追加（ストリーミング表示用）
      const assistantMessage = addAssistantMessage('')
      let accumulatedContent = ''
      
      // 新しい統一サービスでストリーミング
      await llmService.stream(
        {
          prompt: content,
          provider: 'openai',
          conversationHistory,
          includeDocument: true,
          enableTools: false,
          toolChoice: 'none'
        },
        currentDoc,
        {
          onStart: () => {
            console.log('Streaming started')
          },
          onChunk: (chunk) => {
            console.log('Received chunk in streaming operations:', chunk)
            // 新しいチャンクを受信したら累積コンテンツに追加
            accumulatedContent += chunk
            console.log('Accumulated content so far:', accumulatedContent)
            
            // アシスタントメッセージを更新
            const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id)
            console.log('Found message at index:', messageIndex, 'with ID:', assistantMessage.id)
            if (messageIndex !== -1) {
              // Vueのリアクティビティを確実にトリガーするため、新しいオブジェクトを作成
              const updatedMessage = {
                ...messages.value[messageIndex],
                content: accumulatedContent
              }
              messages.value[messageIndex] = updatedMessage
              console.log('Updated message content:', messages.value[messageIndex].content)
            } else {
              console.warn('Could not find message to update')
            }
          },
          onError: (error) => {
            console.error('Streaming error:', error)
            const errorMsg = error.message || 'Unknown streaming error'
            
            // エラーメッセージを表示
            addSystemMessage(`エラー: ${errorMsg}`)
          },
          onEnd: (data) => {
            console.log('Streaming completed:', data)
            
            // 最適化された会話履歴の処理を改善
            if (data?.optimized_conversation_history && data.optimized_conversation_history.length > 0) {
              console.log('Using optimized conversation history from the server:', 
                data.optimized_conversation_history.length, 'messages')
              
              // 現在の会話履歴をバックアップ（デバッグ用）
              const oldMessages = [...messages.value]
              console.log('Previous messages count:', oldMessages.length)
              
              // MCPツール使用時は現在のメッセージを保持し、最適化は透過的に処理
              // 通常のストリーミングでのみ履歴を置き換える
              console.log('Replacing conversation history with optimized version for regular streaming')
              
              // 既存の会話履歴をクリア
              messages.value = []
              
              // 最適化された会話履歴を追加
              data.optimized_conversation_history.forEach((msg: MessageItem, index: number) => {
                console.log(`Adding message ${index} with role ${msg.role}`)
                const clientMsg: ClientMessage = {
                  id: generateMessageId(),
                  role: msg.role as 'user' | 'assistant' | 'system',
                  content: msg.content,
                  timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                }
                messages.value.push(clientMsg)
              })
              console.log('Updated messages after optimization:', messages.value.length)
            }
          }
        }
      )
      
      // 新しいストリーミング実装では中断機能は内部で管理される
      console.log('Streaming chat message sent successfully')
    } catch (error) {
      console.error('Error in streaming message:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addSystemMessage(`エラー: ${errorMsg}`)
    }
  }

  // 新しいバックエンド仕様に対応したストリーミングメッセージ送信
  async function sendStreamingMessageWithConfig(content: string, config?: Partial<DocumentContextConfig>) {
    console.log('Start sending streaming message with config:', content, config)
    
    try {
      // ユーザーメッセージを追加
      addUserMessage(content)
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません')
      }
      
      // リポジトリ情報を取得 (ドキュメントストアの値があればそれを使用し、なければデフォルト値を使用)
      const defaultConfig = getDefaultRepositoryConfig()
      const service = documentStore.currentService || defaultConfig.service
      const owner = documentStore.currentOwner || defaultConfig.owner
      const repo = documentStore.currentRepo || defaultConfig.repo
      const path = documentStore.currentPath || defaultConfig.path
      const ref = documentStore.currentRef || defaultConfig.ref
      
      // 設定の統合（デフォルト設定とパラメータのマージ）
      const effectiveConfig = {
        enableRepositoryContext: config?.enableRepositoryContext ?? true,
        enableDocumentMetadata: config?.enableDocumentMetadata ?? true,
        includeDocumentInSystemPrompt: config?.includeDocumentInSystemPrompt ?? true,
        systemPromptTemplate: config?.systemPromptTemplate ?? 'contextual_document_assistant_ja'
      }
      
      // 会話履歴の準備（クライアントメッセージをAPIの形式に変換）
      const conversationHistory = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))
      
      console.log('📤 Sending message request with new backend specification')
      
      // 新しい統一サービスでリクエスト送信
      const response = await llmService.query({
        prompt: content,
        provider: 'openai',
        conversationHistory,
        includeDocument: true
      }, currentDoc)
      
      // レスポンスを処理
      if (response.content) {
        addAssistantMessage(response.content)
        
        // 会話履歴の最適化があった場合は適用
        if (response.optimized_conversation_history && response.optimized_conversation_history.length > 0) {
          console.log('🗂️ Server provided optimized conversation history:', 
            response.optimized_conversation_history.length, 'messages')
        }
      }
      
      console.log('Message sent successfully with new specification')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Error sending message with config:', err)
      
      // エラーメッセージを表示
      addSystemMessage(`エラーが発生しました: ${errorMessage}`)
    }
  }

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
      
      // 会話履歴を構築
      const conversationHistory: MessageItem[] = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))
      
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
          provider: 'openai',
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
    sendStreamingMessage,
    sendStreamingMessageWithConfig,
    sendStreamingMessageWithToolsAndConfig,
    stopStreaming
  }
}