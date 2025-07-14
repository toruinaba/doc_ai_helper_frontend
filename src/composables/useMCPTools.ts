/**
 * MCP Tools Management Composable
 * 
 * MCPツールの設定、実行状態管理を行うコンポーザブル
 */
import { ref, computed } from 'vue';
import type { components } from '@/services/api/types.auto';

// 型エイリアス
type ToolCall = components['schemas']['ToolCall'];

// ツール実行モードの型定義
type ToolExecutionMode = 'auto' | 'manual' | 'required' | 'none';

// MCPツール実行状態の管理
export interface MCPToolExecution {
  id: string;
  toolCall: ToolCall;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  progress?: number;
}

// MCPツール設定
export interface MCPToolsConfig {
  enabled: boolean;
  autoDetect: boolean;
  defaultToolChoice: string;
  toolChoice: string; // 'auto', 'none', 'required', または特定のツール名
  executionMode: ToolExecutionMode;
  enableProgressMonitoring: boolean;
  enableDetailedLogging: boolean;
}

export function useMCPTools() {
  // MCPツール関連の状態
  const mcpToolsConfig = ref<MCPToolsConfig>({
    enabled: true,
    autoDetect: true,
    defaultToolChoice: 'auto',
    toolChoice: 'auto', // デフォルトは自動選択
    executionMode: 'auto',
    enableProgressMonitoring: true,
    enableDetailedLogging: true
  });

  const activeToolExecutions = ref<MCPToolExecution[]>([]);
  const isStreamingWithTools = ref(false);
  const currentStreamController = ref<AbortController | (() => void) | null>(null);
  const toolExecutionHistory = ref<MCPToolExecution[]>([]);

  // Computed プロパティ
  const hasActiveToolExecutions = computed(() => activeToolExecutions.value.length > 0);
  const isToolsEnabled = computed(() => mcpToolsConfig.value.enabled);
  const runningToolExecutions = computed(() => 
    activeToolExecutions.value.filter(exec => exec.status === 'running')
  );
  const completedToolExecutions = computed(() => 
    toolExecutionHistory.value.filter(exec => exec.status === 'completed')
  );
  const failedToolExecutions = computed(() => 
    toolExecutionHistory.value.filter(exec => exec.status === 'error')
  );

  /**
   * MCPツール実行追跡開始
   */
  function startToolExecution(toolCall: ToolCall): MCPToolExecution {
    const execution: MCPToolExecution = {
      id: toolCall.id,
      toolCall,
      status: 'pending',
      startTime: new Date()
    };
    
    activeToolExecutions.value.push(execution);
    console.log('Started tool execution:', execution.id, execution.toolCall.function.name);
    return execution;
  }

  /**
   * ツール実行状態を更新
   */
  function updateToolExecutionStatus(
    executionId: string, 
    status: MCPToolExecution['status'], 
    result?: any, 
    error?: string,
    progress?: number
  ): void {
    const execution = activeToolExecutions.value.find(exec => exec.id === executionId);
    if (execution) {
      execution.status = status;
      if (result !== undefined) execution.result = result;
      if (error) execution.error = error;
      if (progress !== undefined) execution.progress = progress;
      
      if (status === 'completed' || status === 'error') {
        execution.endTime = new Date();
        // アクティブリストから履歴に移動
        activeToolExecutions.value = activeToolExecutions.value.filter(exec => exec.id !== executionId);
        toolExecutionHistory.value.push(execution);
      }
      
      console.log('Updated tool execution status:', executionId, status);
    }
  }

  /**
   * ツール実行履歴をクリア
   */
  function clearToolExecutionHistory(): void {
    toolExecutionHistory.value = [];
    activeToolExecutions.value = [];
    console.log('Cleared tool execution history');
  }

  /**
   * MCPツール設定を更新
   */
  function updateMCPToolsConfig(config: Partial<MCPToolsConfig>): void {
    mcpToolsConfig.value = { ...mcpToolsConfig.value, ...config };
    console.log('Updated MCP tools config:', mcpToolsConfig.value);
  }

  /**
   * MCPツールを切り替え
   */
  function toggleMCPTools(): void {
    mcpToolsConfig.value.enabled = !mcpToolsConfig.value.enabled;
    console.log('Toggled MCP tools:', mcpToolsConfig.value.enabled ? 'enabled' : 'disabled');
  }

  /**
   * ツール実行を検索
   */
  function findToolExecution(executionId: string): MCPToolExecution | undefined {
    return activeToolExecutions.value.find(exec => exec.id === executionId) ||
           toolExecutionHistory.value.find(exec => exec.id === executionId);
  }

  /**
   * ツール呼び出しに対応する実行を検索
   */
  function findExecutionByToolCall(toolCallId: string): MCPToolExecution | undefined {
    return activeToolExecutions.value.find(exec => exec.toolCall.id === toolCallId) ||
           toolExecutionHistory.value.find(exec => exec.toolCall.id === toolCallId);
  }

  /**
   * 進行中のツール実行を中断
   */
  function abortActiveExecutions(): void {
    activeToolExecutions.value.forEach(exec => {
      if (exec.status === 'running' || exec.status === 'pending') {
        updateToolExecutionStatus(exec.id, 'error', undefined, 'Execution aborted');
      }
    });
    
    if (currentStreamController.value) {
      if (typeof currentStreamController.value === 'function') {
        currentStreamController.value();
      } else {
        currentStreamController.value.abort();
      }
      currentStreamController.value = null;
    }
    
    isStreamingWithTools.value = false;
    console.log('Aborted all active tool executions');
  }

  /**
   * ストリーミング状態を設定
   */
  function setStreamingWithTools(streaming: boolean, controller?: AbortController | (() => void)): void {
    isStreamingWithTools.value = streaming;
    if (controller) {
      currentStreamController.value = controller;
    }
    console.log('Set streaming with tools:', streaming);
  }

  return {
    // 状態
    mcpToolsConfig,
    activeToolExecutions,
    isStreamingWithTools,
    currentStreamController,
    toolExecutionHistory,
    
    // 計算されたプロパティ
    hasActiveToolExecutions,
    isToolsEnabled,
    runningToolExecutions,
    completedToolExecutions,
    failedToolExecutions,
    
    // アクション
    startToolExecution,
    updateToolExecutionStatus,
    clearToolExecutionHistory,
    updateMCPToolsConfig,
    toggleMCPTools,
    findToolExecution,
    findExecutionByToolCall,
    abortActiveExecutions,
    setStreamingWithTools
  };
}