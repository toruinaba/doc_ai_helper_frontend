/**
 * LLMチャットAPIサービス
 * 
 * LLMとのチャット機能を提供するAPIサービス
 */
import apiClient from '.';
import { shouldUseMockApi } from '../../utils/config.util';
import { getEffectiveStreamingType, StreamingType } from './streaming-config.service';
import type { 
  LLMQueryRequest, 
  LLMResponse,
  MessageItem,
  DocumentResponse,
  RepositoryContext,
  DocumentMetadataInput,
  MCPToolsResponse,
  MCPToolInfo
} from './types';
import type { DocumentTypeInput, GitService } from './types';

/**
 * LLMにクエリを送信
 * @param request LLMクエリリクエスト
 * @param systemPrompt オプションのシステムプロンプト
 * @returns LLMレスポンス
 */
export async function sendLLMQuery(
  request: LLMQueryRequest, 
  systemPrompt?: string
): Promise<LLMResponse> {
  // システムプロンプトがある場合は会話履歴に追加
  if (systemPrompt && (!request.conversation_history || request.conversation_history.length === 0)) {
    request.conversation_history = createConversationWithSystemPrompt(systemPrompt);
  } else if (systemPrompt) {
    request.conversation_history = createConversationWithSystemPrompt(
      systemPrompt, 
      request.conversation_history || []
    );
  }

  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock LLM response as configured by environment variables');
    const { getMockLLMResponse } = await import('./mock.service');
    const mockResponse = getMockLLMResponse(request.prompt, request.conversation_history || []) as LLMResponse;
    
    // モックレスポンスに会話履歴が含まれていなければ作成する
    if (!mockResponse.optimized_conversation_history && request.conversation_history) {
      // 最新のユーザーメッセージとシステムメッセージを保持
      const systemMessages = request.conversation_history.filter(msg => msg.role === 'system');
      const userMessages = request.conversation_history.filter(msg => msg.role === 'user');
      const latestUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
      
      mockResponse.optimized_conversation_history = [
        ...systemMessages,
        ...(latestUserMessage ? [latestUserMessage] : []),
        { role: 'assistant', content: mockResponse.content, timestamp: new Date().toISOString() }
      ];
      
      console.log('Created conversation history for mock response:', 
        mockResponse.optimized_conversation_history.length, 'messages');
    }
    
    return mockResponse;
  }
  
  try {
    // モックモードでない場合は実際のAPIを呼び出し
    console.log('Sending LLM query with conversation history:', 
      request.conversation_history ? request.conversation_history.length : 0, 'messages');
    
    // デバッグ用：最初と最後のメッセージを表示
    if (request.conversation_history && request.conversation_history.length > 0) {
      console.log('First message:', request.conversation_history[0]);
      console.log('Last message:', request.conversation_history[request.conversation_history.length - 1]);
    }
    
    const response = await apiClient.sendLLMQuery(request);
    
    // 会話履歴の最適化情報があれば、コンソールに記録
    if (response.optimized_conversation_history) {
      console.log('Received optimized conversation history from the server');
    }
    
    return response;
  } catch (error) {
    console.error('LLM API error:', error);
    throw error;
  }
}

/**
 * LLMの機能を取得
 * @param provider プロバイダー名（オプション）
 * @returns LLM機能情報
 */
export async function getLLMCapabilities(provider?: string): Promise<Record<string, any>> {
  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock LLM capabilities as configured by environment variables');
    const { getMockLLMCapabilities } = await import('./mock.service');
    return getMockLLMCapabilities(provider);
  }
  
  try {
    // モックモードでない場合は実際のAPIを呼び出し
    return await apiClient.getLLMCapabilities(provider);
  } catch (error) {
    console.error('LLM capabilities API error:', error);
    throw error;
  }
}

/**
 * 利用可能なテンプレート一覧を取得
 * @returns テンプレートID配列
 */
export async function getLLMTemplates(): Promise<string[]> {
  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock LLM templates as configured by environment variables');
    const { getMockLLMTemplates } = await import('./mock.service');
    return getMockLLMTemplates();
  }
  
  try {
    // モックモードでない場合は実際のAPIを呼び出し
    return await apiClient.getLLMTemplates();
  } catch (error) {
    console.error('LLM templates API error:', error);
    throw error;
  }
}

/**
 * プロンプトテンプレートをフォーマット
 * @param templateId テンプレートID
 * @param variables テンプレート変数
 * @returns フォーマットされたプロンプト
 */
export async function formatPrompt(
  templateId: string, 
  variables: Record<string, any>
): Promise<string> {
  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock formatted prompt as configured by environment variables');
    const { getMockFormattedPrompt } = await import('./mock.service');
    return getMockFormattedPrompt(templateId, variables);
  }
  
  try {
    // モックモードでない場合は実際のAPIを呼び出し
    return await apiClient.formatPrompt(templateId, variables);
  } catch (error) {
    console.error('Format prompt API error:', error);
    throw error;
  }
}

/**
 * システムプロンプトを含む会話履歴を生成
 * @param systemPrompt システムプロンプト
 * @param conversationHistory 既存の会話履歴
 * @returns システムプロンプトを含む会話履歴
 */
export function createConversationWithSystemPrompt(
  systemPrompt: string,
  conversationHistory: MessageItem[] = []
): MessageItem[] {
  // 既存の会話履歴にシステムプロンプトがあるか確認
  const hasSystemPrompt = conversationHistory.some(msg => msg.role === 'system');
  
  if (hasSystemPrompt) {
    // 既存のシステムプロンプトを更新
    return conversationHistory.map(msg => {
      if (msg.role === 'system') {
        return { ...msg, content: systemPrompt };
      }
      return msg;
    });
  } else {
    // システムプロンプトを先頭に追加
    return [
      { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
      ...conversationHistory
    ];
  }
}

/**
 * 会話履歴にユーザーメッセージを追加
 * @param conversationHistory 既存の会話履歴
 * @param userMessage ユーザーメッセージ
 * @returns 更新された会話履歴
 */
export function addUserMessageToConversation(
  conversationHistory: MessageItem[] = [],
  userMessage: string
): MessageItem[] {
  return [
    ...conversationHistory,
    {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
  ];
}

/**
 * 会話履歴にシステムとユーザーメッセージを追加
 * @param systemPrompt システムプロンプト
 * @param userMessage ユーザーメッセージ
 * @returns 新しい会話履歴
 */
export function createConversationWithUserMessage(
  systemPrompt: string,
  userMessage: string
): MessageItem[] {
  return [
    {
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString()
    },
    {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
  ];
}

/**
 * ストリーミングモードでLLMにクエリを送信
 * @param request LLMクエリリクエスト
 * @param callbacks ストリーミングイベントのコールバック関数
 * @param systemPrompt オプションのシステムプロンプト
 * @returns イベントソースを閉じるためのクリーンアップ関数
 */
export function streamLLMQuery(
  request: LLMQueryRequest,
  callbacks: {
    onStart?: (data: any) => void;
    onToken?: (token: string) => void;
    onError?: (error: string) => void;
    onEnd?: (data: any) => void;
  },
  systemPrompt?: string
): () => void {
  // システムプロンプトがある場合は会話履歴に追加
  if (systemPrompt && (!request.conversation_history || request.conversation_history.length === 0)) {
    request.conversation_history = createConversationWithSystemPrompt(systemPrompt);
  } else if (systemPrompt) {
    request.conversation_history = createConversationWithSystemPrompt(
      systemPrompt,
      request.conversation_history || []
    );
  }

  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock streaming for LLM response as configured by environment variables');
    
    // モックストリーミング開始
    // 開始イベントを発火
    callbacks.onStart?.({
      model: 'mock-gpt-3.5-turbo',
      provider: 'mock-openai'
    });
    
    // モックレスポンスを非同期で取得
    import('./mock.service').then(({ getMockLLMResponse }) => {
      const mockResponse = getMockLLMResponse(
        request.prompt, 
        request.conversation_history || []
      ) as LLMResponse;
      
      // モックデータをトークンに分割してストリーミング
      const content = mockResponse.content;
      const tokens = content.split(' ');
      
      // トークンを一定の遅延で送信
      let index = 0;
      const intervalId = setInterval(() => {
        if (index < tokens.length) {
          callbacks.onToken?.(tokens[index] + (index < tokens.length - 1 ? ' ' : ''));
          index++;
        } else {
          clearInterval(intervalId);
          
          // 会話履歴の最適化情報を追加
          if (!mockResponse.optimized_conversation_history && request.conversation_history) {
            // 最新のユーザーメッセージとシステムメッセージを保持
            const systemMessages = request.conversation_history.filter(msg => msg.role === 'system');
            const userMessages = request.conversation_history.filter(msg => msg.role === 'user');
            const latestUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
            
            mockResponse.optimized_conversation_history = [
              ...systemMessages,
              ...(latestUserMessage ? [latestUserMessage] : []),
              { role: 'assistant', content: mockResponse.content, timestamp: new Date().toISOString() }
            ];
          }
          
          // 終了イベントを発火
          callbacks.onEnd?.({
            usage: mockResponse.usage || {
              prompt_tokens: 100,
              completion_tokens: tokens.length,
              total_tokens: 100 + tokens.length
            },
            optimized_conversation_history: mockResponse.optimized_conversation_history
          });
        }
      }, 50); // 50msごとにトークンを送信
      
      // クリーンアップ関数を設定
      cleanupFunction = () => {
        clearInterval(intervalId);
      };
    }).catch((error) => {
      console.error('Mock service error:', error);
      callbacks.onError?.(`Mock service error: ${error instanceof Error ? error.message : String(error)}`);
    });
    
    // クリーンアップ関数
    let cleanupFunction = () => {};
    return () => cleanupFunction();
  }

  try {
    // 実際のAPIストリーミングを使用
    let cleanupFunction = () => {};
    
    // 設定からストリーミング方式を決定
    const streamingType = getEffectiveStreamingType();
    
    // デバッグログ
    console.log(`Using streaming type: ${streamingType} (selected from config)`);
    
    // バックエンドの実装に合わせてfetchベースの実装を優先使用
    if (streamingType === StreamingType.EVENTSOURCE) {
      // EventSourceベースの実装を使用（バックエンドがGETリクエストのSSEをサポートしている場合）
      console.log('Using EventSource-based streaming implementation (configured)');
      import('./streaming.service').then(({ streamLLMQuery: apiStreamLLMQuery }) => {
        const cleanup = apiStreamLLMQuery(request, callbacks);
        cleanupFunction = cleanup;
      }).catch((error) => {
        console.error('Failed to import streaming service:', error);
        callbacks.onError?.(`Failed to import streaming service: ${error instanceof Error ? error.message : String(error)}`);
      });
    } else {
      // fetchベースの代替実装を使用（バックエンドがPOSTリクエストでのストリーミングを要求する場合）
      console.log('Using fetch-based streaming implementation (configured)');
      import('./streaming-alt.service').then(({ streamLLMQueryWithFetch }) => {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const controller = streamLLMQueryWithFetch(apiBaseUrl, '/llm/stream', request, callbacks);
        cleanupFunction = () => controller.abort();
      }).catch((error) => {
        console.error('Failed to import alternative streaming service:', error);
        callbacks.onError?.(`Failed to import alternative streaming service: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
    
    // クリーンアップ関数を返す
    return () => cleanupFunction();
  } catch (error) {
    console.error('Streaming API error:', error);
    callbacks.onError?.(`Streaming API error: ${error instanceof Error ? error.message : String(error)}`);
    return () => {}; // ダミーのクリーンアップ関数
  }
}

/**
 * モックLLMストリーミングの実装
 * バックエンドAPIが未実装の場合やテスト用に使用
 */
function createMockStreamLLMQuery(
  request: LLMQueryRequest,
  callbacks: {
    onStart?: (data: any) => void;
    onToken?: (token: string) => void;
    onError?: (error: string) => void;
    onEnd?: (data: any) => void;
  },
  systemPrompt?: string
): () => void {
  console.log('Creating mock streaming implementation');
  
  // モックストリーミング開始
  // 開始イベントを発火
  callbacks.onStart?.({
    model: 'mock-gpt-3.5-turbo',
    provider: 'mock-openai'
  });
  
  let cleanupFunction = () => {};
  
  // モックレスポンスを非同期で取得
  import('./mock.service').then(({ getMockLLMResponse }) => {
    const mockResponse = getMockLLMResponse(
      request.prompt, 
      request.conversation_history || []
    ) as LLMResponse;
    
    // モックデータをトークンに分割してストリーミング
    const content = mockResponse.content;
    const tokens = content.split(' ');
    
    // トークンを一定の遅延で送信
    let index = 0;
    const intervalId = setInterval(() => {
      if (index < tokens.length) {
        callbacks.onToken?.(tokens[index] + (index < tokens.length - 1 ? ' ' : ''));
        index++;
      } else {
        clearInterval(intervalId);
        
        // 会話履歴の最適化情報を追加
        if (!mockResponse.optimized_conversation_history && request.conversation_history) {
          // 最新のユーザーメッセージとシステムメッセージを保持
          const systemMessages = request.conversation_history.filter(msg => msg.role === 'system');
          const userMessages = request.conversation_history.filter(msg => msg.role === 'user');
          const latestUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
          
          mockResponse.optimized_conversation_history = [
            ...systemMessages,
            ...(latestUserMessage ? [latestUserMessage] : []),
            { role: 'assistant', content: mockResponse.content, timestamp: new Date().toISOString() }
          ];
        }
        
        // 終了イベントを発火
        callbacks.onEnd?.({
          usage: mockResponse.usage || {
            prompt_tokens: 100,
            completion_tokens: tokens.length,
            total_tokens: 100 + tokens.length
          },
          optimized_conversation_history: mockResponse.optimized_conversation_history
        });
      }
    }, 50); // 50msごとにトークンを送信
    
    // クリーンアップ関数を設定
    cleanupFunction = () => {
      clearInterval(intervalId);
    };
  }).catch((error) => {
    console.error('Mock service error:', error);
    callbacks.onError?.(`Mock service error: ${error instanceof Error ? error.message : String(error)}`);
  });
  
  // クリーンアップ関数を返す
  return () => cleanupFunction();
}

/**
 * MCPツールを有効にしたLLMクエリを送信
 * @param request LLMクエリリクエスト（ツール設定を除く）
 * @param enableTools ツールを有効にするかどうか
 * @param toolChoice ツール選択戦略
 * @param systemPrompt オプションのシステムプロンプト
 * @returns LLMレスポンス（ツール実行結果を含む）
 */
export async function sendLLMQueryWithTools(
  request: Omit<LLMQueryRequest, 'enable_tools' | 'tool_choice'>,
  enableTools: boolean = true,
  toolChoice: string = 'auto',
  systemPrompt?: string
): Promise<LLMResponse> {
  // ツール設定を含む完全なリクエストを構築
  const toolsRequest: LLMQueryRequest = {
    ...request,
    enable_tools: enableTools,
    tool_choice: toolChoice
  };

  // システムプロンプトがある場合は会話履歴に追加
  if (systemPrompt && (!toolsRequest.conversation_history || toolsRequest.conversation_history.length === 0)) {
    toolsRequest.conversation_history = createConversationWithSystemPrompt(systemPrompt);
  } else if (systemPrompt) {
    toolsRequest.conversation_history = createConversationWithSystemPrompt(
      systemPrompt, 
      toolsRequest.conversation_history || []
    );
  }

  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock LLM response with MCP tools as configured by environment variables');
    
    try {
      const { getMockLLMResponse } = await import('./mock.service');
      const mockResponse = getMockLLMResponse(toolsRequest.prompt, toolsRequest.conversation_history || []) as LLMResponse;
      
      // モックレスポンスにツール情報が含まれていなければ作成する
      if (enableTools && !mockResponse.tool_calls) {
        // 計算関連のプロンプトの場合、モックツール呼び出しを生成
        if (toolsRequest.prompt.includes('計算') || toolsRequest.prompt.includes('×') || toolsRequest.prompt.includes('+')) {
          mockResponse.tool_calls = [{
            id: 'mock_call_' + Date.now(),
            type: 'function',
            function: {
              name: 'calculate',
              arguments: JSON.stringify({ expression: '100 * 25 + 75' })
            }
          }];
          
          mockResponse.tool_execution_results = [{
            tool_call_id: mockResponse.tool_calls[0].id,
            function_name: 'calculate',
            result: { success: true, result: 2575 }
          }];
          
          // ツール実行結果を反映したコンテンツに更新
          mockResponse.content = `計算結果: 2575\n\n${mockResponse.content}`;
        }
      }
      
      // モックレスポンスに会話履歴が含まれていなければ作成する
      if (!mockResponse.optimized_conversation_history && toolsRequest.conversation_history) {
        const systemMessages = toolsRequest.conversation_history.filter(msg => msg.role === 'system');
        const userMessages = toolsRequest.conversation_history.filter(msg => msg.role === 'user');
        const latestUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
        
        mockResponse.optimized_conversation_history = [
          ...systemMessages,
          ...(latestUserMessage ? [latestUserMessage] : []),
          { role: 'assistant', content: mockResponse.content, timestamp: new Date().toISOString() }
        ];
        
        console.log('Created conversation history for mock MCP tools response:', 
          mockResponse.optimized_conversation_history.length, 'messages');
      }
      
      return mockResponse;
    } catch (error) {
      console.warn('Mock service error, creating fallback response:', error);
      // フォールバック用の基本モックレスポンス
      return {
        content: 'モック環境でのMCPツール機能のテストレスポンスです。',
        model: 'mock-model',
        provider: 'mock',
        usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
        optimized_conversation_history: toolsRequest.conversation_history ? [
          ...toolsRequest.conversation_history,
          { role: 'assistant', content: 'モックレスポンス', timestamp: new Date().toISOString() }
        ] : []
      } as LLMResponse;
    }
  }
  
  try {
    // モックモードでない場合は実際のAPIを呼び出し
    console.log('Sending LLM query with MCP tools:', {
      enable_tools: enableTools,
      tool_choice: toolChoice,
      conversation_history_length: toolsRequest.conversation_history ? toolsRequest.conversation_history.length : 0,
      prompt: toolsRequest.prompt.substring(0, 100) + '...'
    });
    
    // デバッグ用：最初と最後のメッセージを表示
    if (toolsRequest.conversation_history && toolsRequest.conversation_history.length > 0) {
      console.log('First message:', toolsRequest.conversation_history[0]);
      console.log('Last message:', toolsRequest.conversation_history[toolsRequest.conversation_history.length - 1]);
    }
    
    const response = await apiClient.sendLLMQueryWithTools(
      request, 
      enableTools, 
      toolChoice
    );
    
    // ツール実行結果の処理
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log('Tool calls executed:', response.tool_calls.length);
      response.tool_calls.forEach((toolCall, index) => {
        console.log(`Tool call ${index + 1}:`, {
          id: toolCall.id,
          function: toolCall.function.name,
          arguments: toolCall.function.arguments
        });
      });
    }
    
    if (response.tool_execution_results && response.tool_execution_results.length > 0) {
      console.log('Tool execution results received:', response.tool_execution_results.length);
    }
    
    // 会話履歴の最適化情報があれば、コンソールに記録
    if (response.optimized_conversation_history) {
      console.log('Received optimized conversation history from the server (with MCP tools)');
    }
    
    return response;
  } catch (error) {
    console.error('LLM API with MCP tools error:', error);
    throw error;
  }
}

/**
 * MCPツールを有効にしたストリーミングLLMクエリを送信
 * @param request LLMクエリリクエスト（ツール設定を除く）
 * @param enableTools ツールを有効にするかどうか
 * @param toolChoice ツール選択戦略
 * @param callbacks ストリーミングコールバック（MCPツール対応）
 * @param systemPrompt オプションのシステムプロンプト
 * @returns ストリーミングを中止するためのAbortController
 */
export async function streamLLMQueryWithTools(
  request: LLMQueryRequest, // 完全なLLMQueryRequestを受け取る
  enableTools: boolean = true,
  toolChoice: string = 'auto',
  callbacks: {
    onStart?: (data?: any) => void;
    onToken?: (token: string) => void;
    onError?: (error: string) => void;
    onEnd?: (data?: any) => void;
    onToolCall?: (toolCall: any) => void;           // ツール呼び出し開始時
    onToolResult?: (result: any) => void;           // ツール実行結果受信時
  },
  systemPrompt?: string
): Promise<AbortController> {
  // ツール設定を含む完全なリクエストを構築
  let toolsRequest: LLMQueryRequest = {
    ...request,
    enable_tools: enableTools,
    tool_choice: toolChoice
  };

  // システムプロンプトがある場合は会話履歴に追加
  if (systemPrompt && (!toolsRequest.conversation_history || toolsRequest.conversation_history.length === 0)) {
    toolsRequest.conversation_history = createConversationWithSystemPrompt(systemPrompt);
  } else if (systemPrompt) {
    toolsRequest.conversation_history = createConversationWithSystemPrompt(
      systemPrompt, 
      toolsRequest.conversation_history || []
    );
  }

  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Mock streaming with MCP tools is not implemented, falling back to non-streaming');
    
    // モックの場合は非ストリーミングで実行し、結果をストリーミング形式で配信
    const controller = new AbortController();
    
    setTimeout(async () => {
      try {
        callbacks.onStart?.({ 
          model: 'mock-model', 
          provider: 'mock',
          tools_enabled: enableTools 
        });
        
        const response = await sendLLMQueryWithTools(request, enableTools, toolChoice, systemPrompt);
        
        // ツール呼び出しがあればコールバック実行
        if (response.tool_calls) {
          response.tool_calls.forEach(toolCall => {
            callbacks.onToolCall?.(toolCall);
          });
        }
        
        // ツール実行結果があればコールバック実行
        if (response.tool_execution_results) {
          response.tool_execution_results.forEach(result => {
            callbacks.onToolResult?.(result);
          });
        }
        
        // コンテンツを単語ごとにストリーミング
        const words = response.content.split(' ');
        for (let i = 0; i < words.length; i++) {
          if (controller.signal.aborted) break;
          
          callbacks.onToken?.(words[i] + (i < words.length - 1 ? ' ' : ''));
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms間隔
        }
        
        callbacks.onEnd?.({
          usage: response.usage,
          optimized_conversation_history: response.optimized_conversation_history,
          tool_calls: response.tool_calls,
          tool_execution_results: response.tool_execution_results
        });
      } catch (error) {
        callbacks.onError?.(error instanceof Error ? error.message : 'Mock streaming error');
      }
    }, 100);
    
    return controller;
  }
  
  try {
    // モックモードでない場合は実際のAPIを呼び出し
    console.log('Starting streaming LLM query with MCP tools:', {
      enable_tools: enableTools,
      tool_choice: toolChoice,
      conversation_history_length: toolsRequest.conversation_history ? toolsRequest.conversation_history.length : 0,
      hasRepositoryContext: !!toolsRequest.repository_context,
      hasDocumentMetadata: !!toolsRequest.document_metadata,
      hasDocumentContent: !!toolsRequest.document_content
    });
    
    return await apiClient.streamLLMQueryWithTools(
      toolsRequest, // 完全なリクエストを渡す
      enableTools,
      toolChoice,
      callbacks
    );
  } catch (error) {
    console.error('Streaming LLM API with MCP tools error:', error);
    throw error;
  }
}

/**
 * MCPツール情報を取得
 */
export async function getMCPTools(): Promise<MCPToolsResponse> {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/v1/llm/tools`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch MCP tools:', error);
    throw error;
  }
}

/**
 * 特定のMCPツールの詳細情報を取得
 */
export async function getMCPToolInfo(toolName: string): Promise<MCPToolInfo> {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/v1/llm/tools/${encodeURIComponent(toolName)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch MCP tool info for ${toolName}:`, error);
    throw error;
  }
}

/**
 * MCPツール機能を使用すべべきかを判断するヘルパー関数
 * @param prompt ユーザーのプロンプト
 * @param enableAutoDetection 自動検出を有効にするかどうか
 * @returns ツール使用推奨の判定結果
 */
export function shouldUseMCPTools(prompt: string, enableAutoDetection: boolean = true): {
  recommended: boolean;
  toolChoice: string;
  reason: string;
} {
  if (!enableAutoDetection) {
    return { recommended: false, toolChoice: 'none', reason: 'Auto-detection disabled' };
  }

  const lowerPrompt = prompt.toLowerCase();
  
  // 計算関連のキーワード検出
  const calculationKeywords = ['計算', '足す', '引く', '掛ける', '割る', '+', '-', '×', '*', '÷', '/', '='];
  if (calculationKeywords.some(keyword => lowerPrompt.includes(keyword))) {
    return { 
      recommended: true, 
      toolChoice: 'calculate', 
      reason: 'Mathematical calculation detected' 
    };
  }
  
  // ドキュメント分析関連のキーワード検出
  const analysisKeywords = ['分析', '構造', '要約', '抽出', 'まとめ', '整理'];
  if (analysisKeywords.some(keyword => lowerPrompt.includes(keyword))) {
    return { 
      recommended: true, 
      toolChoice: 'analyze_document_structure', 
      reason: 'Document analysis task detected' 
    };
  }
  
  // テキストフォーマット関連のキーワード検出
  const formatKeywords = ['フォーマット', '大文字', '小文字', 'タイトルケース', '整形'];
  if (formatKeywords.some(keyword => lowerPrompt.includes(keyword))) {
    return { 
      recommended: true, 
      toolChoice: 'format_text', 
      reason: 'Text formatting task detected' 
    };
  }
  
  // フィードバック生成関連のキーワード検出
  const feedbackKeywords = ['フィードバック', '評価', '改善', '提案', 'レビュー'];
  if (feedbackKeywords.some(keyword => lowerPrompt.includes(keyword))) {
    return { 
      recommended: true, 
      toolChoice: 'generate_feedback_from_conversation', 
      reason: 'Feedback generation task detected' 
    };
  }
  
  // デフォルトは自動選択
  return { 
    recommended: true, 
    toolChoice: 'auto', 
    reason: 'General query, auto tool selection recommended' 
  };
}

/**
 * MCPツール実行結果を会話履歴に統合するヘルパー関数
 * @param conversation 既存の会話履歴
 * @param toolCalls ツール呼び出し情報
 * @param toolResults ツール実行結果
 * @param assistantResponse アシスタントのレスポンス
 * @returns 統合された会話履歴
 */
export function integrateMCPToolResults(
  conversation: MessageItem[],
  toolCalls?: any[],
  toolResults?: any[],
  assistantResponse?: string
): MessageItem[] {
  const integratedConversation = [...conversation];
  
  // ツール呼び出し情報を会話履歴に追加（システムメッセージとして）
  if (toolCalls && toolCalls.length > 0) {
    const toolCallsMessage: MessageItem = {
      role: 'system',
      content: `MCPツールが実行されました: ${toolCalls.map(tc => tc.function.name).join(', ')}`,
      timestamp: new Date().toISOString()
    };
    integratedConversation.push(toolCallsMessage);
  }
  
  // ツール実行結果を会話履歴に追加（システムメッセージとして）
  if (toolResults && toolResults.length > 0) {
    const toolResultsMessage: MessageItem = {
      role: 'system',
      content: `ツール実行結果: ${toolResults.length}件の結果が取得されました`,
      timestamp: new Date().toISOString()
    };
    integratedConversation.push(toolResultsMessage);
  }
  
  // アシスタントのレスポンスを追加
  if (assistantResponse) {
    const assistantMessage: MessageItem = {
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date().toISOString()
    };
    integratedConversation.push(assistantMessage);
  }
  
  return integratedConversation;
}

/**
 * ドキュメント情報からDocumentMetadataInputを生成する
 * @param document ドキュメントレスポンス
 * @returns DocumentMetadataInput
 */
export function createDocumentMetadataInput(document: DocumentResponse | null): DocumentMetadataInput | null {
  if (!document) return null;
  
  // ファイル拡張子の抽出
  const fileExtension = document.name.includes('.') 
    ? document.name.split('.').pop() 
    : null;
  
  // ドキュメントタイプのマッピング（文字列リテラル型に対応）
  const typeMapping: Record<string, DocumentTypeInput> = {
    'markdown': 'markdown',
    'html': 'html',
    'text': 'text',
    'python': 'python',
    'javascript': 'javascript',
    'typescript': 'typescript',
    'json': 'json',
    'yaml': 'yaml',
    'xml': 'xml'
  };
  
  const documentType = typeMapping[document.type.toLowerCase()] || 'other';
  
  return {
    title: document.name,
    type: documentType,
    filename: document.name,
    file_extension: fileExtension || null,
    last_modified: document.metadata.last_modified,
    file_size: document.metadata.size,
    encoding: document.content.encoding || 'utf-8',
    language: null // 言語検出は将来的に実装
  };
}

/**
 * リポジトリ情報からRepositoryContextを生成する
 * @param document ドキュメントレスポンス
 * @returns RepositoryContext
 */
export function createRepositoryContext(document: DocumentResponse | null): RepositoryContext | null {
  if (!document) return null;
  
  // サービス名のマッピング（文字列リテラル型に対応）
  const serviceMapping: Record<string, GitService> = {
    'github': 'github',
    'gitlab': 'gitlab',
    'bitbucket': 'bitbucket'
  };
  
  const service = serviceMapping[document.service.toLowerCase()] || 'github';
  
  return {
    service,
    owner: document.owner,
    repo: document.repository,
    ref: document.ref || 'main',
    current_path: document.path,
    base_url: null // 必要に応じて設定
  };
}

export default {
  sendLLMQuery,
  sendLLMQueryWithTools,
  streamLLMQueryWithTools,
  getLLMCapabilities,
  getLLMTemplates,
  formatPrompt,
  createConversationWithSystemPrompt,
  addUserMessageToConversation,
  createConversationWithUserMessage,
  shouldUseMCPTools,
  integrateMCPToolResults,
  createDocumentMetadataInput,
  createRepositoryContext,
  getMCPTools,
  getMCPToolInfo
};
