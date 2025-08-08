<template>
  <div v-if="show" class="list-loading-state" :class="loadingStateClass">
    <div v-if="layout === 'cards'" class="loading-cards">
      <div 
        v-for="n in itemCount" 
        :key="`card-${n}`" 
        class="loading-card"
        :class="{ 'loading-card--compact': compact }"
      >
        <Skeleton class="card-header" :height="cardHeaderHeight" />
        <Skeleton class="card-content" :height="cardContentHeight" />
        <div v-if="!compact" class="card-footer">
          <Skeleton width="60px" height="24px" />
          <Skeleton width="80px" height="24px" />
        </div>
      </div>
    </div>

    <div v-else-if="layout === 'table'" class="loading-table">
      <div class="loading-table-header">
        <Skeleton 
          v-for="n in columnCount" 
          :key="`header-${n}`" 
          :width="getColumnWidth(n)" 
          height="20px" 
        />
      </div>
      <div 
        v-for="n in itemCount" 
        :key="`row-${n}`" 
        class="loading-table-row"
      >
        <Skeleton 
          v-for="c in columnCount" 
          :key="`cell-${n}-${c}`" 
          :width="getColumnWidth(c)" 
          :height="rowHeight" 
        />
      </div>
    </div>

    <div v-else-if="layout === 'list'" class="loading-list">
      <div 
        v-for="n in itemCount" 
        :key="`list-${n}`" 
        class="loading-list-item"
        :class="{ 'loading-list-item--compact': compact }"
      >
        <Skeleton class="list-avatar" :width="avatarSize" :height="avatarSize" />
        <div class="list-content">
          <Skeleton class="list-title" width="60%" height="16px" />
          <Skeleton v-if="!compact" class="list-subtitle" width="40%" height="12px" />
        </div>
        <div class="list-actions">
          <Skeleton width="24px" height="24px" />
          <Skeleton v-if="!compact" width="24px" height="24px" />
        </div>
      </div>
    </div>

    <div v-else-if="layout === 'grid'" class="loading-grid">
      <div 
        v-for="n in itemCount" 
        :key="`grid-${n}`" 
        class="loading-grid-item"
      >
        <Skeleton class="grid-image" :height="gridImageHeight" />
        <div class="grid-content">
          <Skeleton width="80%" height="16px" />
          <Skeleton v-if="!compact" width="60%" height="12px" />
        </div>
      </div>
    </div>

    <!-- カスタムレイアウト用スロット -->
    <div v-else-if="layout === 'custom'" class="loading-custom">
      <div v-for="n in itemCount" :key="`custom-${n}`" class="loading-custom-item">
        <slot name="skeleton-item" :index="n">
          <Skeleton width="100%" height="60px" />
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Skeleton from 'primevue/skeleton';

type LoadingLayout = 'cards' | 'table' | 'list' | 'grid' | 'custom';

interface Props {
  /** 表示するかどうか */
  show?: boolean;
  /** レイアウトタイプ */
  layout?: LoadingLayout;
  /** アイテム数 */
  itemCount?: number;
  /** テーブルの列数 */
  columnCount?: number;
  /** 列幅の配列（テーブル用） */
  columnWidths?: string[];
  /** コンパクトモード */
  compact?: boolean;
  /** カスタムCSSクラス */
  customClass?: string;
  /** カードヘッダーの高さ */
  cardHeaderHeight?: string;
  /** カードコンテンツの高さ */
  cardContentHeight?: string;
  /** 行の高さ（テーブル用） */
  rowHeight?: string;
  /** アバターサイズ（リスト用） */
  avatarSize?: string;
  /** グリッド画像の高さ */
  gridImageHeight?: string;
  /** グリッドの列数 */
  gridColumns?: number;
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  layout: 'cards',
  itemCount: 6,
  columnCount: 4,
  columnWidths: () => ['25%', '25%', '25%', '25%'],
  compact: false,
  cardHeaderHeight: '60px',
  cardContentHeight: '80px',
  rowHeight: '16px',
  avatarSize: '40px',
  gridImageHeight: '120px',
  gridColumns: 3
});

const loadingStateClass = computed(() => {
  const classes = [`loading-layout--${props.layout}`];
  
  if (props.compact) {
    classes.push('list-loading-state--compact');
  }
  
  if (props.customClass) {
    classes.push(props.customClass);
  }
  
  if (props.layout === 'grid') {
    classes.push(`loading-grid--${props.gridColumns}`);
  }
  
  return classes;
});

function getColumnWidth(columnIndex: number): string {
  if (props.columnWidths && props.columnWidths[columnIndex - 1]) {
    return props.columnWidths[columnIndex - 1];
  }
  return `${100 / props.columnCount}%`;
}
</script>

<style scoped>
.list-loading-state {
  padding: var(--app-spacing-base);
}

.list-loading-state--compact {
  padding: var(--app-spacing-sm);
}

/* カードレイアウト */
.loading-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--app-spacing-base);
}

.loading-card {
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius);
  padding: var(--app-spacing-base);
  background: var(--app-surface-0);
}

.loading-card--compact {
  padding: var(--app-spacing-sm);
}

.card-header {
  margin-bottom: var(--app-spacing-sm);
  border-radius: var(--app-border-radius-sm);
}

.card-content {
  margin-bottom: var(--app-spacing-sm);
  border-radius: var(--app-border-radius-sm);
}

.card-footer {
  display: flex;
  gap: var(--app-spacing-sm);
  justify-content: space-between;
}

/* テーブルレイアウト */
.loading-table {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-sm);
}

.loading-table-header,
.loading-table-row {
  display: flex;
  gap: var(--app-spacing-base);
  align-items: center;
  padding: var(--app-spacing-sm);
}

.loading-table-header {
  background: var(--app-surface-100);
  border-radius: var(--app-border-radius-sm);
  font-weight: 600;
}

.loading-table-row {
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius-sm);
  background: var(--app-surface-0);
}

/* リストレイアウト */
.loading-list {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-sm);
}

.loading-list-item {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-base);
  padding: var(--app-spacing-base);
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius);
  background: var(--app-surface-0);
}

.loading-list-item--compact {
  padding: var(--app-spacing-sm);
  gap: var(--app-spacing-sm);
}

.list-avatar {
  flex-shrink: 0;
  border-radius: 50%;
}

.list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-xs);
}

.list-actions {
  display: flex;
  gap: var(--app-spacing-sm);
  flex-shrink: 0;
}

/* グリッドレイアウト */
.loading-grid {
  display: grid;
  gap: var(--app-spacing-base);
}

.loading-grid--2 {
  grid-template-columns: repeat(2, 1fr);
}

.loading-grid--3 {
  grid-template-columns: repeat(3, 1fr);
}

.loading-grid--4 {
  grid-template-columns: repeat(4, 1fr);
}

.loading-grid-item {
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius);
  overflow: hidden;
  background: var(--app-surface-0);
}

.grid-image {
  width: 100%;
  border-radius: 0;
}

.grid-content {
  padding: var(--app-spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-xs);
}

/* カスタムレイアウト */
.loading-custom {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-base);
}

.loading-custom-item {
  padding: var(--app-spacing-base);
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius);
  background: var(--app-surface-0);
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .loading-cards {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
  
  .loading-grid--4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .loading-cards {
    grid-template-columns: 1fr;
  }
  
  .loading-grid--3,
  .loading-grid--4 {
    grid-template-columns: 1fr;
  }
  
  .loading-table-header,
  .loading-table-row {
    gap: var(--app-spacing-sm);
    padding: var(--app-spacing-xs);
  }
  
  .loading-list-item {
    padding: var(--app-spacing-sm);
  }
}

@media (max-width: 480px) {
  .list-loading-state {
    padding: var(--app-spacing-xs);
  }
  
  .loading-grid--2 {
    grid-template-columns: 1fr;
  }
  
  .loading-list-item {
    gap: var(--app-spacing-sm);
  }
  
  .list-actions {
    gap: var(--app-spacing-xs);
  }
}

/* アニメーション */
.list-loading-state {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>