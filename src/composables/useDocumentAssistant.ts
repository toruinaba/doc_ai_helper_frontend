/**
 * Document Assistant Composable
 * 
 * ドキュメントアシスタントUIの状態とロジックを管理するコンポーザブル
 */
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useDocumentAssistantStore } from '@/stores/document-assistant.store';
import { useDocumentStore } from '@/stores/document.store';
import { getMCPToolsConfig } from '@/services/api/infrastructure/config.service';
import { updateStreamingConfig, StreamingType } from '@/services/api/infrastructure';
import { getAppDefaultsConfig } from '@/utils/config.util';
import { loadSettings, type StreamingSettings, type MCPSettings } from '@/utils/settings.util';

// Type definitions
type ToolExecutionMode = 'auto' | 'manual' | 'required' | 'none';

interface MCPToolConfig {
  name: string;
  description: string;
  enabled: boolean;
}

export interface DocumentAssistantState {
  // メッセージ関連
  messages: any[];
  isLoading: boolean;
  error: string | null;
  
  // UI状態
  useStreaming: boolean;
  useToolsForMessage: boolean;
  
  // MCP ツール設定
  mcpToolsEnabled: boolean;
  executionMode: ToolExecutionMode;
  availableTools: MCPToolConfig[];
  toolExecutionHistory: any[];
  activeToolExecutions: any[];
  
  // ストリーミング設定
  streamingType: string;
}

export interface DocumentAssistantActions {
  // メッセージ送信
  sendMessage: (options: {
    message: string;
    useStreaming: boolean;
    useTools: boolean;
  }) => Promise<void>;
  
  // 設定更新
  updateStreamingMode: (useStreaming: boolean) => void;
  updateToolsForMessage: (useTools: boolean) => void;
  updateMCPToolsEnabled: (enabled: boolean) => void;
  updateExecutionMode: (mode: ToolExecutionMode) => void;
  updateAvailableTools: (tools: MCPToolConfig[]) => void;
  updateStreamingType: (type: string) => void;
  
  // ユーティリティ
  scrollToBottom: () => Promise<void>;
  clearMessages: () => void;
  clearToolHistory: () => void;
}

export function useDocumentAssistant(messagesRef?: any) {
  const assistantStore = useDocumentAssistantStore();
  const documentStore = useDocumentStore();
  
  // 統一設定を読み込み
  const allSettings = loadSettings();
  
  // MCPツール設定を環境変数から取得（フォールバック用）
  const mcpConfig = getMCPToolsConfig();
  
  // アプリケーションデフォルト設定を取得（フォールバック用）
  const appDefaults = getAppDefaultsConfig();
  
  // 統一設定を優先したローカル状態
  const useStreaming = ref(allSettings.streaming.enabled);
  const useToolsForMessage = ref(allSettings.mcp.enabled);
  const mcpToolsEnabled = ref(allSettings.mcp.enabled);
  const executionMode = ref<ToolExecutionMode>(allSettings.mcp.executionMode);
  const availableTools = ref<MCPToolConfig[]>([]);
  const streamingType = ref<string>(allSettings.streaming.type);
  
  // 設定変更のリスナー
  const handleSettingsChange = () => {
    const newSettings = loadSettings();
    useStreaming.value = newSettings.streaming.enabled;
    useToolsForMessage.value = newSettings.mcp.enabled;
    mcpToolsEnabled.value = newSettings.mcp.enabled;
    executionMode.value = newSettings.mcp.executionMode;
    streamingType.value = newSettings.streaming.type;
    console.log('Settings updated in document assistant:', newSettings);
  };
  
  // 設定変更イベントのリスナーを設定
  onMounted(() => {
    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('document-settings-changed', handleSettingsChange as EventListener);
  });
  
  onUnmounted(() => {
    window.removeEventListener('storage', handleSettingsChange);
    window.removeEventListener('document-settings-changed', handleSettingsChange as EventListener);
  });
  
  // 計算されたプロパティ
  const messages = computed(() => {
    console.log('useDocumentAssistant computed messages triggered:', assistantStore.messages.length);
    return assistantStore.messages;
  });
  const isLoading = computed(() => assistantStore.isLoading);
  const error = computed(() => assistantStore.error);
  const toolExecutionHistory = computed(() => assistantStore.toolExecutionHistory);
  const activeToolExecutions = computed(() => assistantStore.activeToolExecutions);
  
  /**
   * メッセージ送信（現在の設定を動的に読み込み）
   */
  const sendMessage = async (options: {
    message: string;
    useStreaming: boolean;
    useTools: boolean;
  }) => {
    const { message, useStreaming: streaming, useTools } = options;
    
    if (!message.trim() || isLoading.value) {
      return;
    }
    
    // 最新の設定を読み込み
    const currentSettings = loadSettings();
    const actualStreaming = currentSettings.streaming.enabled && streaming;
    const actualTools = currentSettings.mcp.enabled && useTools;
    
    console.log('🌊 Sending message:', { 
      message: message.substring(0, 50), 
      streaming: actualStreaming, 
      useTools: actualTools,
      settingsStreaming: currentSettings.streaming.enabled,
      settingsMcp: currentSettings.mcp.enabled
    });
    
    try {
      if (actualStreaming) {
        // ストリーミングモード（設定で有効な場合のみ）
        if (actualTools) {
          console.log('🛠️ Sending streaming message with MCP tools enabled');
          await assistantStore.sendStreamingMessageWithToolsAndConfig(message);
        } else {
          console.log('📨 Sending regular streaming message');
          await assistantStore.sendStreamingMessageWithConfig(message);
        }
      } else {
        // 通常モード（非ストリーミング）
        console.log('📨 Sending message with standard mode');
        if (actualTools) {
          await assistantStore.sendMessageWithTools(message);
        } else {
          await assistantStore.sendMessageWithConfig(message, {
            provider: 'openai',
            includeHistory: true
          });
        }
      }
      
      // スクロールはUIコンポーネントレベルで制御するため、ここでは呼ばない
    } catch (err) {
      console.error('メッセージ送信エラー:', err);
    }
  };
  
  /**
   * 最下部にスクロール
   */
  const scrollToBottom = async () => {
    await nextTick();
    if (messagesRef?.value) {
      console.log('Scrolling to bottom, scrollHeight:', messagesRef.value.scrollHeight);
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
  };
  
  /**
   * ストリーミングモード更新
   */
  const updateStreamingMode = (streaming: boolean) => {
    useStreaming.value = streaming;
    console.log(`ストリーミングモードを変更: ${streaming}`);
  };
  
  /**
   * ツール使用設定更新
   */
  const updateToolsForMessage = (useTools: boolean) => {
    useToolsForMessage.value = useTools;
    console.log(`ツール使用設定を変更: ${useTools}`);
  };
  
  /**
   * MCPツール有効状態更新
   */
  const updateMCPToolsEnabled = (enabled: boolean) => {
    mcpToolsEnabled.value = enabled;
    console.log(`MCPツール有効状態を変更: ${enabled}`);
    
    // アシスタントストアの設定も更新
    assistantStore.updateMCPToolsConfig({
      enabled,
      executionMode: executionMode.value,
      toolChoice: executionMode.value,
      autoDetect: executionMode.value === 'auto',
      defaultToolChoice: executionMode.value === 'auto' ? 'auto' : 'none',
      enableProgressMonitoring: true,
      enableDetailedLogging: true
    });
  };
  
  /**
   * 実行モード更新
   */
  const updateExecutionMode = (mode: ToolExecutionMode) => {
    executionMode.value = mode;
    console.log(`実行モードを変更: ${mode}`);
    
    // MCPツールが有効な場合はアシスタントストアの設定も更新
    if (mcpToolsEnabled.value) {
      assistantStore.updateMCPToolsConfig({
        enabled: mcpToolsEnabled.value,
        executionMode: mode,
        toolChoice: mode,
        autoDetect: mode === 'auto',
        defaultToolChoice: mode === 'auto' ? 'auto' : 'none',
        enableProgressMonitoring: true,
        enableDetailedLogging: true
      });
    }
  };
  
  /**
   * 利用可能ツール更新
   */
  const updateAvailableTools = (tools: MCPToolConfig[]) => {
    availableTools.value = tools;
    console.log(`利用可能ツールを更新:`, tools.map(t => t.name));
  };
  
  /**
   * ストリーミングタイプ更新
   */
  const updateStreamingType = (type: string) => {
    streamingType.value = type;
    console.log(`ストリーミングタイプを変更: ${type}`);
    
    // ストリーミング設定を更新
    updateStreamingConfig({
      type: type as StreamingType,
      debug: true
    });
  };
  
  /**
   * メッセージクリア
   */
  const clearMessages = () => {
    assistantStore.clearMessages();
    console.log('メッセージをクリアしました');
  };
  
  /**
   * ツール履歴クリア
   */
  const clearToolHistory = () => {
    assistantStore.clearToolExecutionHistory();
    console.log('ツール実行履歴をクリアしました');
  };
  
  // 状態オブジェクト
  const state: DocumentAssistantState = {
    messages: messages.value,
    isLoading: isLoading.value,
    error: error.value,
    useStreaming: useStreaming.value,
    useToolsForMessage: useToolsForMessage.value,
    mcpToolsEnabled: mcpToolsEnabled.value,
    executionMode: executionMode.value,
    availableTools: availableTools.value,
    toolExecutionHistory: toolExecutionHistory.value,
    activeToolExecutions: activeToolExecutions.value,
    streamingType: streamingType.value
  };
  
  // アクションオブジェクト
  const actions: DocumentAssistantActions = {
    sendMessage,
    updateStreamingMode,
    updateToolsForMessage,
    updateMCPToolsEnabled,
    updateExecutionMode,
    updateAvailableTools,
    updateStreamingType,
    scrollToBottom,
    clearMessages,
    clearToolHistory
  };
  
  return {
    // リアクティブな値
    messages,
    isLoading,
    error,
    useStreaming,
    useToolsForMessage,
    mcpToolsEnabled,
    executionMode,
    availableTools,
    toolExecutionHistory,
    streamingType,
    activeToolExecutions,
    
    // 計算されたプロパティ
    currentDocument: computed(() => documentStore.currentDocument),
    
    // アクション
    ...actions,
    
    // 状態とアクションのグループ化されたオブジェクト
    state,
    actions
  };
}