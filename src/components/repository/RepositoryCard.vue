<template>
  <Card class="repository-card" :class="cardClass">
    <!-- カードヘッダー -->
    <template #header>
      <div class="repository-header">
        <div class="repository-title">
          <i class="pi pi-folder" />
          <span class="repository-name">{{ truncatedName }}</span>
          <div class="status-indicator">
            <i 
              :class="statusIcon" 
              :style="{ color: statusColor }"
              v-tooltip="statusTooltip"
            />
          </div>
        </div>
        <div class="repository-service">
          <Tag :value="repository.service_type" :severity="getServiceSeverity(repository.service_type)" />
        </div>
      </div>
    </template>

    <!-- カードコンテンツ -->
    <template #content>
      <div class="repository-content">
        <!-- リポジトリ情報 -->
        <div class="repository-info">
          <div class="repository-path">
            <i class="pi pi-user" />
            <span>{{ repository.owner }}/{{ repository.name }}</span>
          </div>
          
          <!-- 説明文 -->
          <div v-if="repository.description" class="repository-description">
            <p>{{ truncatedDescription }}</p>
          </div>
        </div>

        <!-- リポジトリ統計 -->
        <div class="repository-stats">
          <div class="stat-item">
            <i class="pi pi-code-branch" />
            <span>{{ repository.default_branch }}</span>
          </div>
          <div class="stat-item">
            <i class="pi pi-clock" />
            <span>{{ formattedUpdatedAt }}</span>
          </div>
          <div v-if="repository.is_public !== undefined" class="stat-item">
            <i :class="repository.is_public ? 'pi pi-eye' : 'pi pi-eye-slash'" />
            <span>{{ repository.is_public ? '公開' : '非公開' }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- カードフッター：アクションボタン -->
    <template #footer>
      <div class="repository-actions">
        <Button 
          label="開く" 
          icon="pi pi-external-link"
          size="small"
          @click="$emit('open', repository)"
          :disabled="!isHealthy"
        />
        <Button 
          label="設定" 
          icon="pi pi-cog"
          size="small"
          severity="secondary"
          outlined
          @click="$emit('edit', repository)"
        />
        <Button 
          icon="pi pi-ellipsis-v"
          size="small"
          severity="secondary"
          text
          @click="toggleMenu"
          aria-haspopup="true"
          aria-controls="repository-menu"
        />
        
        <!-- ドロップダウンメニュー -->
        <Menu 
          ref="menu" 
          id="repository-menu"
          :model="menuItems" 
          :popup="true" 
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Button, Tag, Menu, type MenuItem } from 'primevue'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']

interface Props {
  repository: RepositoryResponse
  isHealthy?: boolean
  isLoading?: boolean
}

interface Emits {
  open: [repository: RepositoryResponse]
  edit: [repository: RepositoryResponse]
  delete: [repository: RepositoryResponse]
  refresh: [repository: RepositoryResponse]
  clone: [repository: RepositoryResponse]
  viewDetails: [repository: RepositoryResponse]
}

const props = withDefaults(defineProps<Props>(), {
  isHealthy: true,
  isLoading: false
})

const emit = defineEmits<Emits>()

// テンプレート参照
const menu = ref<Menu>()

// コンピューテッド プロパティ
const truncatedName = computed(() => {
  const maxLength = 20
  return props.repository.name.length > maxLength 
    ? props.repository.name.substring(0, maxLength) + '...'
    : props.repository.name
})

const truncatedDescription = computed(() => {
  if (!props.repository.description) return ''
  const maxLength = 100
  return props.repository.description.length > maxLength
    ? props.repository.description.substring(0, maxLength) + '...'
    : props.repository.description
})

const formattedUpdatedAt = computed(() => {
  const date = new Date(props.repository.updated_at)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    return '1時間以内'
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}時間前`
  } else if (diffInHours < 168) { // 1週間
    return `${Math.floor(diffInHours / 24)}日前`
  } else {
    return date.toLocaleDateString('ja-JP')
  }
})

const statusIcon = computed(() => {
  if (props.isLoading) return 'pi pi-spin pi-spinner'
  return props.isHealthy ? 'pi pi-check-circle' : 'pi pi-times-circle'
})

const statusColor = computed(() => {
  if (props.isLoading) return '#6366f1'
  return props.isHealthy ? '#10b981' : '#ef4444'
})

const statusTooltip = computed(() => {
  if (props.isLoading) return '同期中...'
  return props.isHealthy ? '正常' : 'エラー: 接続できません'
})

const cardClass = computed(() => ({
  'repository-card--healthy': props.isHealthy && !props.isLoading,
  'repository-card--unhealthy': !props.isHealthy && !props.isLoading,
  'repository-card--loading': props.isLoading
}))

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

function toggleMenu(event: Event) {
  menu.value?.toggle(event)
}

// メニュー項目
const menuItems = computed<MenuItem[]>(() => [
  {
    label: '再同期',
    icon: 'pi pi-refresh',
    command: () => emit('refresh', props.repository)
  },
  {
    label: '詳細情報',
    icon: 'pi pi-info-circle',
    command: () => emit('viewDetails', props.repository)
  },
  {
    label: 'ブランチ変更',
    icon: 'pi pi-code-branch',
    command: () => {} // TODO: ブランチ変更機能
  },
  {
    separator: true
  },
  {
    label: '複製',
    icon: 'pi pi-copy',
    command: () => emit('clone', props.repository)
  },
  {
    label: '削除',
    icon: 'pi pi-trash',
    command: () => emit('delete', props.repository),
    style: 'color: var(--red-500)'
  }
])
</script>

<style scoped lang="scss">
.repository-card {
  height: 100%;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &--loading {
    opacity: 0.7;
  }
  
  &--unhealthy {
    border-left: 4px solid var(--red-500);
  }
  
  &--healthy {
    border-left: 4px solid var(--green-500);
  }
}

.repository-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  
  .repository-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    
    .pi-folder {
      color: var(--primary-color);
      font-size: 1.1rem;
    }
    
    .repository-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .status-indicator {
      margin-left: auto;
      
      i {
        font-size: 0.9rem;
      }
    }
  }
  
  .repository-service {
    flex-shrink: 0;
  }
}

.repository-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 120px;
}

.repository-info {
  .repository-path {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-secondary);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    
    .pi-user {
      font-size: 0.8rem;
    }
  }
  
  .repository-description {
    p {
      margin: 0;
      color: var(--text-color-secondary);
      font-size: 0.9rem;
      line-height: 1.4;
    }
  }
}

.repository-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: auto;
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-color-secondary);
    font-size: 0.8rem;
    
    i {
      font-size: 0.7rem;
    }
  }
}

.repository-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  
  :deep(.p-button) {
    flex: 1;
    
    &:last-child {
      flex: 0;
      min-width: auto;
    }
  }
}

// レスポンシブ対応
@media (max-width: 768px) {
  .repository-header {
    flex-direction: column;
    gap: 0.5rem;
    
    .repository-title {
      width: 100%;
    }
  }
  
  .repository-actions {
    flex-direction: column;
    
    :deep(.p-button) {
      width: 100%;
    }
  }
}
</style>