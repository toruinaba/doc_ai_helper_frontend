<template>
  <FormSection title="Git設定">
    <FormField 
      label="サービス" 
      :required="true" 
      :error="errors.service_type"
      fieldId="service_type"
    >
      <template #default="{ fieldId }">
        <ServiceSelector
          :id="fieldId"
          :modelValue="modelValue.service_type"
          :error="errors.service_type"
          :custom-services="serviceOptions"
          @update:modelValue="updateField('service_type', $event)"
          @change="handleServiceChange"
        />
      </template>
    </FormField>

    <FormField 
      label="リポジトリURL" 
      :required="true" 
      :error="errors.url"
      helpText="HTTPSのクローンURLを入力してください"
      fieldId="url"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.url"
          :class="{ 'p-invalid': errors.url }"
          placeholder="https://github.com/owner/repo"
          @update:modelValue="updateField('url', $event)"
          @blur="$emit('validate', 'url')"
        />
      </template>
    </FormField>

    <!-- カスタムベースURL（Forgejoの場合） -->
    <FormField
      v-if="modelValue.service_type === 'forgejo'"
      label="ベースURL"
      :required="true"
      :error="errors.base_url"
      helpText="カスタムForgejoインスタンスのベースURL"
      fieldId="base_url"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.base_url"
          :class="{ 'p-invalid': errors.base_url }"
          placeholder="https://your-forgejo-instance.com"
          @update:modelValue="updateField('base_url', $event)"
          @blur="$emit('validate', 'base_url')"
        />
      </template>
    </FormField>

    <FormField 
      label="デフォルトブランチ" 
      :error="errors.default_branch"
      fieldId="default_branch"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.default_branch"
          :class="{ 'p-invalid': errors.default_branch }"
          placeholder="main"
          @update:modelValue="updateField('default_branch', $event)"
          @blur="$emit('validate', 'default_branch')"
        />
      </template>
    </FormField>

    <FormField 
      label="リポジトリルート" 
      helpText="リポジトリ内のルートパス（デフォルト: /）"
      fieldId="repository_root"
    >
      <template #default="{ fieldId }">
        <InputText
          :id="fieldId"
          :modelValue="modelValue.repository_root"
          placeholder="/"
          @update:modelValue="updateField('repository_root', $event)"
        />
      </template>
    </FormField>
  </FormSection>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { InputText } from 'primevue'
import FormSection from '@/components/common/FormSection.vue'
import FormField from '@/components/common/FormField.vue'
import ServiceSelector from '@/components/common/ServiceSelector.vue'
import type { components } from '@/services/api/types.auto'

type RepositoryCreate = components['schemas']['RepositoryCreate']
type GitServiceType = components['schemas']['GitServiceType']

interface Props {
  modelValue: Pick<RepositoryCreate, 'service_type' | 'url' | 'base_url' | 'default_branch' | 'repository_root' | 'name' | 'owner'>
  errors: Record<string, string>
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
  (e: 'validate', fieldName: string): void
  (e: 'serviceChange'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// サービスオプション
const serviceOptions = [
  { label: 'GitHub', value: 'github' as GitServiceType },
  { label: 'GitLab', value: 'gitlab' as GitServiceType },
  { label: 'Bitbucket', value: 'bitbucket' as GitServiceType },
  { label: 'Forgejo', value: 'forgejo' as GitServiceType }
]

function updateField(fieldName: keyof Props['modelValue'], value: any) {
  const updatedValue = {
    ...props.modelValue,
    [fieldName]: value
  }
  
  // サービスタイプ変更時に自動的にURLを更新
  if (fieldName === 'service_type' && props.modelValue.name && props.modelValue.owner) {
    updatedValue.url = generateUrlFromService(value, props.modelValue.name, props.modelValue.owner, props.modelValue.base_url)
  }
  
  emit('update:modelValue', updatedValue)
}

function handleServiceChange() {
  emit('serviceChange')
  
  // サービス変更時にURLを自動生成
  if (props.modelValue.name && props.modelValue.owner) {
    const newUrl = generateUrlFromService(
      props.modelValue.service_type, 
      props.modelValue.name, 
      props.modelValue.owner, 
      props.modelValue.base_url
    )
    updateField('url', newUrl)
  }
}

function generateUrlFromService(
  serviceType: GitServiceType, 
  name: string, 
  owner: string, 
  baseUrl?: string | null
): string {
  const baseUrls: Record<GitServiceType, string> = {
    github: 'https://github.com',
    gitlab: 'https://gitlab.com',
    bitbucket: 'https://bitbucket.org',
    forgejo: baseUrl || 'https://codeberg.org'
  }
  
  const base = baseUrls[serviceType]
  return `${base}/${owner}/${name}.git`
}
</script>