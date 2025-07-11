/**
 * Conversation Service
 * 
 * 会話履歴の管理機能を提供
 */
import type { MessageItem } from '../types';

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
 * 会話履歴をフィルタリングして最新のメッセージを保持
 * @param conversationHistory 既存の会話履歴
 * @param maxMessages 保持する最大メッセージ数
 * @returns フィルタリングされた会話履歴
 */
export function filterConversationHistory(
  conversationHistory: MessageItem[],
  maxMessages: number = 10
): MessageItem[] {
  if (conversationHistory.length <= maxMessages) {
    return conversationHistory;
  }
  
  // システムメッセージは常に保持
  const systemMessages = conversationHistory.filter(msg => msg.role === 'system');
  const otherMessages = conversationHistory.filter(msg => msg.role !== 'system');
  
  // 最新のメッセージを保持
  const recentMessages = otherMessages.slice(-maxMessages + systemMessages.length);
  
  return [...systemMessages, ...recentMessages];
}

/**
 * 会話履歴のサマリーを作成
 * @param conversationHistory 会話履歴
 * @returns サマリー情報
 */
export function createConversationSummary(conversationHistory: MessageItem[]): {
  totalMessages: number;
  systemMessages: number;
  userMessages: number;
  assistantMessages: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
} {
  const systemMessages = conversationHistory.filter(msg => msg.role === 'system').length;
  const userMessages = conversationHistory.filter(msg => msg.role === 'user').length;
  const assistantMessages = conversationHistory.filter(msg => msg.role === 'assistant').length;
  
  const timestamps = conversationHistory
    .map(msg => msg.timestamp)
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort();
  
  return {
    totalMessages: conversationHistory.length,
    systemMessages,
    userMessages,
    assistantMessages,
    firstTimestamp: timestamps.length > 0 ? timestamps[0] : undefined,
    lastTimestamp: timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined
  };
}
