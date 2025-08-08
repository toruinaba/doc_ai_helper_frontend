<template>
  <div class="repository-list">
    <!-- 検索・フィルター・ソート -->
    <ListControls
      v-model:searchQuery="searchQuery"
      v-model:selectedService="selectedService"
      v-model:sortBy="sortBy"
      v-model:viewMode="viewMode"
      :searchPlaceholder="'リポジトリを検索...'"
      :showServiceFilter="true"
      :customFilters="statusFilter"
      :sortOptions="sortOptionsList"
      :viewModeOptions="viewModeOptionsList"
      :loading="isLoading"
      @update:customFilter="handleStatusFilterChange"
      @refresh="$emit('refresh')"
    />

    <!-- 統計情報 -->
    <StatsSummary
      v-if="showStats"
      :stats="repositoryStats"
      :data="repositories"
      :layout="'grid'"
      :columns="3"
    />

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
    <ListEmptyState
      v-else-if="!isLoading && filteredRepositories.length === 0"
      :type="searchQuery ? 'no-results' : 'no-data'"
      :searchQuery="searchQuery"
      :resourceName="'リポジトリ'"
      :resourceNamePlural="'リポジトリ'"
      :icon="searchQuery ? undefined : 'pi pi-folder-open'"
      :primaryAction="!searchQuery ? addRepositoryAction : undefined"
    />

    <!-- ローディング状態 -->
    <ListLoadingState
      :show="isLoading"
      :layout="'cards'"
      :itemCount="6"
      :cardHeaderHeight="'80px'"
      :cardContentHeight="'100px'"
    />

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
import { Panel, Button, Paginator } from 'primevue'
import RepositoryCard from './RepositoryCard.vue'
import ListControls from '@/components/common/ListControls.vue'
import StatsSummary from '@/components/common/StatsSummary.vue'
import ListEmptyState from '@/components/common/ListEmptyState.vue'
import ListLoadingState from '@/components/common/ListLoadingState.vue'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']
type GitServiceType = components['schemas']['GitServiceType']

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
const selectedService = ref<GitServiceType | null>(null)
const selectedStatus = ref<string | null>(null)
const sortBy = ref('updated_desc')
const viewMode = ref('card')
const currentPage = ref(1)
const pageSize = ref(12)

// ListControls用のオプション
const sortOptionsList = [
  { label: '更新日時（新しい順）', value: 'updated_desc', icon: 'pi pi-sort-numeric-down' },
  { label: '更新日時（古い順）', value: 'updated_asc', icon: 'pi pi-sort-numeric-up' },
  { label: '名前（A-Z）', value: 'name_asc', icon: 'pi pi-sort-alpha-down' },
  { label: '名前（Z-A）', value: 'name_desc', icon: 'pi pi-sort-alpha-up' },
  { label: 'サービス別', value: 'service', icon: 'pi pi-tag' }
]

const viewModeOptionsList = [
  { label: 'カード', value: 'card', icon: 'pi pi-th-large' },
  { label: 'リスト', value: 'list', icon: 'pi pi-list' }
]

const statusFilter = [{
  key: 'status',
  label: '状態',
  options: [
    { label: '正常', value: 'healthy' },
    { label: 'エラー', value: 'unhealthy' },
    { label: '不明', value: 'unknown' }
  ],
  value: selectedStatus.value,
  showClear: true
}]

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

// StatsSummary用のデータ
const repositoryStats = computed(() => [
  {
    key: 'total',
    label: 'リポジトリ',
    getValue: () => filteredRepositories.value.length,
    icon: 'pi pi-folder',
    iconColor: 'var(--app-primary-400)',
    variant: 'primary' as const
  },
  {
    key: 'healthy',
    label: '正常',
    getValue: () => healthyCount.value,
    icon: 'pi pi-check-circle',
    iconColor: 'var(--p-green-500)',
    variant: 'success' as const
  },
  {
    key: 'unhealthy',
    label: 'エラー',
    getValue: () => unhealthyCount.value,
    icon: 'pi pi-exclamation-triangle',
    iconColor: 'var(--p-red-500)',
    variant: 'danger' as const
  }
])

// ListEmptyState用のアクション
const addRepositoryAction = {
  label: 'リポジトリを追加',
  icon: 'pi pi-plus',
  onClick: () => emit('add')
}

// メソッド
function getRepositoryHealth(repositoryId: number): boolean | undefined {
  return props.healthStatus[repositoryId]
}

function onPageChange(event: any) {
  currentPage.value = Math.floor(event.first / event.rows) + 1
  pageSize.value = event.rows
}

// イベントハンドラー
function handleStatusFilterChange(key: string, value: any) {
  if (key === 'status') {
    selectedStatus.value = value
  }
}

// 検索クエリが変更されたらページをリセット
watch(searchQuery, () => {
  currentPage.value = 1
})

// フィルターが変更されたらページをリセット
watch([selectedService, selectedStatus], () => {
  currentPage.value = 1
})

// ビューモード変更イベント
watch(viewMode, (newMode) => {
  emit('viewModeChange', newMode)
})
</script>

<style scoped lang="scss">
.repository-list {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-lg);
}

.repository-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--app-spacing-lg);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.add-repository-card {
  border: 2px dashed var(--app-surface-border);
  cursor: pointer;
  transition: all var(--app-transition-fast);
  
  &:hover {
    border-color: var(--app-primary-400);
    transform: translateY(-2px);
    
    .add-repository-content {
      color: var(--app-primary-400);
    }
  }
  
  .add-repository-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--app-spacing-sm);
    padding: var(--app-spacing-xl);
    color: var(--app-text-color-secondary);
    min-height: 150px;
    
    i {
      font-size: 2rem;
    }
    
    span {
      font-weight: 500;
    }
  }
}


</style>