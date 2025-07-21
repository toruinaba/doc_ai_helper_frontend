<template>
  <div class="repository-selector">
    <!-- セレクター本体 -->
    <div class="selector-container">
      <label class="selector-label">
        <i class="pi pi-folder" />
        <span>リポジトリ</span>
      </label>
      
      <Dropdown
        v-model="selectedRepositoryId"
        :options="repositoryOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="リポジトリを選択..."
        :loading="repositoryStore.isLoading"
        class="repository-dropdown"
        @change="onRepositoryChange"
      >
        <template #value="{ value, placeholder }">
          <div v-if="value" class="selected-repo-display">
            <i class="pi pi-folder" />
            <span class="repo-name">{{ getSelectedRepositoryLabel(value) }}</span>
            <Tag 
              :value="getSelectedRepositoryService(value)" 
              :severity="getServiceSeverity(getSelectedRepositoryService(value))"
              class="service-tag"
            />
          </div>
          <span v-else>{{ placeholder }}</span>
        </template>
        
        <template #option="{ option }">
          <div class="repo-option">
            <div class="repo-info">
              <span class="repo-name">{{ option.repository.name }}</span>
              <span class="repo-owner">{{ option.repository.owner }}</span>
            </div>
            <div class="repo-meta">
              <Tag 
                :value="option.repository.service_type" 
                :severity="getServiceSeverity(option.repository.service_type)"
                size="small"
              />
              <i 
                :class="getHealthIcon(option.repository.id)"
                :style="{ color: getHealthColor(option.repository.id) }"
                v-tooltip="getHealthTooltip(option.repository.id)"
              />
            </div>
          </div>
        </template>
        
        <template #empty>
          <div class="empty-message">
            <i class="pi pi-folder-open" />
            <span>リポジトリが登録されていません</span>
            <Button 
              label="リポジトリを追加" 
              icon="pi pi-plus"
              size="small"
              text
              @click="navigateToRepositoryManagement"
            />
          </div>
        </template>
      </Dropdown>
    </div>

    <!-- ブランチ・パス選択 -->
    <div v-if="selectedRepository" class="additional-controls">
      <div class="control-group">
        <label class="control-label">
          <i class="pi pi-code-branch" />
          <span>ブランチ</span>
        </label>
        <Dropdown
          v-model="selectedBranch"
          :options="branchOptions"
          placeholder="ブランチを選択..."
          class="branch-dropdown"
          @change="onBranchChange"
        />
      </div>

      <div class="control-group">
        <label class="control-label">
          <i class="pi pi-folder" />
          <span>パス</span>
        </label>
        <InputText
          v-model="currentPath"
          placeholder="docs/README.md"
          class="path-input"
          @keyup.enter="onPathChange"
        />
      </div>
    </div>

    <!-- アクションボタン -->
    <div v-if="selectedRepository" class="action-buttons">
      <Button
        icon="pi pi-refresh"
        severity="secondary"
        size="small"
        outlined
        @click="refreshRepository"
        :loading="isRefreshing"
        v-tooltip="'リポジトリ情報を更新'"
      />
      <Button
        icon="pi pi-cog"
        severity="secondary"
        size="small"
        outlined
        @click="openRepositorySettings"
        v-tooltip="'リポジトリ設定'"
      />
    </div>

    <!-- 状態インジケータ -->
    <div v-if="selectedRepository && connectionStatus" class="status-indicator">
      <div class="status-item">
        <i :class="connectionStatus.icon" :style="{ color: connectionStatus.color }" />
        <span class="status-text">{{ connectionStatus.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Dropdown, Button, InputText, Tag } from 'primevue'
import { useRepositoryStore } from '@/stores/repository.store'
import { useDocumentStore } from '@/stores/document.store'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']

interface Emits {
  repositoryChange: [repository: RepositoryResponse | null]
  branchChange: [branch: string]
  pathChange: [path: string]
}

const emit = defineEmits<Emits>()

// ストアとルーター
const repositoryStore = useRepositoryStore()
const documentStore = useDocumentStore()
const router = useRouter()

// リアクティブな状態
const selectedRepositoryId = ref<number | null>(null)
const selectedBranch = ref<string>('')
const currentPath = ref<string>('')
const isRefreshing = ref(false)

// コンピューテッド プロパティ
const repositoryOptions = computed(() => 
  repositoryStore.repositories.map(repo => ({
    label: `${repo.owner}/${repo.name}`,
    value: repo.id,
    repository: repo
  }))
)

const selectedRepository = computed(() => 
  repositoryStore.repositories.find(repo => repo.id === selectedRepositoryId.value) || null
)

const branchOptions = computed(() => {
  if (!selectedRepository.value) return []
  
  return selectedRepository.value.supported_branches.map(branch => ({
    label: branch,
    value: branch
  }))
})

const connectionStatus = computed(() => {
  if (!selectedRepository.value) return null
  
  const health = repositoryStore.healthStatus[selectedRepository.value.id]
  
  if (health === undefined) {
    return {
      icon: 'pi pi-question-circle',
      color: '#6b7280',
      message: '状態不明'
    }
  }
  
  if (health === true) {
    return {
      icon: 'pi pi-check-circle',
      color: '#10b981',
      message: '接続正常'
    }
  }
  
  return {
    icon: 'pi pi-times-circle',
    color: '#ef4444',
    message: '接続エラー'
  }
})

// ライフサイクル
onMounted(async () => {
  // リポジトリ一覧を読み込み
  if (repositoryStore.repositories.length === 0) {
    await repositoryStore.fetchRepositories()
  }
  
  // 既に選択されているリポジトリがあればそれを設定
  if (repositoryStore.selectedRepository) {
    selectedRepositoryId.value = repositoryStore.selectedRepository.id
    selectedBranch.value = repositoryStore.selectedRepository.default_branch
  }
  
  // ヘルスチェック
  await repositoryStore.checkMultipleRepositoryHealth()
})

// ウォッチャー
watch(selectedRepository, (newRepo) => {
  if (newRepo) {
    repositoryStore.selectRepository(newRepo)
    selectedBranch.value = newRepo.default_branch
    currentPath.value = ''
    emit('repositoryChange', newRepo)
  } else {
    emit('repositoryChange', null)
  }
}, { immediate: true })

// メソッド
function getSelectedRepositoryLabel(repositoryId: number): string {
  const repo = repositoryStore.repositories.find(r => r.id === repositoryId)
  return repo ? `${repo.owner}/${repo.name}` : ''
}

function getSelectedRepositoryService(repositoryId: number): string {
  const repo = repositoryStore.repositories.find(r => r.id === repositoryId)
  return repo?.service_type || ''
}

function getServiceSeverity(service: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
  const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
    'github': 'success',
    'gitlab': 'warning',
    'bitbucket': 'info',
    'forgejo': 'secondary'
  }
  return severityMap[service.toLowerCase()] || 'secondary'
}

function getHealthIcon(repositoryId: number): string {
  const health = repositoryStore.healthStatus[repositoryId]
  if (health === undefined) return 'pi pi-question-circle'
  return health ? 'pi pi-check-circle' : 'pi pi-times-circle'
}

function getHealthColor(repositoryId: number): string {
  const health = repositoryStore.healthStatus[repositoryId]
  if (health === undefined) return '#6b7280'
  return health ? '#10b981' : '#ef4444'
}

function getHealthTooltip(repositoryId: number): string {
  const health = repositoryStore.healthStatus[repositoryId]
  if (health === undefined) return '状態不明'
  return health ? '接続正常' : '接続エラー'
}

function onRepositoryChange() {
  // selectedRepositoryのウォッチャーで処理される
}

function onBranchChange() {
  emit('branchChange', selectedBranch.value)
  updateDocumentContext()
}

function onPathChange() {
  emit('pathChange', currentPath.value)
  updateDocumentContext()
}

async function refreshRepository() {
  if (!selectedRepository.value) return
  
  isRefreshing.value = true
  try {
    await repositoryStore.checkRepositoryHealth(selectedRepository.value)
  } finally {
    isRefreshing.value = false
  }
}

function openRepositorySettings() {
  // 将来の実装: リポジトリ設定ダイアログを開く
  console.log('リポジトリ設定を開く（未実装）')
}

function navigateToRepositoryManagement() {
  router.push('/repositories')
}

function updateDocumentContext() {
  if (!selectedRepository.value) return
  
  // ドキュメントストアのコンテキストを更新
  const context = repositoryStore.createContextFromRepository(
    selectedRepository.value,
    {
      ref: selectedBranch.value,
      current_path: currentPath.value
    }
  )
  
  // ドキュメント読み込みをトリガー
  if (currentPath.value) {
    documentStore.fetchDocument(currentPath.value)
  }
}
</script>

<style scoped lang="scss">
.repository-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  border: 1px solid var(--surface-border);
}

.selector-container {
  .selector-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    
    i {
      color: var(--primary-color);
    }
  }
  
  .repository-dropdown {
    width: 100%;
  }
}

.selected-repo-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  i {
    color: var(--primary-color);
  }
  
  .repo-name {
    flex: 1;
    font-weight: 500;
  }
  
  .service-tag {
    font-size: 0.7rem;
  }
}

.repo-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  
  .repo-info {
    display: flex;
    flex-direction: column;
    
    .repo-name {
      font-weight: 500;
      color: var(--text-color);
    }
    
    .repo-owner {
      font-size: 0.8rem;
      color: var(--text-color-secondary);
    }
  }
  
  .repo-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    i {
      font-size: 0.8rem;
    }
  }
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--text-color-secondary);
  
  i {
    font-size: 1.5rem;
    color: var(--surface-400);
  }
}

.additional-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    
    .control-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-color-secondary);
      
      i {
        font-size: 0.7rem;
        color: var(--primary-color);
      }
    }
    
    .branch-dropdown,
    .path-input {
      width: 100%;
    }
  }
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.status-indicator {
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--surface-ground);
    border-radius: var(--border-radius);
    border: 1px solid var(--surface-border);
    
    i {
      font-size: 0.8rem;
    }
    
    .status-text {
      font-size: 0.8rem;
      color: var(--text-color-secondary);
    }
  }
}

// レスポンシブ対応
@media (max-width: 768px) {
  .repository-selector {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .additional-controls {
    gap: 0.5rem;
  }
  
  .action-buttons {
    justify-content: center;
  }
}
</style>