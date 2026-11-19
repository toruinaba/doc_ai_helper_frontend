<template>
  <FormSection title="アクセス設定">
    <div class="form-checkbox">
      <Checkbox 
        :id="'is-public'"
        :modelValue="modelValue.is_public"
        :binary="true"
        @update:modelValue="updateField('is_public', $event)"
      />
      <label for="is-public">パブリックリポジトリ</label>
    </div>

    <!-- プライベートリポジトリの場合のアクセストークン -->
    <FormField
      v-if="!modelValue.is_public"
      label="アクセストークン"
      :required="true"
      :error="errors.access_token"
      helpText="プライベートリポジトリへのアクセスに必要"
      fieldId="access_token"
    >
      <template #default="{ fieldId }">
        <Password
          :id="fieldId"
          :modelValue="modelValue.access_token"
          :class="{ 'p-invalid': errors.access_token }"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          :toggleMask="true"
          :feedback="false"
          @update:modelValue="updateField('access_token', $event)"
          @blur="$emit('validate', 'access_token')"
        />
      </template>
    </FormField>

    <!-- 接続テスト -->
    <ActionTest
      v-if="showConnectionTest"
      label="接続テスト"
      icon="pi pi-link"
      :loading="testingConnection"
      :result="connectionTestResult"
      :disabled="!canTestConnection"
      @action="$emit('testConnection')"
    />
  </FormSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Checkbox, Password } from 'primevue'
import FormSection from '@/components/common/FormSection.vue'
import FormField from '@/components/common/FormField.vue'
import ActionTest from '@/components/common/ActionTest.vue'
import type { components } from '@/services/api/types.auto'

type RepositoryCreate = components['schemas']['RepositoryCreate']

interface ConnectionTestResult {
  success: boolean
  message: string
}

interface Props {
  modelValue: Pick<RepositoryCreate, 'is_public' | 'access_token'>
  errors: Record<string, string>
  /** 接続テスト機能を表示するかどうか */
  showConnectionTest?: boolean
  /** 接続テスト中かどうか */
  testingConnection?: boolean
  /** 接続テスト結果 */
  connectionTestResult?: ConnectionTestResult | null
  /** フォームデータ（接続テスト可否判定用） */
  formData?: RepositoryCreate
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
  (e: 'validate', fieldName: string): void
  (e: 'testConnection'): void
}

const props = withDefaults(defineProps<Props>(), {
  showConnectionTest: true,
  testingConnection: false,
  connectionTestResult: null
})
const emit = defineEmits<Emits>()

function updateField(fieldName: keyof Props['modelValue'], value: any) {
  const updatedValue = {
    ...props.modelValue,
    [fieldName]: value
  }
  
  // パブリックリポジトリに変更した場合、アクセストークンをクリア
  if (fieldName === 'is_public' && value === true) {
    updatedValue.access_token = null
  }
  
  emit('update:modelValue', updatedValue)
  
  // is_publicが変更された場合、access_tokenの検証を再実行
  if (fieldName === 'is_public') {
    emit('validate', 'access_token')
  }
}

// 接続テストが実行可能かどうか
const canTestConnection = computed(() => {
  if (!props.formData) return false
  
  const required = ['name', 'owner', 'service_type', 'url']
  return required.every(field => !!props.formData![field as keyof RepositoryCreate])
})
</script>

<style scoped>
.form-checkbox {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  margin-bottom: var(--app-spacing-sm);
  
  label {
    margin: 0;
    cursor: pointer;
    font-weight: 500;
    color: var(--app-text-color);
  }
}
</style>