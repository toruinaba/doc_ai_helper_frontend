/**
 * LLMチャットAPIサービス
 * 
 * LLMとのチャット機能を提供するAPIサービス
 */
import apiClient from '.';
import type { ChatRequest, ChatResponse } from './types';

/**
 * LLMとのチャット
 * @param request チャットリクエスト
 * @returns チャットレスポンス
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  try {
    return await apiClient.post<ChatResponse>('/chat/message', request);
  } catch (error) {
    console.error('Chat API error, using mock response:', error);
    // モックデータを返す（開発用）
    const { getMockChatResponse } = await import('./mock.service');
    return getMockChatResponse(
      request.messages, 
      request.document_context
    ) as ChatResponse;
  }
}

export default {
  sendChatMessage
};
