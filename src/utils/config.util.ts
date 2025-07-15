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
