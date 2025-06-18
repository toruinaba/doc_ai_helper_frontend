/**
 * LLMチャットAPIサービス
 * 
 * LLMとのチャット機能を提供するAPIサービス
 */
import apiClient from '.';
import { shouldUseMockApi } from '../../utils/config.util';
import type { 
  ChatRequest, 
  ChatResponse, 
  LLMQueryRequest, 
  LLMResponse 
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
    return await apiClient.sendChatMessage(request);
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
}

/**
 * LLMにクエリを送信
 * @param request LLMクエリリクエスト
 * @returns LLMレスポンス
 */
export async function sendLLMQuery(request: LLMQueryRequest): Promise<LLMResponse> {
  // 環境変数の設定に基づいてモックを使用するかどうかを判断
  if (shouldUseMockApi()) {
    console.log('Using mock LLM response as configured by environment variables');
    const { getMockLLMResponse } = await import('./mock.service');
    return getMockLLMResponse(request.prompt) as LLMResponse;
  }
  
  try {
    // モックモードでない場合は実際のAPIを呼び出し
    return await apiClient.sendLLMQuery(request);
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

export default {
  sendChatMessage,
  sendLLMQuery,
  getLLMCapabilities,
  getLLMTemplates,
  formatPrompt
};
