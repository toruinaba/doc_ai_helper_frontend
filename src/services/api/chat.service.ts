/**
 * LLMチャットAPIサービス
 * 
 * LLMとのチャット機能を提供するAPIサービス
 */
import apiClient from '.';
import { shouldUseMockApi } from '../../utils/config.util';
import { getEffectiveStreamingType, StreamingType } from './streaming-config.service';
import type { 
  ChatRequest, 
  ChatResponse, 
  LLMQueryRequest, 
  LLMResponse,
  MessageItem
} from './types';

/**
 * LLMとのチャット
 * @param request チャットリクエスト
 * @returns チャットレスポンス
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock chat response as configured by environment variables');
    const { getMockChatResponse } = await import('./mock.service');
    return getMockChatResponse(
      request.messages, 
      request.document_context
    ) as ChatResponse;
  }
  
  try {
    // モックモードでない場合は実際のAPIを呼び出し
    console.log('Sending chat message with conversation history:', 
      request.messages ? request.messages.length : 0, 'messages');
    
    // デバッグ用：最初と最後のメッセージを表示
    if (request.messages && request.messages.length > 0) {
      console.log('First message:', request.messages[0]);
      console.log('Last message:', request.messages[request.messages.length - 1]);
    }
    
    const response = await apiClient.sendChatMessage(request);
    
    // 会話履歴の最適化情報があれば、コンソールに記録
    if (response.optimized_conversation_history) {
      console.log('Received optimized conversation history from the server');
    }
    
    return response;
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
}

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
      request.conversation_history
    );
  }

  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock LLM response as configured by environment variables');
    const { getMockLLMResponse } = await import('./mock.service');
    const mockResponse = getMockLLMResponse(request.prompt, request.conversation_history) as LLMResponse;
    
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
      request.conversation_history
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
        request.conversation_history
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
      request.conversation_history
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

export default {
  sendChatMessage,
  sendLLMQuery,
  getLLMCapabilities,
  getLLMTemplates,
  formatPrompt,
  createConversationWithSystemPrompt,
  addUserMessageToConversation,
  createConversationWithUserMessage,
  streamLLMQuery
};
