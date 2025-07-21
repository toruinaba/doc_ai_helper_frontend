/**
 * 統一設定管理ユーティリティ
 * 
 * ローカルストレージを使った設定の読み書きを管理
 */

export interface StreamingSettings {
  enabled: boolean;
  type: 'auto' | 'eventsource' | 'fetch';
}

export interface MCPSettings {
  enabled: boolean;
  executionMode: 'auto' | 'manual' | 'required' | 'none';
  autoDetect: boolean;
}

export interface DocumentSettings {
  includeDocumentInSystemPrompt: boolean;
  enableRepositoryContext: boolean;
  enableDocumentMetadata: boolean;
  systemPromptTemplate: string;
}

export interface UISettings {
  showStreamingToggle: boolean;
  showToolsToggle: boolean;
}

export interface AllSettings {
  streaming: StreamingSettings;
  mcp: MCPSettings;
  document: DocumentSettings;
  ui: UISettings;
}

// ローカルストレージキー
const STORAGE_KEYS = {
  STREAMING: 'app-streaming-settings',
  MCP: 'app-mcp-settings',
  DOCUMENT: 'app-document-settings',
  UI: 'app-ui-settings',
  AVAILABLE_TOOLS: 'app-available-tools'
} as const;

// デフォルト設定
const DEFAULT_SETTINGS: AllSettings = {
  streaming: {
    enabled: true,
    type: 'fetch'
  },
  mcp: {
    enabled: false,
    executionMode: 'auto',
    autoDetect: true
  },
  document: {
    includeDocumentInSystemPrompt: true,
    enableRepositoryContext: true,
    enableDocumentMetadata: true,
    systemPromptTemplate: 'contextual_document_assistant_ja'
  },
  ui: {
    showStreamingToggle: false,
    showToolsToggle: false
  }
};

/**
 * 設定をローカルストレージから読み込み
 */
export function loadSettings(): AllSettings {
  const settings = { ...DEFAULT_SETTINGS };

  // ストリーミング設定
  const savedStreamingSettings = localStorage.getItem(STORAGE_KEYS.STREAMING);
  if (savedStreamingSettings) {
    try {
      Object.assign(settings.streaming, JSON.parse(savedStreamingSettings));
    } catch (error) {
      console.warn('Failed to parse streaming settings:', error);
    }
  }

  // MCP設定
  const savedMCPSettings = localStorage.getItem(STORAGE_KEYS.MCP);
  if (savedMCPSettings) {
    try {
      Object.assign(settings.mcp, JSON.parse(savedMCPSettings));
    } catch (error) {
      console.warn('Failed to parse MCP settings:', error);
    }
  }

  // ドキュメント設定
  const savedDocumentSettings = localStorage.getItem(STORAGE_KEYS.DOCUMENT);
  if (savedDocumentSettings) {
    try {
      Object.assign(settings.document, JSON.parse(savedDocumentSettings));
    } catch (error) {
      console.warn('Failed to parse document settings:', error);
    }
  }

  // UI設定
  const savedUISettings = localStorage.getItem(STORAGE_KEYS.UI);
  if (savedUISettings) {
    try {
      Object.assign(settings.ui, JSON.parse(savedUISettings));
    } catch (error) {
      console.warn('Failed to parse UI settings:', error);
    }
  }

  return settings;
}

/**
 * ストリーミング設定を保存
 */
export function saveStreamingSettings(settings: StreamingSettings): void {
  localStorage.setItem(STORAGE_KEYS.STREAMING, JSON.stringify(settings));
}

/**
 * MCP設定を保存
 */
export function saveMCPSettings(settings: MCPSettings): void {
  localStorage.setItem(STORAGE_KEYS.MCP, JSON.stringify(settings));
}

/**
 * ドキュメント設定を保存
 */
export function saveDocumentSettings(settings: DocumentSettings): void {
  localStorage.setItem(STORAGE_KEYS.DOCUMENT, JSON.stringify(settings));
}

/**
 * UI設定を保存
 */
export function saveUISettings(settings: UISettings): void {
  localStorage.setItem(STORAGE_KEYS.UI, JSON.stringify(settings));
}

/**
 * 全設定を保存
 */
export function saveAllSettings(settings: AllSettings): void {
  saveStreamingSettings(settings.streaming);
  saveMCPSettings(settings.mcp);
  saveDocumentSettings(settings.document);
  saveUISettings(settings.ui);
}

/**
 * 設定をリセット（デフォルト値に戻す）
 */
export function resetSettings(): AllSettings {
  // ローカルストレージをクリア
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });

  return { ...DEFAULT_SETTINGS };
}

/**
 * 設定をエクスポート
 */
export function exportSettings(): string {
  const settings = loadSettings();
  return JSON.stringify(settings, null, 2);
}

/**
 * 設定をインポート
 */
export function importSettings(jsonString: string): AllSettings {
  try {
    const importedSettings = JSON.parse(jsonString);
    
    // 設定の構造を検証
    const validatedSettings: AllSettings = {
      streaming: { ...DEFAULT_SETTINGS.streaming, ...importedSettings.streaming },
      mcp: { ...DEFAULT_SETTINGS.mcp, ...importedSettings.mcp },
      document: { ...DEFAULT_SETTINGS.document, ...importedSettings.document },
      ui: { ...DEFAULT_SETTINGS.ui, ...importedSettings.ui }
    };

    // 保存
    saveAllSettings(validatedSettings);
    
    return validatedSettings;
  } catch (error) {
    console.error('Failed to import settings:', error);
    throw new Error('設定ファイルの形式が正しくありません');
  }
}

/**
 * 利用可能なツール設定を読み込み
 */
export function loadAvailableTools(): Array<{ name: string; description: string; enabled: boolean }> {
  const savedTools = localStorage.getItem(STORAGE_KEYS.AVAILABLE_TOOLS);
  if (savedTools) {
    try {
      return JSON.parse(savedTools);
    } catch (error) {
      console.warn('Failed to parse available tools:', error);
    }
  }
  
  // デフォルトツール
  return [
    { name: 'file-search', description: 'ファイル検索機能', enabled: true },
    { name: 'code-analysis', description: 'コード解析機能', enabled: true },
    { name: 'document-summary', description: 'ドキュメント要約機能', enabled: false }
  ];
}

/**
 * 利用可能なツール設定を保存
 */
export function saveAvailableTools(tools: Array<{ name: string; description: string; enabled: boolean }>): void {
  localStorage.setItem(STORAGE_KEYS.AVAILABLE_TOOLS, JSON.stringify(tools));
}