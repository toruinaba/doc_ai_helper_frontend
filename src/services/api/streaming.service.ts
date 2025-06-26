import apiClient from '.';
import { getNormalizedApiUrl } from './url-helper';
import type { 
  LLMStreamingRequest, 
  StreamingLLMResponse
} from './types';

/**
 * ストリーミングクエリを送信する関数
 * @param request LLMストリーミングリクエスト
 * @param callbacks ストリーミングイベントのコールバック関数
 * @returns イベントソースを閉じるためのクリーンアップ関数
 */
export function streamLLMQuery(
  request: LLMStreamingRequest,
  callbacks: {
    onStart?: (data: StreamingLLMResponse['data']) => void;
    onToken?: (token: string) => void;
    onError?: (error: string) => void;
    onEnd?: (data: StreamingLLMResponse['data']) => void;
  }
): () => void {
  // リクエストがストリーミングを要求していることを確認
  const streamingRequest = {
    ...request,
    stream: true
  };
  
  // POST本文のJSONデータ
  const jsonData = JSON.stringify(streamingRequest);
  
  // クエリパラメータの構築
  const params = new URLSearchParams();
  if (request.provider) params.append('provider', request.provider);
  if (request.model) params.append('model', request.model);
  if (request.disable_cache) params.append('disable_cache', 'true');
  
  // 正規化されたURLを取得
  const baseUrl = getNormalizedApiUrl('/llm/stream');
  const fullUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  console.log('LLMストリーミングURL:', fullUrl);
  
  // イベントソースの作成
  const eventSource = new EventSource(fullUrl);
  
  // 開始イベントハンドラ
  eventSource.addEventListener('start', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onStart?.(data);
    } catch (error) {
      console.error('SSE start event parsing error:', error);
    }
  });
  
  // トークンイベントハンドラ
  eventSource.addEventListener('token', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onToken?.(data.content || '');
    } catch (error) {
      console.error('SSE token event parsing error:', error);
    }
  });
  
  // エラーイベントハンドラ
  eventSource.addEventListener('error', (event: Event) => {
    try {
      const messageEvent = event as MessageEvent;
      if (messageEvent.data) {
        const data = JSON.parse(messageEvent.data);
        callbacks.onError?.(data.error || 'Unknown streaming error');
      } else {
        callbacks.onError?.('Connection error');
      }
    } catch (error) {
      console.error('SSE error event parsing error:', error);
      callbacks.onError?.('Error parsing error event');
    }
    // エラー時にはイベントソースを閉じる
    eventSource.close();
  });
  
  // 終了イベントハンドラ
  eventSource.addEventListener('end', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onEnd?.(data);
    } catch (error) {
      console.error('SSE end event parsing error:', error);
    }
    // 終了時にはイベントソースを閉じる
    eventSource.close();
  });
  
  // イベントソースの一般的なエラーハンドラ
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
    callbacks.onError?.('EventSource connection error');
    eventSource.close();
  };
  
  // クリーンアップ関数を返す
  return () => {
    eventSource.close();
  };
}

// streamChatMessage 関数は削除しました
// 現在のアプリケーションはすべて LLMQueryRequest ベースです
// streamLLMQuery を使用してください
  const jsonData = JSON.stringify(streamingRequest);
  
  // クエリパラメータの構築

