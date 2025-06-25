/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * バックエンドAPIのベースURL
   * 例: http://localhost:8000/api/v1
   */
  readonly VITE_API_BASE_URL: string;
  
  /**
   * バックエンドのベースURL（リンク変換用）
   */
  readonly VITE_BACKEND_URL: string;
  
  /**
   * モックAPIを使用するかどうか
   */
  readonly VITE_USE_MOCK_API: string;
  
  /**
   * デバッグパネルを表示するかどうか
   */
  readonly VITE_SHOW_DEBUG_PANEL: string;
  
  /**
   * MCPツール機能が有効かどうか
   */
  readonly VITE_MCP_TOOLS_ENABLED: string;
  
  /**
   * 利用可能なMCPツールのリスト（カンマ区切り）
   */
  readonly VITE_MCP_AVAILABLE_TOOLS: string;
  
  /**
   * MCPツールの説明（name:description形式、カンマ区切り）
   */
  readonly VITE_MCP_TOOL_DESCRIPTIONS: string;
  
  /**
   * MCPツールのデフォルト実行モード
   */
  readonly VITE_MCP_DEFAULT_EXECUTION_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
