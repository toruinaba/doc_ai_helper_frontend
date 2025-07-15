import { ref, type Ref } from 'vue'
import type { components } from '@/services/api/types.auto'
import { useDocumentStore } from '@/stores/document.store'
import { llmService } from '@/services/api/llm.service'
import { getDefaultRepositoryConfig, getLLMConfig } from '@/utils/config.util'
import type { ClientMessage } from '@/composables/useMessageManagement'

type MessageItem = components['schemas']['MessageItem']

export interface BasicStreamingOperations {
  sendStreamingMessage: (content: string) => Promise<void>
}

export function useBasicStreaming(
  messages: Ref<ClientMessage[]>,
  addUserMessage: (content: string) => ClientMessage,
  addAssistantMessage: (content: string) => ClientMessage,
  addSystemMessage: (content: string) => ClientMessage,
  generateMessageId: () => string
): BasicStreamingOperations {
  const documentStore = useDocumentStore()
  const llmConfig = getLLMConfig()

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
          provider: llmConfig.defaultProvider,
          model: llmConfig.defaultModel,
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

  return {
    sendStreamingMessage
  }
}