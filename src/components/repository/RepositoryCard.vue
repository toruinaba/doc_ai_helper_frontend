<template>
  <Card 
    class="u-h-full u-transition repository-card" 
    :class="{
      'u-opacity-70': isLoading,
      'repository-card--unhealthy': healthStatus === 'unhealthy',
      'repository-card--healthy': healthStatus === 'healthy'
    }"
  >
    <!-- カードヘッダー -->
    <template #header>
      <div class="u-flex u-flex-center u-gap-base u-w-full mobile:u-flex-wrap mobile:u-gap-sm">
        <div class="u-flex u-flex-center u-gap-sm u-flex-1 u-min-w-0">
          <i class="pi pi-folder u-text-primary" style="font-size: 1.1rem" />
          <span class="u-font-semibold u-font-base u-text-overflow-ellipsis u-whitespace-nowrap u-overflow-hidden">{{ truncatedName }}</span>
          <div class="u-ml-sm">
            <i 
              :class="statusIcon" 
              :style="{ color: statusColor, fontSize: '0.9rem' }"
              v-tooltip="statusTooltip"
            />
          </div>
        </div>
        <div class="u-flex-none">
          <Tag :value="repository.service_type" :severity="getServiceSeverity(repository.service_type)" />
        </div>
        <div class="u-flex u-flex-center u-gap-xs u-flex-none u-ml-auto mobile:u-ml-0">
          <Button 
            icon="pi pi-cog"
            size="small"
            severity="secondary"
            text
            class="u-p-xs"
            @click="$emit('edit', repository)"
            v-tooltip="'設定'"
          />
          <Button 
            icon="pi pi-ellipsis-v"
            size="small"
            severity="secondary"
            text
            class="u-p-xs"
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
        </div>
      </div>
    </template>

    <!-- カードコンテンツ -->
    <template #content>
      <div class="u-flex u-flex-column u-gap-base u-h-full">
        <!-- リポジトリ情報 -->
        <div class="u-flex u-flex-column u-gap-sm">
          <div class="u-flex u-flex-center u-gap-xs u-text-sm u-text-muted">
            <i class="pi pi-user" />
            <span>{{ repository.owner }}/{{ repository.name }}</span>
          </div>
          
          <!-- 説明文 -->
          <p v-if="repository.description" class="u-text-sm u-text-secondary u-line-height-relaxed u-m-0">
            {{ truncatedDescription }}
          </p>
        </div>

        <!-- リポジトリ統計 -->
        <div class="u-flex u-flex-column u-gap-xs u-flex-1">
          <div class="u-flex u-flex-center u-gap-xs u-text-xs u-text-muted">
            <i class="pi pi-code-branch" />
            <span>{{ repository.default_branch }}</span>
          </div>
          <div class="u-flex u-flex-center u-gap-xs u-text-xs u-text-muted">
            <i class="pi pi-clock" />
            <span>{{ formattedUpdatedAt }}</span>
          </div>
          <div v-if="repository.is_public !== undefined" class="u-flex u-flex-center u-gap-xs u-text-xs u-text-muted">
            <i :class="repository.is_public ? 'pi pi-eye' : 'pi pi-eye-slash'" />
            <span>{{ repository.is_public ? '公開' : '非公開' }}</span>
          </div>
        </div>
        
        <!-- フッターアクション -->
        <div class="u-mt-auto">
          <Button 
            label="開く" 
            size="small"
            @click="$emit('open', repository)"
            :disabled="!isHealthy"
            class="u-w-full"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'
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
 * PrimeVue v4 Cardコンポーネントで最大最適化
 * - Cardの#header, #content, #footerスロット使用
 * - ユーティリティクラスでflex/spacing/responsive処理
 * - mobile:プレフィックスでレスポンシブ対応
 * 
 * CSS記述量: 164行 → 20行 (88%削減)
 */

/* ホバーアニメーション - PrimeVueの標準アニメーション使用 */
.repository-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--app-shadow-lg);
}

/* ヘルスステータスインジケーター */
.repository-card--unhealthy {
  border-left: 4px solid var(--p-red-500);
}

.repository-card--healthy {
  border-left: 4px solid var(--p-green-500);
}
</style>