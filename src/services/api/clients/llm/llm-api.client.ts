/**
 * LLM API Client
 * 
 * LLMクエリ、機能取得、テンプレート操作を担当
 */
import { BaseHttpClient } from '../base'
import type { components } from '../../types.auto'

type LLMQueryRequest = components['schemas']['LLMQueryRequest']
type LLMResponse = components['schemas']['LLMResponse']

export class LLMApiClient extends BaseHttpClient {
  /**
   * LLMにクエリを送信
   * @param request LLMクエリリクエスト
   * @returns LLMレスポンス
   */
  async sendLLMQuery(request: LLMQueryRequest): Promise<LLMResponse> {
    return this.post<LLMResponse>('/llm/query', request)
  }

  /**
   * LLMの機能を取得
   * @param provider プロバイダー名（オプション）
   * @returns LLM機能情報
   */
  async getLLMCapabilities(provider?: string): Promise<Record<string, any>> {
    const params = provider ? { provider } : {}
    return this.get<Record<string, any>>('/llm/capabilities', { params })
  }

  /**
   * 利用可能なテンプレート一覧を取得
   * @returns テンプレートID配列
   */
  async getLLMTemplates(): Promise<string[]> {
    return this.get<string[]>('/llm/templates')
  }

  /**
   * プロンプトテンプレートをフォーマット
   * @param templateId テンプレートID
   * @param variables テンプレート変数
   * @returns フォーマットされたプロンプト
   */
  async formatPrompt(
    templateId: string, 
    variables: Record<string, any>
  ): Promise<string> {
    return this.post<string>(
      `/llm/format-prompt?template_id=${templateId}`, 
      variables
    )
  }
}