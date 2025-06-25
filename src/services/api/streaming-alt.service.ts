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

  const controller = new AbortController()
  
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
    
    // MCPツール対応のイベント処理
    function processMCPEvent(eventType: string, eventData: string) {
      console.log('Processing MCP event - Type:', eventType, 'Data:', eventData.substring(0, 200) + (eventData.length > 200 ? '...' : ''))
      
      try {
        let parsedData
        
        // JSONパースを試行
        try {
          parsedData = JSON.parse(eventData)
        } catch (e) {
          // JSONでない場合、シンプルなテキストとして処理
          console.log('Non-JSON data, treating as text token:', eventData)
          callbacks.onToken?.(eventData)
          return
        }
        
        // MCPツール特有のイベントタイプを処理
        switch (eventType) {
          case 'start':
            console.log('MCP Stream started:', parsedData)
            callbacks.onStart?.(parsedData)
            break
            
          case 'token':
            // MCPツール使用時の特殊な構造をチェック
            let tokenContent = null
            
            // 終了シグナルをチェック
            if (parsedData.done === true || parsedData.done === "true") {
              console.log('Stream done signal detected, ending MCP stream')
              callbacks.onEnd?.(parsedData)
              return
            }
            
            // コンテンツの抽出（複数の可能性を考慮）
            if (parsedData.choices && Array.isArray(parsedData.choices) && parsedData.choices.length > 0) {
              const choice = parsedData.choices[0]
              if (choice.delta && choice.delta.content) {
                tokenContent = choice.delta.content
              } else if (choice.message && choice.message.content) {
                tokenContent = choice.message.content
              }
            } else if (parsedData.delta && parsedData.delta.content) {
              tokenContent = parsedData.delta.content
            } else if (parsedData.content) {
              tokenContent = parsedData.content
            } else if (parsedData.text) {
              tokenContent = parsedData.text
            } else if (typeof parsedData === 'string') {
              tokenContent = parsedData
            }
            
            if (tokenContent !== null) {
              console.log('Extracted token content:', tokenContent)
              callbacks.onToken?.(tokenContent)
            } else {
              console.log('No token content found in:', parsedData)
            }
            
            // ツール関連の情報をチェック
            if (parsedData.tool_calls && Array.isArray(parsedData.tool_calls)) {
              parsedData.tool_calls.forEach((toolCall: ToolCall) => {
                console.log('Tool call found in token event:', toolCall)
                callbacks.onToolCall?.(toolCall)
              })
            }
            
            if (parsedData.tool_execution_results && Array.isArray(parsedData.tool_execution_results)) {
              parsedData.tool_execution_results.forEach((result: any) => {
                console.log('Tool result found in token event:', result)
                callbacks.onToolResult?.(result)
              })
            }
            break
            
          case 'tool_call':
          case 'tool_call_start':
            console.log('Tool call event:', parsedData)
            if (parsedData.tool_call) {
              callbacks.onToolCall?.(parsedData.tool_call)
            } else if (parsedData.function) {
              // OpenAI形式のツール呼び出し
              const toolCall: ToolCall = {
                id: parsedData.id || generateId(),
                type: 'function',
                function: parsedData.function
              }
              callbacks.onToolCall?.(toolCall)
            }
            break
            
          case 'tool_result':
          case 'tool_execution_result':
            console.log('Tool result event:', parsedData)
            if (parsedData.result) {
              callbacks.onToolResult?.(parsedData.result)
            } else {
              callbacks.onToolResult?.(parsedData)
            }
            break
            
          case 'end':
            console.log('MCP Stream ended:', parsedData)
            callbacks.onEnd?.(parsedData)
            break
            
          case 'error':
            console.error('MCP Stream error:', parsedData)
            callbacks.onError?.(parsedData.error || parsedData.message || 'Unknown streaming error')
            break
            
          default:
            // 不明なイベントタイプの場合、内容によって処理
            console.log('Unknown event type, processing as generic data:', eventType, parsedData)
            
            // 終了シグナルをチェック
            if (parsedData.done === true || parsedData.done === "true") {
              console.log('Stream done signal detected in unknown event, ending stream')
              callbacks.onEnd?.(parsedData)
              return
            }
            
            // ツール関連の情報をチェック
            if (parsedData.tool_calls && Array.isArray(parsedData.tool_calls)) {
              parsedData.tool_calls.forEach((toolCall: ToolCall) => {
                console.log('Tool call found in unknown event:', toolCall)
                callbacks.onToolCall?.(toolCall)
              })
            }
            
            if (parsedData.tool_execution_results && Array.isArray(parsedData.tool_execution_results)) {
              parsedData.tool_execution_results.forEach((result: any) => {
                console.log('Tool result found in unknown event:', result)
                callbacks.onToolResult?.(result)
              })
            }
            
            // コンテンツがあればトークンとして処理
            const unknownContent = extractTokenContent(parsedData)
            if (unknownContent !== null) {
              console.log('Processing unknown event content as token:', unknownContent)
              callbacks.onToken?.(unknownContent)
            }
            break
        }
      } catch (error) {
        console.error('Error processing MCP streaming data:', error)
        callbacks.onError?.(`Event processing error: ${error}`)
      }
    }
    
    // バッファからSSEデータを処理（MCPツール対応版）
    function processStreamData(chunk: string) {
      buffer += chunk
      console.log('Raw MCP streaming data received:', buffer.substring(0, 200) + (buffer.length > 200 ? '...' : ''))
      
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      let eventType = ''
      let eventData = ''
      
      for (const line of lines) {
        if (line === '') {
          // 空行はイベントの終わり
          if (eventData) {
            if (!eventType) {
              eventType = 'token'
              console.log('No event type specified, defaulting to token')
            }
            processMCPEvent(eventType, eventData)
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
          console.log('Event data:', newEventData.substring(0, 100) + (newEventData.length > 100 ? '...' : ''))
          
          if (newEventData) {
            eventData = newEventData
            
            // 二重エンコーディング対応
            if (eventData.startsWith('data:')) {
              eventData = eventData.substring(5).trim()
              console.log('Double-encoded data detected, extracted:', eventData.substring(0, 100) + '...')
            }
          }
        } else if (line.trim()) {
          // イベントタイプがないが、データがある場合
          console.log('Processing non-SSE line as MCP data:', line.substring(0, 100) + (line.length > 100 ? '...' : ''))
          try {
            processMCPEvent('token', line)
          } catch (e) {
            console.log('Failed to process as JSON, treating as raw text:', line)
            callbacks.onToken?.(line)
          }
        }
      }
      
      // 最後に残ったイベントがあれば処理
      if (eventData) {
        if (!eventType) {
          eventType = 'token'
        }
        processMCPEvent(eventType, eventData)
      }
    }
    
    // ユニークIDを生成するヘルパー関数
    function generateId(): string {
      return 'tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }
    
    // トークンコンテンツを抽出するヘルパー関数
    function extractTokenContent(parsedData: any): string | null {
      if (parsedData.done === true || parsedData.done === "true") {
        return null
      }
      
      if (parsedData.text) {
        return parsedData.text
      } else if (parsedData.content) {
        return parsedData.content
      } else if (typeof parsedData === 'string') {
        return parsedData
      } else {
        return null
      }
    }
    
    // ストリームの読み込みを開始
    function readStream(): Promise<void> {
      return reader.read().then(({ done, value }) => {
        if (done) {
          console.log('MCP stream complete')
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
      console.error('MCP stream reading error:', error)
      callbacks.onError?.(`Stream reading error: ${error.message}`)
    })
  })
  .catch(error => {
    console.error('Fetch error for MCP streaming request:', error)
    
    let errorMessage = 'Failed to initiate MCP streaming request'
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
