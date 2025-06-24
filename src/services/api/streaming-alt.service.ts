import { normalizeUrl } from './url-helper'

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
