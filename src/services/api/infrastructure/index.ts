/**
 * Infrastructure Domain Services
 * 
 * インフラストラクチャ関連のサービスを統合
 */

// 設定管理
export {
  getStreamingConfig,
  updateStreamingConfig,
  getEffectiveStreamingType,
  StreamingType
} from './config.service'

// ユーティリティ機能
export {
  getNormalizedApiUrl,
  normalizeUrl,
  getStreamingUrl
} from './utils.service'