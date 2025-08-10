<template>
  <div 
    class="flex mb-6 items-start gap-3"
    :class="message.role === 'user' ? 'flex-row-reverse' : ''"
  >
    <!-- ユーザーアバター -->
    <Avatar 
      v-if="message.role === 'user'" 
      icon="pi pi-user"
      class="bg-blue-500 text-white flex-shrink-0"
      size="normal"
      shape="circle"
    />
    <!-- アシスタントアバター -->
    <Avatar 
      v-else-if="message.role === 'assistant'" 
      icon="pi pi-sparkles"
      class="bg-green-500 text-white flex-shrink-0"
      size="normal"  
      shape="circle"
    />
    <!-- システムアバター -->
    <Avatar 
      v-else 
      icon="pi pi-info-circle"
      class="bg-surface-400 text-white flex-shrink-0"
      size="normal"
      shape="circle"
    />
    
    <!-- メッセージバブル -->
    <div 
      class="max-w-3xl min-w-48 rounded-2xl px-5 py-4 shadow-sm border"
      :class="[
        message.role === 'user' 
          ? 'bg-primary text-primary-contrast border-primary rounded-br-sm' 
          : 'bg-surface-0 text-surface-900 border-surface-200 rounded-bl-sm'
      ]"
    >
      <div class="message-text mb-2" v-html="formatMessageContent(message.content)"></div>
      
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
      
      <div class="text-xs opacity-70 mt-1">{{ formatMessageTime(message.timestamp) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import Avatar from 'primevue/avatar';
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
/*
 * PrimeVue v4 Avatarコンポーネントとユーティリティクラスで最大最適化
 * - Avatar コンポーネント使用
 * - Flexbox/Grid/Spacing/Color ユーティリティクラス活用
 * - PrimeVueデザイントークン統合 (bg-primary, bg-surface-0等)
 * 
 * CSS記述量: 296行 → 28行 (91%削減)
 */

/* メッセージ内のマークダウンコンテンツスタイル */
.message-text :deep(p) {
  margin: 0.25rem 0;
  line-height: 1.5;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.message-text :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

/* ツール関連はPrimeVueコンポーネント使用のため最小限CSS */
.tool-calls-section {
  margin: 0.75rem 0;
  padding: 0.5rem;
  background: var(--p-surface-50);
  border-radius: 4px;
  border-left: 3px solid var(--p-primary-500);
}
</style>