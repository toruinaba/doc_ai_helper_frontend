/**
 * MCP Tools API Client
 * 
 * MCPツール情報取得とツール付きLLMクエリを担当
 */
import { BaseHttpClient } from '../base'
import type { components } from '../../types.auto'

type MCPToolsResponse = components['schemas']['MCPToolsResponse']
type MCPToolInfo = components['schemas']['MCPToolInfo']
type LLMQueryRequest = components['schemas']['LLMQueryRequest']
type LLMResponse = components['schemas']['LLMResponse']

export class MCPToolsApiClient extends BaseHttpClient {
  /**
   * 利用可能なMCPツール一覧を取得
   * @returns MCPツール情報のレスポンス
   */
  async getMCPTools(): Promise<MCPToolsResponse> {
    return this.get<MCPToolsResponse>('/llm/tools')
  }

  /**
   * 特定のMCPツール情報を取得
   * @param toolName ツール名
   * @returns MCPツール情報
   */
  async getMCPTool(toolName: string): Promise<MCPToolInfo> {
    return this.get<MCPToolInfo>(`/llm/tools/${toolName}`)
  }

  /**
   * MCPツールを有効にしたLLMクエリを送信
   * @param request LLMクエリリクエスト
   * @param enableTools ツールを有効にするかどうか
   * @param toolChoice ツール選択戦略
   * @returns LLMレスポンス（ツール実行結果を含む）
   */
  async sendLLMQueryWithTools(
    request: LLMQueryRequest,
    enableTools: boolean = true,
    toolChoice: string = 'auto'
  ): Promise<LLMResponse> {
    const toolsRequest: LLMQueryRequest = {
      ...request,
      tools: {
        enable_tools: enableTools,
        tool_choice: toolChoice,
        complete_tool_flow: true
      }
    }
    
    console.log('Sending LLM query with MCP tools:', {
      enable_tools: enableTools,
      tool_choice: toolChoice,
      prompt: request.query.prompt.substring(0, 100) + '...'
    })
    
    const response = await this.post<LLMResponse>('/llm/query', toolsRequest)
    
    // ツール実行結果をログ出力
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log('Tool calls executed:', response.tool_calls.length)
      response.tool_calls.forEach((toolCall, index) => {
        console.log(`Tool call ${index + 1}:`, {
          id: toolCall.id,
          function: toolCall.function.name,
          arguments: toolCall.function.arguments
        })
      })
    }
    
    if (response.tool_execution_results && response.tool_execution_results.length > 0) {
      console.log('Tool execution results received:', response.tool_execution_results.length)
    }
    
    return response
  }
}