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
  LLMResponse,
  MessageItem
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
    console.log('Adding assistant message with content:', content.substring(0, 100) + '...');
    const message: ClientChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content,
      timestamp: new Date()
    };
    
    messages.value.push(message);
    console.log('Messages after adding assistant message:', messages.value.length);
    return message;
  }
  
  // LLMにメッセージ送信
  async function sendMessage(content: string) {
    console.log('Start sending message:', content);
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
        
        // 会話履歴の準備（クライアントメッセージをAPIの形式に変換）
        const conversationHistory = messages.value.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString()
        }));
        
        // LLMクエリリクエストの構築
        const request: LLMQueryRequest = {
          prompt: userPrompt,
          context_documents: [path],
          conversation_history: conversationHistory
        };
        
        console.log('Sending chat message with conversation history:', conversationHistory.length, 'messages');
        
        // APIリクエスト送信（/llm/queryエンドポイントを使用）
        const response = await sendLLMQuery(request);
        console.log('Received LLM response:', response);
        
        // 最適化された会話履歴がある場合は、それをクライアント形式に変換して保存
        if (response.optimized_conversation_history && response.optimized_conversation_history.length > 0) {
          console.log('Using optimized conversation history from the server:', 
            response.optimized_conversation_history.length, 'messages');
          
          // 現在の会話履歴をバックアップ（デバッグ用）
          const oldMessages = [...messages.value];
          console.log('Previous messages count:', oldMessages.length);
          
          // 既存の会話履歴をクリア
          messages.value = [];
          
          // 最適化された会話履歴を追加
          response.optimized_conversation_history.forEach((msg: MessageItem, index: number) => {
            console.log(`Adding message ${index} with role ${msg.role}`);
            const clientMsg: ClientChatMessage = {
              id: generateMessageId(),
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
            };
            messages.value.push(clientMsg);
          });
          console.log('Updated messages after optimization:', messages.value.length);
          
          // 最後のメッセージが assistant でない場合、応答メッセージを追加
          const lastMsg = response.optimized_conversation_history[response.optimized_conversation_history.length - 1];
          if (lastMsg.role !== 'assistant') {
            console.log('Last message is not from assistant, adding response content');
            addAssistantMessage(response.content);
          }
        } else {
          // 最適化された会話履歴がない場合は、応答メッセージを追加
          console.log('No optimized history, adding assistant message directly');
          addAssistantMessage(response.content);
        }
      } catch (apiErr: any) {
        console.error('API通信エラー:', apiErr);
        console.log('APIエラー後、モック応答を使用します');
        // モック応答（バックエンドAPI未実装の場合）
        setTimeout(() => {
          console.log('Timeout finished, adding mock assistant message');
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
    includeHistory?: boolean;
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
      
      // 会話履歴の準備（クライアントメッセージをAPIの形式に変換）
      const conversationHistory = options?.includeHistory !== false ? messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      })) : undefined;
      
      // LLMクエリリクエストの構築
      const request: LLMQueryRequest = {
        prompt,
        context_documents: [path],
        provider: options?.provider,
        model: options?.model,
        options: options?.customOptions,
        conversation_history: conversationHistory
      };
      
      console.log('Sending LLM query with conversation history:', 
        conversationHistory ? conversationHistory.length : 0, 'messages');
      
      // APIリクエスト送信
      const response = await sendLLMQuery(request);
      console.log('Received direct LLM query response:', response);
      
      // 最適化された会話履歴がある場合は、それをクライアント形式に変換して保存
      if (response.optimized_conversation_history && response.optimized_conversation_history.length > 0) {
        console.log('Using optimized conversation history from the server:', 
          response.optimized_conversation_history.length, 'messages');
        
        // 現在の会話履歴をバックアップ（デバッグ用）
        const oldMessages = [...messages.value];
        console.log('Previous messages count in direct query:', oldMessages.length);
        
        // 既存の会話履歴をクリア
        messages.value = [];
        
        // 最適化された会話履歴を追加
        response.optimized_conversation_history.forEach((msg: MessageItem, index: number) => {
          console.log(`Direct query: Adding message ${index} with role ${msg.role}`);
          const clientMsg: ClientChatMessage = {
            id: generateMessageId(),
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          };
          messages.value.push(clientMsg);
        });
        console.log('Updated messages after optimization in direct query:', messages.value.length);
        
        // 最後のメッセージが assistant でない場合、応答メッセージを追加
        const lastMsg = response.optimized_conversation_history[response.optimized_conversation_history.length - 1];
        if (lastMsg.role !== 'assistant') {
          console.log('Direct query: Last message is not from assistant, adding response content');
          addAssistantMessage(response.content);
        }
      } else {
        // 最適化された会話履歴がない場合は、応答メッセージを追加
        console.log('No optimized history in direct query, adding assistant message directly');
        addAssistantMessage(response.content);
      }
      
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
  
  // ストリーミングモードでLLMにメッセージ送信
  async function sendStreamingMessage(content: string) {
    console.log('Start sending streaming message:', content);
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
      
      // 会話履歴の準備（クライアントメッセージをAPIの形式に変換）
      const conversationHistory = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
      
      // LLMクエリリクエストの構築
      const request: LLMQueryRequest = {
        prompt: content,
        context_documents: [path],
        conversation_history: conversationHistory
      };
      
      console.log('Sending streaming chat message with conversation history:', conversationHistory.length, 'messages');
      
      // アシスタントの空メッセージを追加（ストリーミング表示用）
      const assistantMessage = addAssistantMessage('');
      let accumulatedContent = '';
      
      // chat.service.tsからストリーミング関数をインポート
      const { streamLLMQuery } = await import('../services/api/chat.service');
      
      // ストリーミングコールバックの設定
      const cleanup = streamLLMQuery(
        request,
        {
          onStart: (data) => {
            console.log('Streaming started with model:', data?.model);
          },
          onToken: (token) => {
            console.log('Received token in chat store:', token);
            // 新しいトークンを受信したら累積コンテンツに追加
            accumulatedContent += token;
            console.log('Accumulated content so far:', accumulatedContent);
            
            // アシスタントメッセージを更新
            const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
            console.log('Found message at index:', messageIndex, 'with ID:', assistantMessage.id);
            if (messageIndex !== -1) {
              // Vueのリアクティビティを確実にトリガーするため、新しいオブジェクトを作成
              const updatedMessage = {
                ...messages.value[messageIndex],
                content: accumulatedContent
              };
              messages.value[messageIndex] = updatedMessage;
              console.log('Updated message content:', messages.value[messageIndex].content);
            } else {
              console.warn('Could not find message to update');
            }
          },
          onError: (errorMsg) => {
            console.error('Streaming error:', errorMsg);
            error.value = errorMsg;
            
            // エラーメッセージを表示
            if (error.value) {
              addSystemMessage(`エラー: ${error.value}`);
            }
          },
          onEnd: (data) => {
            console.log('Streaming completed with usage:', data?.usage);
            
            // 最適化された会話履歴がある場合は、それをクライアント形式に変換して保存
            if (data?.optimized_conversation_history && data.optimized_conversation_history.length > 0) {
              console.log('Using optimized conversation history from the server:', 
                data.optimized_conversation_history.length, 'messages');
              
              // 現在の会話履歴をバックアップ（デバッグ用）
              const oldMessages = [...messages.value];
              console.log('Previous messages count:', oldMessages.length);
              
              // 既存の会話履歴をクリア
              messages.value = [];
              
              // 最適化された会話履歴を追加
              data.optimized_conversation_history.forEach((msg: MessageItem, index: number) => {
                console.log(`Adding message ${index} with role ${msg.role}`);
                const clientMsg: ClientChatMessage = {
                  id: generateMessageId(),
                  role: msg.role as 'user' | 'assistant' | 'system',
                  content: msg.content,
                  timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                };
                messages.value.push(clientMsg);
              });
              console.log('Updated messages after optimization:', messages.value.length);
            }
          }
        }
      );
      
      // クリーンアップ関数を保存（必要に応じて使用）
      const abortController = {
        abort: cleanup
      };
      
      return abortController;
    } catch (err: any) {
      error.value = err.message || 'メッセージの送信に失敗しました';
      console.error('メッセージ送信エラー:', err);
      
      // エラーメッセージを表示
      addSystemMessage(`エラー: ${error.value}`);
      
      return null;
    } finally {
      isLoading.value = false;
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
    sendTemplateQuery,
    sendStreamingMessage
  };
});
