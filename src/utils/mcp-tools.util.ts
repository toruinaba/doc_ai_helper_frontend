/**
 * MCP ツール管理ユーティリティ
 */
import { getMCPTools, getMCPToolInfo } from '@/services/api/modules';
import type { MCPToolsResponse, MCPToolInfo, MCPToolConfig } from '@/services/api/types';

/**
 * バックエンドからMCPツールリストを取得し、MCPToolConfig形式に変換
 */
export async function loadMCPToolsFromBackend(): Promise<MCPToolConfig[]> {
  try {
    const response: MCPToolsResponse = await getMCPTools();
    
    return response.tools.map((tool: MCPToolInfo) => ({
      name: tool.name,
      description: tool.description || `${tool.name}ツール`,
      enabled: tool.enabled !== false, // デフォルトでtrue
      parameters: tool.parameters
    }));
  } catch (error) {
    console.error('Failed to load MCP tools from backend:', error);
    // フォールバック：デフォルトツールリストを返す
    return [
      {
        name: 'mcp_letter_counte_letter_counter',
        description: '文字列内の文字出現回数をカウント',
        enabled: true
      }
    ];
  }
}

/**
 * 特定のツールの詳細情報を取得
 */
export async function getToolDetails(toolName: string): Promise<MCPToolInfo | null> {
  try {
    return await getMCPToolInfo(toolName);
  } catch (error) {
    console.error(`Failed to get tool details for ${toolName}:`, error);
    return null;
  }
}

/**
 * ツールカテゴリごとにツールを分類
 */
export function categorizeTools(tools: MCPToolConfig[]): Record<string, MCPToolConfig[]> {
  const categories: Record<string, MCPToolConfig[]> = {};
  
  tools.forEach(tool => {
    // ツール名からカテゴリを推測（実際のAPIレスポンスにcategoryがある場合はそれを使用）
    let category = 'その他';
    
    if (tool.name.includes('letter') || tool.name.includes('text')) {
      category = 'テキスト処理';
    } else if (tool.name.includes('document') || tool.name.includes('analyze')) {
      category = 'ドキュメント分析';
    } else if (tool.name.includes('calculate') || tool.name.includes('math')) {
      category = '計算';
    }
    
    if (!categories[category]) {
      categories[category] = [];
    }
    
    categories[category].push(tool);
  });
  
  return categories;
}

/**
 * ツール選択の推奨を行う
 */
export function recommendToolForPrompt(prompt: string, availableTools: MCPToolConfig[]): {
  recommendedTool: string | null;
  confidence: number;
  reason: string;
} {
  const lowerPrompt = prompt.toLowerCase();
  
  // 文字カウント関連
  if (lowerPrompt.includes('文字') && (lowerPrompt.includes('数') || lowerPrompt.includes('カウント'))) {
    const letterCountTool = availableTools.find(t => t.name.includes('letter_counter'));
    if (letterCountTool) {
      return {
        recommendedTool: letterCountTool.name,
        confidence: 0.9,
        reason: '文字カウント処理が検出されました'
      };
    }
  }
  
  // 汎用的な推奨
  if (availableTools.length > 0) {
    return {
      recommendedTool: 'auto',
      confidence: 0.5,
      reason: '自動ツール選択を推奨'
    };
  }
  
  return {
    recommendedTool: null,
    confidence: 0,
    reason: '適切なツールが見つかりません'
  };
}
