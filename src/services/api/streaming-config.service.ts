/**
 * ストリーミングサービス設定ユーティリティ
 * 
 * ストリーミングの動作に関する設定を提供
 */

/**
 * ストリーミングタイプの列挙型
 */
export enum StreamingType {
  // EventSourceを使用した標準的な実装
  EVENTSOURCE = 'eventsource',
  
  // fetchベースの代替実装
  FETCH = 'fetch',
  
  // 自動選択 (ブラウザのサポート状況に応じて選択)
  AUTO = 'auto'
}

// デフォルトの設定
const defaultStreamingConfig = {
  // ストリーミングのタイプ
  type: StreamingType.FETCH, // デフォルトでfetch-based実装を使用
  
  // ストリーミングリクエストのタイムアウト (ミリ秒)
  timeout: 30000,
  
  // デバッグモード
  debug: true // デバッグモードを有効化
};

// 現在のストリーミング設定
let currentConfig = { ...defaultStreamingConfig };

/**
 * ストリーミング設定を取得
 * @returns 現在のストリーミング設定
 */
export function getStreamingConfig() {
  return { ...currentConfig };
}

/**
 * ストリーミング設定を更新
 * @param config 新しい設定 (部分的)
 * @returns 更新された設定
 */
export function updateStreamingConfig(config: Partial<typeof defaultStreamingConfig>) {
  currentConfig = {
    ...currentConfig,
    ...config
  };
  
  if (currentConfig.debug) {
    console.log('Updated streaming config:', currentConfig);
  }
  
  return { ...currentConfig };
}

/**
 * 現在の環境に最適なストリーミング実装を判断
 * @returns 使用すべきストリーミングタイプ
 */
export function detectOptimalStreamingType(): StreamingType {
  // EventSourceが利用可能かどうかをチェック
  const hasEventSource = typeof window !== 'undefined' && 'EventSource' in window;
  
  if (hasEventSource) {
    return StreamingType.EVENTSOURCE;
  } else {
    return StreamingType.FETCH;
  }
}

/**
 * 現在の設定に基づいて使用すべきストリーミングタイプを返す
 * @returns 使用すべきストリーミングタイプ
 */
export function getEffectiveStreamingType(): StreamingType {
  // 設定が自動選択の場合は環境から判断
  if (currentConfig.type === StreamingType.AUTO) {
    return detectOptimalStreamingType();
  }
  
  // 設定されたタイプを返す
  return currentConfig.type;
}

/**
 * ストリーミング設定をデフォルトに戻す
 */
export function resetStreamingConfig() {
  currentConfig = { ...defaultStreamingConfig };
  return { ...currentConfig };
}

export default {
  getStreamingConfig,
  updateStreamingConfig,
  detectOptimalStreamingType,
  getEffectiveStreamingType,
  resetStreamingConfig,
  StreamingType
};
