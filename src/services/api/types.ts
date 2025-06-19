/**
 * API型定義
 */

// ドキュメント関連の型定義
export interface DocumentContent {
  content: string;
  encoding?: string;
}

export interface DocumentMetadata {
  size: number;
  last_modified: string;
  content_type: string;
  sha?: string | null;
  download_url?: string | null;
  html_url?: string | null;
  raw_url?: string | null;
  extra?: Record<string, any> | null;
}

export enum DocumentType {
  Markdown = "markdown",
  Quarto = "quarto",
  Html = "html",
  Other = "other"
}

export interface LinkInfo {
  text: string;
  url: string;
  is_image?: boolean;
  position: [number, number];
  is_external?: boolean;
}

export interface DocumentResponse {
  path: string;
  name: string;
  type: DocumentType;
  metadata: DocumentMetadata;
  content: DocumentContent;
  repository: string;
  owner: string;
  service: string;
  ref?: string;
  links?: LinkInfo[] | null;
  transformed_content?: string | null;
}

// LLMチャット関連の型定義
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: string;
  document_context?: {
    service: string;
    owner: string;
    repo: string;
    path: string;
    ref?: string;
  };
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  message: ChatMessage;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  execution_time_ms: number;
  optimized_conversation_history?: MessageItem[]; // 最適化された会話履歴
}

// リポジトリ構造関連の型定義
export interface FileTreeItem {
  path: string;
  name: string;
  type: string; // 'file' または 'directory'
  size?: number | null;
  sha?: string | null;
  download_url?: string | null;
  html_url?: string | null;
  git_url?: string | null;
  children?: FileTreeItem[]; // ディレクトリの場合の子要素
}

export interface RepositoryStructureResponse {
  service: string;
  owner: string;
  repo: string;
  ref?: string;
  tree: FileTreeItem[];
  last_updated: string;
}

// リポジトリ関連の型定義
export enum GitServiceType {
  GitHub = "github",
  GitLab = "gitlab"
}

export interface RepositoryCreate {
  name: string;
  owner: string;
  service_type: GitServiceType;
  url: string;
  branch?: string;
  description?: string | null;
  is_public?: boolean;
  access_token?: string | null;
  metadata?: Record<string, any> | null;
}

export interface RepositoryResponse {
  name: string;
  owner: string;
  service_type: GitServiceType;
  url: string;
  branch?: string;
  description?: string | null;
  is_public?: boolean;
  id: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any> | null;
}

export interface RepositoryUpdate {
  name?: string | null;
  owner?: string | null;
  service_type?: GitServiceType | null;
  url?: string | null;
  branch?: string | null;
  description?: string | null;
  is_public?: boolean | null;
  access_token?: string | null;
  metadata?: Record<string, any> | null;
}

// 検索関連の型定義
export interface SearchQuery {
  query: string;
  limit?: number;
  offset?: number;
  file_extensions?: string[] | null;
  path_prefix?: string | null;
  metadata_filters?: Record<string, any> | null;
}

export interface SearchResultItem {
  path: string;
  name: string;
  type: string;
  repository: string;
  owner: string;
  service: string;
  score: number;
  highlight?: string | null;
  metadata?: Record<string, any> | null;
}

export interface SearchResponse {
  total: number;
  offset: number;
  limit: number;
  query: string;
  results: SearchResultItem[];
  execution_time_ms: number;
}

// バリデーションエラー関連の型定義
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

// LLMクエリ関連の型定義
export interface MessageItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface LLMQueryRequest {
  prompt: string;                  // LLMに送信するプロンプト
  context_documents?: string[];    // コンテキストに含めるドキュメントパスのリスト
  provider?: string;               // 使用するLLMプロバイダー
  model?: string;                  // 使用する特定のモデル
  options?: Record<string, any>;   // LLMプロバイダー用の追加オプション
  disable_cache?: boolean;         // trueの場合、キャッシュをバイパスして常に新しいAPI呼び出しを行う
  conversation_history?: MessageItem[]; // 会話の履歴（コンテキスト用）
}

export interface LLMResponse {
  content: string;                 // LLMから返されたコンテンツ
  model: string;                   // 生成に使用されたモデル
  provider: string;                // LLMプロバイダー
  usage?: {                        // トークン使用情報
    prompt_tokens: number;         // プロンプト内のトークン数
    completion_tokens: number;     // 補完内のトークン数
    total_tokens: number;          // 使用された合計トークン数
  };
  raw_response?: Record<string, any>; // プロバイダーからの生レスポンス
  optimized_conversation_history?: MessageItem[]; // 最適化された会話履歴
  history_optimization_info?: Record<string, any>; // 会話履歴の最適化に関する情報
}
