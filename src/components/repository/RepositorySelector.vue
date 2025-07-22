<template>
  <div class="repository-selector">
    <!-- 現在のドキュメント情報表示 -->
    <div v-if="selectedRepository" class="repository-display">
      <div class="repository-info">
        <div class="repo-header">
          <i class="pi pi-folder" />
          <span class="repo-name">{{ selectedRepository.name }}</span>
          <Tag 
            :value="selectedRepository.service_type" 
            :severity="getServiceSeverity(selectedRepository.service_type)"
            class="service-tag"
          />
        </div>
        <div class="repo-path">
          <i class="pi pi-user" />
          <span>{{ selectedRepository.owner }}/{{ selectedRepository.name }}</span>
        </div>
      </div>
    </div>

    <!-- ブランチ選択のみ -->
    <div v-if="selectedRepository" class="branch-control">
      <div class="control-group">
        <label class="control-label">
          <i class="pi pi-code-branch" />
          <span>ブランチ</span>
        </label>
        <Select
          v-model="selectedBranch"
          :options="branchOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="ブランチを選択..."
          class="branch-dropdown"
          @change="onBranchChange"
        />
      </div>
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
import { Button, InputText, Tag } from 'primevue'
import Select from 'primevue/select'
import { useRepositoryStore } from '@/stores/repository.store'
import { useDocumentStore } from '@/stores/document.store'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']

interface Emits {
  branchChange: [branch: string]
}

const emit = defineEmits<Emits>()

// ストアとルーター
const repositoryStore = useRepositoryStore()
const documentStore = useDocumentStore()
const router = useRouter()

// リアクティブな状態
const selectedBranch = ref<string>('')

// コンピューテッド プロパティ
const selectedRepository = computed(() => repositoryStore.selectedRepository)

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
  // 既に選択されているリポジトリがあればブランチを設定
  if (repositoryStore.selectedRepository) {
    selectedBranch.value = repositoryStore.selectedRepository.default_branch
  }
})

// ウォッチャー
watch(selectedRepository, (newRepo) => {
  if (newRepo) {
    selectedBranch.value = newRepo.default_branch
  }
}, { immediate: true })

// メソッド
function getServiceSeverity(service: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
  const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
    'github': 'success',
    'gitlab': 'warning',
    'bitbucket': 'info',
    'forgejo': 'secondary'
  }
  return severityMap[service.toLowerCase()] || 'secondary'
}

function onBranchChange() {
  emit('branchChange', selectedBranch.value)
  
  // ブランチ変更時にリポジトリストアのコンテキストを更新
  if (selectedRepository.value) {
    repositoryStore.updateRepositoryContext({
      ref: selectedBranch.value
    })
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

.repository-display {
  .repository-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    .repo-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      i {
        color: var(--primary-color);
        font-size: 1.1rem;
      }
      
      .repo-name {
        font-weight: 600;
        color: var(--text-color);
        flex: 1;
      }
      
      .service-tag {
        font-size: 0.7rem;
      }
    }
    
    .repo-path {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-color-secondary);
      font-size: 0.9rem;
      
      i {
        font-size: 0.8rem;
        color: var(--primary-color);
      }
    }
  }
}

.branch-control {
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    .control-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-color);
      
      i {
        font-size: 0.8rem;
        color: var(--primary-color);
      }
    }
    
    .branch-dropdown {
      width: 100%;
    }
  }
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