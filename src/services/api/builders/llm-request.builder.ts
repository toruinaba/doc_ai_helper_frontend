/**
 * LLM Request Builder
 * 
 * 新しいバックエンドAPI仕様（階層化構造）に対応した統一されたリクエストビルダー
 */
import type { components } from '../types.auto';
import type { DocumentResponse } from '../types';
import { getLLMConfig, getDefaultsConfig, getAppDefaultsConfig } from '@/utils/config.util';

// 型エイリアスを作成
type LLMQueryRequest = components['schemas']['LLMQueryRequest'];
type CoreQueryRequest = components['schemas']['CoreQueryRequest'];
type ToolConfiguration = components['schemas']['ToolConfiguration'];
type DocumentContext = components['schemas']['DocumentContext'];
type ProcessingOptions = components['schemas']['ProcessingOptions'];
type MessageItem = components['schemas']['MessageItem'];
type RepositoryContext = components['schemas']['RepositoryContext'];
type DocumentMetadata = components['schemas']['DocumentMetadata-Input'];

export interface LLMRequestBuilderOptions {
  prompt: string;
  provider?: string;
  model?: string;
  conversationHistory?: MessageItem[];
  enableTools?: boolean;
  toolChoice?: string;
  completeToolFlow?: boolean;
  document?: DocumentResponse;
  repositoryContext?: RepositoryContext;
  documentMetadata?: DocumentMetadata;
  autoIncludeDocument?: boolean;
  contextDocuments?: string[];
  disableCache?: boolean;
  options?: Record<string, any>;
}

/**
 * LLMリクエストビルダー
 * フラット構造から新しい階層化構造へのマッピングを担当
 */
export class LLMRequestBuilder {
  private options: Partial<LLMRequestBuilderOptions> = {};

  private constructor() {}

  static create(): LLMRequestBuilder {
    return new LLMRequestBuilder();
  }

  /**
   * 基本プロンプトを設定
   */
  prompt(prompt: string): LLMRequestBuilder {
    this.options.prompt = prompt;
    return this;
  }

  /**
   * プロバイダーとモデルを設定
   */
  provider(provider: string, model?: string): LLMRequestBuilder {
    this.options.provider = provider;
    this.options.model = model;
    return this;
  }

  /**
   * 会話履歴を設定
   */
  withHistory(history: MessageItem[]): LLMRequestBuilder {
    this.options.conversationHistory = history;
    return this;
  }

  /**
   * ツール設定を追加
   */
  withTools(config: {
    enabled?: boolean;
    choice?: string;
    completeFlow?: boolean;
  }): LLMRequestBuilder {
    const appDefaults = getAppDefaultsConfig();
    const llmConfig = getLLMConfig();
    this.options.enableTools = config.enabled ?? appDefaults.toolsEnabled;
    this.options.toolChoice = config.choice ?? llmConfig.defaultToolChoice;
    this.options.completeToolFlow = config.completeFlow ?? appDefaults.toolsEnabled;
    return this;
  }

  /**
   * ドキュメントコンテキストを設定
   */
  withDocument(document: DocumentResponse, options?: {
    autoInclude?: boolean;
    contextDocuments?: string[];
  }): LLMRequestBuilder {
    this.options.document = document;
    this.options.autoIncludeDocument = options?.autoInclude ?? true;
    this.options.contextDocuments = options?.contextDocuments ?? [document.path];
    
    // ドキュメントからリポジトリコンテキストを自動生成
    const defaultsConfig = getDefaultsConfig();
    this.options.repositoryContext = {
      service: document.service as any,
      owner: document.owner,
      repo: document.repository,
      ref: document.ref || defaultsConfig.branch,
      current_path: document.path,
      base_url: null
    };

    // ドキュメントメタデータを自動生成
    this.options.documentMetadata = {
      title: document.name,
      type: defaultsConfig.documentType as any,
      filename: document.name,
      file_extension: document.name.includes('.') ? document.name.split('.').pop() || null : null,
      last_modified: document.metadata.last_modified,
      file_size: document.metadata.size,
      encoding: document.content.encoding || defaultsConfig.encoding,
      language: null
    };

    return this;
  }

  /**
   * 処理オプションを設定
   */
  withProcessing(options: {
    disableCache?: boolean;
    customOptions?: Record<string, any>;
  }): LLMRequestBuilder {
    this.options.disableCache = options.disableCache ?? false;
    this.options.options = options.customOptions;
    return this;
  }

  /**
   * 新しいバックエンド仕様に基づいてLLMQueryRequestを構築
   */
  build(): LLMQueryRequest {
    if (!this.options.prompt) {
      throw new Error('Prompt is required');
    }

    // 設定を取得
    const llmConfig = getLLMConfig();

    // Core query parameters (必須グループ)
    const query: CoreQueryRequest = {
      prompt: this.options.prompt,
      provider: this.options.provider || llmConfig.defaultProvider,
      model: this.options.model || llmConfig.defaultModel,
      conversation_history: this.options.conversationHistory || null
    };

    // Tool configuration (オプショナル)
    const appDefaults = getAppDefaultsConfig();
    const tools: ToolConfiguration | undefined = this.options.enableTools ? {
      enable_tools: this.options.enableTools,
      tool_choice: this.options.toolChoice || llmConfig.defaultToolChoice,
      complete_tool_flow: this.options.completeToolFlow ?? appDefaults.toolsEnabled
    } : undefined;

    // Document context (オプショナル)
    const document: DocumentContext | undefined = (
      this.options.repositoryContext || 
      this.options.documentMetadata || 
      this.options.contextDocuments
    ) ? {
      repository_context: this.options.repositoryContext || null,
      document_metadata: this.options.documentMetadata || null,
      auto_include_document: this.options.autoIncludeDocument ?? true,
      context_documents: this.options.contextDocuments || null
    } : undefined;

    // Processing options (オプショナル)
    const processing: ProcessingOptions | undefined = (
      this.options.disableCache !== undefined || 
      this.options.options
    ) ? {
      disable_cache: this.options.disableCache ?? false,
      options: this.options.options || undefined
    } : undefined;

    // 新しい階層化構造でリクエストを構築
    const request: LLMQueryRequest = {
      query,
      tools,
      document,
      processing
    };

    return request;
  }

  /**
   * 既存のフラット構造からビルダーを初期化（マイグレーション用）
   */
  static fromLegacyRequest(legacyRequest: any): LLMRequestBuilder {
    const builder = new LLMRequestBuilder();
    
    // 既存のフラット構造から新しいビルダーに値をマッピング
    builder.options = {
      prompt: legacyRequest.prompt,
      provider: legacyRequest.provider,
      model: legacyRequest.model,
      conversationHistory: legacyRequest.conversation_history,
      enableTools: legacyRequest.enable_tools,
      toolChoice: legacyRequest.tool_choice,
      completeToolFlow: legacyRequest.complete_tool_flow,
      autoIncludeDocument: legacyRequest.auto_include_document,
      contextDocuments: legacyRequest.context_documents,
      disableCache: legacyRequest.disable_cache,
      options: legacyRequest.options
    };

    // リポジトリコンテキストの変換
    if (legacyRequest.repository_context) {
      builder.options.repositoryContext = legacyRequest.repository_context;
    }

    // ドキュメントメタデータの変換
    if (legacyRequest.document_metadata) {
      builder.options.documentMetadata = legacyRequest.document_metadata;
    }

    return builder;
  }
}

/**
 * 便利なファクトリー関数
 */
export const createLLMRequest = () => LLMRequestBuilder.create();

/**
 * よく使われるパターンのプリセット
 */
export const LLMRequestPresets = {
  /**
   * ドキュメント付きチャット（ツール有効）
   */
  documentChatWithTools: (prompt: string, document: DocumentResponse, history?: MessageItem[]) => {
    const llmConfig = getLLMConfig();
    const appDefaults = getAppDefaultsConfig();
    return LLMRequestBuilder
      .create()
      .prompt(prompt)
      .provider(llmConfig.defaultProvider, llmConfig.defaultModel)
      .withHistory(history || [])
      .withDocument(document)
      .withTools({ enabled: appDefaults.toolsEnabled, choice: llmConfig.defaultToolChoice });
  },

  /**
   * シンプルクエリ（ツール無効）
   */
  simpleQuery: (prompt: string, provider?: string) => {
    const llmConfig = getLLMConfig();
    return LLMRequestBuilder
      .create()
      .prompt(prompt)
      .provider(provider || llmConfig.defaultProvider, llmConfig.defaultModel)
      .withTools({ enabled: false, choice: 'none' });
  },

  /**
   * ストリーミング用リクエスト
   */
  streamingRequest: (prompt: string, document: DocumentResponse, history: MessageItem[]) => {
    const llmConfig = getLLMConfig();
    const appDefaults = getAppDefaultsConfig();
    return LLMRequestBuilder
      .create()
      .prompt(prompt)
      .provider(llmConfig.defaultProvider, llmConfig.defaultModel)
      .withHistory(history)
      .withDocument(document)
      .withTools({ enabled: appDefaults.toolsEnabled, choice: llmConfig.defaultToolChoice })
      .withProcessing({ disableCache: false });
  }
};