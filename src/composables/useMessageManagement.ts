/**
 * Message Management Composable
 * 
 * メッセージの状態管理を行うコンポーザブル
 * 純粋なメッセージ操作のみを担当し、外部依存なし
 */
import { ref } from 'vue';
import type { components } from '@/services/api/types.auto';

// 型エイリアス
type ToolCall = components['schemas']['ToolCall'];

export interface ClientMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  // MCPツール関連の情報
  toolCalls?: ToolCall[];
  toolResults?: any[];
  isToolExecuting?: boolean;
}

export function useMessageManagement() {
  // 状態
  const messages = ref<ClientMessage[]>([]);

  /**
   * 新しいメッセージIDを生成
   */
  function generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * ユーザーメッセージを追加
   */
  function addUserMessage(content: string): ClientMessage {
    const message: ClientMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    messages.value.push(message);
    console.log('Added user message:', content.substring(0, 50) + '...');
    return message;
  }

  /**
   * システムメッセージを追加
   */
  function addSystemMessage(content: string): ClientMessage {
    const message: ClientMessage = {
      id: generateMessageId(),
      role: 'system',
      content,
      timestamp: new Date()
    };
    
    messages.value.push(message);
    console.log('Added system message:', content.substring(0, 50) + '...');
    return message;
  }

  /**
   * アシスタントメッセージを追加
   */
  function addAssistantMessage(content: string): ClientMessage {
    console.log('Adding assistant message with content:', content.substring(0, 100) + '...');
    const message: ClientMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date()
    };
    
    messages.value.push(message);
    console.log('Messages after adding assistant message:', messages.value.length);
    return message;
  }

  /**
   * メッセージを更新（ストリーミング用）
   */
  function updateMessage(messageId: string, updates: Partial<ClientMessage>): boolean {
    const messageIndex = messages.value.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      // Vueのリアクティビティを確実にトリガーするため、新しいオブジェクトを作成
      messages.value[messageIndex] = {
        ...messages.value[messageIndex],
        ...updates
      };
      return true;
    }
    return false;
  }

  /**
   * メッセージ一覧をクリア
   */
  function clearMessages(): void {
    messages.value = [];
    console.log('Messages cleared');
  }

  /**
   * 会話履歴をAPI形式に変換
   */
  function getConversationHistory() {
    return messages.value.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
  }

  /**
   * メッセージを検索
   */
  function findMessage(messageId: string): ClientMessage | undefined {
    return messages.value.find(m => m.id === messageId);
  }

  /**
   * 最適化された会話履歴で置き換え
   */
  function replaceWithOptimizedHistory(optimizedHistory: any[]): void {
    console.log('Replacing conversation history with optimized version:', optimizedHistory.length, 'messages');
    
    // 既存の会話履歴をクリア
    messages.value = [];
    
    // 最適化された会話履歴を追加
    optimizedHistory.forEach((msg: any, index: number) => {
      console.log(`Adding optimized message ${index} with role ${msg.role}`);
      const clientMsg: ClientMessage = {
        id: generateMessageId(),
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
      };
      messages.value.push(clientMsg);
    });
    
    console.log('Updated messages after optimization:', messages.value.length);
  }

  return {
    // 状態
    messages,
    
    // アクション
    generateMessageId,
    addUserMessage,
    addSystemMessage,
    addAssistantMessage,
    updateMessage,
    clearMessages,
    getConversationHistory,
    findMessage,
    replaceWithOptimizedHistory
  };
}