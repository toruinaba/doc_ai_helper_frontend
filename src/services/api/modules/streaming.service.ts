/**
 * Streaming Service for Modules
 * 
 * LLMストリーミング機能を提供（自己完結実装）
 */
import { shouldUseMockApi } from '../../../utils/config.util';
import { normalizeUrl } from '../url-helper';
import type { 
  LLMQueryRequest,
  LLMResponse
} from '../types';

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
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
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
            
          case 'token':
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
              tokenContent = parsedData.content;
            } else if (parsedData.text) {
              tokenContent = parsedData.text;
            } else if (typeof parsedData === 'string') {
              tokenContent = parsedData;
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
            if (typeof parsedData === 'string') {
              callbacks.onToken?.(parsedData);
            } else if (parsedData.content) {
              callbacks.onToken?.(parsedData.content);
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
            callbacks.onEnd?.({});
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          let currentEventType = '';
          let currentEventData = '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine === '') {
              if (currentEventType && currentEventData) {
                processEvent(currentEventType, currentEventData);
                currentEventType = '';
                currentEventData = '';
              }
            } else if (trimmedLine.startsWith('event:')) {
              currentEventType = trimmedLine.substring(6).trim();
            } else if (trimmedLine.startsWith('data:')) {
              currentEventData += (currentEventData ? '\n' : '') + trimmedLine.substring(5).trim();
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
    const controller = streamWithFetch(apiBaseUrl, '/api/v1/llm/stream', request, callbacks);
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
