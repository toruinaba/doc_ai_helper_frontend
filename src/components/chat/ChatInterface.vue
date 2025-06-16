<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>ドキュメント AI チャット</h2>
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
      <div class="p-inputgroup">
        <InputText 
          v-model="newMessage" 
          placeholder="ドキュメントについて質問する..." 
          @keyup.enter="sendMessage"
          :disabled="isLoading"
        />
        <Button 
          icon="pi pi-send" 
          @click="sendMessage" 
          :disabled="!newMessage.trim() || isLoading"
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
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';

// 状態
const chatStore = useChatStore();
const documentStore = useDocumentStore();
const newMessage = ref('');
const chatMessagesRef = ref<HTMLElement | null>(null);

// 計算された値
const messages = computed(() => chatStore.messages);
const isLoading = computed(() => chatStore.isLoading);
const error = computed(() => chatStore.error);

// マークダウンパーサーの設定
marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-'
});

// メッセージコンテンツをフォーマット（マークダウン対応）
function formatMessageContent(content: string): string {
  return marked.parse(content);
}

// メッセージ時間をフォーマット
function formatMessageTime(timestamp: Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// メッセージ送信
function sendMessage() {
  if (newMessage.value.trim() && !isLoading.value) {
    chatStore.sendMessage(newMessage.value.trim());
    newMessage.value = '';
  }
}

// スクロールを最下部に移動
function scrollToBottom() {
  nextTick(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
    }
  });
}

// メッセージが追加されたらスクロール位置を調整
watch(() => messages.value.length, () => {
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
  border-radius: 4px;
  overflow: hidden;
}

.chat-header {
  padding: 0.75rem 1rem;
  background-color: #1976d2;
  color: white;
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
</style>
