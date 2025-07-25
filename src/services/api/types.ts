/**
 * API型定義
 * 
 * 自動生成された型定義（types.auto.ts）を基に、段階的に移行中
 */

// 自動生成された型定義をインポート
import type { components } from './types.auto';

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

// DocumentResponse: 自動生成版を使用
export type DocumentResponse = components["schemas"]["DocumentResponse"];

// リポジトリ構造関連の型定義
// FileTreeItem: 自動生成版を使用
export type FileTreeItem = components["schemas"]["FileTreeItem"];

// RepositoryStructureResponse: 自動生成版を使用
export type RepositoryStructureResponse = components["schemas"]["RepositoryStructureResponse"];

// リポジトリ関連の型定義 - Fallback definitions
export type GitServiceType = 'github' | 'gitlab' | 'bitbucket' | 'mock';

export interface RepositoryCreate {
  name: string;
  owner: string;
  service: GitServiceType;
  description?: string;
}

export interface RepositoryResponse {
  id: number;
  name: string;
  owner: string;
  service: GitServiceType;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RepositoryUpdate {
  name?: string;
  description?: string;
}

// 検索関連の型定義
// SearchQuery: 自動生成版を使用
export type SearchQuery = components["schemas"]["SearchQuery"];

// SearchResultItem: 自動生成版を使用
export type SearchResultItem = components["schemas"]["SearchResultItem"];

// SearchResponse: 自動生成版を使用
export type SearchResponse = components["schemas"]["SearchResponse"];

// バリデーションエラー関連の型定義
// ValidationError: 自動生成版を使用
export type ValidationError = components["schemas"]["ValidationError"];

// HTTPValidationError: 自動生成版を使用
export type HTTPValidationError = components["schemas"]["HTTPValidationError"];

// LLMクエリ関連の型定義
// MessageItem: 自動生成版を使用
export type MessageItem = components["schemas"]["MessageItem"];

// RepositoryContext: 自動生成版を使用
export type RepositoryContext = components["schemas"]["RepositoryContext"];

// GitService: 自動生成版を使用  
export type GitService = components["schemas"]["GitService"];

// DocumentMetadataInput: 自動生成版を使用
export type DocumentMetadataInput = components["schemas"]["DocumentMetadata-Input"];

// DocumentTypeInput: 自動生成版を使用
export type DocumentTypeInput = components["schemas"]["DocumentType-Input"];

// MCPツール関連の型定義
// FunctionCall: 自動生成版を使用
export type FunctionCall = components["schemas"]["FunctionCall"];

// ToolCall: 自動生成版を使用
export type ToolCall = components["schemas"]["ToolCall"];

// LLMQueryRequest: 自動生成版を使用
export type LLMQueryRequest = components["schemas"]["LLMQueryRequest"];

// LLMResponse: 自動生成版を使用
export type LLMResponse = components["schemas"]["LLMResponse"];

// SSEストリーミング関連の型定義
export interface StreamingLLMResponse {
  event: 'start' | 'token' | 'error' | 'end';  // イベントタイプ
  data?: {
    content?: string;              // トークンイベントの場合、新しいトークン
    error?: string;                // エラーイベントの場合、エラーメッセージ
    model?: string;                // 開始イベントの場合、使用されるモデル
    provider?: string;             // 開始イベントの場合、プロバイダー
    usage?: components["schemas"]["LLMUsage"]; // 終了イベントの場合、トークン使用情報
    optimized_conversation_history?: MessageItem[]; // 終了イベントの場合、最適化された会話履歴
    tool_calls?: ToolCall[];       // ツール呼び出し情報（MCPツール機能）
    tool_execution_results?: Record<string, any>[]; // ツール実行結果（MCPツール機能）
  };
  id?: string;                     // イベントID（任意）
}

export interface LLMStreamingRequest extends LLMQueryRequest {
  stream?: boolean;                // ストリーミングモードを有効にするフラグ
}

// ストリーミングコールバック関数の型定義
export interface StreamingCallbacks {
  onStart?: (data?: any) => void;
  onToken?: (token: string) => void;
  onError?: (error: string) => void;
  onEnd?: (data?: any) => void;
}

// MCPツール機能のコールバック関数の型定義（ストリーミング用）
export interface MCPStreamingCallbacks extends StreamingCallbacks {
  onToolCall?: (toolCall: ToolCall) => void;           // ツール呼び出し開始時
  onToolResult?: (result: Record<string, any>) => void; // ツール実行結果受信時
}

// MCPツール実行状態管理用の型定義
export interface ToolExecution {
  id: string;
  toolCallId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  progress?: {
    percentage: number;
    message: string;
  };
  result?: any;
  error?: string;
}

// MCPツール設定の型定義
export interface MCPToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  parameters?: Record<string, any>;
}

// MCPツール実行モードの型定義
export type ToolExecutionMode = 'auto' | 'none' | 'required';

// MCPツール管理状態の型定義
export interface MCPToolsState {
  enabled: boolean;
  executionMode: ToolExecutionMode;
  availableTools: MCPToolConfig[];
  activeExecutions: Map<string, ToolExecution>;
  executionHistory: ToolExecution[];
}

// バックエンドから取得するMCPツール情報の型定義（OpenAPI仕様に基づく）
// ToolParameter: 自動生成版を使用
export type ToolParameter = components["schemas"]["ToolParameter"];

// MCPToolInfo: 自動生成版を使用
export type MCPToolInfo = components["schemas"]["MCPToolInfo"];

// MCPToolsResponse: 自動生成版を使用
export type MCPToolsResponse = components["schemas"]["MCPToolsResponse"];

// MCPツール選択の型定義（tool_choiceで使用）
export type MCPToolChoice = 'auto' | 'none' | 'required' | string; // 特定のツール名も可能
