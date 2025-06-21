<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>ドキュメント AI チャット</h2>
      <div v-if="showDebugPanel" class="debug-panel">
        <div class="debug-options">
          <div>
            <div class="option-label">ストリーミング方式：</div>
            <div class="p-field-radiobutton">
              <RadioButton v-model="streamingType" inputId="auto" name="streamingType" value="auto" />
              <label for="auto">自動検出</label>
            </div>
            <div class="p-field-radiobutton">
              <RadioButton v-model="streamingType" inputId="eventsource" name="streamingType" value="eventsource" />
              <label for="eventsource">EventSource</label>
            </div>
            <div class="p-field-radiobutton">
              <RadioButton v-model="streamingType" inputId="fetch" name="streamingType" value="fetch" />
              <label for="fetch">fetch API</label>
            </div>
            <div class="debug-info">
              現在の設定: {{ streamingType }} 
              <span v-if="streamingType === 'fetch'" class="recommended">(推奨)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="chat-messages" ref="chatMessagesRef">
      <div v-if="messages.length === 0" class="chat-empty-state">
        <div class="empty-state-content">
          <i class="pi pi-comments chat-icon"></i>
          <p>表示中のドキュメントについて質問してください</p>
        </div>
      </div>
      
      <div v-for="message in messages" 
           :key="message.id" 
           class="chat-message"
           :class="[`message-${message.role}`]">
        <div class="message-avatar">
          <i v-if="message.role === 'user'" class="pi pi-user"></i>
          <i v-else-if="message.role === 'assistant'" class="pi pi-cog"></i>
          <i v-else class="pi pi-info-circle"></i>
        </div>
        <div class="message-content">
          <div class="message-text" v-html="formatMessageContent(message.content)"></div>
          <div class="message-time">{{ formatMessageTime(message.timestamp) }}</div>
        </div>
      </div>
      
      <div v-if="isLoading" class="chat-loading">
        <ProgressSpinner style="width: 30px; height: 30px" />
        <span>応答を生成中...</span>
      </div>
    </div>
    
    <div class="chat-input">
      <div class="streaming-toggle">
        <Checkbox v-model="useStreaming" :binary="true" inputId="streaming" />
        <label for="streaming" class="ml-2">ストリーミングモード</label>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/chat.store';
import { useDocumentStore } from '@/stores/document.store';
import { marked } from 'marked';
import hljs from 'highlight.js';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import { updateStreamingConfig, StreamingType } from '@/services/api/streaming-config.service';

// 状態
const chatStore = useChatStore();
const documentStore = useDocumentStore();
const newMessage = ref('');
const chatMessagesRef = ref<HTMLElement | null>(null);

// 計算された値
const messages = computed(() => chatStore.messages);
const isLoading = computed(() => chatStore.isLoading);
const error = computed(() => chatStore.error);

// ストリーミング有効フラグ
const useStreaming = ref(true);
const streamingController = ref<{ abort: () => void } | null>(null);

// デバッグパネル
const showDebugPanel = ref(import.meta.env.DEV || import.meta.env.VITE_SHOW_DEBUG_PANEL === 'true');
const streamingType = ref<string>(StreamingType.FETCH);

// ストリーミングタイプが変更されたときの処理
watch(streamingType, (newType) => {
  // 選択に基づいてストリーミング設定を更新
  updateStreamingConfig({
    type: newType as StreamingType,
    debug: true
  });
  console.log(`ストリーミングタイプを変更しました: ${newType}`);
});

// メッセージの変更を監視（デバッグ用）
watch(messages, (newMessages, oldMessages) => {
  console.log('Messages array changed from', oldMessages?.length, 'to', newMessages.length);
  if (newMessages.length > 0) {
    const lastMessage = newMessages[newMessages.length - 1];
    console.log('Last message:', lastMessage);
  }
}, { deep: true });

// マークダウンパーサーの設定
// @ts-ignore
marked.setOptions({
  langPrefix: 'hljs language-'
});

// メッセージコンテンツをフォーマット（マークダウン対応）
function formatMessageContent(content: string): string {
  console.log('Formatting message content:', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
  // @ts-ignore
  const formatted = marked(content) as string;
  console.log('Formatted result:', formatted.substring(0, 100) + (formatted.length > 100 ? '...' : ''));
  return formatted;
}

// メッセージ時間をフォーマット
function formatMessageTime(timestamp: Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ストリーミングメッセージ送信
async function sendStreamingMessage() {
  if (newMessage.value.trim() && !isLoading.value) {
    // 前回のストリーミングコントローラがあれば中止
    if (streamingController.value) {
      streamingController.value.abort();
      streamingController.value = null;
    }
    
    // ストリーミングメッセージ送信
    streamingController.value = await chatStore.sendStreamingMessage(newMessage.value.trim());
    newMessage.value = '';
  }
}

// メッセージ送信
function sendMessage() {
  if (useStreaming.value) {
    sendStreamingMessage();
  } else if (newMessage.value.trim() && !isLoading.value) {
    chatStore.sendMessage(newMessage.value.trim());
    newMessage.value = '';
  }
}

// スクロールを最下部に移動
function scrollToBottom() {
  console.log('scrollToBottom called');
  nextTick(() => {
    if (chatMessagesRef.value) {
      console.log('Scrolling to bottom, scrollHeight:', chatMessagesRef.value.scrollHeight);
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
    } else {
      console.log('chatMessagesRef is null, cannot scroll');
    }
  });
}

// メッセージが追加されたらスクロール位置を調整
watch(() => messages.value.length, (newLength, oldLength) => {
  console.log('Message count changed from', oldLength, 'to', newLength);
  scrollToBottom();
});

// ドキュメントが変更されたら会話をクリア
watch(() => documentStore.currentPath, () => {
  chatStore.clearMessages();
});

// コンポーネントマウント時の処理
onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f9f9f9;
  /*border-radius: 0px;*/
  overflow: hidden;
}

.chat-header {
  padding: 0.75rem 1rem;
  background-color: #e0e0e0;
  color: black;
}

.chat-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-message {
  display: flex;
  max-width: 85%;
  gap: 0.5rem;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-assistant, .message-system {
  align-self: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-user .message-avatar {
  background-color: #1976d2;
  color: white;
}

.message-assistant .message-avatar {
  background-color: #4caf50;
  color: white;
}

.message-system .message-avatar {
  background-color: #ff9800;
  color: white;
}

.message-content {
  background-color: white;
  padding: 0.75rem;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message-user .message-content {
  background-color: #e3f2fd;
}

.message-system .message-content {
  background-color: #fff3e0;
}

.message-time {
  font-size: 0.7rem;
  color: #757575;
  text-align: right;
  margin-top: 0.25rem;
}

.chat-input {
  padding: 1rem;
  background-color: white;
  border-top: 1px solid #e0e0e0;
}

/* 入力フォームの幅を拡張 */
.chat-input .p-inputgroup {
  width: 100%;
  display: flex;
}

.chat-input .p-inputtext,
.chat-input .p-textarea {
  width: 100%;
  flex: 1;
}

/* テキストエリアのスタイル調整 */
.chat-input .p-inputgroup .p-inputtextarea {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  resize: none;
}

/* 送信ボタンのスタイル調整 */
.chat-input .p-inputgroup .p-button {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

/* 送信ボタンの状態をより明確に */
.chat-input .p-inputgroup .send-button {
  width: 3rem;
  background-color: #ffffff;
  border-color: #ced4da;
  color: #495057;
  border-radius: 0;
}

.chat-input .p-inputgroup .send-button:enabled:hover {
  background-color: #f0f0f0;
  border-color: #ced4da;
  color: #212529;
}

.chat-input .p-inputgroup .send-button:disabled {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  color: #a0a0a0;
  cursor: not-allowed;
  opacity: 0.8;
}

.chat-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  color: #666;
}

.chat-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #757575;
  text-align: center;
  padding: 2rem;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.chat-icon {
  font-size: 3rem;
  color: #bdbdbd;
}

.chat-error {
  margin-top: 0.5rem;
}

/* Markdown スタイル上書き */
.message-text :deep(pre) {
  background-color: #f5f5f5;
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
}

.message-text :deep(code) {
  font-family: monospace;
}

.message-text :deep(p) {
  margin: 0.5rem 0;
}

.message-text :deep(ul), .message-text :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.message-text :deep(img) {
  max-width: 100%;
  height: auto;
}

.message-text :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.message-text :deep(a:hover) {
  text-decoration: underline;
}

.message-text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}

.message-text :deep(th), .message-text :deep(td) {
  border: 1px solid #e0e0e0;
  padding: 0.5rem;
}

.message-text :deep(blockquote) {
  border-left: 4px solid #e0e0e0;
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  color: #757575;
}

.streaming-toggle {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  color: #555;
  background-color: #f0f0f0;
  border-top: 1px solid #e0e0e0;
}

/* デバッグパネルのスタイル */
.debug-panel {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.8rem;
}

.debug-options {
  display: flex;
  flex-direction: column;
}

.option-label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.p-field-radiobutton {
  display: flex;
  align-items: center;
  margin: 0.25rem 0;
}

.p-field-radiobutton label {
  margin-left: 0.5rem;
}

.debug-info {
  margin-top: 0.5rem;
  font-size: 0.9em;
  color: #666;
}

.recommended {
  color: #2196F3;
  font-weight: bold;
}
</style>
