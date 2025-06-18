/**
 * チャットストア
 * 
 * LLMとの対話状態を管理するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { 
  sendLLMQuery, 
  formatPrompt 
} from '../services/api/chat.service';
import { useDocumentStore } from './document.store';
import { useRepositoryStore } from './repository.store';
import { getDefaultRepositoryConfig } from '../utils/config.util';
import type { 
  ChatMessage,
  LLMQueryRequest,
  LLMResponse
} from '../services/api/types';

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
      
      // リポジトリ情報を取得 (ドキュメントストアの値があればそれを使用し、なければデフォルト値を使用)
      const service = documentStore.currentService || defaultConfig.service;
      const owner = documentStore.currentOwner || defaultConfig.owner;
      const repo = documentStore.currentRepo || defaultConfig.repo;
      const path = documentStore.currentPath || defaultConfig.path;
      const ref = documentStore.currentRef || defaultConfig.ref;
      
      try {
        // ユーザーの最後のメッセージを取得
        const userPrompt = content;
        
        // LLMクエリリクエストの構築 - システムプロンプトなしでユーザーの質問のみを送信
        const request: LLMQueryRequest = {
          prompt: userPrompt,
          context_documents: [path]
        };
        
        // APIリクエスト送信（/llm/queryエンドポイントを使用）
        const response = await sendLLMQuery(request);
        
        // 応答メッセージを追加
        addAssistantMessage(response.content);
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
  
  // 直接LLMにクエリを送信する関数
  async function sendDirectQuery(prompt: string, options?: {
    provider?: string;
    model?: string;
    customOptions?: Record<string, any>;
  }) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument;
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません');
      }
      
      // ユーザープロンプトを追加（UIに表示用）
      addUserMessage(prompt);
      
      // リポジトリ情報を取得
      const service = documentStore.currentService || defaultConfig.service;
      const owner = documentStore.currentOwner || defaultConfig.owner;
      const repo = documentStore.currentRepo || defaultConfig.repo;
      const path = documentStore.currentPath || defaultConfig.path;
      
      // LLMクエリリクエストの構築
      const request: LLMQueryRequest = {
        prompt,
        context_documents: [path],
        provider: options?.provider,
        model: options?.model,
        options: options?.customOptions
      };
      
      // APIリクエスト送信
      const response = await sendLLMQuery(request);
      
      // 応答を追加（UIに表示用）
      addAssistantMessage(response.content);
      
      return response;
    } catch (err: any) {
      error.value = err.message || 'LLMクエリの送信に失敗しました';
      console.error('LLMクエリ送信エラー:', err);
      
      // エラーメッセージを表示
      addSystemMessage(`エラー: ${error.value}`);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  // テンプレートを使用してLLMにクエリを送信する関数
  async function sendTemplateQuery(templateId: string, variables: Record<string, any>, options?: {
    provider?: string;
    model?: string;
    customOptions?: Record<string, any>;
  }) {
    try {
      // テンプレートをフォーマット
      const formattedPrompt = await formatPrompt(templateId, variables);
      
      // フォーマットされたプロンプトを使用してクエリを送信
      return await sendDirectQuery(formattedPrompt, options);
    } catch (err: any) {
      error.value = err.message || 'テンプレートクエリの送信に失敗しました';
      console.error('テンプレートクエリ送信エラー:', err);
      throw err;
    }
  }
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    addUserMessage,
    addSystemMessage,
    addAssistantMessage,
    clearMessages,
    sendDirectQuery,
    sendTemplateQuery
  };
});
