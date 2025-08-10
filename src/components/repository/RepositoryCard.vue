<template>
  <Panel 
    class="repository-card" 
    :class="{
      'u-opacity-70': isLoading,
      'repository-card--unhealthy': healthStatus === 'unhealthy',
      'repository-card--healthy': healthStatus === 'healthy',
      'repository-card--simple': props.layout === 'simple'
    }"
    :toggleable="false"
  >
    <!-- パネルヘッダー -->
    <template #header>
      <div class="flex items-center gap-2">
        <Avatar icon="pi pi-folder" size="small" style="background-color: var(--p-primary-color); color: var(--p-primary-contrast)" />
        <span class="font-semibold truncate">{{ truncatedName }}</span>
        <div v-if="props.layout === 'detailed'">
          <i 
            :class="statusIcon" 
            :style="{ color: statusColor, fontSize: '0.9rem' }"
            v-tooltip="statusTooltip"
          />
        </div>
      </div>
    </template>
    
    <!-- 管理アクション -->
    <template v-if="props.layout === 'detailed'" #icons>
      <Button 
        icon="pi pi-cog"
        size="small"
        severity="secondary"
        text
        @click="$emit('edit', repository)"
        v-tooltip="'設定'"
      />
      <Button 
        icon="pi pi-ellipsis-v"
        size="small"
        severity="secondary"
        text
        @click="toggleMenu"
        aria-haspopup="true"
        aria-controls="repository-menu"
        v-tooltip="'その他'"
      />
      
      <!-- ドロップダウンメニュー -->
      <Menu 
        ref="menu" 
        id="repository-menu"
        :model="menuItems" 
        :popup="true" 
      />
    </template>

    <!-- パネルコンテンツ -->
    <div class="flex flex-col gap-4">
      <!-- リポジトリ基本情報 -->
      <div class="flex items-center justify-between">
        <span class="text-sm text-surface-500 dark:text-surface-400">{{ repository.owner }}</span>
        <Tag 
          :value="repository.service_type" 
          :severity="getServiceSeverity(repository.service_type)"
          :size="props.layout === 'simple' ? 'small' : undefined" 
        />
      </div>
      
      <!-- 説明文 -->
      <div v-if="repository.description">
        <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed m-0">
          {{ truncatedDescription }}
        </p>
      </div>
      
      <!-- メタ情報 -->
      <div class="flex flex-col gap-2 flex-1">
        <div class="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
          <Avatar icon="pi pi-code-branch" size="small" style="background-color: var(--p-surface-200); color: var(--p-text-color); width: 16px; height: 16px; font-size: 0.75rem" />
          <span>{{ repository.default_branch }}</span>
        </div>
        <div v-if="props.layout === 'detailed'" class="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
          <Avatar icon="pi pi-clock" size="small" style="background-color: var(--p-surface-200); color: var(--p-text-color); width: 16px; height: 16px; font-size: 0.75rem" />
          <span>{{ formattedUpdatedAt }}</span>
        </div>
        <div class="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
          <Avatar :icon="repository.is_public ? 'pi pi-globe' : 'pi pi-lock'" size="small" :style="repository.is_public ? 'background-color: var(--p-green-200); color: var(--p-green-700); width: 16px; height: 16px; font-size: 0.75rem' : 'background-color: var(--p-orange-200); color: var(--p-orange-700); width: 16px; height: 16px; font-size: 0.75rem'" />
          <span>{{ repository.is_public ? '公開' : '非公開' }}</span>
        </div>
      </div>
    </div>
    
    <!-- パネルフッター -->
    <template #footer>
      <div class="flex justify-end">
        <Button 
          label="開く" 
          size="small"
          @click="$emit('open', repository)"
          :disabled="!isHealthy"
          :class="props.layout === 'detailed' ? 'w-full' : ''"
        />
      </div>
    </template>
  </Panel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'
import type { components } from '@/services/api/types.auto'

type RepositoryResponse = components['schemas']['RepositoryResponse']

interface Props {
  repository: RepositoryResponse
  isHealthy?: boolean
  isLoading?: boolean
  /** レイアウトモード: 'detailed' (管理画面用) | 'simple' (ホーム画面用) */
  layout?: 'detailed' | 'simple'
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
  isLoading: false,
  layout: 'detailed'
})

const emit = defineEmits<Emits>()

// テンプレート参照
const menu = ref<typeof Menu>()

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

// PrimeVue v4 Cardコンポーネントとユーティリティクラスでスタイリング処理するため簡素化
// cardClassはテンプレートで直接使用
const healthStatus = computed(() => {
  if (props.isLoading) return 'loading'
  return props.isHealthy ? 'healthy' : 'unhealthy'
})

// メソッド
function getServiceIcon(service: string): string {
  const iconMap: Record<string, string> = {
    'github': 'pi pi-github',
    'gitlab': 'pi pi-code-branch', // GitLab specific icon not available, using code-branch
    'bitbucket': 'pi pi-code', // Bitbucket specific icon not available, using code
    'forgejo': 'pi pi-server' // Forgejo specific icon not available, using server
  }
  return iconMap[service.toLowerCase()] || 'pi pi-server'
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

function toggleMenu(event: Event) {
  if (menu.value && typeof (menu.value as any).toggle === 'function') {
    (menu.value as any).toggle(event);
  }
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

<style scoped>
/*
 * PrimeVue Panel ネイティブスタイル使用
 * - デフォルトのPanelレイアウトとパディング保持
 * - 必要最小限のカスタマイズのみ
 */

/* ホバーアニメーション */
.repository-card:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* ヘルスステータスインジケーター */
.repository-card--unhealthy {
  border-left: 4px solid var(--p-red-500);
}

.repository-card--healthy {
  border-left: 4px solid var(--p-green-500);
}

/* レスポンシブ調整 - モバイル対応 */
@media (max-width: 768px) {
  .repository-card .p-panel-header .flex {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .repository-card--simple .p-panel-footer .p-button {
    width: 100%;
  }
}
</style>