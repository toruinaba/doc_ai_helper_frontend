import { normalizeUrl } from './url-helper'
import type { ToolCall, MCPStreamingCallbacks } from './types'

// ストリーミングコールバック関数の型定義
interface StreamingCallbacks {
  onStart?: (data?: any) => void;
  onToken?: (token: string) => void;
  onError?: (error: string) => void;
  onEnd?: (data?: any) => void;
}

// Fetch-based SSE実装（POST対応）
export function streamLLMQueryWithFetch(
  apiBaseUrl: string,
  endpoint: string,
  requestData: any,
  callbacks: StreamingCallbacks
): AbortController {
  const controller = new AbortController()
  
  console.log('=== Initializing Fetch Streaming (Alt) ===')
  console.log('API Base URL:', apiBaseUrl)
  console.log('Endpoint:', endpoint)
  console.log('Request data:', requestData)
  
  const fullUrl = normalizeUrl(apiBaseUrl, endpoint)
  console.log('Full URL:', fullUrl)
  
  fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify(requestData),
    signal: controller.signal,
  })
  .then(response => {
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    if (!response.body) {
      throw new Error('Response body is null')
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    // トークンコンテンツを抽出するヘルパー関数
    function extractTokenContent(parsedData: any): string | null {
      // doneフィールドがtrueの場合は終了信号なのでコンテンツとして扱わない
      if (parsedData.done === true || parsedData.done === "true") {
        console.log('Stream done signal detected, ending stream')
        return null
      }
      
      if (parsedData.text) {
        console.log('Found text field:', parsedData.text)
        return parsedData.text
      } else if (parsedData.content) {
        console.log('Found content field:', parsedData.content)
        return parsedData.content
      } else if (typeof parsedData === 'string') {
        console.log('Data is string:', parsedData)
        return parsedData
      } else {
        console.log('No recognizable content, returning null')
        return null
      }
    }

    // イベントを処理する関数
    function processEvent(eventType: string, eventData: string) {
      console.log('processEvent called with type:', eventType, 'data:', eventData)
      try {
        // JSONでない場合は単純なテキストとして処理
        let parsedData
        try {
          parsedData = JSON.parse(eventData)
        } catch (e) {
          // JSONではない場合、シンプルなトークンとして扱う
          parsedData = { content: eventData }
          // イベントタイプがない場合はトークンとして扱う
          if (!eventType) eventType = 'token'
        }
        
        switch (eventType) {
          case 'start':
            console.log('Processing start event:', parsedData)
            callbacks.onStart?.(parsedData)
            break
          case 'token':
            // doneフィールドをチェック
            if (parsedData.done === true || parsedData.done === "true") {
              console.log('Stream done signal detected, ending stream')
              callbacks.onEnd?.(parsedData)
              return
            }
            
            const tokenContent = extractTokenContent(parsedData)
            if (tokenContent !== null) {
              console.log('Processing token event with extracted content:', tokenContent)
              callbacks.onToken?.(tokenContent)
            }
            break
          case 'end':
            console.log('Processing end event:', parsedData)
            callbacks.onEnd?.(parsedData)
            break
          case 'error':
            callbacks.onError?.(parsedData.error || 'Unknown streaming error')
            controller.abort()
            break
          default:
            // 不明なイベントタイプの場合、内容によって処理
            if (parsedData.done === true || parsedData.done === "true") {
              console.log('Stream done signal detected in default case, ending stream')
              callbacks.onEnd?.(parsedData)
              return
            }
            
            const defaultContent = extractTokenContent(parsedData)
            if (defaultContent !== null) {
              console.log('Processing unknown event type as token:', defaultContent)
              callbacks.onToken?.(defaultContent)
            }
            break
        }
      } catch (error) {
        console.error(`Error processing streaming data:`, error)
        console.error(`Event type: ${eventType}, Raw data: ${eventData}`)
      }
    }
    
    // バッファからSSEデータを処理
    function processStreamData(chunk: string) {
      buffer += chunk
      console.log('Raw streaming data received:', buffer)
      
      const lines = buffer.split('\n')
      // 最後の要素は不完全な可能性があるので残す
      buffer = lines.pop() || ''
      
      let eventType = ''
      let eventData = ''
      
      for (const line of lines) {
        console.log('Processing line:', line)
        
        if (line === '') {
          // 空行はイベントの終わり
          if (eventData) {
            if (!eventType) {
              eventType = 'token'
              console.log('No event type specified, defaulting to token')
            }
            processEvent(eventType, eventData)
            eventType = ''
            eventData = ''
          }
          continue
        }
        
        if (line.startsWith('event:')) {
          eventType = line.substring(6).trim()
          console.log('Event type:', eventType)
        } else if (line.startsWith('data:')) {
          const newEventData = line.substring(5).trim()
          console.log('Event data:', newEventData)
          
          // 空でない場合のみ更新
          if (newEventData) {
            eventData = newEventData
            
            // データが再度 "data:" で始まっている場合（二重エンコーディング対応）
            if (eventData.startsWith('data:')) {
              eventData = eventData.substring(5).trim()
              console.log('Double-encoded data detected, extracted:', eventData)
            }
            
            // データがある場合は即座に処理（改行を待たない）
            if (eventData) {
              if (!eventType) {
                eventType = 'token'
                console.log('No event type specified, defaulting to token')
              }
              processEvent(eventType, eventData)
              eventType = ''
              eventData = ''
            }
          }
        } else if (line.trim()) {
          // イベントタイプがないが、データがある場合
          // バックエンドによっては標準的なSSE形式ではなく、
          // 直接JSONや特殊な形式を送信する場合がある
          console.log('Processing non-SSE line:', line)
          try {
            // JSONとして解析を試みる
            const parsedData = JSON.parse(line)
            
            // doneフィールドをチェック
            if (parsedData.done === true || parsedData.done === "true") {
              console.log('Stream done signal detected in non-SSE line, ending stream')
              callbacks.onEnd?.(parsedData)
              return
            }
            
            const tokenContent = extractTokenContent(parsedData)
            if (tokenContent !== null) {
              console.log('Calling onToken with extracted content:', tokenContent)
              callbacks.onToken?.(tokenContent)
            }
          } catch (e) {
            // JSONではない場合、単純なテキストトークンとして扱う
            console.log('Calling onToken with raw line:', line)
            callbacks.onToken?.(line)
          }
        }
      }
      
      // 最後に残ったイベントがあれば処理
      if (eventData) {
        // eventTypeがない場合はデフォルトで'token'として扱う
        if (!eventType) {
          eventType = 'token'
          console.log('No event type specified, defaulting to token')
        }
        processEvent(eventType, eventData)
      }
    }
    
    // ストリームの読み込みを開始
    function readStream(): Promise<void> {
      return reader.read().then(({ done, value }) => {
        if (done) {
          console.log('Stream complete')
          if (buffer.trim()) {
            processStreamData('')
          }
          return
        }
        
        const chunk = decoder.decode(value, { stream: true })
        processStreamData(chunk)
        
        return readStream()
      })
    }
    
    readStream().catch(error => {
      console.error('Stream reading error:', error)
      callbacks.onError?.(`Stream reading error: ${error.message}`)
    })
  })
  .catch(error => {
    console.error('Fetch error for streaming request:', error)
    
    let errorMessage = 'Failed to initiate streaming request'
    if (error instanceof TypeError) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not connect to server. Please check if the backend is running and CORS is properly configured.'
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error: The server needs to be configured to allow cross-origin requests.'
      } else {
        errorMessage = `Network error: ${error.message}`
      }
    } else if (error instanceof Error) {
      errorMessage = `Request error: ${error.message}`
    }
    
    callbacks.onError?.(errorMessage)
  })
  
  return controller
}

/**
 * MCPツール対応のFetch-based SSE実装
 * 既存のstreamLLMQueryWithFetchを拡張し、MCPツール機能に対応
 * @param apiBaseUrl APIのベースURL
 * @param endpoint エンドポイント
 * @param requestData リクエストデータ（MCPツール設定を含む）
 * @param callbacks ストリーミングコールバック（MCPツール対応）
 * @returns AbortController
 */
export function streamLLMQueryWithMCPTools(
  apiBaseUrl: string,
  endpoint: string,
  requestData: any,
  callbacks: MCPStreamingCallbacks
): AbortController {
  console.log('=== Initializing MCP Tools Streaming ===')
  console.log('MCP Tools enabled:', requestData.enable_tools)
  console.log('Tool choice:', requestData.tool_choice)

  // 拡張されたコールバック関数を定義
  const extendedCallbacks: StreamingCallbacks = {
    onStart: (data?: any) => {
      console.log('MCP streaming started:', data)
      
      // ツール関連の情報があれば処理
      if (data?.tools_available) {
        console.log('Available tools:', data.tools_available)
      }
      
      callbacks.onStart?.(data)
    },
    
    onToken: (token: string) => {
      // 通常のトークンストリーミング
      callbacks.onToken?.(token)
    },
    
    onError: (error: string) => {
      console.error('MCP streaming error:', error)
      callbacks.onError?.(error)
    },
    
    onEnd: (data?: any) => {
      console.log('MCP streaming ended:', data)
      
      // ツール実行結果の処理
      if (data?.tool_calls && Array.isArray(data.tool_calls)) {
        console.log('Processing tool calls from stream end:', data.tool_calls.length)
        data.tool_calls.forEach((toolCall: ToolCall, index: number) => {
          console.log(`Tool call ${index + 1}:`, {
            id: toolCall.id,
            function: toolCall.function.name,
            arguments: toolCall.function.arguments
          })
          callbacks.onToolCall?.(toolCall)
        })
      }
      
      if (data?.tool_execution_results && Array.isArray(data.tool_execution_results)) {
        console.log('Processing tool execution results from stream end:', data.tool_execution_results.length)
        data.tool_execution_results.forEach((result: any, index: number) => {
          console.log(`Tool result ${index + 1}:`, result)
          callbacks.onToolResult?.(result)
        })
      }
      
      // 最適化された会話履歴の処理
      if (data?.optimized_conversation_history) {
        console.log('Optimized conversation history received:', data.optimized_conversation_history.length, 'messages')
      }
      
      callbacks.onEnd?.(data)
    }
  }

  // 既存のstreamLLMQueryWithFetch関数を使用
  return streamLLMQueryWithFetch(apiBaseUrl, endpoint, requestData, extendedCallbacks)
}

/**
 * リアルタイムMCPツール実行ストリーミング
 * ツール実行中の進捗をリアルタイムで監視
 * @param apiBaseUrl APIのベースURL
 * @param endpoint エンドポイント
 * @param requestData リクエストデータ
 * @param callbacks MCPツール専用コールバック
 * @returns AbortController
 */
export function streamMCPToolExecution(
  apiBaseUrl: string,
  endpoint: string,
  requestData: any,
  callbacks: MCPStreamingCallbacks & {
    onToolProgress?: (progress: { toolId: string; status: string; progress?: number }) => void
  }
): AbortController {
  console.log('=== Initializing Real-time MCP Tool Execution Streaming ===')
  
  const controller = new AbortController()
  const fullUrl = normalizeUrl(apiBaseUrl, endpoint)
  
  fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      ...requestData,
      enable_tools: true,
      stream_tool_execution: true // ツール実行の詳細ストリーミングを有効化
    }),
    signal: controller.signal,
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    if (!response.body) {
      throw new Error('Response body is null')
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    // MCPツール固有のイベント処理
    function processMCPEvent(eventType: string, eventData: string) {
      try {
        const parsedData = JSON.parse(eventData)
        
        switch (eventType) {
          case 'tool_call_start':
            console.log('Tool call started:', parsedData)
            if (parsedData.tool_call) {
              callbacks.onToolCall?.(parsedData.tool_call)
            }
            break
            
          case 'tool_execution_progress':
            console.log('Tool execution progress:', parsedData)
            if (callbacks.onToolProgress && parsedData.tool_id) {
              callbacks.onToolProgress({
                toolId: parsedData.tool_id,
                status: parsedData.status || 'running',
                progress: parsedData.progress
              })
            }
            break
            
          case 'tool_execution_result':
            console.log('Tool execution result:', parsedData)
            if (parsedData.result) {
              callbacks.onToolResult?.(parsedData.result)
            }
            break
            
          case 'token':
            if (parsedData.content || parsedData.text) {
              callbacks.onToken?.(parsedData.content || parsedData.text)
            }
            break
            
          case 'start':
            callbacks.onStart?.(parsedData)
            break
            
          case 'end':
            callbacks.onEnd?.(parsedData)
            break
            
          case 'error':
            callbacks.onError?.(parsedData.error || 'Unknown error')
            break
            
          default:
            // 不明なイベントは通常のトークンとして処理
            if (parsedData.content || parsedData.text) {
              callbacks.onToken?.(parsedData.content || parsedData.text)
            }
            break
        }
      } catch (error) {
        console.error('Error processing MCP event:', error)
        callbacks.onError?.(`Event processing error: ${error}`)
      }
    }
    
    // ストリームデータの処理（既存の実装を再利用）
    function processStreamData(chunk: string) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      let eventType = ''
      let eventData = ''
      
      for (const line of lines) {
        if (line === '') {
          if (eventData) {
            processMCPEvent(eventType || 'token', eventData)
            eventType = ''
            eventData = ''
          }
          continue
        }
        
        if (line.startsWith('event:')) {
          eventType = line.substring(6).trim()
        } else if (line.startsWith('data:')) {
          eventData = line.substring(5).trim()
          if (eventData.startsWith('data:')) {
            eventData = eventData.substring(5).trim()
          }
        } else if (line.trim()) {
          try {
            processMCPEvent('token', line)
          } catch (e) {
            callbacks.onToken?.(line)
          }
        }
      }
    }
    
    // ストリーム読み込み
    function readStream(): Promise<void> {
      return reader.read().then(({ done, value }) => {
        if (done) {
          console.log('MCP tool execution stream complete')
          return
        }
        
        const chunk = decoder.decode(value, { stream: true })
        processStreamData(chunk)
        
        return readStream()
      })
    }
    
    readStream().catch(error => {
      console.error('MCP stream reading error:', error)
      callbacks.onError?.(`Stream reading error: ${error.message}`)
    })
  })
  .catch(error => {
    console.error('MCP streaming fetch error:', error)
    callbacks.onError?.(`Failed to initiate MCP streaming: ${error.message}`)
  })
  
  return controller
}
