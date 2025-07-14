import { type Ref } from 'vue'
import { useDocumentStore } from '@/stores/document.store'
import { llmService } from '@/services/api/llm.service'
import { getDefaultRepositoryConfig } from '@/utils/config.util'
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
  addSystemMessage: (content: string) => ClientMessage
): StreamingWithConfigOperations {
  const documentStore = useDocumentStore()

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

  return {
    sendStreamingMessageWithConfig
  }
}