/**
 * Streaming Service for Modules
 * 
 * LLMストリーミング機能を提供（自己完結実装）
 */
import { shouldUseMockApi } from '../../../utils/config.util';
import { normalizeUrl } from '../infrastructure';
import type { 
  LLMQueryRequest,
  LLMResponse
} from '../types';

/**
 * Unicode文字列をデコードする関数
 * \uXXXX形式のエスケープ文字列を通常の文字列に変換
 */
function decodeUnicodeString(str: string): string {
  try {
    // JSON.parse を使ってUnicodeエスケープ文字列をデコード
    return JSON.parse(`"${str}"`);
  } catch (error) {
    // デコードに失敗した場合はそのまま返す
    console.warn('Unicode decode failed for:', str, error);
    return str;
  }
}

/**
 * ストリーミング実装タイプの定義
 */
export enum StreamingType {
  EVENTSOURCE = 'eventsource',  // EventSource（GET）ベース
  FETCH = 'fetch'               // Fetch（POST）ベース
}

/**
 * ストリーミングコールバック関数の型定義
 */
export interface StreamingCallbacks {
  onStart?: (data?: any) => void;
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: any) => void;
  onToolResult?: (result: any) => void;
  onError?: (error: string) => void;
  onEnd?: (data?: any) => void;
}

/**
 * Fetch-based SSE実装（POST対応）
 */
function streamWithFetch(
  apiBaseUrl: string,
  endpoint: string,
  requestData: any,
  callbacks: StreamingCallbacks
): AbortController {
  const controller = new AbortController();
  
  console.log('=== Initializing Fetch Streaming ===');
  console.log('API Base URL:', apiBaseUrl);
  console.log('Endpoint:', endpoint);
  console.log('Request data:', requestData);
  
  const fullUrl = normalizeUrl(apiBaseUrl, endpoint);
  console.log('Full URL:', fullUrl);
  
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
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response content-type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    console.log('Starting to read streaming response...');
    
    function processEvent(eventType: string, eventData: string) {
      console.log('Processing event - Type:', eventType, 'Data:', eventData.substring(0, 200) + (eventData.length > 200 ? '...' : ''));
      
      try {
        let parsedData;
        
        try {
          parsedData = JSON.parse(eventData);
        } catch (e) {
          console.log('Non-JSON data, treating as text token:', eventData);
          callbacks.onToken?.(eventData);
          return;
        }
        
        switch (eventType) {
          case 'start':
            console.log('Stream started:', parsedData);
            callbacks.onStart?.(parsedData);
            break;
            
          case 'message':
          case 'token':
          case 'data':
            let tokenContent = null;
            
            if (parsedData.done === true || parsedData.done === "true") {
              console.log('Stream done signal detected, ending stream');
              callbacks.onEnd?.(parsedData);
              return;
            }
            
            if (parsedData.choices && Array.isArray(parsedData.choices) && parsedData.choices.length > 0) {
              const choice = parsedData.choices[0];
              if (choice.delta && choice.delta.content) {
                tokenContent = choice.delta.content;
              } else if (choice.message && choice.message.content) {
                tokenContent = choice.message.content;
              }
            } else if (parsedData.delta && parsedData.delta.content) {
              tokenContent = parsedData.delta.content;
            } else if (parsedData.content) {
              tokenContent = decodeUnicodeString(parsedData.content);
            } else if (parsedData.text) {
              tokenContent = decodeUnicodeString(parsedData.text);
            } else if (typeof parsedData === 'string') {
              tokenContent = decodeUnicodeString(parsedData);
            }
            
            if (tokenContent !== null) {
              console.log('Extracted token content:', tokenContent);
              callbacks.onToken?.(tokenContent);
            } else {
              console.log('No token content found in:', parsedData);
            }
            break;
            
          case 'end':
            console.log('Stream ended:', parsedData);
            callbacks.onEnd?.(parsedData);
            break;
            
          case 'error':
            console.error('Stream error:', parsedData);
            callbacks.onError?.(parsedData.error || parsedData.message || 'Unknown streaming error');
            break;
            
          default:
            console.log('Unknown event type:', eventType, 'data:', parsedData);
            // デフォルトケースでもtextフィールドを処理
            if (typeof parsedData === 'string') {
              callbacks.onToken?.(decodeUnicodeString(parsedData));
            } else if (parsedData.text) {
              callbacks.onToken?.(decodeUnicodeString(parsedData.text));
            } else if (parsedData.content) {
              callbacks.onToken?.(decodeUnicodeString(parsedData.content));
            }
            break;
        }
      } catch (error) {
        console.error('Error processing event:', error);
        callbacks.onError?.(`Event processing error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    function readStream() {
      reader.read()
        .then(({ done, value }) => {
          if (done) {
            console.log('Stream finished');
            // 未処理のデータがある場合は処理
            if (buffer.trim()) {
              const lines = buffer.split('\n');
              let currentEventType = '';
              let currentEventData = '';
              
              for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('event:')) {
                  currentEventType = trimmedLine.substring(6).trim();
                } else if (trimmedLine.startsWith('data:')) {
                  const dataContent = trimmedLine.substring(5).trim();
                  currentEventData += (currentEventData ? '\n' : '') + dataContent;
                }
              }
              
              if (currentEventData) {
                const eventType = currentEventType || 'message';
                console.log('Processing final event - type:', eventType, 'data:', currentEventData);
                processEvent(eventType, currentEventData);
              }
            }
            callbacks.onEnd?.({});
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          console.log('Raw chunk received:', JSON.stringify(chunk));
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          console.log('Lines to process:', lines.length, 'lines:', lines);
          
          let currentEventType = '';
          let currentEventData = '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            console.log('Processing line:', JSON.stringify(trimmedLine));
            
            if (trimmedLine === '') {
              if (currentEventData) {
                // event:行がない場合はデフォルトで'message'イベントとして処理
                const eventType = currentEventType || 'message';
                console.log('Processing complete event - type:', eventType, 'data:', currentEventData);
                processEvent(eventType, currentEventData);
                currentEventType = '';
                currentEventData = '';
              }
            } else if (trimmedLine.startsWith('event:')) {
              currentEventType = trimmedLine.substring(6).trim();
              console.log('Found event type:', currentEventType);
            } else if (trimmedLine.startsWith('data:')) {
              const dataContent = trimmedLine.substring(5).trim();
              currentEventData += (currentEventData ? '\n' : '') + dataContent;
              console.log('Found data:', dataContent, 'accumulated:', currentEventData);
            } else {
              console.log('Unknown line format, treating as raw data:', trimmedLine);
              // SSE形式でない場合、直接JSONとしてパースしてみる
              try {
                const parsed = JSON.parse(trimmedLine);
                console.log('Parsed JSON directly from line:', parsed);
                processEvent('token', trimmedLine);
              } catch (e) {
                console.log('Line is not JSON, treating as text token:', trimmedLine);
                callbacks.onToken?.(trimmedLine);
              }
            }
          }
          
          readStream();
        })
        .catch(error => {
          if (error.name === 'AbortError') {
            console.log('Stream aborted');
          } else {
            console.error('Stream reading error:', error);
            callbacks.onError?.(`Stream reading error: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
    }
    
    readStream();
  })
  .catch(error => {
    if (error.name === 'AbortError') {
      console.log('Request aborted');
    } else {
      console.error('Fetch error:', error);
      callbacks.onError?.(`Fetch error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  return controller;
}

/**
 * LLMストリーミングクエリ（メインエントリーポイント）
 * @param request LLMクエリリクエスト
 * @param callbacks ストリーミングコールバック
 * @returns クリーンアップ関数
 */
export async function streamLLMQuery(
  request: LLMQueryRequest,
  callbacks: StreamingCallbacks
): Promise<() => void> {
  if (shouldUseMockApi()) {
    console.log('Using mock streaming as configured by environment variables');
    // モックストリーミング実装
    setTimeout(() => callbacks.onStart?.({}), 100);
    
    const tokens = ['これは', 'モック', 'ストリーミング', '応答', 'です。'];
    let tokenIndex = 0;
    
    const interval = setInterval(() => {
      if (tokenIndex < tokens.length) {
        callbacks.onToken?.(tokens[tokenIndex]);
        tokenIndex++;
      } else {
        clearInterval(interval);
        callbacks.onEnd?.({});
      }
    }, 500);
    
    return () => clearInterval(interval);
  }

  try {
    console.log('Using fetch-based streaming implementation');
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const controller = streamWithFetch(apiBaseUrl, '/llm/stream', request, callbacks);
    return () => controller.abort();
  } catch (error) {
    console.error('Streaming LLM error:', error);
    callbacks.onError?.(`Streaming LLM error: ${error instanceof Error ? error.message : String(error)}`);
    return () => {};
  }
}

/**
 * ストリーミングの統計情報
 */
export interface StreamingStats {
  totalTokens: number;
  streamingDuration: number;
  averageTokenRate: number;
  errors: string[];
}

/**
 * ストリーミング統計を追跡するラッパー
 */
export function createStreamingStatsTracker(
  callbacks: StreamingCallbacks
): {
  wrappedCallbacks: StreamingCallbacks;
  getStats: () => StreamingStats;
} {
  let stats: StreamingStats = {
    totalTokens: 0,
    streamingDuration: 0,
    averageTokenRate: 0,
    errors: []
  };
  
  let startTime: number;
  
  const wrappedCallbacks: StreamingCallbacks = {
    onStart: (data) => {
      startTime = Date.now();
      stats.totalTokens = 0;
      stats.errors = [];
      callbacks.onStart?.(data);
    },
    onToken: (token) => {
      stats.totalTokens++;
      callbacks.onToken?.(token);
    },
    onError: (error) => {
      stats.errors.push(error);
      callbacks.onError?.(error);
    },
    onEnd: (data) => {
      const endTime = Date.now();
      stats.streamingDuration = endTime - startTime;
      stats.averageTokenRate = stats.totalTokens / (stats.streamingDuration / 1000);
      callbacks.onEnd?.(data);
    }
  };
  
  return {
    wrappedCallbacks,
    getStats: () => ({ ...stats })
  };
}
