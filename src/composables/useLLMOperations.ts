/**
 * LLM Operations Composable
 * 
 * LLMとの直接的な通信とクエリ処理を管理するコンポーザブル
 */
import { llmService } from '@/services/api/llm.service';
import { shouldUseMCPTools, formatPrompt } from '@/services/api/llm';
import { useAsyncOperation } from '@/composables/useAsyncOperation';
import { useMessageManagement } from '@/composables/useMessageManagement';
import { useDocumentContext } from '@/composables/useDocumentContext';
import { useMCPTools } from '@/composables/useMCPTools';
import { getLLMConfig } from '@/utils/config.util';
import type { components } from '@/services/api/types.auto';
import type { DocumentContextConfig } from '@/utils/config.util';

// 型エイリアス
type LLMResponse = components['schemas']['LLMResponse'];
type MessageItem = components['schemas']['MessageItem'];

export function useLLMOperations() {
  // 設定を取得
  const llmConfig = getLLMConfig();
  
  // 依存する composables
  const { 
    addUserMessage, 
    addAssistantMessage, 
    addSystemMessage, 
    getConversationHistory,
    replaceWithOptimizedHistory,
    saveOptimizedHistory
  } = useMessageManagement();
  
  const { 
    currentDocument, 
    createDocumentSystemPrompt, 
    mergeConfig, 
    validateDocumentContext 
  } = useDocumentContext();
  
  const {
    mcpToolsConfig,
    startToolExecution,
    updateToolExecutionStatus
  } = useMCPTools();

  // 非同期操作管理
  const asyncOp = useAsyncOperation({
    defaultErrorMessage: 'LLM操作に失敗しました',
    logPrefix: 'LLMOperations'
  });

  /**
   * 直接LLMにクエリを送信
   */
  async function sendDirectQuery(prompt: string, options?: {
    provider?: string;
    model?: string;
    customOptions?: Record<string, any>;
    includeHistory?: boolean;
  }) {
    return await asyncOp.executeWithLoading(async () => {
      // ドキュメントコンテキストを検証
      const validation = validateDocumentContext();
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // ユーザープロンプトを追加（UIに表示用）
      addUserMessage(prompt);

      // 会話履歴の準備
      const conversationHistory = options?.includeHistory !== false 
        ? getConversationHistory() 
        : undefined;

      console.log('Sending LLM query with conversation history:', 
        conversationHistory ? conversationHistory.length : 0, 'messages');

      // 新しい統一サービスを使用
      const response = await llmService.query({
        prompt,
        provider: options?.provider || llmConfig.defaultProvider,
        model: options?.model || llmConfig.defaultModel,
        conversationHistory,
        includeDocument: true,
        customOptions: options?.customOptions
      }, currentDocument.value!);

      console.log('Received direct LLM query response:', response);

      // 最適化された会話履歴の処理（非ストリーミングモード）
      if (response.optimized_conversation_history && response.optimized_conversation_history.length > 0) {
        console.log('Received optimized conversation history from server:', 
          response.optimized_conversation_history.length, 'messages');

        // 非ストリーミングモードでは最適化履歴を内部的に保存のみ（UI表示は維持）
        saveOptimizedHistory(response.optimized_conversation_history);
        
        console.log('Optimization saved for next request, keeping current UI messages');
      }
      
      // 非ストリーミングモードでは常にアシスタントメッセージを追加
      console.log('Adding assistant response to UI');
      console.log('Response content length:', response.content?.length);
      console.log('Response content preview:', response.content?.substring(0, 100));
      addAssistantMessage(response.content);

      return response;
    });
  }

  /**
   * テンプレートを使用してLLMにクエリを送信
   */
  async function sendTemplateQuery(templateId: string, variables: Record<string, any>, options?: {
    provider?: string;
    model?: string;
    customOptions?: Record<string, any>;
  }) {
    return await asyncOp.executeWithLoading(async () => {
      // テンプレートをフォーマット
      const formattedPrompt = await formatPrompt(templateId, variables);
      
      // フォーマットされたプロンプトを使用してクエリを送信
      return await sendDirectQuery(formattedPrompt, options);
    });
  }

  /**
   * MCPツール対応メッセージ送信
   */
  async function sendMessageWithTools(content: string, forceToolChoice?: string) {
    console.log('Start sending message with MCP tools:', content);
    
    return await asyncOp.executeWithLoading(async () => {
      // ドキュメントコンテキストを検証
      const validation = validateDocumentContext();
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // ユーザーメッセージを追加
      addUserMessage(content);
      
      // ツール使用の判定
      const toolRecommendation = shouldUseMCPTools(content, mcpToolsConfig.value.autoDetect);
      const useTools = mcpToolsConfig.value.enabled && toolRecommendation.recommended;
      
      // executionModeに基づいてtoolChoiceを設定
      let toolChoice: string;
      if (forceToolChoice) {
        toolChoice = forceToolChoice;
      } else if (useTools) {
        toolChoice = mcpToolsConfig.value.toolChoice;
      } else {
        toolChoice = 'none';
      }
      
      console.log('Tool recommendation:', toolRecommendation);
      console.log('Using tools:', useTools, 'Tool choice:', toolChoice);
      
      // ドキュメントコンテキストを含むシステムプロンプトを作成
      const documentContext = createDocumentSystemPrompt();
      
      // 会話履歴を構築
      const conversationHistory: MessageItem[] = getConversationHistory();
      
      // 新しい統一サービスを使用
      let response: LLMResponse;
      
      if (useTools) {
        // MCPツール付きでクエリを送信
        response = await llmService.queryWithTools({
          prompt: content,
          provider: llmConfig.defaultProvider,
          model: llmConfig.defaultModel,
          conversationHistory,
          includeDocument: true,
          enableTools: true,
          toolChoice: toolChoice || llmConfig.defaultToolChoice,
          completeToolFlow: true
        }, currentDocument.value!);
        
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
          provider: llmConfig.defaultProvider,
          model: llmConfig.defaultModel,
          conversationHistory,
          includeDocument: true,
          systemPrompt: documentContext
        }, currentDocument.value!);
      }
      
      // アシスタントメッセージを追加（ツール情報も含む）
      const assistantMessage = addAssistantMessage(response.content);
      if (useTools && (response.tool_calls || response.tool_execution_results)) {
        assistantMessage.toolCalls = response.tool_calls || undefined;
        assistantMessage.toolResults = response.tool_execution_results || undefined;
      }
      
      // 最適化された会話履歴があれば保存（MCPツール使用時は透過的に処理）
      if (response.optimized_conversation_history && response.optimized_conversation_history.length > 0) {
        console.log('🗂️ Received optimized conversation history for MCP tools:', response.optimized_conversation_history.length, 'messages');
        
        // 最適化履歴を保存して次回リクエストで使用（UI表示は現在のものを維持）
        saveOptimizedHistory(response.optimized_conversation_history);
        
        console.log('🗂️ Optimization saved for next request, keeping current UI messages');
      }
      
      console.log('Message with MCP tools sent successfully');
      return response;
    });
  }

  /**
   * エラーハンドリング付きでシステムメッセージを追加
   */
  function handleError(error: string) {
    addSystemMessage(`エラーが発生しました: ${error}`);
  }

  return {
    // 状態
    isLoading: asyncOp.isLoading,
    error: asyncOp.error,
    
    // アクション
    sendDirectQuery,
    sendTemplateQuery,
    sendMessageWithTools,
    handleError,
    
    // ユーティリティ
    validateDocumentContext
  };
}