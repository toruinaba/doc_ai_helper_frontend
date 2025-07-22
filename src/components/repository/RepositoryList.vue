<template>
  <div class="repository-list">
    <!-- 検索・フィルター・ソート -->
    <div class="repository-controls">
      <div class="search-section">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText 
            v-model="searchQuery"
            placeholder="リポジトリを検索..."
            class="search-input"
          />
        </IconField>
      </div>
      
      <div class="filter-section">
        <Dropdown 
          v-model="selectedService"
          :options="serviceOptions"
          placeholder="サービス"
          class="service-filter"
          showClear
        />
        <Dropdown 
          v-model="selectedStatus"
          :options="statusOptions"
          placeholder="状態"
          class="status-filter"
          showClear
        />
        <Dropdown 
          v-model="sortBy"
          :options="sortOptions"
          placeholder="並び替え"
          class="sort-dropdown"
        />
      </div>
      
      <div class="view-controls">
        <Button 
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="$emit('refresh')"
          :loading="isLoading"
          v-tooltip="'更新'"
        />
        <SelectButton 
          v-model="viewMode"
          :options="viewModeOptions"
          optionLabel="label"
          optionValue="value"
          @change="$emit('viewModeChange', $event.value)"
        />
      </div>
    </div>

    <!-- 統計情報 -->
    <div v-if="showStats" class="repository-stats-summary">
      <div class="stat-card">
        <span class="stat-number">{{ filteredRepositories.length }}</span>
        <span class="stat-label">リポジトリ</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ healthyCount }}</span>
        <span class="stat-label">正常</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ unhealthyCount }}</span>
        <span class="stat-label">エラー</span>
      </div>
    </div>

    <!-- リポジトリカード一覧 -->
    <div v-if="!isLoading && filteredRepositories.length > 0" class="repository-grid">
      <RepositoryCard
        v-for="repository in paginatedRepositories"
        :key="repository.id"
        :repository="repository"
        :isHealthy="getRepositoryHealth(repository.id)"
        :isLoading="loadingRepositories.includes(repository.id)"
        @open="$emit('open', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @refresh="$emit('refreshRepository', $event)"
        @clone="$emit('clone', $event)"
        @viewDetails="$emit('viewDetails', $event)"
      />
      
      <!-- 新規追加カード -->
      <Panel v-if="showAddCard" class="add-repository-card" @click="$emit('add')">
        <template #default>
          <div class="add-repository-content">
            <i class="pi pi-plus" />
            <span>新規リポジトリ</span>
          </div>
        </template>
      </Panel>
    </div>

    <!-- 空状態 -->
    <div v-else-if="!isLoading && filteredRepositories.length === 0" class="empty-state">
      <i class="pi pi-folder-open" />
      <h3>{{ searchQuery ? '検索結果が見つかりません' : 'リポジトリがありません' }}</h3>
      <p>
        {{ searchQuery 
          ? '検索条件を変更してお試しください' 
          : '新しいリポジトリを追加して始めましょう' 
        }}
      </p>
      <Button 
        v-if="!searchQuery"
        label="リポジトリを追加" 
        icon="pi pi-plus"
        @click="$emit('add')"
      />
    </div>

    <!-- ローディング状態 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-grid">
        <Card v-for="i in 6" :key="i" class="loading-card">
          <template #content>
            <div class="skeleton-content">
              <!-- ヘッダー部分 -->
              <div class="skeleton-header">
                <div class="skeleton-icon">
                  <Skeleton shape="circle" size="2.5rem" />
                </div>
                <div class="skeleton-title-area">
                  <Skeleton width="8rem" height="1.2rem" class="mb-1" />
                  <Skeleton width="6rem" height="0.8rem" />
                </div>
                <Skeleton width="4rem" height="1.5rem" />
              </div>
              
              <!-- 説明部分 -->
              <Skeleton width="100%" height="0.8rem" class="mt-2" />
              <Skeleton width="80%" height="0.8rem" class="mt-1" />
              
              <!-- フッター部分 -->
              <div class="skeleton-footer">
                <Skeleton width="5rem" height="0.8rem" />
                <div class="skeleton-actions">
                  <Skeleton shape="circle" size="2rem" class="mr-1" />
                  <Skeleton shape="circle" size="2rem" class="mr-1" />
                  <Skeleton shape="circle" size="2rem" />
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- ページネーション -->
    <Paginator
      v-if="totalPages > 1"
      :rows="pageSize"
      :totalRecords="filteredRepositories.length"
      :first="(currentPage - 1) * pageSize"
      @page="onPageChange"
      :rowsPerPageOptions="[12, 24, 48]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { 
  Panel, 
  Button, 
  InputText, 
  IconField, 
  InputIcon,
  Dropdown, 
  SelectButton, 
  Paginator,
  Skeleton 
} from 'primevue'
import RepositoryCard from './RepositoryCard.vue'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']

interface Props {
  repositories: RepositoryResponse[]
  healthStatus?: Record<number, boolean>
  isLoading?: boolean
  loadingRepositories?: number[]
  showStats?: boolean
  showAddCard?: boolean
}

interface Emits {
  open: [repository: RepositoryResponse]
  edit: [repository: RepositoryResponse]
  delete: [repository: RepositoryResponse]
  add: []
  refresh: []
  refreshRepository: [repository: RepositoryResponse]
  clone: [repository: RepositoryResponse]
  viewDetails: [repository: RepositoryResponse]
  viewModeChange: [mode: string]
}

const props = withDefaults(defineProps<Props>(), {
  healthStatus: () => ({}),
  isLoading: false,
  loadingRepositories: () => [],
  showStats: true,
  showAddCard: true
})

const emit = defineEmits<Emits>()

// リアクティブな状態
const searchQuery = ref('')
const selectedService = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const sortBy = ref('updated_desc')
const viewMode = ref('card')
const currentPage = ref(1)
const pageSize = ref(12)

// オプション
const serviceOptions = [
  { label: 'GitHub', value: 'github' },
  { label: 'GitLab', value: 'gitlab' },
  { label: 'Bitbucket', value: 'bitbucket' },
  { label: 'Forgejo', value: 'forgejo' }
]

const statusOptions = [
  { label: '正常', value: 'healthy' },
  { label: 'エラー', value: 'unhealthy' },
  { label: '不明', value: 'unknown' }
]

const sortOptions = [
  { label: '更新日時（新しい順）', value: 'updated_desc' },
  { label: '更新日時（古い順）', value: 'updated_asc' },
  { label: '名前（A-Z）', value: 'name_asc' },
  { label: '名前（Z-A）', value: 'name_desc' },
  { label: 'サービス別', value: 'service' }
]

const viewModeOptions = [
  { label: 'カード', value: 'card', icon: 'pi pi-th-large' },
  { label: 'リスト', value: 'list', icon: 'pi pi-list' }
]

// コンピューテッド プロパティ
const filteredRepositories = computed(() => {
  let filtered = props.repositories

  // 検索フィルター
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(repo => 
      repo.name.toLowerCase().includes(query) ||
      repo.owner.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query)
    )
  }

  // サービスフィルター
  if (selectedService.value) {
    filtered = filtered.filter(repo => repo.service_type === selectedService.value)
  }

  // 状態フィルター
  if (selectedStatus.value) {
    filtered = filtered.filter(repo => {
      const health = getRepositoryHealth(repo.id)
      if (selectedStatus.value === 'healthy') return health === true
      if (selectedStatus.value === 'unhealthy') return health === false
      if (selectedStatus.value === 'unknown') return health === undefined
      return true
    })
  }

  // ソート
  return filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'updated_desc':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      case 'updated_asc':
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      case 'name_asc':
        return a.name.localeCompare(b.name)
      case 'name_desc':
        return b.name.localeCompare(a.name)
      case 'service':
        return a.service_type.localeCompare(b.service_type)
      default:
        return 0
    }
  })
})

const paginatedRepositories = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return filteredRepositories.value.slice(startIndex, endIndex)
})

const totalPages = computed(() => Math.ceil(filteredRepositories.value.length / pageSize.value))

const healthyCount = computed(() => 
  props.repositories.filter(repo => getRepositoryHealth(repo.id) === true).length
)

const unhealthyCount = computed(() => 
  props.repositories.filter(repo => getRepositoryHealth(repo.id) === false).length
)

// メソッド
function getRepositoryHealth(repositoryId: number): boolean | undefined {
  return props.healthStatus[repositoryId]
}

function onPageChange(event: any) {
  currentPage.value = Math.floor(event.first / event.rows) + 1
  pageSize.value = event.rows
}

// 検索クエリが変更されたらページをリセット
watch(searchQuery, () => {
  currentPage.value = 1
})

// フィルターが変更されたらページをリセット
watch([selectedService, selectedStatus], () => {
  currentPage.value = 1
})
</script>

<style scoped lang="scss">
.repository-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.repository-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  border: 1px solid var(--surface-border);
  
  .search-section {
    flex: 1;
    min-width: 250px;
    
    .search-input {
      width: 100%;
    }
  }
  
  .filter-section {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    
    .p-dropdown {
      min-width: 120px;
    }
  }
  
  .view-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
}

.repository-stats-summary {
  display: flex;
  gap: 1rem;
  
  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: var(--surface-card);
    border-radius: var(--border-radius);
    border: 1px solid var(--surface-border);
    min-width: 80px;
    
    .stat-number {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--primary-color);
    }
    
    .stat-label {
      font-size: 0.8rem;
      color: var(--text-color-secondary);
      margin-top: 0.25rem;
    }
  }
}

.repository-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.add-repository-card {
  border: 2px dashed var(--surface-border);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    
    .add-repository-content {
      color: var(--primary-color);
    }
  }
  
  .add-repository-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--text-color-secondary);
    min-height: 150px;
    
    i {
      font-size: 2rem;
    }
    
    span {
      font-weight: 500;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--text-color-secondary);
  
  i {
    font-size: 4rem;
    margin-bottom: 1rem;
    color: var(--surface-400);
  }
  
  h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
  }
  
  p {
    margin: 0 0 1.5rem 0;
    max-width: 400px;
  }
}

.loading-state {
  .loading-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
  
  .loading-card {
    height: 200px;
  }
  
  .skeleton-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
  }
  
  .skeleton-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    .skeleton-title-area {
      flex: 1;
    }
  }
  
  .skeleton-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    
    .skeleton-actions {
      display: flex;
      gap: 0.25rem;
    }
  }
}

// レスポンシブ対応
@media (max-width: 768px) {
  .repository-controls {
    flex-direction: column;
    align-items: stretch;
    
    .search-section {
      min-width: auto;
    }
    
    .filter-section {
      justify-content: space-between;
      
      .p-dropdown {
        flex: 1;
        min-width: auto;
      }
    }
    
    .view-controls {
      justify-content: space-between;
    }
  }
  
  .repository-stats-summary {
    justify-content: space-around;
    
    .stat-card {
      flex: 1;
      min-width: auto;
    }
  }
}
</style>