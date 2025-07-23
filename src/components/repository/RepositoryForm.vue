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
      <div class="form-section">
        <h4>基本情報</h4>
        
        <div class="form-field">
          <label for="name">リポジトリ名 *</label>
          <InputText
            id="name"
            v-model="formData.name"
            :class="{ 'p-invalid': errors.name }"
            placeholder="my-awesome-project"
            @blur="validateField('name')"
          />
          <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
        </div>

        <div class="form-field">
          <label for="owner">所有者 *</label>
          <InputText
            id="owner"
            v-model="formData.owner"
            :class="{ 'p-invalid': errors.owner }"
            placeholder="username or organization"
            @blur="validateField('owner')"
          />
          <small v-if="errors.owner" class="p-error">{{ errors.owner }}</small>
        </div>

        <div class="form-field">
          <label for="description">説明</label>
          <Textarea
            id="description"
            v-model="formData.description"
            rows="3"
            placeholder="プロジェクトの説明を入力..."
          />
        </div>
      </div>

      <!-- Git設定セクション -->
      <div class="form-section">
        <h4>Git設定</h4>
        
        <div class="form-field">
          <label for="service_type">サービス *</label>
          <Select
            id="service_type"
            v-model="formData.service_type"
            :options="serviceOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Gitサービスを選択"
            :class="{ 'p-invalid': errors.service_type }"
            @change="onServiceChange"
          />
          <small v-if="errors.service_type" class="p-error">{{ errors.service_type }}</small>
        </div>

        <div class="form-field">
          <label for="url">リポジトリURL *</label>
          <InputText
            id="url"
            v-model="formData.url"
            :class="{ 'p-invalid': errors.url }"
            placeholder="https://github.com/owner/repo"
            @blur="validateField('url')"
          />
          <small v-if="errors.url" class="p-error">{{ errors.url }}</small>
          <small class="field-help">HTTPSのクローンURLを入力してください</small>
        </div>

        <div v-if="showBaseUrl" class="form-field">
          <label for="base_url">ベースURL</label>
          <InputText
            id="base_url"
            v-model="formData.base_url"
            placeholder="https://gitlab.example.com"
          />
          <small class="field-help">カスタムGitサービスのベースURL（オプション）</small>
        </div>

        <div class="form-field">
          <label for="default_branch">デフォルトブランチ</label>
          <InputText
            id="default_branch"
            v-model="formData.default_branch"
            placeholder="main"
          />
        </div>

        <div class="form-field">
          <label for="root_path">ルートドキュメントパス</label>
          <InputText
            id="root_path"
            v-model="formData.root_path"
            placeholder="README.md, index.html, docs/index.md"
          />
          <small class="field-help">メインドキュメントファイルのパス（省略時: README.md）</small>
        </div>
      </div>

      <!-- アクセス設定セクション -->
      <div class="form-section">
        <h4>アクセス設定</h4>
        
        <div class="form-field">
          <div class="form-checkbox">
            <Checkbox
              id="is_public"
              v-model="formData.is_public"
              :binary="true"
            />
            <label for="is_public">パブリックリポジトリ</label>
          </div>
          <small class="field-help">
            プライベートリポジトリの場合はアクセストークンが必要です
          </small>
        </div>

        <div v-if="!formData.is_public" class="form-field">
          <label for="access_token">アクセストークン</label>
          <Password
            id="access_token"
            v-model="formData.access_token"
            :feedback="false"
            toggleMask
            placeholder="ghp_xxxxxxxxxxxx"
            :class="{ 'p-invalid': errors.access_token }"
          />
          <small v-if="errors.access_token" class="p-error">{{ errors.access_token }}</small>
          <small class="field-help">
            読み取り権限のあるパーソナルアクセストークン
          </small>
        </div>
      </div>

      <!-- 接続テスト -->
      <div v-if="showConnectionTest" class="form-section">
        <div class="connection-test">
          <Button
            type="button"
            label="接続テスト"
            icon="pi pi-link"
            severity="secondary"
            outlined
            :loading="isTestingConnection"
            @click="testConnection"
          />
          <div v-if="connectionTestResult" class="test-result">
            <Message
              :severity="connectionTestResult.success ? 'success' : 'error'"
              :closable="false"
            >
              {{ connectionTestResult.message }}
            </Message>
          </div>
        </div>
      </div>
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
import {
  Dialog,
  InputText,
  Textarea,
  Checkbox,
  Password,
  Button,
  Message
} from 'primevue'
import Select from 'primevue/select'
import type { components } from '@/services/api/types.auto'

type RepositoryCreate = components['schemas']['RepositoryCreate']
type RepositoryResponse = components['schemas']['RepositoryResponse']
type GitServiceType = components['schemas']['GitServiceType']

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

// フォームデータ
const formData = reactive<RepositoryCreate>({
  name: '',
  owner: '',
  service_type: 'github',
  url: '',
  base_url: null,
  default_branch: 'main',
  root_path: null,
  description: null,
  is_public: true,
  access_token: null,
  metadata: {}
})

// フォーム状態
const errors = reactive<Record<string, string>>({})
const isTestingConnection = ref(false)
const connectionTestResult = ref<{ success: boolean; message: string } | null>(null)

// オプション
const serviceOptions = [
  { label: 'GitHub', value: 'github' },
  { label: 'GitLab', value: 'gitlab' },
  { label: 'Bitbucket', value: 'bitbucket' },
  { label: 'Forgejo', value: 'forgejo' }
]

// コンピューテッド
const isEdit = computed(() => !!props.repository)

const showBaseUrl = computed(() => 
  formData.service_type === 'gitlab' || formData.service_type === 'forgejo'
)

const showConnectionTest = computed(() => 
  formData.name && formData.owner && formData.url
)

const isFormValid = computed(() => {
  const requiredFields = ['name', 'owner', 'service_type', 'url']
  const hasRequiredFields = requiredFields.every(field => 
    formData[field as keyof RepositoryCreate]
  )
  
  const hasNoErrors = Object.keys(errors).length === 0 || 
    Object.values(errors).every(error => !error)
  
  const hasAccessTokenIfPrivate = formData.is_public || formData.access_token
  
  return hasRequiredFields && hasNoErrors && hasAccessTokenIfPrivate
})

// ウォッチャー
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
  
  // エラーをクリア
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })
  
  connectionTestResult.value = null
}, { immediate: true })

// バリデーション
function validateField(fieldName: string) {
  errors[fieldName] = ''
  
  const value = formData[fieldName as keyof RepositoryCreate]
  
  switch (fieldName) {
    case 'name':
      if (!value) {
        errors[fieldName] = 'リポジトリ名は必須です'
      } else if (!/^[a-zA-Z0-9._-]+$/.test(value as string)) {
        errors[fieldName] = '英数字、ピリオド、ハイフン、アンダースコアのみ使用可能です'
      }
      break
      
    case 'owner':
      if (!value) {
        errors[fieldName] = '所有者名は必須です'
      } else if (!/^[a-zA-Z0-9._-]+$/.test(value as string)) {
        errors[fieldName] = '英数字、ピリオド、ハイフン、アンダースコアのみ使用可能です'
      }
      break
      
    case 'url':
      if (!value) {
        errors[fieldName] = 'URLは必須です'
      } else if (!/^https?:\/\/.+/.test(value as string)) {
        errors[fieldName] = '有効なHTTP/HTTPS URLを入力してください'
      }
      break
      
    case 'service_type':
      if (!value) {
        errors[fieldName] = 'サービスタイプは必須です'
      }
      break
      
    case 'access_token':
      if (!formData.is_public && !value) {
        errors[fieldName] = 'プライベートリポジトリにはアクセストークンが必要です'
      }
      break
  }
}

function validateForm() {
  const fieldsToValidate = ['name', 'owner', 'service_type', 'url']
  if (!formData.is_public) {
    fieldsToValidate.push('access_token')
  }
  
  fieldsToValidate.forEach(validateField)
  
  return Object.values(errors).every(error => !error)
}

// イベントハンドラー
function onServiceChange() {
  // サービス変更時にURLを自動生成（オプション）
  if (formData.name && formData.owner) {
    updateUrlFromService()
  }
}

function updateUrlFromService() {
  const baseUrls: Record<GitServiceType, string> = {
    github: 'https://github.com',
    gitlab: 'https://gitlab.com',
    bitbucket: 'https://bitbucket.org',
    forgejo: formData.base_url || 'https://codeberg.org'
  }
  
  const baseUrl = baseUrls[formData.service_type]
  formData.url = `${baseUrl}/${formData.owner}/${formData.name}.git`
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
    service_type: 'github' as GitServiceType,
    url: '',
    base_url: null,
    default_branch: 'main',
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
  gap: 1.5rem;
}

.form-section {
  h4 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1.1rem;
    font-weight: 600;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--surface-border);
  }
  
  .form-field {
    margin-bottom: 1rem;
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--text-color);
    }
    
    .p-inputtext,
    .p-dropdown,
    .p-password {
      width: 100%;
    }
    
    .field-help {
      display: block;
      margin-top: 0.25rem;
      color: var(--text-color-secondary);
      font-size: 0.875rem;
    }
    
    .p-error {
      display: block;
      margin-top: 0.25rem;
      color: var(--red-500);
      font-size: 0.875rem;
    }
  }
  
  .form-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    
    label {
      margin: 0;
      cursor: pointer;
    }
  }
}

.connection-test {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  .test-result {
    :deep(.p-message) {
      margin: 0;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
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