/**
 * LLM Core Service
 * 
 * 基本的なLLMクエリ機能を提供
 */
import apiClient from '..';
import { shouldUseMockApi } from '../../../utils/config.util';
import type { 
  LLMQueryRequest, 
  LLMResponse,
  MessageItem
} from '../types';

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
  const requestAny = request as any;
  if (systemPrompt && (!requestAny.query.conversation_history || requestAny.query.conversation_history.length === 0)) {
    const { createConversationWithSystemPrompt } = await import('./conversation.service');
    requestAny.query.conversation_history = createConversationWithSystemPrompt(systemPrompt);
  } else if (systemPrompt) {
    const { createConversationWithSystemPrompt } = await import('./conversation.service');
    requestAny.query.conversation_history = createConversationWithSystemPrompt(
      systemPrompt, 
      requestAny.query.conversation_history || []
    );
  }

  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock LLM response as configured by environment variables');
    const { getMockLLMResponse } = await import('../testing');
    const mockResponse = getMockLLMResponse(requestAny.query.prompt, requestAny.query.conversation_history || []) as LLMResponse;
    
    // モックレスポンスに会話履歴が含まれていなければ作成する
    if (!mockResponse.optimized_conversation_history && requestAny.query.conversation_history) {
      // 最新のユーザーメッセージとシステムメッセージを保持
      const systemMessages = requestAny.query.conversation_history.filter(msg => msg.role === 'system');
      const userMessages = requestAny.query.conversation_history.filter(msg => msg.role === 'user');
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
      requestAny.query.conversation_history ? requestAny.query.conversation_history.length : 0, 'messages');
    
    // デバッグ用：最初と最後のメッセージを表示
    if (requestAny.query.conversation_history && requestAny.query.conversation_history.length > 0) {
      console.log('First message:', requestAny.query.conversation_history[0]);
      console.log('Last message:', requestAny.query.conversation_history[requestAny.query.conversation_history.length - 1]);
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
    return {
      provider: provider || 'mock',
      models: ['gpt-3.5-turbo', 'gpt-4'],
      maxTokens: 4096,
      supportedFeatures: ['chat', 'completion', 'embedding']
    };
  }
  
  try {
    const response = await apiClient.getLLMCapabilities(provider);
    return response;
  } catch (error) {
    console.error('LLM capabilities API error:', error);
    throw error;
  }
}

/**
 * LLMテンプレートを取得
 * @returns テンプレート一覧
 */
export async function getLLMTemplates(): Promise<string[]> {
  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock LLM templates as configured by environment variables');
    return [
      'default',
      'code-assistant',
      'documentation-helper',
      'translation'
    ];
  }
  
  try {
    const response = await apiClient.getLLMTemplates();
    return response;
  } catch (error) {
    console.error('LLM templates API error:', error);
    throw error;
  }
}

/**
 * プロンプトをフォーマット
 * @param template テンプレート名
 * @param variables 変数マップ
 * @returns フォーマットされたプロンプト
 */
export async function formatPrompt(
  template: string, 
  variables: Record<string, string>
): Promise<string> {
  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock prompt formatting as configured by environment variables');
    let formattedPrompt = `Template: ${template}\n`;
    for (const [key, value] of Object.entries(variables)) {
      formattedPrompt += `${key}: ${value}\n`;
    }
    return formattedPrompt;
  }
  
  try {
    const response = await apiClient.formatPrompt(template, variables);
    return response;
  } catch (error) {
    console.error('Prompt formatting API error:', error);
    throw error;
  }
}
