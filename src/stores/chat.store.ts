/**
 * チャットストア
 * 
 * LLMとの対話状態を管理するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { 
  sendLLMQuery, 
  sendLLMQueryWithTools,
  streamLLMQueryWithTools,
  shouldUseMCPTools,
  integrateMCPToolResults,
  formatPrompt 
} from '../services/api/chat.service';
import { useDocumentStore } from './document.store';
import { useRepositoryStore } from './repository.store';
import { getDefaultRepositoryConfig } from '../utils/config.util';
import type { 
  ChatMessage,
  LLMQueryRequest,
  LLMResponse,
  MessageItem,
  ToolCall
} from '../services/api/types';

export interface ClientChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  // MCPツール関連の情報
  toolCalls?: ToolCall[];
  toolResults?: any[];
  isToolExecuting?: boolean;
}

// MCPツール実行状態の管理
export interface MCPToolExecution {
  id: string;
  toolCall: ToolCall;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  progress?: number;
}

// MCPツール設定
export interface MCPToolsConfig {
  enabled: boolean;
  autoDetect: boolean;
  defaultToolChoice: string;
  enableProgressMonitoring: boolean;
  enableDetailedLogging: boolean;
}

export const useChatStore = defineStore('chat', () => {
  // デフォルト設定を取得
  const defaultConfig = getDefaultRepositoryConfig();

  // 基本状態
  const messages = ref<ClientChatMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const documentStore = useDocumentStore();
  const repositoryStore = useRepositoryStore();
  
  // MCPツール関連の状態
  const mcpToolsConfig = ref<MCPToolsConfig>({
    enabled: true,
    autoDetect: true,
    defaultToolChoice: 'auto',
    enableProgressMonitoring: true,
    enableDetailedLogging: true
  });
  
  const activeToolExecutions = ref<MCPToolExecution[]>([]);
  const isStreamingWithTools = ref(false);
  const currentStreamController = ref<AbortController | null>(null);
  const toolExecutionHistory = ref<MCPToolExecution[]>([]);
  
  // Computed プロパティ
  const hasActiveToolExecutions = computed(() => activeToolExecutions.value.length > 0);
  const isToolsEnabled = computed(() => mcpToolsConfig.value.enabled);
  const runningToolExecutions = computed(() => 
    activeToolExecutions.value.filter(exec => exec.status === 'running')
  );
  const completedToolExecutions = computed(() => 
    toolExecutionHistory.value.filter(exec => exec.status === 'completed')
  );
  const failedToolExecutions = computed(() => 
    toolExecutionHistory.value.filter(exec => exec.status === 'error')
  );
  
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
  
  // MCPツール実行追跡関数
  function startToolExecution(toolCall: ToolCall): MCPToolExecution {
    const execution: MCPToolExecution = {
      id: toolCall.id,
      toolCall,
      status: 'pending',
      startTime: new Date()
    };
    
    activeToolExecutions.value.push(execution);
    console.log('Started tool execution:', execution.id, execution.toolCall.function.name);
    return execution;
  }
  
  function updateToolExecutionStatus(
    executionId: string, 
    status: MCPToolExecution['status'], 
    result?: any, 
    error?: string,
    progress?: number
  ) {
    const execution = activeToolExecutions.value.find(exec => exec.id === executionId);
    if (execution) {
      execution.status = status;
      if (result !== undefined) execution.result = result;
      if (error) execution.error = error;
      if (progress !== undefined) execution.progress = progress;
      
      if (status === 'completed' || status === 'error') {
        execution.endTime = new Date();
        // アクティブリストから履歴に移動
        activeToolExecutions.value = activeToolExecutions.value.filter(exec => exec.id !== executionId);
        toolExecutionHistory.value.push(execution);
      }
      
      console.log('Updated tool execution status:', executionId, status);
    }
  }
  
  function clearToolExecutionHistory() {
    toolExecutionHistory.value = [];
    activeToolExecutions.value = [];
    console.log('Cleared tool execution history');
  }
  
  // MCPツール設定管理
  function updateMCPToolsConfig(config: Partial<MCPToolsConfig>) {
    mcpToolsConfig.value = { ...mcpToolsConfig.value, ...config };
    console.log('Updated MCP tools config:', mcpToolsConfig.value);
  }
  
  function toggleMCPTools() {
    mcpToolsConfig.value.enabled = !mcpToolsConfig.value.enabled;
    console.log('Toggled MCP tools:', mcpToolsConfig.value.enabled ? 'enabled' : 'disabled');
  }
  
  // MCPツール対応メッセージ送信
  async function sendMessageWithTools(content: string, forceToolChoice?: string) {
    console.log('Start sending message with MCP tools:', content);
    isLoading.value = true;
    error.value = null;
    
    try {
      // ユーザーメッセージを追加
      const userMessage = addUserMessage(content);
      
      // ツール使用の判定
      const toolRecommendation = shouldUseMCPTools(content, mcpToolsConfig.value.autoDetect);
      const useTools = mcpToolsConfig.value.enabled && toolRecommendation.recommended;
      const toolChoice = forceToolChoice || toolRecommendation.toolChoice;
      
      console.log('Tool recommendation:', toolRecommendation);
      console.log('Using tools:', useTools, 'Tool choice:', toolChoice);
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument;
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません');
      }
      
      // リポジトリ情報を取得
      const service = documentStore.currentService || defaultConfig.service;
      const owner = documentStore.currentOwner || defaultConfig.owner;
      const repo = documentStore.currentRepo || defaultConfig.repo;
      const ref = documentStore.currentRef || defaultConfig.ref;
      const path = currentDoc.path;
      
      // ドキュメントコンテキストを含むシステムプロンプトを作成
      const documentContext = `以下のドキュメントに関する質問に答えてください：

リポジトリ: ${service}/${owner}/${repo}
ファイル: ${path}
ブランチ: ${ref}

ドキュメント内容:
${currentDoc.content.content}`;
      
      // 会話履歴を構築
      const conversationHistory: MessageItem[] = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
      
      // LLMクエリリクエストを構築
      const request: Omit<LLMQueryRequest, 'enable_tools' | 'tool_choice'> = {
        prompt: content,
        conversation_history: conversationHistory,
        context_documents: [path],
        provider: 'openai'
      };
      
      let response: LLMResponse;
      
      if (useTools) {
        // MCPツール付きでクエリを送信
        response = await sendLLMQueryWithTools(request, true, toolChoice, documentContext);
        
        // ツール実行の追跡
        if (response.tool_calls) {
          response.tool_calls.forEach(toolCall => {
            const execution = startToolExecution(toolCall);
            updateToolExecutionStatus(execution.id, 'running');
          });
        }
        
        // ツール実行結果の処理
        if (response.tool_execution_results) {
          response.tool_execution_results.forEach((result, index) => {
            const toolCall = response.tool_calls?.[index];
            if (toolCall) {
              updateToolExecutionStatus(toolCall.id, 'completed', result);
            }
          });
        }
      } else {
        // 通常のクエリを送信
        response = await sendLLMQuery({ ...request, enable_tools: false }, documentContext);
      }
      
      // アシスタントメッセージを追加（ツール情報も含む）
      const assistantMessage = addAssistantMessage(response.content);
      if (useTools && (response.tool_calls || response.tool_execution_results)) {
        assistantMessage.toolCalls = response.tool_calls;
        assistantMessage.toolResults = response.tool_execution_results;
      }
      
      // 最適化された会話履歴があれば更新（MCPツール使用時は慎重に処理）
      if (response.optimized_conversation_history) {
        console.log('🗂️ Server provided optimized conversation history for MCP tools');
        console.log('🗂️ Keeping current UI messages, optimization will be applied transparently in next request');
        // MCPツール使用時は現在のUI表示を維持し、最適化は次回のリクエスト時に透過的に適用
      }
      
      console.log('Message with MCP tools sent successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error sending message with MCP tools:', err);
      error.value = errorMessage;
      
      // エラーメッセージを表示
      addSystemMessage(`エラーが発生しました: ${errorMessage}`);
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
            
            // 最適化された会話履歴の処理を改善
            if (data?.optimized_conversation_history && data.optimized_conversation_history.length > 0) {
              console.log('Using optimized conversation history from the server:', 
                data.optimized_conversation_history.length, 'messages');
              
              // 現在の会話履歴をバックアップ（デバッグ用）
              const oldMessages = [...messages.value];
              console.log('Previous messages count:', oldMessages.length);
              
              // MCPツール使用時は現在のメッセージを保持し、最適化は透過的に処理
              // 通常のストリーミングでのみ履歴を置き換える
              console.log('Replacing conversation history with optimized version for regular streaming');
              
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
  
  // MCPツール対応ストリーミングメッセージ送信
  async function sendStreamingMessageWithTools(
    content: string, 
    onToken?: (token: string) => void,
    forceToolChoice?: string
  ) {
    console.log('Start streaming message with MCP tools:', content);
    isLoading.value = true;
    isStreamingWithTools.value = true;
    error.value = null;
    
    // 前のストリーミングがあれば中止
    if (currentStreamController.value) {
      currentStreamController.value.abort();
    }
    
    try {
      // ユーザーメッセージを追加
      const userMessage = addUserMessage(content);
      
      // ツール使用の判定
      const toolRecommendation = shouldUseMCPTools(content, mcpToolsConfig.value.autoDetect);
      const useTools = mcpToolsConfig.value.enabled && toolRecommendation.recommended;
      const toolChoice = forceToolChoice || toolRecommendation.toolChoice;
      
      console.log('Streaming with tools - Tool recommendation:', toolRecommendation);
      console.log('Using tools:', useTools, 'Tool choice:', toolChoice);
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument;
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません');
      }
      
      // リポジトリ情報を取得
      const service = documentStore.currentService || defaultConfig.service;
      const owner = documentStore.currentOwner || defaultConfig.owner;
      const repo = documentStore.currentRepo || defaultConfig.repo;
      const ref = documentStore.currentRef || defaultConfig.ref;
      const path = currentDoc.path;
      
      // ドキュメントコンテキストを含むシステムプロンプトを作成
      const documentContext = `以下のドキュメントに関する質問に答えてください：

リポジトリ: ${service}/${owner}/${repo}
ファイル: ${path}
ブランチ: ${ref}

ドキュメント内容:
${currentDoc.content.content}`;
      
      // 会話履歴を構築
      const conversationHistory: MessageItem[] = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
      
      // LLMクエリリクエストを構築
      const request: Omit<LLMQueryRequest, 'enable_tools' | 'tool_choice'> = {
        prompt: content,
        conversation_history: conversationHistory,
        context_documents: [path],
        provider: 'openai'
      };
      
      // ストリーミング用の暫定アシスタントメッセージを作成
      const assistantMessage = addAssistantMessage('');
      let accumulatedContent = '';
      
      // ストリーミングコールバック
      const callbacks = {
        onStart: (data?: any) => {
          console.log('🚀 MCP tools streaming started:', data);
        },
        onToken: (token: string) => {
          console.log('📝 Received token:', token.substring(0, 50) + (token.length > 50 ? '...' : ''));
          accumulatedContent += token;
          
          // Vueのリアクティビティを確実にトリガーするため、配列全体を新しい配列で置き換える
          const messageIndex = messages.value.findIndex(msg => msg.id === assistantMessage.id);
          if (messageIndex !== -1) {
            // 新しい配列を作成して置き換え
            const newMessages = [...messages.value];
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              content: accumulatedContent
            };
            messages.value = newMessages;
            console.log('📝 Updated assistant message via full array replacement, content length:', accumulatedContent.length);
            console.log('📝 Message content preview:', accumulatedContent.substring(0, 100) + (accumulatedContent.length > 100 ? '...' : ''));
          } else {
            // フォールバック: 直接更新
            assistantMessage.content = accumulatedContent;
            console.log('📝 Updated assistant message directly (fallback), content length:', accumulatedContent.length);
          }
          
          onToken?.(token);
        },
        onToolCall: (toolCall: any) => {
          console.log('🛠️ Tool call in streaming:', toolCall);
          const execution = startToolExecution(toolCall);
          updateToolExecutionStatus(execution.id, 'running');
          
          // ツール実行情報をメッセージに追加（配列全体を置き換え）
          const messageIndex = messages.value.findIndex(msg => msg.id === assistantMessage.id);
          if (messageIndex !== -1) {
            const newMessages = [...messages.value];
            const currentToolCalls = newMessages[messageIndex].toolCalls || [];
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              toolCalls: [...currentToolCalls, toolCall]
            };
            messages.value = newMessages;
            console.log('🛠️ Added tool call to message via full array replacement, total calls:', newMessages[messageIndex].toolCalls?.length);
          } else {
            // フォールバック: 直接更新
            if (!assistantMessage.toolCalls) {
              assistantMessage.toolCalls = [];
            }
            assistantMessage.toolCalls.push(toolCall);
            console.log('🛠️ Added tool call to message directly (fallback), total calls:', assistantMessage.toolCalls.length);
          }
        },
        onToolResult: (result: any) => {
          console.log('📊 Tool result in streaming:', result);
          
          // ツール実行結果をメッセージに追加（配列全体を置き換え）
          const messageIndex = messages.value.findIndex(msg => msg.id === assistantMessage.id);
          if (messageIndex !== -1) {
            const newMessages = [...messages.value];
            const currentToolResults = newMessages[messageIndex].toolResults || [];
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              toolResults: [...currentToolResults, result]
            };
            messages.value = newMessages;
            console.log('📊 Added tool result to message via full array replacement, total results:', newMessages[messageIndex].toolResults?.length);
          } else {
            // フォールバック: 直接更新
            if (!assistantMessage.toolResults) {
              assistantMessage.toolResults = [];
            }
            assistantMessage.toolResults.push(result);
            console.log('📊 Added tool result to message directly (fallback), total results:', assistantMessage.toolResults.length);
          }
          
          // 対応するツール実行を完了状態に更新
          const execution = activeToolExecutions.value.find(exec => 
            exec.toolCall.function.name === result.function_name
          );
          if (execution) {
            updateToolExecutionStatus(execution.id, 'completed', result);
          }
        },
        onError: (error: string) => {
          console.error('MCP tools streaming error:', error);
          assistantMessage.content = `エラーが発生しました: ${error}`;
          
          // アクティブなツール実行をエラー状態に更新
          activeToolExecutions.value.forEach(execution => {
            updateToolExecutionStatus(execution.id, 'error', undefined, error);
          });
        },
        onEnd: (data?: any) => {
          console.log('🏁 MCP tools streaming ended:', data);
          console.log('🏁 Final assistant message content length:', assistantMessage.content.length);
          console.log('🏁 Final assistant message preview:', assistantMessage.content.substring(0, 100) + (assistantMessage.content.length > 100 ? '...' : ''));
          
          // MCPツール使用時は最適化された会話履歴で置き換えしない
          // 現在のUI表示を維持し、最適化は次回のリクエスト時に透過的に適用される
          if (data?.optimized_conversation_history) {
            console.log('🗂️ Server provided optimized conversation history from MCP streaming');
            console.log('🗂️ Keeping current UI messages, optimization will be applied transparently in next request');
          }
          
          // ツール実行を完了状態に更新
          activeToolExecutions.value.forEach(execution => {
            if (execution.status === 'running') {
              updateToolExecutionStatus(execution.id, 'completed');
            }
          });
        }
      };
      
      if (useTools) {
        // MCPツール付きストリーミング
        console.log('🛠️ Starting MCP tools streaming with request:', {
          prompt: request.prompt,
          toolChoice,
          enableTools: true,
          conversationHistoryLength: request.conversation_history?.length || 0
        });
        
        const controller = await streamLLMQueryWithTools(
          request,
          true,
          toolChoice,
          callbacks,
          documentContext
        );
        currentStreamController.value = controller;
        console.log('🛠️ MCP tools streaming controller established');
      } else {
        // 通常のストリーミング（MCPツールなし）
        console.log('Streaming without tools not implemented, falling back to non-streaming');
        const response = await sendLLMQuery({ ...request, enable_tools: false }, documentContext);
        
        // レスポンスを単語ごとにストリーミング風に表示
        const words = response.content.split(' ');
        for (let i = 0; i < words.length; i++) {
          const token = words[i] + (i < words.length - 1 ? ' ' : '');
          accumulatedContent += token;
          assistantMessage.content = accumulatedContent;
          onToken?.(token);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      console.log('Streaming message with MCP tools completed');
      console.log('📊 Final messages count:', messages.value.length);
      console.log('📊 Last message preview:', {
        role: messages.value[messages.value.length - 1]?.role,
        contentLength: messages.value[messages.value.length - 1]?.content.length,
        hasToolCalls: !!messages.value[messages.value.length - 1]?.toolCalls,
        hasToolResults: !!messages.value[messages.value.length - 1]?.toolResults
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error in streaming message with MCP tools:', err);
      error.value = errorMessage;
      
      addSystemMessage(`ストリーミングエラー: ${errorMessage}`);
    } finally {
      isLoading.value = false;
      isStreamingWithTools.value = false;
      currentStreamController.value = null;
    }
  }
  
  // ストリーミング中止
  function stopStreaming() {
    if (currentStreamController.value) {
      currentStreamController.value.abort();
      currentStreamController.value = null;
      isStreamingWithTools.value = false;
      console.log('Stopped MCP tools streaming');
    }
  }
  
  return {
    // 基本状態
    messages,
    isLoading,
    error,
    
    // MCPツール状態
    mcpToolsConfig,
    activeToolExecutions,
    isStreamingWithTools,
    toolExecutionHistory,
    
    // Computed プロパティ
    hasActiveToolExecutions,
    isToolsEnabled,
    runningToolExecutions,
    completedToolExecutions,
    failedToolExecutions,
    
    // 基本メッセージ操作
    addUserMessage,
    addSystemMessage,
    addAssistantMessage,
    clearMessages,
    
    // LLMクエリ関数
    sendDirectQuery,
    sendTemplateQuery,
    sendStreamingMessage,
    
    // MCPツール対応関数
    sendMessageWithTools,
    sendStreamingMessageWithTools,
    stopStreaming,
    
    // MCPツール管理
    updateMCPToolsConfig,
    toggleMCPTools,
    startToolExecution,
    updateToolExecutionStatus,
    clearToolExecutionHistory
  };
});
