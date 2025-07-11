/**
 * MCP Tools Service
 * 
 * Model Context Protocol (MCP) ツールの管理と使用機能を提供
 */
import type { 
  MCPToolsResponse,
  MCPToolInfo,
  MessageItem,
  LLMQueryRequest,
  LLMResponse
} from '../types';
import { shouldUseMockApi } from '../../../utils/config.util';
import apiClient from '..';

/**
 * MCPツール情報を取得
 */
export async function getMCPTools(): Promise<MCPToolsResponse> {
  if (shouldUseMockApi()) {
    console.log('Using mock MCP tools as configured by environment variables');
    return {
      tools: [
        {
          name: 'calculate',
          description: '数値計算を実行します',
          parameters: [
            {
              name: 'expression',
              type: 'string',
              description: '計算式（例: "2 + 3 * 4"）',
              required: true
            }
          ],
          enabled: true
        },
        {
          name: 'analyze_document_structure',
          description: 'ドキュメントの構造を分析します',
          parameters: [
            {
              name: 'content',
              type: 'string',
              description: '分析対象のドキュメント内容',
              required: true
            }
          ],
          enabled: true
        },
        {
          name: 'format_text',
          description: 'テキストをフォーマットします',
          parameters: [
            {
              name: 'text',
              type: 'string',
              description: 'フォーマット対象のテキスト',
              required: true
            },
            {
              name: 'format_type',
              type: 'string',
              description: 'フォーマットの種類',
              required: true
            }
          ],
          enabled: true
        }
      ],
      total_count: 3,
      categories: ['calculation', 'analysis', 'formatting']
    };
  }
  
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
  if (shouldUseMockApi()) {
    console.log(`Using mock MCP tool info for ${toolName} as configured by environment variables`);
    return {
      name: toolName,
      description: `Mock description for ${toolName}`,
      parameters: [],
      enabled: true
    };
  }
  
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
 * MCPツール機能を使用すべきかを判断するヘルパー関数
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
 * ツールベースのLLMクエリを送信
 * @param request LLMクエリリクエスト
 * @param enableTools ツール使用を有効にするかどうか
 * @returns LLMレスポンス
 */
export async function sendLLMQueryWithTools(
  request: LLMQueryRequest,
  enableTools: boolean = true
): Promise<LLMResponse> {
  if (!enableTools) {
    // ツール無効時は通常のLLMクエリを実行
    const { sendLLMQuery } = await import('./llm-core.service');
    return sendLLMQuery(request);
  }
  
  if (shouldUseMockApi()) {
    console.log('Using mock LLM response with tools as configured by environment variables');
    const { getMockLLMResponse } = await import('./mock.service');
    return getMockLLMResponse(request.prompt, request.conversation_history || []) as LLMResponse;
  }
  
  try {
    console.log('Sending LLM query with tools enabled');
    const response = await apiClient.sendLLMQueryWithTools(request);
    return response;
  } catch (error) {
    console.error('LLM API with tools error:', error);
    throw error;
  }
}

/**
 * ストリーミングモードでツールベースのLLMクエリを送信
 * @param request LLMクエリリクエスト
 * @param callbacks ストリーミングコールバック
 * @param enableTools ツール使用を有効にするかどうか
 * @returns クリーンアップ関数
 */
export async function streamLLMQueryWithTools(
  request: LLMQueryRequest,
  callbacks: {
    onStart?: (data: any) => void;
    onToken?: (token: string) => void;
    onError?: (error: string) => void;
    onEnd?: (data: any) => void;
    onToolCall?: (toolCall: any) => void;          
    onToolResult?: (result: any) => void;          
  },
  enableTools: boolean = true
): Promise<() => void> {
  if (!enableTools) {
    // ツール無効時は通常のストリーミングを実行
    const { streamLLMQuery } = await import('./streaming.service');
    return streamLLMQuery(request, callbacks);
  }
  
  if (shouldUseMockApi()) {
    console.log('Using mock streaming with tools as configured by environment variables');
    // モックストリーミング実装
    const { streamLLMQuery } = await import('./streaming.service');
    return streamLLMQuery(request, callbacks);
  }

  try {
    console.log('Using streaming LLM query with MCP tools enabled');
    
    // ツール対応のリクエストを構築
    const toolsRequest: LLMQueryRequest = {
      ...request,
      enable_tools: enableTools,
      tool_choice: 'auto' // 自動ツール選択を有効化
    };
    
    // 拡張コールバックを作成（ツール関連イベントに対応）
    const extendedCallbacks = {
      onStart: callbacks.onStart,
      onToken: callbacks.onToken,
      onError: callbacks.onError,
      onEnd: (data: any) => {
        // ツール実行結果が含まれている場合は処理
        if (data.tool_execution_results) {
          data.tool_execution_results.forEach((result: any) => {
            callbacks.onToolResult?.(result);
          });
        }
        callbacks.onEnd?.(data);
      }
    };
    
    // 通常のストリーミングサービスを使用
    const { streamLLMQuery } = await import('./streaming.service');
    return streamLLMQuery(toolsRequest, extendedCallbacks);
  } catch (error) {
    console.error('Streaming LLM with tools error:', error);
    callbacks.onError?.(`Streaming LLM with tools error: ${error instanceof Error ? error.message : String(error)}`);
    return () => {};
  }
}
