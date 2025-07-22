import { type Ref } from 'vue'
import { useDocumentStore } from '@/stores/document.store'
import { llmService } from '@/services/api/llm.service'
import { getDefaultRepositoryConfig, getLLMConfig, getAppDefaultsConfig } from '@/utils/config.util'
import type { ClientMessage } from '@/composables/useMessageManagement'

export interface DocumentContextConfig {
  enableRepositoryContext?: boolean
  enableDocumentMetadata?: boolean
  includeDocumentInSystemPrompt?: boolean
  systemPromptTemplate?: string
}

export interface StreamingWithConfigOperations {
  sendStreamingMessageWithConfig: (content: string, config?: Partial<DocumentContextConfig>) => Promise<void>
}

export function useStreamingWithConfig(
  messages: Ref<ClientMessage[]>,
  addUserMessage: (content: string) => ClientMessage,
  addAssistantMessage: (content: string) => ClientMessage,
  addSystemMessage: (content: string) => ClientMessage,
  getConversationHistory: () => any[]
): StreamingWithConfigOperations {
  const documentStore = useDocumentStore()
  const llmConfig = getLLMConfig()
  const appDefaults = getAppDefaultsConfig()

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
        systemPromptTemplate: config?.systemPromptTemplate ?? llmConfig.systemPromptTemplate
      }
      
      // 会話履歴の準備（最適化履歴を優先使用）
      const conversationHistory = getConversationHistory()
      
      console.log('📤 Sending streaming message request with new backend specification')
      
      // アシスタントの空メッセージを追加（ストリーミング表示用）
      const assistantMessage = addAssistantMessage('')
      let accumulatedContent = ''
      
      // 新しい統一サービスでストリーミングリクエスト送信
      await llmService.stream({
        prompt: content,
        provider: llmConfig.defaultProvider,
        model: llmConfig.defaultModel,
        conversationHistory,
        includeDocument: true,
        enableTools: false, // Tools disabled for config streaming
        toolChoice: 'none'
      }, currentDoc, {
        onStart: () => {
          console.log('Streaming started with config')
        },
        onChunk: (chunk) => {
          console.log('Received chunk:', chunk)
          accumulatedContent += chunk
          
          // アシスタントメッセージを更新
          const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id)
          if (messageIndex !== -1) {
            const updatedMessage = {
              ...messages.value[messageIndex],
              content: accumulatedContent
            }
            messages.value[messageIndex] = updatedMessage
          }
        },
        onError: (error) => {
          console.error('Streaming error:', error)
          addSystemMessage(`エラー: ${error.message || 'Unknown streaming error'}`)
        },
        onEnd: (data) => {
          console.log('Streaming completed:', data)
          
          // 最適化された会話履歴の処理
          if (data?.optimized_conversation_history && data.optimized_conversation_history.length > 0) {
            console.log('🗂️ Server provided optimized conversation history:', 
              data.optimized_conversation_history.length, 'messages')
            // 注意: 最適化履歴の保存は呼び出し元で管理されるため、ここでは処理しない
          }
        }
      })
      
      console.log('Message sent successfully with new specification')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Error sending message with config:', err)
      
      // エラーメッセージを表示
      addSystemMessage(`エラーが発生しました: ${errorMessage}`)
    }
  }

  return {
    sendStreamingMessageWithConfig
  }
}