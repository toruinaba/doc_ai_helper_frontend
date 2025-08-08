/**
 * API型定義
 * 
 * 手動定義の型のみ含む。自動生成された型は types.auto.ts を直接使用すること。
 * 
 * 使用例:
 * import type { components } from '@/services/api/types.auto';
 * type Repository = components["schemas"]["RepositoryResponse"];
 */

// 自動生成された型定義をインポート（手動型でのみ使用）
import type { components } from './types.auto';

// リポジトリ関連の手動型定義（フロントエンド固有）
/**
 * access_tokenフィールドを含む拡張リポジトリ型（フロントエンドでのみ使用）
 * 
 * 使用場面:
 * - リポジトリフォームコンポーネント（入力時）
 * - リポジトリ詳細表示コンポーネント（表示時、プライベートリポジトリでのマスク表示など）
 * - フロントエンド内での一時的なリポジトリデータ管理
 * 
 * 注意: 
 * - API レスポンス（RepositoryResponse）には通常 access_token は含まれません（セキュリティ上）
 * - この型は主にフォーム入力やローカル状態管理で使用します
 */
export type RepositoryWithToken = components['schemas']['RepositoryResponse'] & {
  access_token?: string | null;
};

// ドキュメント関連の手動型定義（フロントエンド固有）
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

// SSEストリーミング関連の手動型定義（フロントエンド固有）
export interface StreamingLLMResponse {
  event: 'start' | 'token' | 'error' | 'end';  // イベントタイプ
  data?: {
    content?: string;              // トークンイベントの場合、新しいトークン
    error?: string;                // エラーイベントの場合、エラーメッセージ
    model?: string;                // 開始イベントの場合、使用されるモデル
    provider?: string;             // 開始イベントの場合、プロバイダー
    usage?: components["schemas"]["LLMUsage"]; // 終了イベントの場合、トークン使用情報
    optimized_conversation_history?: components["schemas"]["MessageItem"][]; // 終了イベントの場合、最適化された会話履歴
    tool_calls?: components["schemas"]["ToolCall"][];       // ツール呼び出し情報（MCPツール機能）
    tool_execution_results?: Record<string, any>[]; // ツール実行結果（MCPツール機能）
  };
  id?: string;                     // イベントID（任意）
}

// LLMクエリリクエストにストリーミングフラグを追加したインターフェース
export interface LLMStreamingRequest {
  // LLMQueryRequestの全プロパティを含む
  query: string;
  conversation_history?: components["schemas"]["MessageItem"][];
  repository_context?: components["schemas"]["RepositoryContext"];
  document_metadata?: components["schemas"]["DocumentMetadata-Input"];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;                // ストリーミングモードを有効にするフラグ
}

// ストリーミングコールバック関数の型定義（フロントエンド固有）
export interface StreamingCallbacks {
  onStart?: (data?: any) => void;
  onToken?: (token: string) => void;
  onError?: (error: string) => void;
  onEnd?: (data?: any) => void;
}

// MCPツール機能のコールバック関数の型定義（ストリーミング用）
export interface MCPStreamingCallbacks extends StreamingCallbacks {
  onToolCall?: (toolCall: components["schemas"]["ToolCall"]) => void;           // ツール呼び出し開始時
  onToolResult?: (result: Record<string, any>) => void; // ツール実行結果受信時
}

// MCPツール実行状態管理用の型定義（フロントエンド固有）
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

// MCPツール設定の型定義（フロントエンド固有）
export interface MCPToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  parameters?: Record<string, any>;
}

// MCPツール実行モードの型定義
export type ToolExecutionMode = 'auto' | 'none' | 'required';

// MCPツール管理状態の型定義（フロントエンド固有）
export interface MCPToolsState {
  enabled: boolean;
  executionMode: ToolExecutionMode;
  availableTools: MCPToolConfig[];
  activeExecutions: Map<string, ToolExecution>;
  executionHistory: ToolExecution[];
}

// MCPツール選択の型定義（tool_choiceで使用）
export type MCPToolChoice = 'auto' | 'none' | 'required' | string; // 特定のツール名も可能

// =============================================================================
// MIGRATION NOTICE: 自動生成型への移行方法
// =============================================================================
// 
// 以下の型は types.auto.ts から直接参照してください：
//
// OLD (削除済み):
// import { DocumentResponse } from '@/services/api/types';
//
// NEW (推奨):
// import type { components } from '@/services/api/types.auto';
// type DocumentResponse = components["schemas"]["DocumentResponse"];
//
// よく使われる型:
// - components["schemas"]["DocumentResponse"]
// - components["schemas"]["RepositoryResponse"] 
// - components["schemas"]["RepositoryCreate"]
// - components["schemas"]["RepositoryUpdate"]
// - components["schemas"]["GitServiceType"]
// - components["schemas"]["MessageItem"]
// - components["schemas"]["RepositoryContext"]
// - components["schemas"]["LLMQueryRequest"]
// - components["schemas"]["LLMResponse"]
// - components["schemas"]["ToolCall"]
// - components["schemas"]["FunctionCall"]
// - components["schemas"]["MCPToolInfo"]
// - components["schemas"]["MCPToolsResponse"]
// - components["schemas"]["ValidationError"]
// - components["schemas"]["HTTPValidationError"]
//
// フロントエンド拡張型:
// - RepositoryWithToken (access_token フィールド付きリポジトリ型)
//
// =============================================================================