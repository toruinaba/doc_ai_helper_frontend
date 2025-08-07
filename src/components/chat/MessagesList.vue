<template>
  <div class="chat-messages" ref="chatMessagesRef">
    <div v-if="messages.length === 0" class="chat-empty-state">
      <div class="empty-state-content">
        <i class="pi pi-comments chat-icon"></i>
        <p>表示中のドキュメントについて質問してください</p>
      </div>
    </div>
    
    <MessageItem
      v-for="message in messages"
      :key="message.id"
      :message="message"
      :active-tool-executions="activeToolExecutions"
    />
    
    <div v-if="isLoading || (messages.length > 0 && messages[messages.length - 1].role === 'user')" class="chat-loading">
      <ProgressSpinner style="width: 30px; height: 30px" />
      <span>応答を生成中...</span>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import ProgressSpinner from 'primevue/progressspinner';
import MessageItem from './MessageItem.vue';

// Props
interface Props {
  /** メッセージ一覧 */
  messages: any[];
  /** 読み込み中かどうか */
  isLoading?: boolean;
  /** アクティブなツール実行一覧 */
  activeToolExecutions?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  activeToolExecutions: () => []
});

// Template refs
const chatMessagesRef = ref<HTMLElement>();

/**
 * メッセージリストの最下部にスクロール
 */
async function scrollToBottom() {
  await nextTick();
  if (chatMessagesRef.value) {
    const element = chatMessagesRef.value;
    element.scrollTop = element.scrollHeight;
  }
}

/**
 * メッセージまたは読み込み状態の変更を監視してスクロール
 */
watch([() => props.messages.length, () => props.isLoading], async (newValues, oldValues) => {
  const [newMessageCount, newIsLoading] = newValues;
  const [oldMessageCount = 0, oldIsLoading = false] = oldValues || [];
  
  // メッセージ数が増えた場合、または読み込み状態が変わった場合にスクロール
  if (newMessageCount > oldMessageCount || newIsLoading !== oldIsLoading) {
    await scrollToBottom();
  }
}, { immediate: true });

// Export scrollToBottom for parent component access
defineExpose({
  scrollToBottom
});
</script>

<style scoped>
.chat-messages {
  height: 100%;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-color-secondary);
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.chat-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
}

.chat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 1rem;
  background-color: var(--surface-100);
  border-radius: 8px;
  color: var(--text-color-secondary);
  align-self: center;
  max-width: 200px;
}

/* スクロールバーのスタイリング */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: var(--surface-100);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: var(--surface-400);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: var(--surface-500);
}
</style>