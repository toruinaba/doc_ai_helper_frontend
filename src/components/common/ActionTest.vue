<template>
  <div class="action-test">
    <Button
      :label="label"
      :icon="computedIcon"
      :loading="loading"
      :disabled="disabled"
      :severity="buttonSeverity"
      size="small"
      @click="handleClick"
      class="action-test-button"
    />
    
    <div v-if="result" class="action-test-result" :class="resultClass">
      <i :class="resultIcon" class="result-icon"></i>
      <span class="result-message">{{ result.message }}</span>
      <Button
        v-if="showClearResult"
        icon="pi pi-times"
        text
        size="small"
        severity="secondary"
        @click="clearResult"
        class="clear-result-button"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
  timestamp?: Date;
}

interface Props {
  /** ボタンラベル */
  label: string;
  /** ボタンアイコン */
  icon?: string;
  /** ローディング状態 */
  loading?: boolean;
  /** 無効状態 */
  disabled?: boolean;
  /** テスト結果 */
  result?: TestResult | null;
  /** 結果をクリアするボタンを表示するか */
  showClearResult?: boolean;
  /** ボタンのセベリティ */
  severity?: 'secondary' | 'success' | 'info' | 'warning' | 'help' | 'danger';
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  result: null,
  showClearResult: true,
  severity: 'secondary'
});

interface Emits {
  /** アクション実行時 */
  (e: 'action'): void;
  /** 結果クリア時 */
  (e: 'clearResult'): void;
}

const emit = defineEmits<Emits>();

const computedIcon = computed(() => {
  if (props.loading) return 'pi pi-spin pi-spinner';
  return props.icon || 'pi pi-play';
});

const buttonSeverity = computed(() => {
  if (props.result?.success === true) return 'success';
  if (props.result?.success === false) return 'danger';
  return props.severity;
});

const resultClass = computed(() => {
  if (!props.result) return '';
  return props.result.success ? 'action-test-result--success' : 'action-test-result--error';
});

const resultIcon = computed(() => {
  if (!props.result) return '';
  return props.result.success ? 'pi pi-check-circle' : 'pi pi-times-circle';
});

function handleClick() {
  if (props.loading || props.disabled) return;
  emit('action');
}

function clearResult() {
  emit('clearResult');
}
</script>

<style scoped>
.action-test {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-sm);
  align-items: flex-start;
}

.action-test-button {
  min-width: 120px;
}

.action-test-result {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-sm);
  border-radius: var(--app-border-radius);
  font-size: var(--app-font-size-sm);
  width: 100%;
  box-sizing: border-box;
}

.action-test-result--success {
  background-color: var(--p-green-50);
  border: 1px solid var(--p-green-200);
  color: var(--p-green-700);
}

.action-test-result--error {
  background-color: var(--p-red-50);
  border: 1px solid var(--p-red-200);
  color: var(--p-red-700);
}

.result-icon {
  flex-shrink: 0;
  font-size: 1.1rem;
}

.result-message {
  flex: 1;
  word-break: break-word;
}

.clear-result-button {
  flex-shrink: 0;
  margin-left: auto;
}

.clear-result-button :deep(.p-button-icon) {
  font-size: 0.875rem;
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .action-test-result--success {
    background-color: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
    color: rgb(74, 222, 128);
  }
  
  .action-test-result--error {
    background-color: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: rgb(248, 113, 113);
  }
}
</style>