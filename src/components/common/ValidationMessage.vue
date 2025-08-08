<template>
  <div v-if="error || helpText || $slots.default" class="validation-message">
    <small v-if="error" class="validation-error" :class="`p-${type}`">
      <i v-if="showIcon && errorIcon" :class="errorIcon" class="validation-icon"></i>
      {{ error }}
    </small>
    <small v-else-if="helpText" class="validation-help">
      <i v-if="showIcon && helpIcon" :class="helpIcon" class="validation-icon"></i>
      {{ helpText }}
    </small>
    <small v-else-if="$slots.default" class="validation-content">
      <slot></slot>
    </small>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** エラーメッセージ */
  error?: string;
  /** ヘルプテキスト */
  helpText?: string;
  /** メッセージタイプ */
  type?: 'error' | 'help' | 'success' | 'warning';
  /** アイコンを表示するか */
  showIcon?: boolean;
  /** カスタムエラーアイコン */
  errorIcon?: string;
  /** カスタムヘルプアイコン */
  helpIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'error',
  showIcon: false,
  errorIcon: 'pi pi-exclamation-triangle',
  helpIcon: 'pi pi-info-circle'
});
</script>

<style scoped>
.validation-message {
  margin-top: var(--app-spacing-xs);
  display: block;
}

.validation-error {
  color: var(--p-red-500);
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}

.validation-help {
  color: var(--app-text-color-secondary);
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}

.validation-content {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}

.validation-icon {
  font-size: 0.875rem;
  flex-shrink: 0;
}

/* PrimeVue compatible classes */
.p-error {
  color: var(--p-red-500);
}

.p-help {
  color: var(--app-text-color-secondary);
}

.p-success {
  color: var(--p-green-500);
}

.p-warning {
  color: var(--p-orange-500);
}
</style>