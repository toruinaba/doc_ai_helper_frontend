/**
 * Unified LLM Service
 * 
 * 分散していたLLM関連機能を統合し、新しいバックエンド仕様に対応した統一サービス
 */
import apiClient from '.';
import { shouldUseMockApi } from '../../utils/config.util';
import { LLMRequestBuilder } from './builders/llm-request.builder';
import type { components } from './types.auto';

// 型エイリアスを作成
type LLMQueryRequest = components['schemas']['LLMQueryRequest'];
type LLMResponse = components['schemas']['LLMResponse'];
type MessageItem = components['schemas']['MessageItem'];
type ProviderCapabilities = components['schemas']['ProviderCapabilities'];
type MCPToolsResponse = components['schemas']['MCPToolsResponse'];
type MCPToolInfo = components['schemas']['MCPToolInfo'];
import type { DocumentResponse } from './types';

export interface LLMQueryOptions {
  prompt: string;
  provider?: string;
  model?: string;
  conversationHistory?: MessageItem[];
  includeDocument?: boolean;
  systemPrompt?: string;
  customOptions?: Record<string, any>;
}

export interface LLMToolsOptions extends LLMQueryOptions {
  enableTools?: boolean;
  toolChoice?: string;
  completeToolFlow?: boolean;
}

export interface StreamingCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onToolCall?: (toolCall: any) => void;
  onToolResult?: (result: any) => void;
  onEnd?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * 統一されたLLMサービスクラス
 */
class LLMService {
  /**
   * シンプルなLLMクエリ（ツールなし）
   */
  async query(
    options: LLMQueryOptions,
    document?: DocumentResponse
  ): Promise<LLMResponse> {
    const request = this.buildRequest(options, document, { enableTools: false });
    
    if (shouldUseMockApi()) {
      return this.getMockResponse(request);
    }

    // 既存の関数を使用して新しいリクエスト形式で送信
    return await _sendLLMQuery(request as any);
  }

  /**
   * ツール付きLLMクエリ
   */
  async queryWithTools(
    options: LLMToolsOptions,
    document?: DocumentResponse
  ): Promise<LLMResponse> {
    const request = this.buildRequest(options, document, { 
      enableTools: options.enableTools ?? true,
      toolChoice: options.toolChoice,
      completeToolFlow: options.completeToolFlow
    });
    
    if (shouldUseMockApi()) {
      return this.getMockResponseWithTools(request);
    }

    // 既存の関数を使用して新しいリクエスト形式で送信
    return await _sendLLMQuery(request as any);
  }

  /**
   * ストリーミングクエリ
   */
  async stream(
    options: LLMToolsOptions,
    document: DocumentResponse | undefined,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const request = this.buildRequest(options, document, {
      enableTools: options.enableTools ?? true,
      toolChoice: options.toolChoice,
      completeToolFlow: options.completeToolFlow
    });

    if (shouldUseMockApi()) {
      return this.getMockStream(request, callbacks);
    }

    try {
      // 既存のストリーミング機能を使用
      const { streamLLMQuery } = await import('./modules');
      await streamLLMQuery(request as any, {
        onToken: callbacks.onChunk,
        onToolCall: callbacks.onToolCall,
        onToolResult: callbacks.onToolResult,
        onStart: callbacks.onStart,
        onEnd: callbacks.onEnd,
        onError: (errorMsg: string) => callbacks.onError?.(new Error(errorMsg))
      });
      return;
      
      /* 従来のfetchベースのコードをコメントアウト
      const response = await fetch(`/api/v1/llm/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: LLMResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              if (finalResponse) {
                callbacks.onEnd?.(finalResponse);
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content') {
                callbacks.onChunk?.(parsed.content);
              } else if (parsed.type === 'tool_call') {
                callbacks.onToolCall?.(parsed.tool_call);
              } else if (parsed.type === 'tool_result') {
                callbacks.onToolResult?.(parsed.result);
              } else if (parsed.type === 'final') {
                finalResponse = parsed.response;
              }
            } catch (error) {
              console.warn('Failed to parse SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * LLMの機能情報を取得
   */
  async getCapabilities(): Promise<ProviderCapabilities> {
    if (shouldUseMockApi()) {
      const { getMockLLMCapabilities } = await import('./modules/mock.service');
      return getMockLLMCapabilities();
    }

    return await _getLLMCapabilities();
  }

  /**
   * 利用可能なテンプレートを取得
   */
  async getTemplates(): Promise<string[]> {
    if (shouldUseMockApi()) {
      const { getMockLLMTemplates } = await import('./modules/mock.service');
      return getMockLLMTemplates();
    }

    return await _getLLMTemplates();
  }

  /**
   * プロンプトテンプレートをフォーマット
   */
  async formatPrompt(templateId: string, variables: Record<string, any>): Promise<string> {
    if (shouldUseMockApi()) {
      const { getMockFormattedPrompt } = await import('./modules/mock.service');
      return getMockFormattedPrompt(templateId, variables);
    }

    return await _formatPrompt(templateId, variables);
  }

  /**
   * MCPツール一覧を取得
   */
  async getMCPTools(): Promise<MCPToolsResponse> {
    return await _getMCPTools();
  }

  /**
   * 特定のMCPツール情報を取得
   */
  async getMCPToolInfo(toolName: string): Promise<MCPToolInfo> {
    return await _getMCPToolInfo(toolName);
  }

  /**
   * リクエストビルダーを使用してLLMQueryRequestを構築
   */
  private buildRequest(
    options: LLMQueryOptions,
    document?: DocumentResponse,
    toolConfig?: {
      enableTools?: boolean;
      toolChoice?: string;
      completeToolFlow?: boolean;
    }
  ): LLMQueryRequest {
    let builder = LLMRequestBuilder
      .create()
      .prompt(options.prompt)
      .provider(options.provider || 'openai', options.model);

    if (options.conversationHistory) {
      builder = builder.withHistory(options.conversationHistory);
    }

    if (document && options.includeDocument !== false) {
      builder = builder.withDocument(document);
    }

    if (toolConfig?.enableTools) {
      builder = builder.withTools({
        enabled: toolConfig.enableTools,
        choice: toolConfig.toolChoice || 'auto',
        completeFlow: toolConfig.completeToolFlow ?? true
      });
    }

    if (options.customOptions) {
      builder = builder.withProcessing({
        customOptions: options.customOptions
      });
    }

    return builder.build();
  }

  /**
   * モックレスポンスを取得
   */
  private async getMockResponse(request: LLMQueryRequest): Promise<LLMResponse> {
    const { getMockLLMResponse } = await import('./modules/mock.service');
    return getMockLLMResponse(request.query.prompt, request.query.conversation_history || []) as LLMResponse;
  }

  /**
   * ツール付きモックレスポンスを取得
   */
  private async getMockResponseWithTools(request: LLMQueryRequest): Promise<LLMResponse> {
    const { getMockLLMResponse } = await import('./modules/mock.service');
    const baseResponse = getMockLLMResponse(request.query.prompt, request.query.conversation_history || []) as LLMResponse;
    
    // ツール実行のモックを追加
    return {
      ...baseResponse,
      tool_calls: [],
      tool_execution_results: []
    };
  }

  /**
   * モックストリーミングを実行
   */
  private async getMockStream(request: LLMQueryRequest, callbacks: StreamingCallbacks): Promise<void> {
    callbacks.onStart?.();
    
    const mockResponse = await this.getMockResponseWithTools(request);
    const content = mockResponse.content;
    
    // 文字単位でストリーミングをシミュレート
    for (let i = 0; i < content.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      callbacks.onChunk?.(content[i]);
    }
    
    callbacks.onEnd?.(mockResponse);
  }
}

// シングルトンインスタンスを作成
export const llmService = new LLMService();

// 後方互換性のための関数エクスポート
export const sendLLMQuery = (options: LLMQueryOptions, document?: DocumentResponse) =>
  llmService.query(options, document);

export const sendLLMQueryWithTools = (options: LLMToolsOptions, document?: DocumentResponse) =>
  llmService.queryWithTools(options, document);

export const streamLLMQuery = (
  options: LLMToolsOptions,
  document: DocumentResponse | undefined,
  callbacks: StreamingCallbacks
) => llmService.stream(options, document, callbacks);

export const getLLMCapabilities = () => llmService.getCapabilities();
export const getLLMTemplates = () => llmService.getTemplates();
export const formatPrompt = (templateId: string, variables: Record<string, any>) =>
  llmService.formatPrompt(templateId, variables);
export const getMCPTools = () => llmService.getMCPTools();
export const getMCPToolInfo = (toolName: string) => llmService.getMCPToolInfo(toolName);

export default llmService;