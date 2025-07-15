<template>
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
        
        <!-- MCPツール実行情報の表示 -->
        <div v-if="message.toolCalls && message.toolCalls.length > 0" class="tool-calls-section">
          <div class="tool-calls-header">
            <i class="pi pi-wrench"></i>
            <span>ツール実行</span>
          </div>
          <div v-for="toolCall in message.toolCalls" :key="toolCall.id" class="tool-call-item">
            <div class="tool-call-header">
              <span class="tool-name">{{ toolCall.function?.name || 'Unknown Tool' }}</span>
              <Tag 
                :value="getToolCallStatus(toolCall.id)" 
                :severity="getToolCallStatusSeverity(toolCall.id)"
                class="tool-status"
              />
            </div>
            <div v-if="toolCall.function?.arguments" class="tool-arguments">
              <details>
                <summary>引数</summary>
                <pre>{{ formatToolArguments(toolCall.function.arguments) }}</pre>
              </details>
            </div>
            <div v-if="getToolExecutionResult(toolCall.id)" class="tool-result">
              <div class="tool-result-header">実行結果:</div>
              <div class="tool-result-content">
                {{ formatToolResult(getToolExecutionResult(toolCall.id)) }}
              </div>
            </div>
            <div v-if="getToolExecutionProgress(toolCall.id)" class="tool-progress">
              <ProgressBar 
                :value="getToolExecutionProgress(toolCall.id)?.percentage || 0" 
                class="tool-progress-bar"
              />
              <small class="tool-progress-text">
                {{ getToolExecutionProgress(toolCall.id)?.message || '実行中...' }}
              </small>
            </div>
          </div>
        </div>
        
        <div class="message-time">{{ formatMessageTime(message.timestamp) }}</div>
      </div>
    </div>
    
    <div v-if="isLoading" class="chat-loading">
      <ProgressSpinner style="width: 30px; height: 30px" />
      <span>応答を生成中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { marked } from 'marked';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';
import { DateFormatter } from '@/utils/date-formatter.util';

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

// Debug: Check if props are being received
console.log('MessagesList received props.messages:', props.messages);
console.log('MessagesList messages length:', props.messages.length);

// Template refs
const chatMessagesRef = ref<HTMLElement>();

/**
 * メッセージコンテンツをHTMLにフォーマット
 */
function formatMessageContent(content: string): string {
  console.log('Formatting message content:', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
  const formatted = marked(content) as string;
  console.log('Formatted result:', formatted.substring(0, 100) + (formatted.length > 100 ? '...' : ''));
  return formatted;
}

/**
 * メッセージ時間をフォーマット
 */
function formatMessageTime(timestamp: Date): string {
  return DateFormatter.messageTime(timestamp);
}

/**
 * ツール呼び出しのステータスを取得
 */
function getToolCallStatus(toolCallId: string): string {
  const execution = props.activeToolExecutions.find(e => e.toolCall.id === toolCallId);
  if (!execution) return 'unknown';
  return execution.status;
}

/**
 * ツール呼び出しステータスの重要度を取得
 */
function getToolCallStatusSeverity(toolCallId: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined {
  const status = getToolCallStatus(toolCallId);
  switch (status) {
    case 'completed': return 'success';
    case 'running': return 'info';
    case 'pending': return 'warning';
    case 'error': return 'danger';
    default: return 'secondary';
  }
}

/**
 * ツール引数をフォーマット
 */
function formatToolArguments(args: string): string {
  try {
    return JSON.stringify(JSON.parse(args), null, 2);
  } catch {
    return args;
  }
}

/**
 * ツール実行結果を取得
 */
function getToolExecutionResult(toolCallId: string): any {
  const execution = props.activeToolExecutions.find(e => e.toolCall.id === toolCallId);
  return execution?.result;
}

/**
 * ツール実行結果をフォーマット
 */
function formatToolResult(result: any): string {
  if (typeof result === 'string') return result;
  return JSON.stringify(result, null, 2);
}

/**
 * ツール実行進捗を取得
 */
function getToolExecutionProgress(toolCallId: string) {
  const execution = props.activeToolExecutions.find(e => e.toolCall.id === toolCallId);
  return execution?.progress ? {
    percentage: execution.progress * 100,
    message: `実行中... ${Math.round(execution.progress * 100)}%`
  } : null;
}

/**
 * 最下部にスクロール
 */
const scrollToBottom = async () => {
  await nextTick();
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
  }
};

// 外部からアクセス可能にする
defineExpose({
  scrollToBottom
});
</script>

<style scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.chat-message {
  display: flex;
  max-width: 85%;
  gap: 0.5rem;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-assistant, 
.message-system {
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

.message-text :deep(ul), 
.message-text :deep(ol) {
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

.message-text :deep(th), 
.message-text :deep(td) {
  border: 1px solid #e0e0e0;
  padding: 0.5rem;
}

.message-text :deep(blockquote) {
  border-left: 4px solid #e0e0e0;
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  color: #757575;
}

.tool-calls-section {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.tool-calls-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.75rem;
}

.tool-call-item {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.tool-call-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.tool-name {
  font-weight: 600;
  color: #2c3e50;
  font-family: monospace;
}

.tool-status {
  font-size: 0.8rem;
}

.tool-arguments {
  margin: 0.5rem 0;
}

.tool-arguments details {
  font-size: 0.85rem;
}

.tool-arguments summary {
  cursor: pointer;
  color: #007bff;
  margin-bottom: 0.25rem;
}

.tool-arguments pre {
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 3px;
  border: 1px solid #e9ecef;
  font-size: 0.8rem;
  max-height: 120px;
  overflow-y: auto;
}

.tool-result {
  margin: 0.5rem 0;
}

.tool-result-header {
  font-weight: 600;
  color: #28a745;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
}

.tool-result-content {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  padding: 0.5rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.8rem;
  white-space: pre-wrap;
  max-height: 120px;
  overflow-y: auto;
}

.tool-progress {
  margin: 0.5rem 0;
}

.tool-progress-bar {
  margin-bottom: 0.25rem;
}

.tool-progress-text {
  color: #6c757d;
  font-style: italic;
}

.chat-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  padding: 1rem;
  color: #666;
}
</style>