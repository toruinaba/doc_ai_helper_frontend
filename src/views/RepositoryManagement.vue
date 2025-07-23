<template>
  <div class="repository-management">
    <AppNavigation />
    <!-- ヘッダー -->
    <div class="page-header">
      <div class="header-content">
        <h1>リポジトリ管理</h1>
        <p>ドキュメントリポジトリの登録・管理を行います</p>
      </div>
      <div class="header-actions">
        <Button
          label="新規追加"
          icon="pi pi-plus"
          @click="showAddDialog"
        />
      </div>
    </div>

    <!-- エラー表示 -->
    <Message
      v-if="repositoryStore.error"
      severity="error"
      :closable="true"
      @close="repositoryStore.error = null"
    >
      {{ repositoryStore.error }}
    </Message>

    <!-- リポジトリ一覧 -->
    <RepositoryList
      :repositories="repositoryStore.repositories"
      :healthStatus="repositoryStore.healthStatus"
      :isLoading="repositoryStore.isLoading"
      :loadingRepositories="loadingRepositories"
      @open="handleOpenRepository"
      @edit="handleEditRepository"
      @delete="handleDeleteRepository"
      @add="showAddDialog"
      @refresh="handleRefreshRepositories"
      @refreshRepository="handleRefreshRepository"
      @clone="handleCloneRepository"
      @viewDetails="handleViewDetails"
    />

    <!-- リポジトリフォーム -->
    <RepositoryForm
      :visible="showForm"
      :repository="selectedRepository"
      :isSubmitting="isSubmitting"
      @update:visible="showForm = $event"
      @submit="handleSubmitRepository"
      @cancel="handleCancelForm"
    />

    <!-- 削除確認ダイアログ -->
    <ConfirmDialog />

    <!-- 詳細情報ダイアログ -->
    <Dialog
      :visible="showDetails"
      header="リポジトリ詳細"
      :modal="true"
      :draggable="false"
      :blockScroll="true"
      appendTo="body"
      class="repository-details-dialog"
      @update:visible="showDetails = $event"
    >
      <div v-if="selectedRepository" class="repository-details">
        <div class="detail-section">
          <h4>基本情報</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>名前</label>
              <span>{{ selectedRepository.name }}</span>
            </div>
            <div class="detail-item">
              <label>所有者</label>
              <span>{{ selectedRepository.owner }}</span>
            </div>
            <div class="detail-item">
              <label>サービス</label>
              <Tag :value="selectedRepository.service_type" />
            </div>
            <div class="detail-item">
              <label>URL</label>
              <a :href="selectedRepository.url" target="_blank" class="repository-url">
                {{ selectedRepository.url }}
                <i class="pi pi-external-link" />
              </a>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>設定</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>デフォルトブランチ</label>
              <span>{{ selectedRepository.default_branch }}</span>
            </div>
            <div class="detail-item">
              <label>ルートパス</label>
              <span>{{ selectedRepository.root_path || 'なし' }}</span>
            </div>
            <div class="detail-item">
              <label>公開設定</label>
              <Tag 
                :value="selectedRepository.is_public ? '公開' : '非公開'"
                :severity="selectedRepository.is_public ? 'success' : 'warning'"
              />
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>システム情報</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>ID</label>
              <span>{{ selectedRepository.id }}</span>
            </div>
            <div class="detail-item">
              <label>作成日時</label>
              <span>{{ formatDateTime(selectedRepository.created_at) }}</span>
            </div>
            <div class="detail-item">
              <label>更新日時</label>
              <span>{{ formatDateTime(selectedRepository.updated_at) }}</span>
            </div>
            <div class="detail-item">
              <label>対応ブランチ</label>
              <div class="branch-list">
                <Tag 
                  v-for="branch in selectedRepository.supported_branches"
                  :key="branch"
                  :value="branch"
                  severity="secondary"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedRepository.description" class="detail-section">
          <h4>説明</h4>
          <p>{{ selectedRepository.description }}</p>
        </div>
      </div>

      <template #footer>
        <Button
          label="閉じる"
          severity="secondary"
          @click="showDetails = false"
        />
        <Button
          label="編集"
          @click="editFromDetails"
        />
      </template>
    </Dialog>

    <!-- トースト通知 -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { 
  Button, 
  Message, 
  Dialog, 
  Tag, 
  Toast, 
  ConfirmDialog 
} from 'primevue'
import { useRepositoryStore } from '@/stores/repository.store'
import { useDocumentStore } from '@/stores/document.store'
import AppNavigation from '@/components/layout/AppNavigation.vue'
import RepositoryList from '@/components/repository/RepositoryList.vue'
import RepositoryForm from '@/components/repository/RepositoryForm.vue'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']
type RepositoryCreate = components['schemas']['RepositoryCreate']

// ストアとユーティリティ
const repositoryStore = useRepositoryStore()
const documentStore = useDocumentStore()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

// リアクティブな状態
const showForm = ref(false)
const showDetails = ref(false)
const selectedRepository = ref<RepositoryResponse | null>(null)
const isSubmitting = ref(false)
const loadingRepositories = ref<number[]>([])

// ライフサイクル
onMounted(async () => {
  await loadRepositories()
  await checkRepositoriesHealth()
})

// メソッド
async function loadRepositories() {
  try {
    await repositoryStore.fetchRepositories()
  } catch (error) {
    console.error('リポジトリ一覧の読み込みに失敗:', error)
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'リポジトリ一覧の読み込みに失敗しました',
      life: 5000
    })
  }
}

async function checkRepositoriesHealth() {
  try {
    await repositoryStore.checkMultipleRepositoryHealth()
  } catch (error) {
    console.error('ヘルスチェックに失敗:', error)
  }
}

// イベントハンドラー
function showAddDialog() {
  selectedRepository.value = null
  showForm.value = true
}

function handleEditRepository(repository: RepositoryResponse) {
  selectedRepository.value = repository
  showForm.value = true
}

async function handleSubmitRepository(data: RepositoryCreate) {
  isSubmitting.value = true
  
  try {
    if (selectedRepository.value) {
      // 更新
      await repositoryStore.updateRepository(selectedRepository.value.id, data)
      toast.add({
        severity: 'success',
        summary: '成功',
        detail: 'リポジトリが更新されました',
        life: 3000
      })
    } else {
      // 新規作成
      await repositoryStore.createRepository(data)
      toast.add({
        severity: 'success',
        summary: '成功',
        detail: 'リポジトリが作成されました',
        life: 3000
      })
    }
    
    showForm.value = false
    selectedRepository.value = null
    
    // ヘルスチェック
    await checkRepositoriesHealth()
    
  } catch (error) {
    console.error('リポジトリの保存に失敗:', error)
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: selectedRepository.value ? 'リポジトリの更新に失敗しました' : 'リポジトリの作成に失敗しました',
      life: 5000
    })
  } finally {
    isSubmitting.value = false
  }
}

function handleCancelForm() {
  showForm.value = false
  selectedRepository.value = null
}

function handleDeleteRepository(repository: RepositoryResponse) {
  confirm.require({
    message: `「${repository.name}」を削除しますか？この操作は取り消せません。`,
    header: 'リポジトリ削除の確認',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'キャンセル',
    acceptLabel: '削除',
    accept: async () => {
      try {
        await repositoryStore.deleteRepository(repository.id)
        toast.add({
          severity: 'success',
          summary: '成功',
          detail: 'リポジトリが削除されました',
          life: 3000
        })
      } catch (error) {
        console.error('リポジトリの削除に失敗:', error)
        toast.add({
          severity: 'error',
          summary: 'エラー',
          detail: 'リポジトリの削除に失敗しました',
          life: 5000
        })
      }
    }
  })
}

function handleOpenRepository(repository: RepositoryResponse) {
  // リポジトリを選択してドキュメントビューアに移動
  repositoryStore.selectRepository(repository)
  
  // ドキュメントストアにリポジトリ情報を設定
  documentStore.currentService = repository.service_type
  documentStore.currentOwner = repository.owner
  documentStore.currentRepo = repository.name
  documentStore.currentRef = repository.default_branch
  
  // デフォルトドキュメントパスを設定
  // root_pathがファイルパスとして設定されている場合はそのまま使用
  const defaultPath = repository.root_path || 'README.md'
  
  // ドキュメントを読み込み
  documentStore.fetchDocument(defaultPath).then(() => {
    toast.add({
      severity: 'success',
      summary: 'リポジトリ選択',
      detail: `${repository.name} のドキュメントを読み込みました`,
      life: 2000
    })
  }).catch(() => {
    toast.add({
      severity: 'warn',
      summary: 'リポジトリ選択',
      detail: `${repository.name} が選択されました（ドキュメント読み込み失敗）`,
      life: 3000
    })
  })
  
  // ドキュメント表示ページに移動
  router.push(`/documents/${repository.id}`)
}

async function handleRefreshRepositories() {
  await loadRepositories()
  await checkRepositoriesHealth()
  
  toast.add({
    severity: 'success',
    summary: '更新完了',
    detail: 'リポジトリ一覧を更新しました',
    life: 2000
  })
}

async function handleRefreshRepository(repository: RepositoryResponse) {
  loadingRepositories.value.push(repository.id)
  
  try {
    await repositoryStore.checkRepositoryHealth(repository)
    toast.add({
      severity: 'success',
      summary: '更新完了',
      detail: `${repository.name} の状態を更新しました`,
      life: 2000
    })
  } catch (error) {
    console.error('リポジトリの更新に失敗:', error)
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'リポジトリの更新に失敗しました',
      life: 3000
    })
  } finally {
    loadingRepositories.value = loadingRepositories.value.filter(id => id !== repository.id)
  }
}

function handleCloneRepository(repository: RepositoryResponse) {
  // クローン機能（将来実装）
  toast.add({
    severity: 'info',
    summary: '機能予定',
    detail: 'クローン機能は今後実装予定です',
    life: 3000
  })
}

function handleViewDetails(repository: RepositoryResponse) {
  selectedRepository.value = repository
  showDetails.value = true
}

function editFromDetails() {
  showDetails.value = false
  showForm.value = true
}

// ユーティリティ
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped lang="scss">
.repository-management {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--app-surface-50);
}

.repository-management > *:not(.app-header) {
  padding: var(--app-spacing-lg);
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
  
  .header-content {
    h1 {
      margin: 0 0 0.5rem 0;
      color: var(--text-color);
      font-size: 2rem;
      font-weight: 600;
    }
    
    p {
      margin: 0;
      color: var(--text-color-secondary);
      font-size: 1rem;
    }
  }
  
  .header-actions {
    flex-shrink: 0;
  }
}

.repository-details-dialog {
  width: 90vw;
  max-width: 700px;
}

.repository-details {
  .detail-section {
    margin-bottom: 1.5rem;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    h4 {
      margin: 0 0 1rem 0;
      color: var(--text-color);
      font-size: 1.1rem;
      font-weight: 600;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--surface-border);
    }
    
    p {
      margin: 0;
      color: var(--text-color);
      line-height: 1.5;
    }
  }
  
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    
    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
    }
  }
  
  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    
    label {
      font-weight: 500;
      color: var(--text-color-secondary);
      font-size: 0.9rem;
    }
    
    span {
      color: var(--text-color);
    }
    
    .repository-url {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--primary-color);
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
      
      i {
        font-size: 0.8rem;
      }
    }
    
    .branch-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }
}

// レスポンシブ対応
@media (max-width: 768px) {
  .repository-management {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    
    .header-actions {
      .p-button {
        width: 100%;
      }
    }
  }
  
  .repository-details-dialog {
    width: 95vw;
    margin: 1rem;
  }
  
  .detail-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>