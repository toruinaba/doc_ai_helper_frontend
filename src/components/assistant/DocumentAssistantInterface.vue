<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-title">
        <h2>ドキュメント AI チャット</h2>
        <!-- リポジトリ状態インジケータ -->
        <div v-if="repositoryInfo.repositoryId" class="repository-status">
          <i 
            :class="getRepositoryStatusIcon()" 
            :style="{ color: getRepositoryStatusColor() }"
            v-tooltip="getRepositoryStatusTooltip()"
          />
          <span class="status-text">{{ repositoryInfo.owner }}/{{ repositoryInfo.repo }}</span>
        </div>
      </div>
      
      <!-- ドキュメントコンテキスト設定パネル -->
      <DocumentContextPanel 
        v-if="uiConfig.showDocumentContextPanel"
        :current-document="currentDocument"
        @config-changed="handleDocumentContextChange"
      />
      
      <!-- MCPツール設定パネル -->
      <MCPToolsPanel
        v-if="uiConfig.showMCPToolsPanel"
        :initial-tools-enabled="mcpToolsEnabled"
        :initial-execution-mode="executionMode" 
        :initial-available-tools="availableTools"
        :tool-execution-history="toolExecutionHistory"
        @tools-enabled-changed="updateMCPToolsEnabled"
        @execution-mode-changed="updateExecutionMode"
        @available-tools-changed="updateAvailableTools"
        @clear-history="clearToolHistory"
      />
      
      <!-- デバッグパネル -->
      <DebugPanel 
        v-if="uiConfig.showDebugPanel"
        :initial-streaming-type="streamingType"
        @streaming-type-changed="updateStreamingType"
      />
    </div>
    
    <!-- メッセージ一覧 -->
    <MessagesList
      :key="messages.length"
      ref="chatMessagesRef"
      :messages="messages"
      :is-loading="isLoading"
      :active-tool-executions="activeToolExecutions"
    />
    
    <!-- メッセージ入力フォーム -->
    <MessageInputForm
      :is-loading="isLoading"
      :error="error"
      :mcp-tools-enabled="mcpToolsEnabled"
      :initial-use-streaming="useStreaming"
      :initial-use-tools-for-message="useToolsForMessage"
      @send-message="handleSendMessage"
      @streaming-changed="updateStreamingMode"
      @tools-changed="updateToolsForMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDocumentStore } from '@/stores/document.store';
import { useDocumentAssistant } from '@/composables/useDocumentAssistant';
import { useDocumentContext } from '@/composables/useDocumentContext';
import { getMCPToolsConfig } from '@/utils/mcp-config.util';
import { loadMCPToolsFromBackend } from '@/utils/mcp-tools.util';
import { getUIConfig, getAppDefaultsConfig } from '@/utils/config.util';

// コンポーネントインポート
import DocumentContextPanel from '@/components/assistant/DocumentContextPanel.vue';
import MCPToolsPanel from '@/components/assistant/MCPToolsPanel.vue';
import DebugPanel from '@/components/assistant/DebugPanel.vue';
import MessagesList from '@/components/assistant/MessagesList.vue';
import MessageInputForm from '@/components/assistant/MessageInputForm.vue';

// Type definitions
type ToolExecutionMode = 'auto' | 'manual' | 'required' | 'none';

interface MCPToolConfig {
  name: string;
  description: string;
  enabled: boolean;
}

// Template refs
const chatMessagesRef = ref();

// 設定の取得
const uiConfig = getUIConfig();
const appDefaults = getAppDefaultsConfig();

// Stores
const documentStore = useDocumentStore();

// Document Assistant composable - centralized logic
const {
  // State
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
  currentDocument,
  
  // Actions
  sendMessage,
  updateStreamingMode,
  updateToolsForMessage,
  updateMCPToolsEnabled,
  updateExecutionMode,
  updateAvailableTools,
  updateStreamingType,
  clearMessages,
  clearToolHistory,
  scrollToBottom
} = useDocumentAssistant(chatMessagesRef);

// Document Context composable for repository info
const {
  repositoryInfo,
  getRepositoryStatus,
  checkRepositoryHealth
} = useDocumentContext();

// Debug: Check messages being passed to MessagesList
console.log('DocumentAssistantInterface messages:', messages.value);
console.log('DocumentAssistantInterface messages length:', messages.value.length);

/**
 * メッセージ送信ハンドラー
 */
const handleSendMessage = async (options: {
  message: string;
  useStreaming: boolean;
  useTools: boolean;
}) => {
  await sendMessage(options);
  await scrollToBottom();
};

/**
 * ドキュメントコンテキスト設定変更ハンドラー
 */
const handleDocumentContextChange = (config: any) => {
  console.log('ドキュメントコンテキスト設定が変更されました:', config);
  // 設定は DocumentContextPanel 内で永続化されているため、ここでは何もしない
};

// メッセージが変更されたらスクロール
watch(messages, async () => {
  await scrollToBottom();
}, { deep: true });

// ドキュメントが変更されたら会話をクリア
watch(() => documentStore.currentPath, () => {
  clearMessages();
});

/**
 * リポジトリ状態表示用の関数
 */
function getRepositoryStatusIcon(): string {
  const status = getRepositoryStatus();
  switch (status) {
    case 'healthy': return 'pi pi-check-circle';
    case 'unhealthy': return 'pi pi-times-circle';
    default: return 'pi pi-question-circle';
  }
}

function getRepositoryStatusColor(): string {
  const status = getRepositoryStatus();
  switch (status) {
    case 'healthy': return '#10b981';
    case 'unhealthy': return '#ef4444';
    default: return '#6b7280';
  }
}

function getRepositoryStatusTooltip(): string {
  const status = getRepositoryStatus();
  switch (status) {
    case 'healthy': return 'リポジトリ接続正常';
    case 'unhealthy': return 'リポジトリ接続エラー';
    default: return 'リポジトリ状態不明';
  }
}

// 初期化処理
onMounted(async () => {
  await scrollToBottom();
  
  // バックエンドからMCPツールリストを読み込み
  try {
    console.log('🔧 バックエンドからMCPツールリストを読み込み中...');
    const backendTools = await loadMCPToolsFromBackend();
    updateAvailableTools(backendTools);
    console.log('✅ MCPツールリストを読み込みました:', backendTools.map(t => t.name));
  } catch (error) {
    console.error('❌ MCPツールリストの読み込みに失敗:', error);
    // デフォルトツールリストを使用
  }
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f9f9f9;
  overflow: hidden;
}

.chat-header {
  padding: 1rem;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.chat-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.repository-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-color-secondary);
  
  i {
    font-size: 0.8rem;
  }
  
  .status-text {
    font-weight: 500;
  }
}
</style>