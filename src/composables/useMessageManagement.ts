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
  
  // 最適化された会話履歴（バックエンドから受信）
  const optimizedConversationHistory = ref<components['schemas']['MessageItem'][]>([]);
  
  // 最適化履歴が有効かどうか
  const hasOptimizedHistory = ref(false);

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
    
    // 新しいユーザーメッセージが追加されると最適化履歴は無効になる
    invalidateOptimizedHistory();
    
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
    clearOptimizedHistory();
    console.log('Messages cleared');
  }

  /**
   * 会話履歴をAPI形式に変換（最適化履歴を優先使用）
   */
  function getConversationHistory() {
    // 最適化履歴が有効な場合はそれを使用
    if (hasOptimizedHistory.value && optimizedConversationHistory.value.length > 0) {
      console.log('Using optimized conversation history for request:', optimizedConversationHistory.value.length, 'messages');
      return optimizedConversationHistory.value;
    }
    
    // 最適化履歴がない場合は通常のメッセージ履歴を使用
    console.log('Using regular message history for request:', messages.value.length, 'messages');
    return messages.value.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
  }

  /**
   * 最適化された会話履歴を保存
   */
  function saveOptimizedHistory(optimizedHistory: components['schemas']['MessageItem'][]): void {
    optimizedConversationHistory.value = [...optimizedHistory];
    hasOptimizedHistory.value = true;
    console.log('Saved optimized conversation history:', optimizedHistory.length, 'messages');
  }

  /**
   * 最適化履歴を無効化
   */
  function invalidateOptimizedHistory(): void {
    hasOptimizedHistory.value = false;
    console.log('Invalidated optimized conversation history');
  }

  /**
   * 最適化履歴をクリア
   */
  function clearOptimizedHistory(): void {
    optimizedConversationHistory.value = [];
    hasOptimizedHistory.value = false;
    console.log('Cleared optimized conversation history');
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
    
    // 最適化履歴を保存（次回のリクエストで使用）
    saveOptimizedHistory(optimizedHistory);
    
    // UI表示用にメッセージも更新
    messages.value = [];
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
    optimizedConversationHistory,
    hasOptimizedHistory,
    
    // アクション
    generateMessageId,
    addUserMessage,
    addSystemMessage,
    addAssistantMessage,
    updateMessage,
    clearMessages,
    getConversationHistory,
    findMessage,
    replaceWithOptimizedHistory,
    saveOptimizedHistory,
    invalidateOptimizedHistory,
    clearOptimizedHistory
  };
}