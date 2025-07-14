/**
 * Document Domain Services
 * 
 * ドキュメント処理関連のサービスを統合
 */

// ドキュメントメタデータ処理
export {
  createDocumentMetadataInput,
  createRepositoryContext,
  createDocumentSummary,
  detectDocumentLanguage,
  calculateDocumentStats,
  analyzeDocumentType
} from './metadata.service'