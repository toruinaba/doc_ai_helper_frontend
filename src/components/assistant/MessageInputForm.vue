<template>
  <div class="chat-input">
    <div class="p-inputgroup">
      <Textarea 
        v-model="newMessage" 
        placeholder="ドキュメントについて質問する..." 
        @keydown.enter.exact.prevent="sendMessage"
        :disabled="isLoading"
        rows="3"
        autoResize
      />
      <Button 
        icon="pi pi-send" 
        @click="sendMessage" 
        :disabled="!newMessage.trim() || isLoading"
        class="send-button"
        :severity="newMessage.trim() && !isLoading ? 'primary' : 'secondary'"
        v-tooltip.bottom="!newMessage.trim() ? '質問を入力してください' : isLoading ? '処理中です' : '送信'"
      />
    </div>
    <div v-if="error" class="chat-error">
      <small class="p-error">{{ error }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { loadSettings } from '@/utils/settings.util';

// Props
interface Props {
  /** 読み込み中かどうか */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null
});

// Emits
interface Emits {
  /** メッセージ送信 */
  (event: 'send-message', options: {
    message: string;
    useStreaming: boolean;
    useTools: boolean;
  }): void;
}

const emit = defineEmits<Emits>();

// 統一設定から設定を取得
const settings = loadSettings();

// ローカル状態
const newMessage = ref('');

/**
 * メッセージ送信
 */
function sendMessage() {
  if (!newMessage.value.trim() || props.isLoading) {
    return;
  }

  emit('send-message', {
    message: newMessage.value.trim(),
    useStreaming: settings.streaming.enabled,
    useTools: settings.mcp.enabled
  });

  // メッセージをクリア
  newMessage.value = '';
}

</script>

<style scoped>
.chat-input {
  padding: var(--app-spacing-base);
  background-color: var(--app-surface-0);
  border-top: 1px solid var(--app-surface-border);
  box-shadow: var(--app-shadow-sm);
}


/* 入力フォームの幅を拡張 */
.p-inputgroup {
  width: 100%;
  display: flex;
}

.p-inputgroup :deep(.p-inputtext),
.p-inputgroup :deep(.p-textarea) {
  width: 100%;
  flex: 1;
}

/* テキストエリアのスタイル調整 */
.p-inputgroup :deep(.p-inputtextarea) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  resize: none;
}

/* 送信ボタンのスタイル調整 */
.p-inputgroup :deep(.p-button) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  transition: var(--app-transition-base);
}

/* 送信ボタンの状態をより明確に */
.send-button {
  width: 3rem;
  background-color: var(--app-surface-0);
  border-color: var(--app-surface-border);
  color: var(--app-text-color-secondary);
  border-radius: 0;
}

.send-button:enabled:hover {
  background-color: var(--app-surface-100);
  border-color: var(--app-primary-color);
  color: var(--app-primary-color);
  transform: translateY(-1px);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--app-surface-200);
  color: var(--app-text-color-muted);
}

.chat-error {
  padding: var(--app-spacing-sm);
  text-align: center;
  background-color: var(--app-surface-50);
  border-radius: var(--app-border-radius-sm);
  margin-top: var(--app-spacing-xs);
}
</style>