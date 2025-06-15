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
