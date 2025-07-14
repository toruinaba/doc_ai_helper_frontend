/**
 * Streaming API Client
 * 
 * LLMストリーミングクエリ（基本とMCPツール付き）を担当
 * 複雑なストリーミング処理は既存のllm/streaming.serviceを活用
 */
import { BaseHttpClient } from '../base'
import type { components } from '../../types.auto'

type LLMQueryRequest = components['schemas']['LLMQueryRequest']

// Fallback types for streaming (not fully defined in current API spec)
interface LLMStreamingRequest {
  prompt: string
  provider: string
  model?: string
  conversation_history?: components['schemas']['MessageItem'][]
  stream?: boolean
  disable_cache?: boolean
}

interface StreamingLLMResponse {
  data: {
    content?: string
    error?: string
    [key: string]: any
  }
}

export class StreamingApiClient extends BaseHttpClient {
  /**
   * LLMにストリーミングクエリを送信
   * @param request LLMストリーミングリクエスト
   * @param callbacks ストリーミングイベントのコールバック関数
   * @returns イベントソースを閉じるためのクリーンアップ関数
   */
  streamLLMQuery(
    request: LLMStreamingRequest, 
    callbacks: {
      onStart?: (data: StreamingLLMResponse['data']) => void
      onToken?: (token: string) => void
      onError?: (error: string) => void
      onEnd?: (data: StreamingLLMResponse['data']) => void
    }
  ): () => void {
    // リクエストがストリーミングを要求していることを確認
    const streamingRequest = {
      ...request,
      stream: true
    }
    
    // URL構築
    const baseUrl = this.baseUrl.endsWith('/') 
      ? this.baseUrl.slice(0, -1) 
      : this.baseUrl
    const url = `${baseUrl}/llm/stream`
    
    // クエリパラメータの構築
    const params = new URLSearchParams()
    if (streamingRequest.provider) params.append('provider', streamingRequest.provider)
    if (streamingRequest.model) params.append('model', streamingRequest.model)
    if (streamingRequest.disable_cache) params.append('disable_cache', 'true')
    
    // URLにクエリパラメータを追加
    const fullUrl = `${url}?${params.toString()}`
    
    // イベントソースの作成
    const eventSource = new EventSource(fullUrl)
    
    // 開始イベントハンドラ
    eventSource.addEventListener('start', (event) => {
      try {
        const data = JSON.parse(event.data)
        callbacks.onStart?.(data)
      } catch (error) {
        console.error('SSE start event parsing error:', error)
      }
    })
    
    // トークンイベントハンドラ
    eventSource.addEventListener('token', (event) => {
      try {
        const data = JSON.parse(event.data)
        callbacks.onToken?.(data.content || '')
      } catch (error) {
        console.error('SSE token event parsing error:', error)
      }
    })
    
    // エラーイベントハンドラ
    eventSource.addEventListener('error', (event) => {
      try {
        const messageEvent = event as MessageEvent
        if (messageEvent.data) {
          const data = JSON.parse(messageEvent.data)
          callbacks.onError?.(data.error || 'Unknown streaming error')
        } else {
          callbacks.onError?.('Connection error')
        }
      } catch (error) {
        console.error('SSE error event parsing error:', error)
        callbacks.onError?.('Error parsing error event')
      }
      // エラー時にはイベントソースを閉じる
      eventSource.close()
    })
    
    // 終了イベントハンドラ
    eventSource.addEventListener('end', (event) => {
      try {
        const data = JSON.parse(event.data)
        callbacks.onEnd?.(data)
      } catch (error) {
        console.error('SSE end event parsing error:', error)
      }
      // 終了時にはイベントソースを閉じる
      eventSource.close()
    })
    
    // イベントソースの一般的なエラーハンドラ
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      callbacks.onError?.('EventSource connection error')
      eventSource.close()
    }
    
    // POST本文のJSONデータ
    const jsonData = JSON.stringify(streamingRequest)
    
    // fetchを使用してPOSTリクエストを送信し、EventSourceを開始
    fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
    }).catch((error) => {
      console.error('Fetch error for streaming request:', error)
      callbacks.onError?.(`Failed to initiate streaming request: ${error.message}`)
      eventSource.close()
    })
    
    // クリーンアップ関数を返す
    return () => {
      eventSource.close()
    }
  }

  /**
   * MCPツールを有効にしたLLMストリーミングクエリを送信
   * 複雑なストリーミング処理は既存のllm/streaming.serviceに委譲
   * @param request LLMクエリリクエスト
   * @param enableTools ツールを有効にするかどうか
   * @param toolChoice ツール選択戦略
   * @param callbacks ストリーミングイベントのコールバック関数（MCPツール対応）
   * @returns ストリーミングを中止するためのAbortController
   */
  async streamLLMQueryWithTools(
    request: LLMQueryRequest,
    enableTools: boolean = true,
    toolChoice: string = 'auto',
    callbacks: {
      onStart?: (data?: any) => void
      onToken?: (token: string) => void
      onError?: (error: string) => void
      onEnd?: (data?: any) => void
      onToolCall?: (toolCall: any) => void
      onToolResult?: (result: any) => void
    }
  ): Promise<AbortController> {
    // MCPツール対応のストリーミングサービスを動的にインポート
    const { streamLLMQueryWithTools } = await import('../../llm')
    
    // 既存のストリーミングサービスに委譲
    const cleanupFunction = await streamLLMQueryWithTools(request, callbacks, enableTools)
    
    // AbortControllerを作成し、cleanupと統合
    const abortController = new AbortController()
    const signal = abortController.signal
    
    signal.addEventListener('abort', () => {
      cleanupFunction()
    })
    
    return abortController
  }
}