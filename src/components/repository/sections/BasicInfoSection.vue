<template>
  <FormSection title="基本情報">
    <FormField 
      label="リポジトリ名" 
      :required="true" 
      :error="errors.name"
      fieldId="name"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.name"
          :class="{ 'p-invalid': errors.name }"
          placeholder="my-awesome-project"
          @update:modelValue="updateField('name', $event)"
          @blur="$emit('validate', 'name')"
        />
      </template>
    </FormField>

    <FormField 
      label="所有者" 
      :required="true" 
      :error="errors.owner"
      fieldId="owner"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.owner"
          :class="{ 'p-invalid': errors.owner }"
          placeholder="username or organization"
          @update:modelValue="updateField('owner', $event)"
          @blur="$emit('validate', 'owner')"
        />
      </template>
    </FormField>

    <FormField 
      label="説明" 
      fieldId="description"
    >
      <template #default="{ fieldId }">
        <Textarea
          :id="fieldId"
          :modelValue="modelValue.description"
          rows="3"
          placeholder="プロジェクトの説明を入力..."
          @update:modelValue="updateField('description', $event)"
        />
      </template>
    </FormField>
  </FormSection>
</template>

<script setup lang="ts">
import { InputText, Textarea } from 'primevue'
import FormSection from '@/components/common/FormSection.vue'
import FormField from '@/components/common/FormField.vue'
import type { components } from '@/services/api/types.auto'

type RepositoryCreate = components['schemas']['RepositoryCreate']

interface Props {
  modelValue: Pick<RepositoryCreate, 'name' | 'owner' | 'description'>
  errors: Record<string, string>
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
  (e: 'validate', fieldName: string): void
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