/**
 * ドキュメントアシスタントストア
 * 
 * LLMとの対話状態を管理するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { llmService } from '../services/api/llm.service';
import { shouldUseMCPTools, integrateMCPToolResults, formatPrompt } from '../services/api/modules';
import { useAsyncOperation } from '../composables/useAsyncOperation';

// ツール実行モードの型定義
type ToolExecutionMode = 'auto' | 'manual' | 'required' | 'none';
import { useDocumentStore } from './document.store';
import { useRepositoryStore } from './repository.store';
import { getDefaultRepositoryConfig, type DocumentContextConfig } from '../utils/config.util';
import type { components } from '../services/api/types.auto';

// 型エイリアスを作成
type LLMResponse = components['schemas']['LLMResponse'];
type MessageItem = components['schemas']['MessageItem'];
type ToolCall = components['schemas']['ToolCall'];
import type { DocumentResponse } from '../services/api/types';

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
  toolChoice: string; // 'auto', 'none', 'required', または特定のツール名
  executionMode: ToolExecutionMode;
  enableProgressMonitoring: boolean;
  enableDetailedLogging: boolean;
}

export const useDocumentAssistantStore = defineStore('documentAssistant', () => {
  // デフォルト設定を取得
  const defaultConfig = getDefaultRepositoryConfig();

  // 基本状態
  const messages = ref<ClientChatMessage[]>([]);
  
  // 非同期操作管理
  const asyncOp = useAsyncOperation({
    defaultErrorMessage: 'ドキュメントアシスタント操作に失敗しました',
    logPrefix: 'DocumentAssistantStore'
  });
  
  const { isLoading, error } = asyncOp;
  const documentStore = useDocumentStore();
  const repositoryStore = useRepositoryStore();
  
  // MCPツール関連の状態
  const mcpToolsConfig = ref<MCPToolsConfig>({
    enabled: true,
    autoDetect: true,
    defaultToolChoice: 'auto',
    toolChoice: 'auto', // デフォルトは自動選択
    executionMode: 'auto',
    enableProgressMonitoring: true,
    enableDetailedLogging: true
  });
  
  const activeToolExecutions = ref<MCPToolExecution[]>([]);
  const isStreamingWithTools = ref(false);
  const currentStreamController = ref<AbortController | (() => void) | null>(null);
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
    
    return await asyncOp.executeWithLoading(async () => {
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
        // MCPツールが有効な場合は、toolChoiceを使用（'auto', 'none', 'required', または特定のツール名）
        toolChoice = mcpToolsConfig.value.toolChoice;
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
      
      // 新しい統一サービスを使用
      let response: LLMResponse;
      
      if (useTools) {
        // MCPツール付きでクエリを送信
        response = await llmService.queryWithTools({
          prompt: content,
          provider: 'openai',
          conversationHistory,
          includeDocument: true,
          enableTools: true,
          toolChoice: toolChoice || 'auto',
          completeToolFlow: true
        }, currentDoc);
        
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
        response = await llmService.query({
          prompt: content,
          provider: 'openai',
          conversationHistory,
          includeDocument: true,
          systemPrompt: documentContext
        }, currentDoc);
      }
      
      // アシスタントメッセージを追加（ツール情報も含む）
      const assistantMessage = addAssistantMessage(response.content);
      if (useTools && (response.tool_calls || response.tool_execution_results)) {
        assistantMessage.toolCalls = response.tool_calls || undefined;
        assistantMessage.toolResults = response.tool_execution_results || undefined;
      }
      
      // 最適化された会話履歴があれば更新（MCPツール使用時は慎重に処理）
      if (response.optimized_conversation_history) {
        console.log('🗂️ Server provided optimized conversation history for MCP tools');
        console.log('🗂️ Keeping current UI messages, optimization will be applied transparently in next request');
        // MCPツール使用時は現在のUI表示を維持し、最適化は次回のリクエスト時に透過的に適用
      }
      
      console.log('Message with MCP tools sent successfully');
    });
    
    // エラーハンドリングはasyncOpが自動で処理
    if (asyncOp.error.value) {
      addSystemMessage(`エラーが発生しました: ${asyncOp.error.value}`);
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
      
      console.log('Sending LLM query with conversation history:', 
        conversationHistory ? conversationHistory.length : 0, 'messages');
      
      // 新しい統一サービスを使用
      const response = await llmService.query({
        prompt,
        provider: options?.provider || 'openai',
        model: options?.model,
        conversationHistory,
        includeDocument: true,
        customOptions: options?.customOptions
      }, currentDoc);
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
    });
  }
  
  // テンプレートを使用してLLMにクエリを送信する関数
  async function sendTemplateQuery(templateId: string, variables: Record<string, any>, options?: {
    provider?: string;
    model?: string;
    customOptions?: Record<string, any>;
  }) {
    return await asyncOp.execute(async () => {
      // テンプレートをフォーマット
      const formattedPrompt = await formatPrompt(templateId, variables);
      
      // フォーマットされたプロンプトを使用してクエリを送信
      return await sendDirectQuery(formattedPrompt, options);
    });
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
      
      console.log('Sending streaming chat message with conversation history:', conversationHistory.length, 'messages');
      
      // アシスタントの空メッセージを追加（ストリーミング表示用）
      const assistantMessage = addAssistantMessage('');
      let accumulatedContent = '';
      
      // 新しい統一サービスでストリーミング
      await llmService.stream(
        {
          prompt: content,
          provider: 'openai',
          conversationHistory,
          includeDocument: true,
          enableTools: false,
          toolChoice: 'none'
        },
        currentDoc,
        {
          onStart: () => {
            console.log('Streaming started');
          },
          onChunk: (chunk) => {
            console.log('Received chunk in chat store:', chunk);
            // 新しいチャンクを受信したら累積コンテンツに追加
            accumulatedContent += chunk;
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
          onError: (error) => {
            console.error('Streaming error:', error);
            const errorMsg = error.message || 'Unknown streaming error';
            error.value = errorMsg;
            
            // エラーメッセージを表示
            addSystemMessage(`エラー: ${errorMsg}`);
          },
          onEnd: (data) => {
            console.log('Streaming completed:', data);
            
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
      
      // 新しいストリーミング実装では中断機能は内部で管理される
      console.log('Streaming chat message sent successfully');
    });
    
    // エラーハンドリングはasyncOpが自動で処理
    if (asyncOp.error.value) {
      addSystemMessage(`エラー: ${asyncOp.error.value}`);
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
      
      if (!currentDoc) {
        throw new Error('ドキュメントが選択されていません');
      }
      
      // リポジトリ情報を取得 (ドキュメントストアの値があればそれを使用し、なければデフォルト値を使用)
      const service = documentStore.currentService || defaultConfig.service;
      const owner = documentStore.currentOwner || defaultConfig.owner;
      const repo = documentStore.currentRepo || defaultConfig.repo;
      const path = documentStore.currentPath || defaultConfig.path;
      const ref = documentStore.currentRef || defaultConfig.ref;
      
      // 設定の統合（デフォルト設定とパラメータのマージ）
      const effectiveConfig = {
        enableRepositoryContext: config?.enableRepositoryContext ?? true,
        enableDocumentMetadata: config?.enableDocumentMetadata ?? true,
        includeDocumentInSystemPrompt: config?.includeDocumentInSystemPrompt ?? true,
        systemPromptTemplate: config?.systemPromptTemplate ?? 'contextual_document_assistant_ja'
      };
      
      // 会話履歴の準備（クライアントメッセージをAPIの形式に変換）
      const conversationHistory = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
      
      console.log('📤 Sending message request with new backend specification');
      
      // 新しい統一サービスでリクエスト送信
      const response = await llmService.query({
        prompt: content,
        provider: 'openai',
        conversationHistory,
        includeDocument: true
      }, currentDoc);
      
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
      if (typeof currentStreamController.value === 'function') {
        currentStreamController.value();
      } else {
        currentStreamController.value.abort();
      }
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
        // MCPツールが有効な場合は、toolChoiceを使用（'auto', 'none', 'required', または特定のツール名）
        toolChoice = mcpToolsConfig.value.toolChoice;
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
      
      // 新しいバックエンド仕様に合わせた処理を開始
      console.log('🌊🛠️ Preparing streaming MCP tools request:', {
        useTools,
        toolChoice
      });
      
      // ストリーミング用のアシスタントメッセージを作成
      const assistantMessage = addAssistantMessage('');
      let accumulatedContent = '';
      
      // 新しい統一サービスでストリーミング
      await llmService.stream(
        {
          prompt: content,
          provider: 'openai',
          conversationHistory,
          includeDocument: true,
          enableTools: useTools,
          toolChoice,
          completeToolFlow: true
        },
        currentDoc,
        {
          onStart: () => {
            console.log('🚀 MCP tools streaming started');
          },
          onChunk: (chunk) => {
            console.log('🎯 MCP tools chunk received:', chunk);
            accumulatedContent += chunk;
            
            // アシスタントメッセージを更新
            const messageIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
            if (messageIndex !== -1) {
              messages.value[messageIndex] = {
                ...messages.value[messageIndex],
                content: accumulatedContent
              };
            }
            
            // 外部のコールバック関数があれば呼び出し
            onToken?.(chunk);
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
          onError: (error) => {
            console.error('🚨 MCP tools streaming error:', error);
            const errorMsg = error.message || 'Unknown streaming error';
            error.value = errorMsg;
            addSystemMessage(`MCPツールストリーミングエラー: ${errorMsg}`);
            isStreamingWithTools.value = false;
          },
          onEnd: (data) => {
            console.log('✅ MCP tools streaming ended');
            console.log('Final accumulated content:', accumulatedContent);
            
            // 会話履歴の最適化があった場合は適用
            if (data?.optimized_conversation_history && data.optimized_conversation_history.length > 0) {
              console.log('🗂️ Server provided optimized conversation history for MCP tools streaming:', 
                data.optimized_conversation_history.length, 'messages');
            }
            
            isLoading.value = false;
            isStreamingWithTools.value = false;
          }
        }
      );
      
      console.log('MCP tools streaming message sent successfully');
      
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
    sendMessageWithConfig: sendDirectQuery,
    
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
