<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>ドキュメント AI チャット</h2>
      
      <!-- MCPツール設定パネル -->
      <div class="mcp-tools-panel">
        <div class="mcp-tools-header">
          <Checkbox v-model="mcpToolsEnabled" :binary="true" inputId="mcpTools" />
          <label for="mcpTools" class="ml-2">MCPツール機能を有効にする</label>
          <Button 
            icon="pi pi-cog" 
            size="small" 
            text 
            severity="secondary"
            @click="showMCPToolsConfig = !showMCPToolsConfig"
            v-tooltip.bottom="'MCPツール設定'"
            class="mcp-config-toggle"
          />
          <Button 
            icon="pi pi-history" 
            size="small" 
            text 
            severity="secondary"
            @click="showToolHistory = !showToolHistory"
            v-tooltip.bottom="'ツール実行履歴'"
            class="mcp-history-toggle"
          />
        </div>
        
        <div v-if="showMCPToolsConfig" class="mcp-tools-config">
          <div class="config-section">
            <label class="config-label">利用可能なツール:</label>
            <div class="available-tools">
              <div v-for="tool in availableTools" :key="tool.name" class="tool-item">
                <Checkbox 
                  v-model="tool.enabled" 
                  :binary="true" 
                  :inputId="`tool-${tool.name}`" 
                />
                <label :for="`tool-${tool.name}`" class="tool-label">
                  {{ tool.name }}
                  <span class="tool-description">{{ tool.description }}</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="config-section">
            <label class="config-label">実行モード:</label>
            <div class="execution-mode-options">
              <div class="p-field-radiobutton">
                <RadioButton v-model="executionMode" inputId="auto-execute" name="executionMode" value="auto" />
                <label for="auto-execute">自動実行</label>
              </div>
              <div class="p-field-radiobutton">
                <RadioButton v-model="executionMode" inputId="confirm-execute" name="executionMode" value="confirm" />
                <label for="confirm-execute">確認後実行</label>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="showToolHistory" class="tool-history">
          <div class="tool-history-header">
            <h4>ツール実行履歴</h4>
            <Button 
              icon="pi pi-trash" 
              size="small" 
              text 
              severity="danger"
              @click="clearToolHistory"
              v-tooltip.bottom="'履歴をクリア'"
            />
          </div>
          <div v-if="toolExecutionHistory.length === 0" class="no-history">
            <small>ツール実行履歴がありません</small>
          </div>
          <div v-else class="history-list">
            <div v-for="execution in toolExecutionHistory.slice(-5)" :key="execution.id" class="history-item">
              <div class="history-item-header">
                <span class="history-tool-name">{{ execution.toolCall.function.name }}</span>
                <Tag 
                  :value="execution.status" 
                  :severity="getExecutionStatusSeverity(execution.status)"
                  size="small"
                />
              </div>
              <div class="history-item-time">
                {{ formatHistoryTime(execution.startTime) }}
                {{ execution.endTime ? ` - ${formatHistoryTime(execution.endTime)}` : '' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
    
    <div class="chat-input">
      <div class="input-options">
        <div class="streaming-toggle">
          <Checkbox v-model="useStreaming" :binary="true" inputId="streaming" />
          <label for="streaming" class="ml-2">ストリーミングモード</label>
        </div>
        <div v-if="mcpToolsEnabled" class="tools-toggle">
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
import ProgressBar from 'primevue/progressbar';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import Tag from 'primevue/tag';
import { updateStreamingConfig, StreamingType } from '@/services/api/streaming-config.service';
import { getMCPToolsConfig, logMCPToolsConfig } from '@/utils/mcp-config.util';
import type { ToolExecution, MCPToolConfig, ToolExecutionMode } from '@/services/api/types';

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

// 環境変数からMCPツール設定を取得
const mcpConfig = getMCPToolsConfig();

// MCPツール関連の状態（環境変数から初期化）
const mcpToolsEnabled = ref(mcpConfig.enabled);
const showMCPToolsConfig = ref(false);
const showToolHistory = ref(false);
const useToolsForMessage = ref(mcpConfig.enabled); // MCPツールが有効な場合はデフォルトで使用
const executionMode = ref<ToolExecutionMode>(mcpConfig.executionMode);

// MCPツール設定（環境変数から取得）
const availableTools = ref<MCPToolConfig[]>(mcpConfig.availableTools);

// chatStoreからのツール実行履歴の計算プロパティ
const toolExecutionHistory = computed(() => chatStore.toolExecutionHistory);

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

// MCPツール設定の変更を監視
watch([mcpToolsEnabled, executionMode, availableTools], ([enabled, mode, tools]) => {
  // chatStoreのMCPツール設定を更新
  chatStore.updateMCPToolsConfig({
    enabled,
    autoDetect: mode === 'auto',
    defaultToolChoice: mode === 'auto' ? 'auto' : 'none',
    enableProgressMonitoring: true,
    enableDetailedLogging: true
  });
  console.log('MCPツール設定を更新しました:', { enabled, mode, tools: tools.map(t => t.name) });
}, { deep: true });

// メッセージの変更を監視（デバッグ用）
watch(messages, (newMessages, oldMessages) => {
  console.log('📝 Messages array changed from', oldMessages?.length || 0, 'to', newMessages.length);
  if (newMessages.length > 0) {
    const lastMessage = newMessages[newMessages.length - 1];
    console.log('📝 Last message:', {
      id: lastMessage.id,
      role: lastMessage.role,
      content: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
      contentLength: lastMessage.content.length,
      hasToolCalls: !!lastMessage.toolCalls,
      toolCallsCount: lastMessage.toolCalls?.length || 0
    });
    
    // 空のコンテンツのアシスタントメッセージを詳細調査
    if (lastMessage.role === 'assistant' && lastMessage.content.length === 0) {
      console.warn('🚨 Empty assistant message detected:', {
        messageId: lastMessage.id,
        timestamp: lastMessage.timestamp,
        allMessages: newMessages.map(m => ({
          id: m.id,
          role: m.role,
          contentLength: m.content.length,
          contentPreview: m.content.substring(0, 30)
        }))
      });
    }
  }
  scrollToBottom();
}, { deep: true });

// マークダウンパーサーの設定
marked.setOptions({
  // @ts-ignore - marked v4+では langPrefix オプションは非推奨
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

// MCPツール関連のヘルパー関数
function getToolCallStatus(toolCallId: string): string {
  const execution = chatStore.activeToolExecutions.find(e => e.toolCall.id === toolCallId);
  if (!execution) return 'unknown';
  return execution.status;
}

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

function formatToolArguments(args: string): string {
  try {
    return JSON.stringify(JSON.parse(args), null, 2);
  } catch {
    return args;
  }
}

function getToolExecutionResult(toolCallId: string): any {
  const execution = chatStore.activeToolExecutions.find(e => e.toolCall.id === toolCallId);
  return execution?.result;
}

function formatToolResult(result: any): string {
  if (typeof result === 'string') return result;
  return JSON.stringify(result, null, 2);
}

function getToolExecutionProgress(toolCallId: string) {
  const execution = chatStore.activeToolExecutions.find(e => e.toolCall.id === toolCallId);
  return execution?.progress ? {
    percentage: execution.progress * 100,
    message: `実行中... ${Math.round(execution.progress * 100)}%`
  } : null;
}

// ツール履歴関連のヘルパー関数
function clearToolHistory() {
  chatStore.clearToolExecutionHistory();
}

function getExecutionStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined {
  switch (status) {
    case 'completed': return 'success';
    case 'running': return 'info';
    case 'pending': return 'warning';
    case 'error': return 'danger';
    default: return 'secondary';
  }
}

function formatHistoryTime(time: Date): string {
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ストリーミングメッセージ送信
async function sendStreamingMessage() {
  if (newMessage.value.trim() && !isLoading.value) {
    // 前回のストリーミングコントローラがあれば中止
    if (streamingController.value) {
      streamingController.value.abort();
      streamingController.value = null;
    }
    
    // MCPツールを使用するかどうかの判定
    if (mcpToolsEnabled.value && useToolsForMessage.value) {
      console.log('🛠️ Sending streaming message with MCP tools enabled');
      // MCPツール対応のストリーミングメッセージ送信
      await chatStore.sendStreamingMessageWithTools(newMessage.value.trim());
    } else {
      console.log('📨 Sending regular streaming message');
      // 通常のストリーミングメッセージ送信
      const controller = await chatStore.sendStreamingMessage(newMessage.value.trim());
      streamingController.value = controller;
    }
    newMessage.value = '';
  }
}

// メッセージ送信
function sendMessage() {
  if (useStreaming.value) {
    sendStreamingMessage();
  } else if (newMessage.value.trim() && !isLoading.value) {
    // MCPツールを使用するかどうかの判定
    if (mcpToolsEnabled.value && useToolsForMessage.value) {
      console.log('🛠️ Sending non-streaming message with MCP tools enabled');
      // MCPツール対応のメッセージ送信
      chatStore.sendMessageWithTools(newMessage.value.trim());
    } else {
      console.log('📨 Sending regular non-streaming message');
      // 通常のメッセージ送信（chat.store.tsで適切なメソッドを確認する必要あり）
      // 一旦sendDirectQueryを使用
      chatStore.sendDirectQuery(newMessage.value.trim());
    }
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
  
  // MCPツール設定をデバッグ出力
  if (import.meta.env.DEV) {
    logMCPToolsConfig();
  }
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

/* MCPツールパネルのスタイル */
.mcp-tools-panel {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #f0f8ff;
  border: 1px solid #b3d9ff;
  border-radius: 6px;
  font-size: 0.9rem;
}

.mcp-tools-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mcp-config-toggle {
  margin-left: auto;
}

.mcp-tools-config {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #b3d9ff;
}

.config-section {
  margin-bottom: 1rem;
}

.config-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.available-tools {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0.5rem;
  background-color: white;
}

.tool-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.tool-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.tool-description {
  color: #666;
  font-size: 0.8rem;
  font-style: italic;
}

.execution-mode-options {
  display: flex;
  gap: 1rem;
}

/* MCPツール実行情報のスタイル */
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

.tool-call-item:last-child {
  margin-bottom: 0;
}

.tool-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-size: 0.8rem;
}

/* 入力オプションのスタイル */
.input-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f0f0f0;
  border-top: 1px solid #e0e0e0;
  font-size: 0.8rem;
}

.tools-toggle {
  display: flex;
  align-items: center;
  color: #555;
}

/* ツール履歴のスタイル */
.tool-history {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #b3d9ff;
}

.tool-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.tool-history-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: #2c3e50;
}

.no-history {
  text-align: center;
  color: #6c757d;
  padding: 1rem;
  font-style: italic;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: white;
}

.history-item {
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.history-tool-name {
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: #2c3e50;
}

.history-item-time {
  font-size: 0.75rem;
  color: #6c757d;
}

.mcp-history-toggle {
  margin-left: 0.25rem;
}
</style>
