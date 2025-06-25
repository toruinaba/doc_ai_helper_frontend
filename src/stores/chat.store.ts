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
import { getDefaultRepositoryConfig, type DocumentContextConfig } from '../utils/config.util';
import type { 
  ChatMessage,
  LLMQueryRequest,
  LLMResponse,
  MessageItem,
  ToolCall,
  ToolExecutionMode
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
  executionMode: ToolExecutionMode;
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
    executionMode: 'auto',
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
      
      // executionModeに基づいてtoolChoiceを設定
      let toolChoice: string;
      if (forceToolChoice) {
        toolChoice = forceToolChoice;
      } else if (useTools) {
        // MCPツールが有効な場合は、executionModeに基づいて決定
        toolChoice = mcpToolsConfig.value.executionMode; // 'auto' または 'required'
      } else {
        toolChoice = 'none';
      }
      
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
            addSystemMessage(`エラー: ${errorMsg}`);
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
  
  // 新しいバックエンド仕様に対応したストリーミングメッセージ送信
  async function sendStreamingMessageWithConfig(content: string, config?: Partial<DocumentContextConfig>) {
    console.log('Start sending streaming message with config:', content, config);
    isLoading.value = true;
    error.value = null;
    
    try {
      // ユーザーメッセージを追加
      addUserMessage(content);
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument;
      
      // 設定とデフォルトをマージ
      const effectiveConfig = {
        includeDocumentInSystemPrompt: true,
        systemPromptTemplate: 'contextual_document_assistant_ja',
        enableRepositoryContext: true,
        enableDocumentMetadata: true,
        completeToolFlow: true,
        ...config
      };
      
      console.log('📋 Streaming with document context config:', effectiveConfig);
      
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
      
      // 新しいバックエンド仕様に合わせたLLMクエリリクエストの構築
      const request: LLMQueryRequest = {
        prompt: content,
        context_documents: [path],
        conversation_history: conversationHistory,
        
        // 新しいフィールド：リポジトリコンテキスト
        repository_context: (effectiveConfig.enableRepositoryContext && currentDoc) ? {
          service: currentDoc.service as any,
          owner: currentDoc.owner,
          repo: currentDoc.repository,
          ref: currentDoc.ref || 'main',
          current_path: currentDoc.path,
          base_url: null
        } : null,
        
        // 新しいフィールド：ドキュメントメタデータ
        document_metadata: (effectiveConfig.enableDocumentMetadata && currentDoc) ? {
          title: currentDoc.name,
          type: 'markdown' as any,
          filename: currentDoc.name,
          file_extension: currentDoc.name.includes('.') ? currentDoc.name.split('.').pop() || null : null,
          last_modified: currentDoc.metadata.last_modified,
          file_size: currentDoc.metadata.size,
          encoding: currentDoc.content.encoding || 'utf-8',
          language: null
        } : null,
        
        // 新しいフィールド：ドキュメントコンテンツ
        document_content: (effectiveConfig.includeDocumentInSystemPrompt && currentDoc) 
          ? currentDoc.content.content 
          : null,
        
        // 新しいフィールド：システムプロンプト設定
        include_document_in_system_prompt: effectiveConfig.includeDocumentInSystemPrompt,
        system_prompt_template: effectiveConfig.systemPromptTemplate,
        
        // MCPツール設定
        enable_tools: false, // 通常のストリーミングではツールを無効
        complete_tool_flow: effectiveConfig.completeToolFlow
      };
      
      console.log('🌊 Sending streaming request with new backend specification:', {
        hasRepositoryContext: !!request.repository_context,
        hasDocumentMetadata: !!request.document_metadata,
        hasDocumentContent: !!request.document_content,
        includeDocumentInSystemPrompt: request.include_document_in_system_prompt,
        systemPromptTemplate: request.system_prompt_template
      });
      
      // リポジトリコンテキストの詳細をログ出力
      if (request.repository_context) {
        console.log('📁 Repository context details:', {
          service: request.repository_context.service,
          owner: request.repository_context.owner,
          repo: request.repository_context.repo,
          ref: request.repository_context.ref,
          current_path: request.repository_context.current_path,
          base_url: request.repository_context.base_url
        });
      } else {
        console.log('❌ No repository context included in request');
        console.log('Current document data:', {
          hasCurrentDoc: !!currentDoc,
          docService: currentDoc?.service,
          docOwner: currentDoc?.owner,
          docRepo: currentDoc?.repository,
          enableRepositoryContext: effectiveConfig.enableRepositoryContext
        });
      }
      
      // 送信する完全なリクエストオブジェクトもログ出力
      console.log('📦 Complete request object to be sent:', JSON.stringify(request, null, 2));
      
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
              messages.value[messageIndex] = {
                ...messages.value[messageIndex],
                content: accumulatedContent
              };
            }
          },
          onError: (errorMsg) => {
            console.error('Streaming error:', errorMsg);
            error.value = errorMsg;
            
            // エラーメッセージを表示
            addSystemMessage(`ストリーミングエラー: ${errorMsg}`);
          },
          onEnd: (data) => {
            console.log('Streaming ended');
            console.log('Final accumulated content:', accumulatedContent);
            
            // 最終的なメッセージ内容を確認
            const finalMessage = messages.value.find(m => m.id === assistantMessage.id);
            if (finalMessage) {
              console.log('Final message content:', finalMessage.content);
            }
            
            // 会話履歴の最適化があった場合は適用
            if (data?.optimized_conversation_history && data.optimized_conversation_history.length > 0) {
              console.log('🗂️ Server provided optimized conversation history for streaming:', 
                data.optimized_conversation_history.length, 'messages');
            }
            
            isLoading.value = false;
          }
        }
      );
      
      console.log('Streaming message sent successfully with new specification');
      
      // AbortControllerを返す（必要に応じて中断できるように）
      return {
        abort: cleanup || (() => {})
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown streaming error occurred';
      console.error('Error sending streaming message with config:', err);
      error.value = errorMessage;
      
      // エラーメッセージを表示
      addSystemMessage(`ストリーミングエラーが発生しました: ${errorMessage}`);
      isLoading.value = false;
      
      return {
        abort: () => {}
      };
    }
  }
  
  // MCPツール対応ストリーミングメッセージ送信
  // 新しいバックエンド仕様に対応したメッセージ送信（設定付き）
  async function sendMessageWithConfig(content: string, config?: Partial<DocumentContextConfig>) {
    console.log('Start sending message with config:', content, config);
    isLoading.value = true;
    error.value = null;
    
    try {
      // ユーザーメッセージを追加
      addUserMessage(content);
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument;
      
      // 設定とデフォルトをマージ
      const effectiveConfig = {
        includeDocumentInSystemPrompt: true,
        systemPromptTemplate: 'contextual_document_assistant_ja',
        enableRepositoryContext: true,
        enableDocumentMetadata: true,
        completeToolFlow: true,
        ...config
      };
      
      console.log('📋 Message with document context config:', effectiveConfig);
      
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
      
      // 新しいバックエンド仕様に合わせたLLMクエリリクエストの構築
      const request: LLMQueryRequest = {
        prompt: content,
        context_documents: [path],
        conversation_history: conversationHistory,
        
        // 新しいフィールド：リポジトリコンテキスト
        repository_context: (effectiveConfig.enableRepositoryContext && currentDoc) ? {
          service: currentDoc.service as any,
          owner: currentDoc.owner,
          repo: currentDoc.repository,
          ref: currentDoc.ref || 'main',
          current_path: currentDoc.path,
          base_url: null
        } : null,
        
        // 新しいフィールド：ドキュメントメタデータ
        document_metadata: (effectiveConfig.enableDocumentMetadata && currentDoc) ? {
          title: currentDoc.name,
          type: 'markdown' as any,
          filename: currentDoc.name,
          file_extension: currentDoc.name.includes('.') ? currentDoc.name.split('.').pop() || null : null,
          last_modified: currentDoc.metadata.last_modified,
          file_size: currentDoc.metadata.size,
          encoding: currentDoc.content.encoding || 'utf-8',
          language: null
        } : null,
        
        // 新しいフィールド：ドキュメントコンテンツ
        document_content: (effectiveConfig.includeDocumentInSystemPrompt && currentDoc) 
          ? currentDoc.content.content 
          : null,
        
        // 新しいフィールド：システムプロンプト設定
        include_document_in_system_prompt: effectiveConfig.includeDocumentInSystemPrompt,
        system_prompt_template: effectiveConfig.systemPromptTemplate,
        
        // MCPツール設定
        enable_tools: false, // 通常のメッセージ送信ではツールを無効
        complete_tool_flow: effectiveConfig.completeToolFlow
      };
      
      console.log('� Sending message request with new backend specification:', {
        hasRepositoryContext: !!request.repository_context,
        hasDocumentMetadata: !!request.document_metadata,
        hasDocumentContent: !!request.document_content,
        includeDocumentInSystemPrompt: request.include_document_in_system_prompt,
        systemPromptTemplate: request.system_prompt_template
      });
      
      // chat.service.tsのsendLLMQuery関数を使用
      const { sendLLMQuery } = await import('../services/api/chat.service');
      const response = await sendLLMQuery(request);
      
      // レスポンスを処理
      if (response.content) {
        addAssistantMessage(response.content);
        
        // 会話履歴の最適化があった場合は適用
        if (response.optimized_conversation_history && response.optimized_conversation_history.length > 0) {
          console.log('🗂️ Server provided optimized conversation history:', 
            response.optimized_conversation_history.length, 'messages');
        }
      }
      
      console.log('Message sent successfully with new specification');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error sending message with config:', err);
      error.value = errorMessage;
      
      // エラーメッセージを表示
      addSystemMessage(`エラーが発生しました: ${errorMessage}`);
    } finally {
      isLoading.value = false;
    }
  }
  
  // 新しいバックエンド仕様に対応したMCPツール付きストリーミングメッセージ送信
  async function sendStreamingMessageWithToolsAndConfig(
    content: string, 
    config?: Partial<DocumentContextConfig>,
    onToken?: (token: string) => void,
    forceToolChoice?: string
  ) {
    console.log('Start streaming message with MCP tools and config:', content, config);
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
      
      // 設定とデフォルトをマージ
      const effectiveConfig = {
        includeDocumentInSystemPrompt: true,
        systemPromptTemplate: 'contextual_document_assistant_ja',
        enableRepositoryContext: true,
        enableDocumentMetadata: true,
        completeToolFlow: true,
        ...config
      };
      
      console.log('📋 Streaming MCP tools with document context config:', effectiveConfig);
      
      // ツール使用の判定
      const toolRecommendation = shouldUseMCPTools(content, mcpToolsConfig.value.autoDetect);
      const useTools = mcpToolsConfig.value.enabled && toolRecommendation.recommended;
      
      // executionModeに基づいてtoolChoiceを設定
      let toolChoice: string;
      if (forceToolChoice) {
        toolChoice = forceToolChoice;
      } else if (useTools) {
        // MCPツールが有効な場合は、executionModeに基づいて決定
        toolChoice = mcpToolsConfig.value.executionMode; // 'auto' または 'required'
      } else {
        toolChoice = 'none';
      }
      
      console.log('Streaming with tools - Tool recommendation:', toolRecommendation);
      console.log('Using tools:', useTools, 'Tool choice:', toolChoice);
      
      // 現在のドキュメントコンテキストを取得
      const currentDoc = documentStore.currentDocument;
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません');
      }
      
      // 会話履歴を構築
      const conversationHistory: MessageItem[] = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
      
      // 新しいバックエンド仕様に合わせたLLMクエリリクエストを構築
      const request: Omit<LLMQueryRequest, 'enable_tools' | 'tool_choice'> = {
        prompt: content,
        conversation_history: conversationHistory,
        context_documents: [currentDoc.path],
        provider: 'openai',
        
        // 新しいフィールド：リポジトリコンテキスト
        repository_context: (effectiveConfig.enableRepositoryContext && currentDoc) ? {
          service: currentDoc.service as any,
          owner: currentDoc.owner,
          repo: currentDoc.repository,
          ref: currentDoc.ref || 'main',
          current_path: currentDoc.path,
          base_url: null
        } : null,
        
        // 新しいフィールド：ドキュメントメタデータ
        document_metadata: (effectiveConfig.enableDocumentMetadata && currentDoc) ? {
          title: currentDoc.name,
          type: 'markdown' as any,
          filename: currentDoc.name,
          file_extension: currentDoc.name.includes('.') ? currentDoc.name.split('.').pop() || null : null,
          last_modified: currentDoc.metadata.last_modified,
          file_size: currentDoc.metadata.size,
          encoding: currentDoc.content.encoding || 'utf-8',
          language: null
        } : null,
        
        // 新しいフィールド：ドキュメントコンテンツ
        document_content: (effectiveConfig.includeDocumentInSystemPrompt && currentDoc) 
          ? currentDoc.content.content 
          : null,
        
        // 新しいフィールド：システムプロンプト設定
        include_document_in_system_prompt: effectiveConfig.includeDocumentInSystemPrompt,
        system_prompt_template: effectiveConfig.systemPromptTemplate,
        
        // 完全なツールフロー設定
        complete_tool_flow: effectiveConfig.completeToolFlow
      };
      
      console.log('🌊🛠️ Sending streaming MCP tools request with new backend specification:', {
        hasRepositoryContext: !!request.repository_context,
        hasDocumentMetadata: !!request.document_metadata,
        hasDocumentContent: !!request.document_content,
        includeDocumentInSystemPrompt: request.include_document_in_system_prompt,
        systemPromptTemplate: request.system_prompt_template,
        useTools,
        toolChoice
      });
      
      // ストリーミング用の暫定アシスタントメッセージを作成
      const assistantMessage = addAssistantMessage('');
      let accumulatedContent = '';
      
      // ストリーミングコールバック
      const callbacks = {
        onStart: (data?: any) => {
          console.log('🚀 MCP tools streaming started with new backend specification:', data);
        },
        onToken: (token: string) => {
          console.log('🎯 MCP tools token received:', token);
          accumulatedContent += token;
          
          // アシスタントメッセージを更新
          const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
          if (messageIndex !== -1) {
            messages.value[messageIndex] = {
              ...messages.value[messageIndex],
              content: accumulatedContent
            };
          }
          
          // 外部のコールバック関数があれば呼び出し
          onToken?.(token);
        },
        onToolCall: (toolCall: any) => {
          console.log('🛠️ Tool call detected during streaming:', toolCall);
          const execution = startToolExecution(toolCall);
          updateToolExecutionStatus(execution.id, 'running');
        },
        onToolResult: (result: any) => {
          console.log('🎯 Tool result received during streaming:', result);
          
          // 対応するツール実行を完了状態に更新
          const execution = activeToolExecutions.value.find(exec => 
            exec.toolCall.function.name === result.function_name
          );
          if (execution) {
            updateToolExecutionStatus(execution.id, 'completed', result);
          }
        },
        onError: (errorMsg: string) => {
          console.error('🚨 MCP tools streaming error:', errorMsg);
          error.value = errorMsg;
          addSystemMessage(`MCPツールストリーミングエラー: ${errorMsg}`);
          isStreamingWithTools.value = false;
        },
        onEnd: (data?: any) => {
          console.log('✅ MCP tools streaming ended with new backend specification');
          console.log('Final accumulated content:', accumulatedContent);
          
          // 会話履歴の最適化があった場合は適用
          if (data?.optimized_conversation_history && data.optimized_conversation_history.length > 0) {
            console.log('🗂️ Server provided optimized conversation history for MCP tools streaming:', 
              data.optimized_conversation_history.length, 'messages');
          }
          
          isLoading.value = false;
          isStreamingWithTools.value = false;
        }
      };
      
      // chat.service.tsからMCPツール対応ストリーミング関数をインポートして実行
      const { streamLLMQueryWithTools } = await import('../services/api/chat.service');
      
      const abortController = await streamLLMQueryWithTools(
        request,
        useTools,
        toolChoice,
        callbacks
      );
      
      currentStreamController.value = abortController;
      
      console.log('MCP tools streaming message sent successfully with new backend specification');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error sending streaming message with MCP tools and config:', err);
      error.value = errorMessage;
      
      // エラーメッセージを表示
      addSystemMessage(`MCPツールストリーミングエラーが発生しました: ${errorMessage}`);
      isLoading.value = false;
      isStreamingWithTools.value = false;
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
    sendStreamingMessageWithConfig,
    sendMessageWithConfig,
    
    // MCPツール対応関数
    sendMessageWithTools,
    sendStreamingMessageWithToolsAndConfig,
    
    // MCPツール管理
    updateMCPToolsConfig,
    toggleMCPTools,
    startToolExecution,
    updateToolExecutionStatus,
    clearToolExecutionHistory
  };
});
