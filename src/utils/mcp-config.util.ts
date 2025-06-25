/**
 * MCPツール設定のユーティリティ関数
 */
import type { MCPToolConfig, ToolExecutionMode } from '@/services/api/types';

/**
 * 環境変数からMCPツール設定を取得
 */
export function getMCPToolsConfig(): {
  enabled: boolean;
  executionMode: ToolExecutionMode;
  availableTools: MCPToolConfig[];
} {
  // MCPツールの有効/無効
  const enabled = import.meta.env.VITE_MCP_TOOLS_ENABLED === 'true';
  
  // 実行モード
  const executionModeStr = import.meta.env.VITE_MCP_DEFAULT_EXECUTION_MODE || 'auto';
  const executionMode: ToolExecutionMode = executionModeStr === 'confirm' ? 'confirm' : 'auto';
  
  // 利用可能なツールのリスト
  const toolsString = import.meta.env.VITE_MCP_AVAILABLE_TOOLS || '';
  const descriptionsString = import.meta.env.VITE_MCP_TOOL_DESCRIPTIONS || '';
  
  // ツール説明の解析
  const descriptionMap = new Map<string, string>();
  if (descriptionsString) {
    const descriptions = descriptionsString.split(',');
    descriptions.forEach((desc: string) => {
      const [name, description] = desc.split(':');
      if (name && description) {
        descriptionMap.set(name.trim(), description.trim());
      }
    });
  }
  
  // ツールリストの解析
  const availableTools: MCPToolConfig[] = [];
  if (toolsString) {
    const toolNames = toolsString.split(',');
    toolNames.forEach((name: string) => {
      const trimmedName = name.trim();
      if (trimmedName) {
        availableTools.push({
          name: trimmedName,
          description: descriptionMap.get(trimmedName) || `${trimmedName}ツール`,
          enabled: true, // デフォルトで有効
        });
      }
    });
  }
  
  // フォールバック: 環境変数が設定されていない場合のデフォルトツール
  if (availableTools.length === 0) {
    availableTools.push({
      name: 'mcp_letter_counte_letter_counter',
      description: '単語中の文字の出現回数を数える',
      enabled: true,
    });
  }
  
  return {
    enabled,
    executionMode,
    availableTools,
  };
}

/**
 * デバッグ用：現在のMCPツール設定をログ出力
 */
export function logMCPToolsConfig(): void {
  const config = getMCPToolsConfig();
  console.group('🛠️ MCPツール設定');
  console.log('有効:', config.enabled);
  console.log('実行モード:', config.executionMode);
  console.log('利用可能なツール:');
  config.availableTools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description} (${tool.enabled ? '有効' : '無効'})`);
  });
  console.groupEnd();
}

/**
 * 特定のツールが有効かどうかを確認
 */
export function isToolEnabled(toolName: string): boolean {
  const config = getMCPToolsConfig();
  const tool = config.availableTools.find(t => t.name === toolName);
  return tool?.enabled ?? false;
}

/**
 * 有効なツールのリストを取得
 */
export function getEnabledTools(): MCPToolConfig[] {
  const config = getMCPToolsConfig();
  return config.availableTools.filter(tool => tool.enabled);
}
