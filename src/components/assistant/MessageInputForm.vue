<template>
  <div class="chat-input">
    <div v-if="uiConfig.showStreamingToggle || (uiConfig.showToolsToggle && mcpToolsEnabled)" class="input-options">
      <div v-if="uiConfig.showStreamingToggle" class="streaming-toggle">
        <Checkbox v-model="useStreaming" :binary="true" inputId="streaming" />
        <label for="streaming" class="ml-2">ストリーミングモード</label>
      </div>
      <div v-if="uiConfig.showToolsToggle && mcpToolsEnabled" class="tools-toggle">
        <Checkbox v-model="useToolsForMessage" :binary="true" inputId="useTools" />
        <label for="useTools" class="ml-2">ツール使用</label>
      </div>
    </div>
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
import Checkbox from 'primevue/checkbox';
import { getUIConfig, getAppDefaultsConfig } from '@/utils/config.util';

// Props
interface Props {
  /** 読み込み中かどうか */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** MCPツールが有効かどうか */
  mcpToolsEnabled?: boolean;
  /** ストリーミングモードの初期値 */
  initialUseStreaming?: boolean;
  /** ツール使用の初期値 */
  initialUseToolsForMessage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  error: null,
  mcpToolsEnabled: false,
  initialUseStreaming: true,
  initialUseToolsForMessage: false
});

// Emits
interface Emits {
  /** メッセージ送信 */
  (event: 'send-message', options: {
    message: string;
    useStreaming: boolean;
    useTools: boolean;
  }): void;
  /** ストリーミングモードが変更された */
  (event: 'streaming-changed', useStreaming: boolean): void;
  /** ツール使用設定が変更された */
  (event: 'tools-changed', useTools: boolean): void;
}

const emit = defineEmits<Emits>();

// 設定の取得
const uiConfig = getUIConfig();
const appDefaults = getAppDefaultsConfig();

// ローカル状態
const newMessage = ref('');
const useStreaming = ref(props.initialUseStreaming ?? appDefaults.streamingMode);
const useToolsForMessage = ref(props.initialUseToolsForMessage ?? appDefaults.toolsEnabled);

/**
 * メッセージ送信
 */
function sendMessage() {
  if (!newMessage.value.trim() || props.isLoading) {
    return;
  }

  emit('send-message', {
    message: newMessage.value.trim(),
    useStreaming: useStreaming.value,
    useTools: useToolsForMessage.value
  });

  // メッセージをクリア
  newMessage.value = '';
}

// 設定変更の監視
import { watch } from 'vue';

watch(useStreaming, (newValue) => {
  emit('streaming-changed', newValue);
});

watch(useToolsForMessage, (newValue) => {
  emit('tools-changed', newValue);
});
</script>

<style scoped>
.chat-input {
  padding: 1rem;
  background-color: white;
  border-top: 1px solid #e0e0e0;
}

.input-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f0f0f0;
  border-top: 1px solid #e0e0e0;
  font-size: 0.8rem;
}

.streaming-toggle {
  display: flex;
  align-items: center;
  color: #555;
}

.tools-toggle {
  display: flex;
  align-items: center;
  color: #555;
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
  transition: all 0.2s ease;
}

/* 送信ボタンの状態をより明確に */
.send-button {
  width: 3rem;
  background-color: #ffffff;
  border-color: #ced4da;
  color: #495057;
  border-radius: 0;
}

.send-button:enabled:hover {
  background-color: #f0f0f0;
  border-color: #ced4da;
  color: #212529;
}

.send-button:disabled {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  color: #a0a0a0;
  cursor: not-allowed;
  opacity: 0.8;
}

.chat-error {
  margin-top: 0.5rem;
}
</style>