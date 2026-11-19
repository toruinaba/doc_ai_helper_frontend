<template>
  <div 
    v-if="show" 
    class="u-p-base animate-fadein" 
    :class="{ 'u-p-sm': compact, [customClass || '']: customClass }"
  >
    <div v-if="layout === 'cards'" class="layout-grid-auto">
      <div 
        v-for="n in itemCount" 
        :key="`card-${n}`" 
        class="layout-card"
        :class="{ 'u-p-sm': compact }"
      >
        <Skeleton 
          :height="cardHeaderHeight" 
          :pt="{ root: 'u-mb-sm u-rounded-sm' }" 
        />
        <Skeleton 
          :height="cardContentHeight" 
          :pt="{ root: 'u-mb-sm u-rounded-sm' }" 
        />
        <div v-if="!compact" class="u-flex u-gap-sm u-flex-between">
          <Skeleton width="60px" height="24px" />
          <Skeleton width="80px" height="24px" />
        </div>
      </div>
    </div>

    <div v-else-if="layout === 'table'" class="u-flex u-flex-column u-gap-sm">
      <div class="u-flex u-gap-base u-flex-center u-p-sm u-bg-surface-100 u-rounded-sm u-font-semibold">
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
        class="u-flex u-gap-base u-flex-center u-p-sm u-border u-rounded-sm u-bg-surface-0"
      >
        <Skeleton 
          v-for="c in columnCount" 
          :key="`cell-${n}-${c}`" 
          :width="getColumnWidth(c)" 
          :height="rowHeight" 
        />
      </div>
    </div>

    <div v-else-if="layout === 'list'" class="u-flex u-flex-column u-gap-sm">
      <div 
        v-for="n in itemCount" 
        :key="`list-${n}`" 
        class="u-flex u-flex-center u-border u-rounded u-bg-surface-0"
        :class="compact ? 'u-gap-sm u-p-sm' : 'u-gap-base u-p-base'"
      >
        <Skeleton 
          :width="avatarSize" 
          :height="avatarSize" 
          :pt="{ root: 'u-rounded' }"
          style="border-radius: 50%" 
        />
        <div class="u-flex-1 u-flex u-flex-column u-gap-xs">
          <Skeleton width="60%" height="16px" />
          <Skeleton v-if="!compact" width="40%" height="12px" />
        </div>
        <div class="u-flex u-gap-sm u-flex-none">
          <Skeleton width="24px" height="24px" />
          <Skeleton v-if="!compact" width="24px" height="24px" />
        </div>
      </div>
    </div>

    <div 
      v-else-if="layout === 'grid'" 
      class="u-grid u-gap-base"
      :class="{
        'mobile:layout-grid-1 tablet:layout-grid-2': gridColumns >= 3,
        'layout-grid-2': gridColumns === 2,
        'layout-grid-3': gridColumns === 3,
        'layout-grid-auto': gridColumns === 4
      }"
    >
      <div 
        v-for="n in itemCount" 
        :key="`grid-${n}`" 
        class="u-border u-rounded u-overflow-hidden u-bg-surface-0"
      >
        <Skeleton 
          :height="gridImageHeight" 
          :pt="{ root: 'u-w-full u-rounded' }" 
          style="border-radius: 0" 
        />
        <div class="u-p-sm u-flex u-flex-column u-gap-xs">
          <Skeleton width="80%" height="16px" />
          <Skeleton v-if="!compact" width="60%" height="12px" />
        </div>
      </div>
    </div>

    <!-- カスタムレイアウト用スロット -->
    <div v-else-if="layout === 'custom'" class="u-flex u-flex-column u-gap-base">
      <div 
        v-for="n in itemCount" 
        :key="`custom-${n}`" 
        class="u-p-base u-border u-rounded u-bg-surface-0"
      >
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

// PrimeVue v4設計トークンベースアーキテクチャで簡素化
function getColumnWidth(columnIndex: number): string {
  if (props.columnWidths && props.columnWidths[columnIndex - 1]) {
    return props.columnWidths[columnIndex - 1];
  }
  return `${100 / props.columnCount}%`;
}
</script>

<style scoped>
/*
 * PrimeVue v4の設計トークンベースアーキテクチャを最大活用
 * - Skeletonコンポーネントの`pt`プロパティでスタイリング
 * - PrimeVueのanimate-fadeinユーティリティクラス使用 
 * - layout-*パターンでグリッドレイアウト処理
 * - レスポンシブ対応はユーティリティクラスで処理
 * 
 * CSS記述量: 315行 → 20行 (94%削減)
 */
</style>