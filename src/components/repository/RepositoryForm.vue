<template>
  <Dialog 
    :visible="visible" 
    :header="isEdit ? 'リポジトリ編集' : '新規リポジトリ追加'"
    :modal="true"
    :closable="true"
    :draggable="false"
    :blockScroll="true"
    appendTo="body"
    class="repository-form-dialog"
    @update:visible="$emit('update:visible', $event)"
    @hide="handleCancel"
  >
    <form @submit.prevent="handleSubmit" class="repository-form">
      <!-- 基本情報セクション -->
      <BasicInfoSection
        v-model="basicInfo"
        :errors="errors"
        @validate="validateField"
      />

      <!-- Git設定セクション -->
      <GitConfigSection
        v-model="gitConfig"
        :errors="errors"
        @validate="validateField"
        @service-change="handleServiceChange"
      />

      <!-- ドキュメント設定セクション -->
      <DocumentConfigSection
        v-model="documentConfig"
        :errors="errors"
      />

      <!-- アクセス設定セクション -->
      <AccessSection
        v-model="accessConfig"
        :errors="errors"
        :form-data="formData"
        :testing-connection="isTestingConnection"
        :connection-test-result="connectionTestResult"
        @validate="validateField"
        @test-connection="testConnection"
      />
    </form>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="キャンセル"
          severity="secondary"
          outlined
          @click="handleCancel"
        />
        <Button
          :label="isEdit ? '更新' : '作成'"
          :loading="isSubmitting"
          @click="handleSubmit"
          :disabled="!isFormValid"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Dialog, Button } from 'primevue'
import { useRepositoryStore } from '@/stores/repository.store'
import { useFormValidation, createRepositoryValidationSchema } from '@/composables/useFormValidation'
import type { components } from '@/services/api/types.auto'

// Section components
import BasicInfoSection from './sections/BasicInfoSection.vue'
import GitConfigSection from './sections/GitConfigSection.vue'
import DocumentConfigSection from './sections/DocumentConfigSection.vue'
import AccessSection from './sections/AccessSection.vue'

type RepositoryCreate = components['schemas']['RepositoryCreate']
type RepositoryResponse = components['schemas']['RepositoryResponse']

interface ConnectionTestResult {
  success: boolean
  message: string
}

interface Props {
  visible: boolean
  repository?: RepositoryResponse | null
  isSubmitting?: boolean
}

interface Emits {
  'update:visible': [value: boolean]
  submit: [data: RepositoryCreate]
  cancel: []
}

const props = withDefaults(defineProps<Props>(), {
  repository: null,
  isSubmitting: false
})

const emit = defineEmits<Emits>()

// ストア
const repositoryStore = useRepositoryStore()

// フォームデータ
const formData = reactive<RepositoryCreate>({
  name: '',
  owner: '',
  service_type: 'github',
  url: '',
  base_url: null,
  default_branch: 'main',
  repository_root: '/',
  document_root_directory: null,
  root_document_path: null,
  root_path: null,
  description: null,
  is_public: true,
  access_token: null,
  metadata: {}
})

// バリデーション composable を使用
const { errors, validateField, validateForm, hasErrors } = useFormValidation({
  schema: createRepositoryValidationSchema(repositoryStore.repositories, props.repository),
  formData,
  existingItems: repositoryStore.repositories,
  excludeId: props.repository?.id
})

// 接続テスト状態
const isTestingConnection = ref(false)
const connectionTestResult = ref<ConnectionTestResult | null>(null)

// コンピューテッド
const isEdit = computed(() => !!props.repository)

const isFormValid = computed(() => {
  const requiredFields = ['name', 'owner', 'service_type', 'url']
  const hasRequiredFields = requiredFields.every(field => 
    formData[field as keyof RepositoryCreate]
  )
  
  const hasAccessTokenIfPrivate = formData.is_public || formData.access_token
  
  return hasRequiredFields && !hasErrors.value && hasAccessTokenIfPrivate
})

// セクション用のデータ
const basicInfo = computed({
  get: () => ({
    name: formData.name,
    owner: formData.owner,
    description: formData.description
  }),
  set: (value) => {
    Object.assign(formData, value)
  }
})

const gitConfig = computed({
  get: () => ({
    service_type: formData.service_type,
    url: formData.url,
    base_url: formData.base_url,
    default_branch: formData.default_branch,
    repository_root: formData.repository_root,
    name: formData.name, // URL生成用
    owner: formData.owner // URL生成用
  }),
  set: (value) => {
    Object.assign(formData, value)
  }
})

const documentConfig = computed({
  get: () => ({
    root_document_path: formData.root_document_path,
    document_root_directory: formData.document_root_directory,
    root_path: formData.root_path
  }),
  set: (value) => {
    Object.assign(formData, value)
  }
})

const accessConfig = computed({
  get: () => ({
    is_public: formData.is_public,
    access_token: formData.access_token
  }),
  set: (value) => {
    Object.assign(formData, value)
  }
})

// ウォッチャー：リポジトリデータが変更されたときにフォームを初期化
watch(() => props.repository, (newRepository) => {
  if (newRepository) {
    // 編集モード：既存データを設定
    Object.assign(formData, {
      name: newRepository.name,
      owner: newRepository.owner,
      service_type: newRepository.service_type,
      url: newRepository.url,
      base_url: newRepository.base_url,
      default_branch: newRepository.default_branch,
      repository_root: newRepository.repository_root,
      document_root_directory: newRepository.document_root_directory,
      root_document_path: newRepository.root_document_path,
      root_path: newRepository.root_path,
      description: newRepository.description,
      is_public: newRepository.is_public,
      access_token: null, // セキュリティのため空にする
      metadata: newRepository.metadata || {}
    })
  } else {
    // 新規作成モード：フォームをリセット
    resetForm()
  }
  
  connectionTestResult.value = null
}, { immediate: true })

// イベントハンドラー
function handleServiceChange() {
  // セクションコンポーネントからの通知を処理
  // 必要に応じて追加のロジックを実装
}

async function testConnection() {
  isTestingConnection.value = true
  connectionTestResult.value = null
  
  try {
    // 実際の接続テストは後で実装
    // とりあえずモックレスポンス
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const isValid = formData.url.includes('github.com') || 
                   formData.url.includes('gitlab.com')
    
    connectionTestResult.value = {
      success: isValid,
      message: isValid 
        ? 'リポジトリに正常に接続できました' 
        : '接続に失敗しました。URLとアクセス権限を確認してください'
    }
  } catch (error) {
    connectionTestResult.value = {
      success: false,
      message: '接続テスト中にエラーが発生しました'
    }
  } finally {
    isTestingConnection.value = false
  }
}

function handleSubmit() {
  if (validateForm()) {
    emit('submit', { ...formData })
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    owner: '',
    service_type: 'github',
    url: '',
    base_url: null,
    default_branch: 'main',
    repository_root: '/',
    document_root_directory: null,
    root_document_path: null,
    root_path: null,
    description: null,
    is_public: true,
    access_token: null,
    metadata: {}
  })
}
</script>

<style scoped lang="scss">
.repository-form-dialog {
  width: 90vw;
  max-width: 600px;
}

// モーダルスタイルはApp.vueのグローバルスタイルで定義済み
// フォーム特有のスタイリング  
:global(.repository-form-dialog) {
  .p-dialog {
    border: 1px solid #e5e7eb;
  }
}

.repository-form {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-lg);
}

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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-spacing-sm);
}

// レスポンシブ対応
@media (max-width: 768px) {
  .repository-form-dialog {
    width: 95vw;
    margin: 1rem;
  }
  
  .dialog-footer {
    flex-direction: column;
    
    .p-button {
      width: 100%;
    }
  }
}
</style>