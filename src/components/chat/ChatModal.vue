<template>
  <div class="chat-modal">
    <!-- チャットヘッダー -->
    <div class="chat-header">
      <div class="header-title">
        <h3>ドキュメント AI チャット</h3>
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
    </div>
    
    <!-- メッセージ一覧 -->
    <MessagesList
      :key="messages.length"
      ref="chatMessagesRef"
      :messages="messages"
      :is-loading="isLoading"
      :active-tool-executions="activeToolExecutions"
      class="modal-messages"
    />
    
    <!-- メッセージ入力フォーム -->
    <MessageInputForm
      :is-loading="isLoading"
      :error="error"
      @send-message="handleSendMessage"
      class="modal-input"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDocumentStore } from '@/stores/document.store';
import { useDocumentAssistant } from '@/composables/useDocumentAssistant';
import { useDocumentContext } from '@/composables/useDocumentContext';

// コンポーネントインポート
import MessagesList from './MessagesList.vue';
import MessageInputForm from './MessageInputForm.vue';

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
  activeToolExecutions,
  currentDocument,
  
  // Actions
  sendMessage,
  scrollToBottom
} = useDocumentAssistant(chatMessagesRef);

// Document Context composable for repository info
const {
  repositoryInfo
} = useDocumentContext();

// Repository status helper functions
const getRepositoryStatusIcon = () => 'pi pi-github';
const getRepositoryStatusColor = () => '#28a745';
const getRepositoryStatusTooltip = () => 'Repository connected';

/**
 * メッセージ送信処理
 */
async function handleSendMessage(options: { 
  message: string; 
  useStreaming: boolean; 
  useTools: boolean; 
}) {
  await sendMessage(options);
}

// コンポーネントマウント時にスクロール
onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
.chat-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--app-surface-50);
}

.chat-header {
  padding: var(--app-spacing-base) var(--app-spacing-lg);
  background-color: var(--app-surface-0);
  border-bottom: 1px solid var(--app-surface-border);
  flex-shrink: 0;
}

.header-title h3 {
  margin: 0 0 var(--app-spacing-xs) 0;
  color: var(--app-text-color);
  font-size: var(--app-font-size-lg);
  font-weight: 600;
}

.repository-status {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
}

.repository-status i {
  font-size: 0.8rem;
}

.status-text {
  font-weight: 500;
}

.modal-messages {
  flex: 1;
  overflow-y: auto;
  background-color: var(--app-surface-50);
}

.modal-input {
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: var(--z-index-base);
}

/* モーダル内でのメッセージ表示調整 */
.modal-messages :deep(.chat-messages) {
  padding-bottom: var(--app-spacing-base); /* インプットボックス分の余白を削減 */
}
</style>