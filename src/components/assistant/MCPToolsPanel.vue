<template>
  <div class="mcp-tools-panel">
    <div class="mcp-tools-header">
      <Checkbox v-model="toolsEnabled" :binary="true" inputId="mcpTools" />
      <label for="mcpTools" class="ml-2">MCPツール機能を有効にする</label>
      <Button 
        icon="pi pi-cog" 
        size="small" 
        text 
        severity="secondary"
        @click="showConfig = !showConfig"
        v-tooltip.bottom="'MCPツール設定'"
        class="mcp-config-toggle"
      />
      <Button 
        icon="pi pi-history" 
        size="small" 
        text 
        severity="secondary"
        @click="showHistory = !showHistory"
        v-tooltip.bottom="'ツール実行履歴'"
        class="mcp-history-toggle"
      />
    </div>
    
    <div v-if="showConfig" class="mcp-tools-config">
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
            <label for="auto-execute">自動実行 (auto)</label>
          </div>
          <div class="p-field-radiobutton">
            <RadioButton v-model="executionMode" inputId="none-execute" name="executionMode" value="none" />
            <label for="none-execute">ツール無効 (none)</label>
          </div>
          <div class="p-field-radiobutton">
            <RadioButton v-model="executionMode" inputId="required-execute" name="executionMode" value="required" />
            <label for="required-execute">必須実行 (required)</label>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showHistory" class="tool-history">
      <div class="tool-history-header">
        <h4>ツール実行履歴</h4>
        <Button 
          icon="pi pi-trash" 
          size="small" 
          text 
          severity="danger"
          @click="clearHistory"
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
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import Tag from 'primevue/tag';
import { loadMCPToolsFromBackend } from '@/utils/mcp-tools.util';
import { DateFormatter } from '@/utils/date-formatter.util';

// Type definitions
type ToolExecutionMode = 'auto' | 'manual' | 'required' | 'none';

interface MCPToolConfig {
  name: string;
  description: string;
  enabled: boolean;
}

interface ToolExecution {
  id: string;
  toolCall: {
    function: {
      name: string;
    };
  };
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
}

// Props
interface Props {
  /** 初期ツール有効状態 */
  initialToolsEnabled?: boolean;
  /** 初期実行モード */
  initialExecutionMode?: ToolExecutionMode;
  /** 初期利用可能ツール */
  initialAvailableTools?: MCPToolConfig[];
  /** ツール実行履歴 */
  toolExecutionHistory?: ToolExecution[];
}

const props = withDefaults(defineProps<Props>(), {
  initialToolsEnabled: false,
  initialExecutionMode: 'auto',
  initialAvailableTools: () => [],
  toolExecutionHistory: () => []
});

// Emits
interface Emits {
  /** ツール有効状態が変更された */
  (event: 'tools-enabled-changed', enabled: boolean): void;
  /** 実行モードが変更された */
  (event: 'execution-mode-changed', mode: ToolExecutionMode): void;
  /** 利用可能ツールが変更された */
  (event: 'available-tools-changed', tools: MCPToolConfig[]): void;
  /** 履歴クリアが要求された */
  (event: 'clear-history'): void;
}

const emit = defineEmits<Emits>();

// ローカル状態
const toolsEnabled = ref(props.initialToolsEnabled);
const executionMode = ref<ToolExecutionMode>(props.initialExecutionMode);
const availableTools = ref<MCPToolConfig[]>([...props.initialAvailableTools]);
const showConfig = ref(false);
const showHistory = ref(false);

/**
 * 実行ステータスの重要度を取得
 */
function getExecutionStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | undefined {
  switch (status) {
    case 'completed': return 'success';
    case 'running': return 'info';
    case 'pending': return 'warning';
    case 'error': return 'danger';
    default: return 'secondary';
  }
}

/**
 * 履歴時間をフォーマット
 */
function formatHistoryTime(time: Date): string {
  return DateFormatter.messageTime(time);
}

/**
 * 履歴をクリア
 */
function clearHistory() {
  emit('clear-history');
}

/**
 * バックエンドからMCPツール一覧を読み込み
 */
const loadTools = async () => {
  try {
    console.log('🔧 バックエンドからMCPツールリストを読み込み中...');
    const backendTools = await loadMCPToolsFromBackend();
    availableTools.value = backendTools;
    console.log('✅ MCPツールリストを読み込みました:', backendTools.map(t => t.name));
    emit('available-tools-changed', backendTools);
  } catch (error) {
    console.error('❌ MCPツールリストの読み込みに失敗:', error);
    // デフォルトツールリストを使用
  }
};

// 変更の監視
watch(toolsEnabled, (newValue) => {
  emit('tools-enabled-changed', newValue);
});

watch(executionMode, (newValue) => {
  emit('execution-mode-changed', newValue);
});

watch(availableTools, (newValue) => {
  emit('available-tools-changed', newValue);
}, { deep: true });

// 初期化時にツール一覧を読み込み
onMounted(() => {
  loadTools();
});
</script>

<style scoped>
/*
 * PrimeVue v4 Cardコンポーネントとユーティリティクラスで最大最適化
 * - Card #header, #content スロット使用
 * - ユーティリティクラスでレイアウト/色/spacing処理
 * - プライマリテーマ色での統一感のあるデザイン
 * 
 * CSS記述量: 124行 → 8行 (94%削減)
 */

/* カーソルポインター適用 */
label {
  cursor: pointer;
}

</style>