<template>
  <div class="form-field" :class="{ 'form-field--error': hasError, 'form-field--required': required }">
    <label v-if="label" :for="fieldId" class="form-field-label">
      {{ label }}
      <span v-if="required" class="required-indicator">*</span>
    </label>
    
    <div class="form-field-input">
      <slot :fieldId="fieldId" :hasError="hasError"></slot>
    </div>
    
    <ValidationMessage 
      :error="error" 
      :helpText="helpText"
      :type="messageType"
      :showIcon="showMessageIcon"
    >
      <slot name="message"></slot>
    </ValidationMessage>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ValidationMessage from './ValidationMessage.vue';

interface Props {
  /** フィールドラベル */
  label?: string;
  /** 必須フィールドかどうか */
  required?: boolean;
  /** エラーメッセージ */
  error?: string;
  /** ヘルプテキスト */
  helpText?: string;
  /** フィールドID（自動生成される場合あり） */
  fieldId?: string;
  /** メッセージタイプ */
  messageType?: 'error' | 'help' | 'success' | 'warning';
  /** メッセージアイコンを表示するか */
  showMessageIcon?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  messageType: 'error',
  showMessageIcon: false
});

const hasError = computed(() => Boolean(props.error));

// フィールドIDを自動生成（提供されない場合）
const fieldId = computed(() => {
  if (props.fieldId) return props.fieldId;
  if (props.label) {
    return props.label.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  return `field-${Math.random().toString(36).substr(2, 9)}`;
});
</script>

<style scoped>
.form-field {
  margin-bottom: var(--app-spacing-base);
}

.form-field-label {
  display: block;
  margin-bottom: var(--app-spacing-xs);
  font-weight: 500;
  color: var(--app-text-color);
  font-size: var(--app-font-size-sm);
}

.required-indicator {
  color: var(--p-red-500);
  margin-left: 2px;
}

.form-field-input {
  width: 100%;
}

.form-field--error .form-field-label {
  color: var(--p-red-600);
}

/* スロットで渡されるPrimeVueコンポーネント用のスタイル */
.form-field-input :deep(.p-component) {
  width: 100%;
}

.form-field-input :deep(.p-invalid) {
  border-color: var(--p-red-500);
}

.form-field-input :deep(.p-inputtext) {
  width: 100%;
}

.form-field-input :deep(.p-dropdown) {
  width: 100%;
}

.form-field-input :deep(.p-inputtextarea) {
  width: 100%;
}
</style>