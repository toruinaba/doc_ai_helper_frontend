/**
 * 設定ユーティリティ
 * 
 * 環境変数からアプリケーション設定を取得するためのユーティリティ関数を提供
 */

/**
 * リポジトリのデフォルト設定
 */
export interface RepositoryConfig {
  service: string;
  owner: string;
  repo: string;
  ref: string;
  path: string;
}

/**
 * APIのデフォルト設定
 */
export interface ApiConfig {
  apiBaseUrl: string;
  backendUrl: string;
  useMockApi: boolean;
}

/**
 * LLM設定
 */
export interface LLMConfig {
  defaultProvider: string;
  defaultModel?: string;
  defaultToolChoice: string;
  systemPromptTemplate: string;
}

/**
 * デフォルト値設定
 */
export interface DefaultsConfig {
  encoding: string;
  documentType: string;
  branch: string;
}

/**
 * UI表示制御設定
 */
export interface UIConfig {
  showAdvancedSettings: boolean;
  showDebugPanel: boolean;
  showStreamingToggle: boolean;
  showToolsToggle: boolean;
  showMCPToolsPanel: boolean;
  showDocumentContextPanel: boolean;
}

/**
 * アプリケーションデフォルト動作設定
 */
export interface AppDefaultsConfig {
  streamingMode: boolean;
  toolsEnabled: boolean;
  mcpAutoDetect: boolean;
  streamingType: string;
  executionMode: string;
}

/**
 * 新しいバックエンド仕様用の設定
 */
export interface DocumentContextConfig {
  includeDocumentInSystemPrompt: boolean;
  systemPromptTemplate: string;
  enableRepositoryContext: boolean;
  enableDocumentMetadata: boolean;
  completeToolFlow: boolean;
}

/**
 * リンク処理モード
 */
export type LinkProcessingMode = 'legacy' | 'selective' | 'hybrid';
// 注意: バックエンド仕様変更により transform_links=true は実質的に images-only 動作
export type TransformLinksMode = 'true' | 'false';

/**
 * リンク処理設定 - 責任分界アプローチ用
 */
export interface LinkProcessingConfig {
  /** メインの処理モード */
  mode: LinkProcessingMode;
  /** バックエンドのtransform_linksパラメータ */
  transformMode: TransformLinksMode;
  /** CDN最適化を有効にするか */
  enableCdnOptimization: boolean;
  /** 実験的機能を有効にするか */
  enableExperimentalFeatures: boolean;
  /** エラー時のフォールバック */
  enableFallback: boolean;
  /** デバッグモード */
  debugMode: boolean;
}

/**
 * 環境変数からリポジトリのデフォルト設定を取得
 * @returns リポジトリのデフォルト設定
 */
export function getDefaultRepositoryConfig(): RepositoryConfig {
  return {
    service: import.meta.env.VITE_DEFAULT_SERVICE || 'mock',
    owner: import.meta.env.VITE_DEFAULT_OWNER || 'example',
    repo: import.meta.env.VITE_DEFAULT_REPO || 'docs-project',
    ref: import.meta.env.VITE_DEFAULT_REF || 'main',
    path: import.meta.env.VITE_DEFAULT_PATH || 'index.md'
  };
}

/**
 * 環境変数からAPIの設定を取得
 * @returns APIの設定
 */
export function getApiConfig(): ApiConfig {
  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true'
  };
}

/**
 * モックAPIを使用するかどうかを判定
 * @returns モックAPIを使用する場合はtrue、そうでない場合はfalse
 */
export function shouldUseMockApi(): boolean {
  // 環境変数が文字列なので、明示的に'true'と比較して判定
  return import.meta.env.VITE_USE_MOCK_API === 'true';
}

/**
 * 環境変数からLLM設定を取得
 * @returns LLM設定
 */
export function getLLMConfig(): LLMConfig {
  return {
    defaultProvider: import.meta.env.VITE_LLM_DEFAULT_PROVIDER || 'openai',
    defaultModel: import.meta.env.VITE_LLM_DEFAULT_MODEL || null,
    defaultToolChoice: import.meta.env.VITE_LLM_DEFAULT_TOOL_CHOICE || 'auto',
    systemPromptTemplate: import.meta.env.VITE_LLM_SYSTEM_PROMPT_TEMPLATE || 'contextual_document_assistant_ja'
  };
}

/**
 * 環境変数からデフォルト値設定を取得
 * @returns デフォルト値設定
 */
export function getDefaultsConfig(): DefaultsConfig {
  return {
    encoding: import.meta.env.VITE_DEFAULT_ENCODING || 'utf-8',
    documentType: import.meta.env.VITE_DEFAULT_DOCUMENT_TYPE || 'markdown',
    branch: import.meta.env.VITE_DEFAULT_BRANCH || 'main'
  };
}

/**
 * 環境変数からUI表示制御設定を取得
 * @returns UI表示制御設定
 */
export function getUIConfig(): UIConfig {
  return {
    showAdvancedSettings: import.meta.env.VITE_SHOW_ADVANCED_SETTINGS !== 'false',
    showDebugPanel: import.meta.env.VITE_SHOW_DEBUG_PANEL !== 'false',
    showStreamingToggle: import.meta.env.VITE_SHOW_STREAMING_TOGGLE !== 'false',
    showToolsToggle: import.meta.env.VITE_SHOW_TOOLS_TOGGLE !== 'false',
    showMCPToolsPanel: import.meta.env.VITE_SHOW_MCP_TOOLS_PANEL !== 'false',
    showDocumentContextPanel: import.meta.env.VITE_SHOW_DOCUMENT_CONTEXT_PANEL !== 'false'
  };
}

/**
 * 環境変数からアプリケーションデフォルト動作設定を取得
 * @returns アプリケーションデフォルト動作設定
 */
export function getAppDefaultsConfig(): AppDefaultsConfig {
  return {
    streamingMode: import.meta.env.VITE_DEFAULT_STREAMING_MODE !== 'false',
    toolsEnabled: import.meta.env.VITE_DEFAULT_TOOLS_ENABLED !== 'false',
    mcpAutoDetect: import.meta.env.VITE_MCP_AUTO_DETECT !== 'false',
    streamingType: import.meta.env.VITE_DEFAULT_STREAMING_TYPE || 'fetch',
    executionMode: import.meta.env.VITE_MCP_DEFAULT_EXECUTION_MODE || 'auto'
  };
}

/**
 * デフォルトのドキュメントコンテキスト設定を取得
 */
export function getDefaultDocumentContextConfig(): DocumentContextConfig {
  const llmConfig = getLLMConfig();
  return {
    includeDocumentInSystemPrompt: true,
    systemPromptTemplate: llmConfig.systemPromptTemplate,
    enableRepositoryContext: true,
    enableDocumentMetadata: true,
    completeToolFlow: true
  };
}

/**
 * リンク処理設定を取得 - 責任分界アプローチ
 */
export function getLinkProcessingConfig(): LinkProcessingConfig {
  const mode = (import.meta.env.VITE_LINK_PROCESSING_MODE || 'legacy') as LinkProcessingMode;
  
  // バックエンド仕様変更対応: transform_links=true は実質的に images-only
  let transformMode: TransformLinksMode;
  switch (mode) {
    case 'selective':
      // 責任分界モード: バックエンドは画像CDNのみ、フロントエンドはドキュメントリンク処理
      transformMode = 'true';
      break;
    case 'hybrid':
      // ハイブリッドモード: 設定に応じて切り替え
      transformMode = (import.meta.env.VITE_TRANSFORM_LINKS_MODE === 'false') ? 'false' : 'true';
      break;
    case 'legacy':
    default:
      // レガシーモード: 従来通り全て変換（バックエンド仕様変更で実質的に画像のみ）
      transformMode = 'true';
      break;
  }
  
  return {
    mode,
    transformMode,
    enableCdnOptimization: import.meta.env.VITE_ENABLE_CDN_OPTIMIZATION !== 'false',
    enableExperimentalFeatures: import.meta.env.VITE_ENABLE_EXPERIMENTAL_FEATURES === 'true',
    enableFallback: import.meta.env.VITE_ENABLE_LINK_PROCESSING_FALLBACK !== 'false',
    debugMode: import.meta.env.VITE_LINK_PROCESSING_DEBUG === 'true'
  };
}

/**
 * 選択的リンク処理を使用するかどうかを判定
 * バックエンド仕様変更により、selectiveモードではフロントエンドでドキュメントリンク処理が必要
 */
export function shouldUseSelectiveLinkProcessing(): boolean {
  const config = getLinkProcessingConfig();
  return config.mode === 'selective' || config.mode === 'hybrid';
}

/**
 * フロントエンドでドキュメントリンク処理が必要か判定
 * バックエンドが画像CDNのみ変換するため、ドキュメントリンクはフロントエンドで処理
 */
export function shouldProcessDocumentLinksInFrontend(): boolean {
  const config = getLinkProcessingConfig();
  // selective モードでは必ずフロントエンドでドキュメントリンク処理
  return config.mode === 'selective';
}

/**
 * 本番環境かどうかを判定
 */
export function isProductionEnvironment(): boolean {
  return import.meta.env.PROD;
}

/**
 * 開発環境での実験的機能を有効にするか判定
 */
export function shouldEnableExperimentalFeatures(): boolean {
  const config = getLinkProcessingConfig();
  return config.enableExperimentalFeatures || (!isProductionEnvironment() && config.debugMode);
}

/**
 * 統合アプリケーション設定
 */
export interface AppConfig {
  repository: RepositoryConfig;
  api: ApiConfig;
  llm: LLMConfig;
  defaults: DefaultsConfig;
  ui: UIConfig;
  appDefaults: AppDefaultsConfig;
  documentContext: DocumentContextConfig;
  linkProcessing: LinkProcessingConfig;
}

/**
 * 全ての設定を統合したアプリケーション設定を取得
 */
export function getAppConfig(): AppConfig {
  return {
    repository: getDefaultRepositoryConfig(),
    api: getApiConfig(),
    llm: getLLMConfig(),
    defaults: getDefaultsConfig(),
    ui: getUIConfig(),
    appDefaults: getAppDefaultsConfig(),
    documentContext: getDefaultDocumentContextConfig(),
    linkProcessing: getLinkProcessingConfig()
  };
}
