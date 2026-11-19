<template>
  <div class="repository-management">
    <AppNavigation />
    
    <!-- ページヘッダー -->
    <PageHeader
      title="リポジトリ管理"
      description="ドキュメントリポジトリの登録・管理を行います"
      icon="pi pi-database"
    >
      <template #actions>
        <Button
          label="新規追加"
          icon="pi pi-plus"
          @click="showAddDialog"
        />
      </template>
    </PageHeader>

    <!-- エラー表示 -->
    <StatusMessage
      v-if="error"
      :message="error"
      severity="error"
      :closable="true"
      @close="repositoryStore.error = null"
    />

    <!-- リポジトリ一覧 -->
    <RepositoryList
      :repositories="repositories"
      :healthStatus="healthStatus"
      :isLoading="isLoading"
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

    <!-- リポジトリ詳細ダイアログ -->
    <DetailsDialog
      :visible="showDetails"
      title="リポジトリ詳細"
      :showEditButton="true"
      editButtonLabel="編集"
      maxWidth="900px"
      @update:visible="showDetails = $event"
      @edit="editFromDetails"
      @close="showDetails = false"
    >
      <RepositoryDetailsView
        :repository="selectedRepository"
        :healthStatus="getRepositoryHealthStatus(selectedRepository)"
      />
    </DetailsDialog>

    <!-- トースト通知 -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  Button, 
  Toast, 
  ConfirmDialog 
} from 'primevue'
import { useRepositoryStore } from '@/stores/repository.store'
import { useRepositoryOperations } from '@/composables/useRepositoryOperations'
import AppNavigation from '@/components/layout/AppNavigation.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusMessage from '@/components/common/StatusMessage.vue'
import DetailsDialog from '@/components/common/DetailsDialog.vue'
import RepositoryDetailsView from '@/components/repository/RepositoryDetailsView.vue'
import RepositoryList from '@/components/repository/RepositoryList.vue'
import RepositoryForm from '@/components/repository/RepositoryForm.vue'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']
type RepositoryCreate = components['schemas']['RepositoryCreate']
type RepositoryUpdate = components['schemas']['RepositoryUpdate']

// Composables を使用
const repositoryStore = useRepositoryStore()
const {
  // State
  isSubmitting,
  loadingRepositories,
  repositories,
  isLoading,
  error,
  healthStatus,
  
  // Operations
  createRepository,
  updateRepository,
  deleteRepository,
  openRepository,
  cloneRepository,
  refreshRepositoryHealth,
  refreshRepositories,
  getRepositoryHealthStatus
} = useRepositoryOperations()

// ローカル状態
const showForm = ref(false)
const showDetails = ref(false)
const selectedRepository = ref<RepositoryResponse | null>(null)

// ライフサイクル
onMounted(async () => {
  await refreshRepositories()
})

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
  let success = false
  
  if (selectedRepository.value) {
    // 更新: RepositoryCreateからRepositoryUpdateへ変換
    const updateData = {
      name: data.name!,
      owner: data.owner!,
      service_type: data.service_type!,
      url: data.url!,
      base_url: data.base_url,
      default_branch: data.default_branch!,
      repository_root: data.repository_root!,
      document_root_directory: data.document_root_directory?.trim() || null,
      root_document_path: data.root_document_path?.trim() || null,
      root_path: data.root_path?.trim() || null,
      description: data.description?.trim() || null,
      is_public: data.is_public!,
      access_token: data.access_token?.trim() || null,
      metadata: data.metadata || {}
    } as RepositoryUpdate
    
    success = await updateRepository(selectedRepository.value.id, updateData)
  } else {
    success = await createRepository(data)
  }
  
  if (success) {
    showForm.value = false
    selectedRepository.value = null
  }
}

function handleCancelForm() {
  showForm.value = false
  selectedRepository.value = null
}

function handleDeleteRepository(repository: RepositoryResponse) {
  deleteRepository(repository)
}

function handleOpenRepository(repository: RepositoryResponse) {
  openRepository(repository)
}

function handleRefreshRepositories() {
  refreshRepositories()
}

function handleRefreshRepository(repository: RepositoryResponse) {
  refreshRepositoryHealth(repository)
}

function handleCloneRepository(repository: RepositoryResponse) {
  const clonedData = cloneRepository(repository)
  selectedRepository.value = null
  showForm.value = true
  
  // Note: クローン機能は将来のRepositoryFormの改良で完全実装予定
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
  padding-top: var(--app-header-height);
}

.repository-management > *:not(.app-header) {
  padding: var(--app-spacing-lg);
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

// レスポンシブ対応
@media (max-width: 992px) {
  .repository-management {
    padding: 1rem;
  }
}
</style>