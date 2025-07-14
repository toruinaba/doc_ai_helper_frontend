<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>ドキュメント AI チャット</h2>
      
      <!-- ドキュメントコンテキスト設定パネル -->
      <DocumentContextPanel 
        :current-document="currentDocument"
        @config-changed="handleDocumentContextChange"
      />
      
      <!-- MCPツール設定パネル -->
      <MCPToolsPanel
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
        :initial-streaming-type="streamingType"
        @streaming-type-changed="updateStreamingType"
      />
    </div>
    
    <!-- メッセージ一覧 -->
    <MessagesList
      ref="chatMessagesRef"
      :messages="messages"
      :is-loading="isLoading"
      :active-tool-executions="assistantStore.activeToolExecutions"
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
import { getMCPToolsConfig } from '@/utils/mcp-config.util';
import { loadMCPToolsFromBackend } from '@/utils/mcp-tools.util';

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
  assistantStore,
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

.chat-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}
</style>