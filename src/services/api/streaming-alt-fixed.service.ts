/**
 * 代替ストリーミングサービス（CORS修正版）
 * 
 * EventSourceを直接使用せず、fetch APIを使用してストリーミングを処理するサービス
 * バックエンドがPOSTリクエストでのストリーミングを要求する場合に使用
 * CORS問題を回避するためにcredentialsオプションを削除
 */

import type { 
  LLMStreamingRequest,
  StreamingLLMResponse,
  ChatRequest
} from './types';
import { getNormalizedApiUrl } from './url-helper';

/**
 * fetch APIを使用してストリーミングLLMクエリを送信する関数
 * @param request LLMストリーミングリクエスト
 * @param callbacks ストリーミングイベントのコールバック関数
 * @returns リクエストをキャンセルするためのアボートコントローラー
 */
export function streamLLMQueryWithFetch(
  request: LLMStreamingRequest,
  callbacks: {
    onStart?: (data: StreamingLLMResponse['data']) => void;
    onToken?: (token: string) => void;
    onError?: (error: string) => void;
    onEnd?: (data: StreamingLLMResponse['data']) => void;
  }
): AbortController {
  // リクエストがストリーミングを要求していることを確認
  const streamingRequest = {
    ...request,
    stream: true
  };
  
  // クエリパラメータの構築
  const params = new URLSearchParams();
  if (request.provider) params.append('provider', request.provider);
  if (request.model) params.append('model', request.model);
  if (request.disable_cache) params.append('disable_cache', 'true');
  
  // 正規化されたURLを取得
  const baseUrl = getNormalizedApiUrl('/llm/stream');
  const fullUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  console.log('LLMストリーミングURL (fetch):', fullUrl);
  
  // アボートコントローラーの作成
  const controller = new AbortController();
  const { signal } = controller;
  
  // デバッグログ
  console.log('Fetch-based streaming request payload:', JSON.stringify(streamingRequest, null, 2));
  
  // fetchを使用してPOSTリクエストを送信（CORS対応）
  fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      // CORS対応のためOriginヘッダーを明示的に設定
      'Origin': window.location.origin
    },
    body: JSON.stringify(streamingRequest),
    signal,
    // CORSエラーを避けるためcredentialsは削除
    mode: 'cors'
  })
  .then(async response => {
    console.log('Streaming response status:', response.status);
    console.log('Streaming response headers:', Object.fromEntries([...response.headers]));
    
    if (!response.ok) {
      // エラーの詳細を取得
      try {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      } catch (e) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    if (!response.body) {
      throw new Error('ReadableStream not supported in this browser.');
    }
    
    // レスポンスをストリームとして読み込むためのリーダーを取得
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    // データを処理する関数
    function processStreamData(data: string) {
      console.log('Raw streaming data received:', data);
      
      // バッファに追加
      buffer += data;
      
      // 行ごとに分割して処理
      const lines = buffer.split('\n');
      
      // 最後の行が不完全な可能性があるので、それ以外を処理
      buffer = lines.pop() || '';
      
      let eventType = '';
      let eventData = '';
      
      // 標準的なSSE形式のデータを処理
      for (const line of lines) {
        if (line.trim() === '') {
          // 空行でイベント区切り
          if (eventType && eventData) {
            processEvent(eventType, eventData);
            eventType = '';
            eventData = '';
          }
          continue;
        }
        
        // デバッグ出力
        console.log('Processing line:', line);
        
        if (line.startsWith('event:')) {
          eventType = line.substring(6).trim();
          console.log('Event type:', eventType);
        } else if (line.startsWith('data:')) {
          eventData = line.substring(5).trim();
          console.log('Event data:', eventData);
        } else if (line.trim()) {
          // イベントタイプがないが、データがある場合
          // バックエンドによっては標準的なSSE形式ではなく、
          // 直接JSONや特殊な形式を送信する場合がある
          try {
            // JSONとして解析を試みる
            const parsedData = JSON.parse(line);
            if (parsedData.content) {
              callbacks.onToken?.(parsedData.content);
            } else if (parsedData.error) {
              callbacks.onError?.(parsedData.error);
            } else {
              // 特定のフィールドがない場合、単純にテキストとして扱う
              callbacks.onToken?.(line);
            }
          } catch (e) {
            // JSONではない場合、単純なテキストトークンとして扱う
            callbacks.onToken?.(line);
          }
        }
      }
      
      // 最後に残ったイベントがあれば処理
      if (eventType && eventData) {
        processEvent(eventType, eventData);
      }
    }
    
    // イベントを処理する関数
    function processEvent(eventType: string, eventData: string) {
      try {
        // JSONでない場合は単純なテキストとして処理
        let parsedData;
        try {
          parsedData = JSON.parse(eventData);
        } catch (e) {
          // JSONではない場合、シンプルなトークンとして扱う
          parsedData = { content: eventData };
          // イベントタイプがない場合はトークンとして扱う
          if (!eventType) eventType = 'token';
        }
        
        switch (eventType) {
          case 'start':
            callbacks.onStart?.(parsedData);
            break;
          case 'token':
            callbacks.onToken?.(parsedData.content || parsedData.toString() || '');
            break;
          case 'end':
            callbacks.onEnd?.(parsedData);
            break;
          case 'error':
            callbacks.onError?.(parsedData.error || 'Unknown streaming error');
            controller.abort();
            break;
          default:
            // 不明なイベントタイプの場合、内容によって処理
            if (parsedData.content) {
              callbacks.onToken?.(parsedData.content);
            } else if (typeof parsedData === 'string') {
              callbacks.onToken?.(parsedData);
            }
            break;
        }
      } catch (error) {
        console.error(`Error processing streaming data:`, error);
        console.error(`Event type: ${eventType}, Raw data: ${eventData}`);
      }
    }
    
    // ストリームの読み込みを開始
    function readStream(): Promise<void> {
      return reader.read().then(({ done, value }) => {
        if (done) {
          console.log('Stream complete');
          // 最後にバッファに残ったデータがあれば処理
          if (buffer.trim()) {
            processStreamData('');
          }
          return;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        processStreamData(chunk);
        
        // 次のチャンクを読み込む
        return readStream();
      });
    }
    
    // 読み込み開始
    readStream().catch(error => {
      console.error('Stream reading error:', error);
      callbacks.onError?.(`Stream reading error: ${error.message}`);
    });
  })
  .catch(error => {
    console.error('Fetch error for streaming request:', error);
    
    // より詳細なエラー情報を提供
    let errorMessage = 'Failed to initiate streaming request';
    if (error instanceof TypeError) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not connect to server. Please check if the backend is running and CORS is properly configured.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error: The server needs to be configured to allow cross-origin requests.';
      } else {
        errorMessage = `Network error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = `Request error: ${error.message}`;
    }
    
    callbacks.onError?.(errorMessage);
  });
  
  // アボートコントローラーを返す
  return controller;
}

/**
 * fetch APIを使用してストリーミングチャットメッセージを送信する関数
 * @param request チャットリクエスト
 * @param callbacks ストリーミングイベントのコールバック関数
 * @returns リクエストをキャンセルするためのアボートコントローラー
 */
export function streamChatMessageWithFetch(
  request: ChatRequest,
  callbacks: {
    onStart?: (data: any) => void;
    onToken?: (token: string) => void;
    onError?: (error: string) => void;
    onEnd?: (data: any) => void;
  }
): AbortController {
  // リクエストがストリーミングを要求していることを確認
  const streamingRequest = {
    ...request,
    stream: true
  };
  
  // 正規化されたURLを取得
  const baseUrl = getNormalizedApiUrl('/chat/stream');
  console.log('チャットストリーミングURL (fetch):', baseUrl);
  
  // アボートコントローラーの作成
  const controller = new AbortController();
  const { signal } = controller;
  
  // デバッグログ
  console.log('Fetch-based chat streaming request payload:', JSON.stringify(streamingRequest, null, 2));
  
  // fetchを使用してPOSTリクエストを送信（CORS対応）
  fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Origin': window.location.origin
    },
    body: JSON.stringify(streamingRequest),
    signal,
    mode: 'cors'
  })
  .then(async response => {
    console.log('Chat streaming response status:', response.status);
    
    if (!response.ok) {
      // エラーの詳細を取得
      try {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      } catch (e) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    if (!response.body) {
      throw new Error('ReadableStream not supported in this browser.');
    }
    
    // レスポンスをストリームとして読み込むためのリーダーを取得
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    // データを処理する関数
    function processStreamData(data: string) {
      console.log('Raw chat streaming data received:', data);
      
      buffer += data;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      let eventType = '';
      let eventData = '';
      
      for (const line of lines) {
        if (line.trim() === '') {
          if (eventType && eventData) {
            processEvent(eventType, eventData);
            eventType = '';
            eventData = '';
          }
          continue;
        }
        
        if (line.startsWith('event:')) {
          eventType = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          eventData = line.substring(5).trim();
        } else if (line.trim()) {
          try {
            const parsedData = JSON.parse(line);
            if (parsedData.content) {
              callbacks.onToken?.(parsedData.content);
            } else if (parsedData.error) {
              callbacks.onError?.(parsedData.error);
            } else {
              callbacks.onToken?.(line);
            }
          } catch (e) {
            callbacks.onToken?.(line);
          }
        }
      }
      
      if (eventType && eventData) {
        processEvent(eventType, eventData);
      }
    }
    
    function processEvent(eventType: string, eventData: string) {
      try {
        let parsedData;
        try {
          parsedData = JSON.parse(eventData);
        } catch (e) {
          parsedData = { content: eventData };
          if (!eventType) eventType = 'token';
        }
        
        switch (eventType) {
          case 'start':
            callbacks.onStart?.(parsedData);
            break;
          case 'token':
            callbacks.onToken?.(parsedData.content || parsedData.toString() || '');
            break;
          case 'end':
            callbacks.onEnd?.(parsedData);
            break;
          case 'error':
            callbacks.onError?.(parsedData.error || 'Unknown streaming error');
            controller.abort();
            break;
          default:
            if (parsedData.content) {
              callbacks.onToken?.(parsedData.content);
            } else if (typeof parsedData === 'string') {
              callbacks.onToken?.(parsedData);
            }
            break;
        }
      } catch (error) {
        console.error(`Error processing streaming data:`, error);
      }
    }
    
    // ストリームの読み込みを開始
    function readStream(): Promise<void> {
      return reader.read().then(({ done, value }) => {
        if (done) {
          console.log('Chat stream complete');
          if (buffer.trim()) {
            processStreamData('');
          }
          return;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        processStreamData(chunk);
        
        return readStream();
      });
    }
    
    readStream().catch(error => {
      console.error('Chat stream reading error:', error);
      callbacks.onError?.(`Stream reading error: ${error.message}`);
    });
  })
  .catch(error => {
    console.error('Fetch error for chat streaming request:', error);
    
    let errorMessage = 'Failed to initiate streaming request';
    if (error instanceof TypeError) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not connect to server. Please check if the backend is running and CORS is properly configured.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error: The server needs to be configured to allow cross-origin requests.';
      } else {
        errorMessage = `Network error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = `Request error: ${error.message}`;
    }
    
    callbacks.onError?.(errorMessage);
  });
  
  return controller;
}
