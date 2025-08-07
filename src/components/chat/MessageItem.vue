<template>
  <div class="chat-message" :class="[`message-${message.role}`]">
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import { DateFormatter } from '@/utils/date-formatter.util';

// Props
interface Props {
  /** メッセージデータ */
  message: any;
  /** アクティブなツール実行一覧 */
  activeToolExecutions?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  activeToolExecutions: () => []
});

/**
 * メッセージコンテンツをHTMLにフォーマット
 */
function formatMessageContent(content: string): string {
  return marked(content) as string;
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
 * ツール実行進捗を取得
 */
function getToolExecutionProgress(toolCallId: string): { percentage: number; message: string } | null {
  const execution = props.activeToolExecutions.find(e => e.toolCall.id === toolCallId);
  if (!execution || !execution.progress) return null;
  return execution.progress;
}

/**
 * ツール結果をフォーマット
 */
function formatToolResult(result: any): string {
  if (!result) return '';
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}
</script>

<style scoped>
.chat-message {
  display: flex;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: var(--surface-card);
}

.message-user {
  margin-left: auto;
  background-color: var(--primary-50);
}

.message-assistant {
  margin-right: auto;
  background-color: var(--surface-100);
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  background-color: var(--primary-500);
  color: white;
  flex-shrink: 0;
}

.message-user .message-avatar {
  background-color: var(--blue-500);
  margin-right: 0;
  margin-left: 12px;
  order: 2;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-user .message-content {
  text-align: right;
}

.message-text {
  margin-bottom: 8px;
  line-height: 1.5;
}

.message-time {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-top: 8px;
}

.tool-calls-section {
  margin: 12px 0;
  padding: 8px;
  background-color: var(--surface-50);
  border-radius: 4px;
  border-left: 3px solid var(--primary-500);
}

.tool-calls-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--primary-700);
}

.tool-call-item {
  margin: 8px 0;
  padding: 8px;
  background-color: var(--surface-card);
  border-radius: 4px;
  border: 1px solid var(--surface-border);
}

.tool-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tool-name {
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.tool-arguments {
  margin: 8px 0;
}

.tool-arguments details {
  cursor: pointer;
}

.tool-arguments pre {
  background-color: var(--surface-100);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  overflow-x: auto;
  margin: 4px 0 0 0;
}

.tool-result {
  margin: 8px 0;
}

.tool-result-header {
  font-weight: 600;
  margin-bottom: 4px;
}

.tool-result-content {
  background-color: var(--surface-100);
  padding: 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.tool-progress {
  margin: 8px 0;
}

.tool-progress-bar {
  margin-bottom: 4px;
}

.tool-progress-text {
  color: var(--text-color-secondary);
  font-size: 0.8rem;
}
</style>