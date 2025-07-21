/**
 * System API Client
 * 
 * システム関連の操作（ヘルスチェック等）を担当
 */
import { BaseHttpClient } from '../base'

export class SystemApiClient extends BaseHttpClient {
  /**
   * ヘルスチェック
   * @returns ヘルスチェック結果
   */
  async healthCheck(): Promise<Record<string, string>> {
    return this.get<Record<string, string>>('/health/')
  }
}