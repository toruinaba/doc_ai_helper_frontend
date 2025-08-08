<template>
  <FormSection title="ドキュメント設定">
    <FormField 
      label="ルートドキュメントパス" 
      helpText="メインドキュメントファイルのパス（省略時: README.md）"
      fieldId="root_document_path"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.root_document_path"
          placeholder="README.md, docs/index.md"
          @update:modelValue="updateField('root_document_path', $event)"
        />
      </template>
    </FormField>

    <FormField 
      label="ドキュメントルートディレクトリ" 
      helpText="ドキュメントベースディレクトリ（省略時: 自動推測）"
      fieldId="document_root_directory"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.document_root_directory"
          placeholder="docs, documentation"
          @update:modelValue="updateField('document_root_directory', $event)"
        />
      </template>
    </FormField>

    <FormField 
      label="ルートパス（旧）" 
      helpText="レガシーフィールド。root_document_pathの使用を推奨"
      fieldId="root_path"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.root_path"
          placeholder="README.md, index.html, docs/index.md"
          @update:modelValue="updateField('root_path', $event)"
        />
      </template>
    </FormField>
  </FormSection>
</template>

<script setup lang="ts">
import { InputText } from 'primevue'
import FormSection from '@/components/common/FormSection.vue'
import FormField from '@/components/common/FormField.vue'
import type { components } from '@/services/api/types.auto'

type RepositoryCreate = components['schemas']['RepositoryCreate']

interface Props {
  modelValue: Pick<RepositoryCreate, 'root_document_path' | 'document_root_directory' | 'root_path'>
  errors: Record<string, string>
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function updateField(fieldName: keyof Props['modelValue'], value: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    [fieldName]: value
  })
}
</script>