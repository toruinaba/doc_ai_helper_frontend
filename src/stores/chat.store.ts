/**
 * チャットストア
 * 
 * LLMとの対話状態を管理するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';
import { useDocumentStore } from './document.store';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export const useChatStore = defineStore('chat', () => {
  // 状態
  const messages = ref<ChatMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const documentStore = useDocumentStore();
  
  // 新しいメッセージID生成
  function generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // ユーザーメッセージ追加
  function addUserMessage(content: string) {
    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    messages.value.push(message);
    return message;
  }
  
  // システムメッセージ追加
  function addSystemMessage(content: string) {
    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'system',
      content,
      timestamp: new Date()
    };
    
    messages.value.push(message);
    return message;
  }
  
  // アシスタントメッセージ追加
  function addAssistantMessage(content: string) {
    const message: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date()
    };
    
    messages.value.push(message);
    return message;
  }
  
  // LLMにメッセージ送信（実装予定）
  async function sendMessage(content: string) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // ユーザーメッセージを追加
      addUserMessage(content);
      
      // TODO: バックエンドAPIとの連携実装
      // 現在のドキュメントコンテキストを取得
      const documentContext = documentStore.currentDocument?.content.content || '';
      
      // モック応答（フェーズ2で実装予定）
      setTimeout(() => {
        addAssistantMessage(`こちらはLLMの応答の予定です。ドキュメントコンテキストを使って回答します。
現在表示中のドキュメントは ${documentStore.documentTitle || 'なし'} です。`);
        isLoading.value = false;
      }, 1000);
      
    } catch (err: any) {
      error.value = err.message || 'メッセージの送信に失敗しました';
      console.error('メッセージ送信エラー:', err);
      isLoading.value = false;
    }
  }
  
  // メッセージクリア
  function clearMessages() {
    messages.value = [];
  }
  
  return {
    // 状態
    messages,
    isLoading,
    error,
    
    // アクション
    addUserMessage,
    addSystemMessage,
    addAssistantMessage,
    sendMessage,
    clearMessages
  };
});
