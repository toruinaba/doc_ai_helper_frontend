<template>
  <Dropdown
    :modelValue="modelValue"
    :options="availableServices"
    :optionLabel="(option: ServiceOption) => option.label"
    :optionValue="(option: ServiceOption) => option.value"
    :placeholder="placeholder"
    :class="{ 'p-invalid': hasError }"
    :disabled="disabled"
    :loading="loading"
    @update:modelValue="handleUpdate"
    @change="$emit('change', $event)"
    @focus="$emit('focus', $event)"
    @blur="$emit('blur', $event)"
  >
    <template #value="slotProps">
      <div v-if="slotProps.value" class="service-option">
        <i :class="getServiceIcon(slotProps.value)" class="service-icon"></i>
        <span>{{ getServiceLabel(slotProps.value) }}</span>
      </div>
      <span v-else class="service-placeholder">{{ placeholder }}</span>
    </template>
    
    <template #option="slotProps">
      <div class="service-option">
        <i :class="getServiceIcon(slotProps.option.value)" class="service-icon"></i>
        <span>{{ slotProps.option.label }}</span>
        <span v-if="slotProps.option.description" class="service-description">
          {{ slotProps.option.description }}
        </span>
      </div>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dropdown from 'primevue/dropdown';
import type { components } from '@/services/api/types.auto';

// 自動生成型のエイリアス
type GitServiceType = components['schemas']['GitServiceType'];

interface ServiceOption {
  value: GitServiceType;
  label: string;
  description?: string;
  icon?: string;
}

interface Props {
  /** 選択されたサービス */
  modelValue: GitServiceType | null | undefined;
  /** エラー状態 */
  error?: string;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 無効状態 */
  disabled?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** カスタムサービスを表示するか */
  showCustomServices?: boolean;
  /** 利用可能なサービスをカスタマイズ */
  customServices?: ServiceOption[];
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Gitサービスを選択...',
  disabled: false,
  loading: false,
  showCustomServices: true
});

interface Emits {
  (e: 'update:modelValue', value: GitServiceType): void;
  (e: 'change', event: any): void;
  (e: 'focus', event: Event): void;
  (e: 'blur', event: Event): void;
}

const emit = defineEmits<Emits>();

const hasError = computed(() => Boolean(props.error));

// デフォルトのサービス選択肢
const defaultServices: ServiceOption[] = [
  {
    value: 'github',
    label: 'GitHub',
    description: 'GitHub.com',
    icon: 'pi pi-github'
  },
  {
    value: 'gitlab',
    label: 'GitLab',
    description: 'GitLab.com',
    icon: 'pi pi-gitlab'
  }
];

const availableServices = computed(() => {
  if (props.customServices) {
    return props.customServices;
  }
  
  let services = [...defaultServices];
  
  if (props.showCustomServices) {
    services.push({
      value: 'forgejo',
      label: 'Forgejo',
      description: 'カスタムGitサービス',
      icon: 'pi pi-cog'
    });
  }
  
  return services;
});

function handleUpdate(value: GitServiceType) {
  emit('update:modelValue', value);
}

function getServiceIcon(service: GitServiceType): string {
  const serviceOption = availableServices.value.find(s => s.value === service);
  return serviceOption?.icon || 'pi pi-code-branch';
}

function getServiceLabel(service: GitServiceType): string {
  const serviceOption = availableServices.value.find(s => s.value === service);
  return serviceOption?.label || service;
}
</script>

<style scoped>
.service-option {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  width: 100%;
}

.service-icon {
  color: var(--app-primary-color);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.service-description {
  font-size: var(--app-font-size-xs);
  color: var(--app-text-color-secondary);
  margin-left: auto;
}

.service-placeholder {
  color: var(--app-text-color-muted);
}

/* PrimeVue Dropdownのカスタマイズ */
:deep(.p-dropdown-label) {
  display: flex;
  align-items: center;
}

:deep(.p-dropdown-item) {
  padding: var(--app-spacing-sm);
}

:deep(.p-dropdown-item:hover) {
  background-color: var(--app-surface-100);
}
</style>