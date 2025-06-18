/**
 * チャットストア
 * 
 * LLMとの対話状態を管理するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { sendChatMessage } from '../services/api/chat.service';
import { useDocumentStore } from './document.store';
import { useRepositoryStore } from './repository.store';
import { getDefaultRepositoryConfig } from '../utils/config.util';
import type { ChatMessage as ApiChatMessage, ChatRequest } from '../services/api/types';
import type { ChatMessage, ChatRequest, ChatResponse } from '../services/api/types';

export interface ClientChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export const useChatStore = defineStore('chat', () => {
  // デフォルト設定を取得
  const defaultConfig = getDefaultRepositoryConfig();

  // 状態
  const messages = ref<ClientChatMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const documentStore = useDocumentStore();
  const repositoryStore = useRepositoryStore();
  
  // 新しいメッセージID生成
  function generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // ユーザーメッセージ追加
  function addUserMessage(content: string) {
    const message: ClientChatMessage = {
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
    const message: ClientChatMessage = {
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
    const message: ClientChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date()
    };
    
    messages.value.push(message);
    return message;
  }
  
  // LLMにメッセージ送信
  async function sendMessage(content: string) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // ユーザーメッセージを追加
      addUserMessage(content);
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument;
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません');
      }
      
      // APIリクエスト用のメッセージ履歴を構築
      const apiMessages: ChatMessage[] = messages.value
        .filter(msg => msg.role !== 'system') // システムメッセージを除外
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // システムメッセージの追加（先頭に挿入）
      apiMessages.unshift({
        role: 'system',
        content: '以下のドキュメントに関する質問に答えてください。ドキュメントに記載されていない内容については、その旨を伝えてください。'
      });
      
      // リポジトリ情報を取得 (ドキュメントストアの値があればそれを使用し、なければデフォルト値を使用)
      const service = documentStore.currentService || defaultConfig.service;
      const owner = documentStore.currentOwner || defaultConfig.owner;
      const repo = documentStore.currentRepo || defaultConfig.repo;
      const path = documentStore.currentPath || defaultConfig.path;
      const ref = documentStore.currentRef || defaultConfig.ref;
      
      // チャットリクエストの構築
      const request: ChatRequest = {
        messages: apiMessages,
        document_context: {
          service,
          owner,
          repo,
          path,
          ref
        }
      };
      
      try {
        // APIリクエスト送信
        const response = await sendChatMessage(request);
        
        // 応答メッセージを追加
        addAssistantMessage(response.message.content);
      } catch (apiErr: any) {
        console.error('API通信エラー:', apiErr);
        // モック応答（バックエンドAPI未実装の場合）
        setTimeout(() => {
          addAssistantMessage(`こちらはLLMの応答の予定です。ドキュメントコンテキストを使って回答します。
現在表示中のドキュメントは ${documentStore.documentTitle || 'なし'} です。

ドキュメントの内容に基づいて、以下の情報を提供します：

1. このドキュメントは「${currentDoc.name}」というタイトルのマークダウンファイルです。
2. ドキュメントの種類: ${currentDoc.type}
3. ファイルパス: ${currentDoc.path}

より具体的な質問をしていただければ、ドキュメントの内容に基づいてお答えします。`);
        }, 1000);
      }
      
    } catch (err: any) {
      error.value = err.message || 'メッセージの送信に失敗しました';
      console.error('メッセージ送信エラー:', err);
      
      // エラーメッセージを表示
      addSystemMessage(`エラー: ${error.value}`);
    } finally {
      isLoading.value = false;
    }
  }
  
  // メッセージクリア
  function clearMessages() {
    messages.value = [];
  }
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    addUserMessage,
    addSystemMessage,
    addAssistantMessage,
    clearMessages
  };
});
