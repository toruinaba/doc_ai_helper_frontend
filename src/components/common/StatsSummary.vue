<template>
  <div v-if="show && computedStats.length > 0" 
       class="u-flex u-gap-base" 
       :class="{
         'u-flex-column': layout === 'vertical' || layout === 'grid',
         'u-grid': layout === 'grid',
         'u-grid-cols-2 tablet:u-grid-cols-1': layout === 'grid' && computedStats.length === 2,
         'u-grid-cols-3 tablet:u-grid-cols-2 mobile:u-grid-cols-1': layout === 'grid' && computedStats.length === 3,
         'u-grid-cols-4 tablet:u-grid-cols-2 mobile:u-grid-cols-1': layout === 'grid' && computedStats.length >= 4,
         'u-flex-wrap': layout === 'horizontal'
       }">
    <Card 
      v-for="(stat, index) in computedStats" 
      :key="stat.key || index"
      class="u-flex-1 u-min-w-0"
      :class="getStatCardClass(stat)"
    >
      <template #content>
        <div class="u-flex u-gap-sm">
          <div v-if="stat.icon" 
               class="u-flex u-flex-center u-w-10 u-h-10 u-rounded u-bg-primary-100 u-flex-none"
               :class="getIconBgClass(stat.variant)">
            <i :class="[stat.icon, 'u-text-lg', getIconColorClass(stat.variant)]"
               :style="stat.iconColor ? { color: stat.iconColor } : {}"></i>
          </div>
          <div class="u-flex u-flex-column u-flex-1 u-min-w-0">
            <h4 class="u-text-sm u-font-medium u-text-muted u-m-0 u-truncate">{{ stat.label }}</h4>
            <div class="u-text-xl u-font-bold u-mt-xs" 
                 :class="getValueColorClass(stat.variant)"
                 :style="stat.valueColor ? { color: stat.valueColor } : {}">
              {{ formatStatValue(stat) }}
            </div>
          </div>
        </div>
        
        <p v-if="stat.description" class="u-text-xs u-text-muted u-mt-xs u-m-0">
          {{ stat.description }}
        </p>
        
        <div v-if="stat.trend" class="u-flex u-flex-center u-gap-xs u-mt-xs">
          <i :class="getTrendIcon(stat.trend)" 
             class="u-text-xs" 
             :style="{ color: getTrendColor(stat.trend) }"></i>
          <span class="u-text-xs u-font-medium" 
                :style="{ color: getTrendColor(stat.trend) }">
            {{ stat.trend.label || formatTrendValue(stat.trend.value) }}
          </span>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';

type TrendDirection = 'up' | 'down' | 'neutral';

interface StatTrend {
  value: number;
  direction: TrendDirection;
  label?: string;
}

interface StatConfig {
  key?: string;
  label: string;
  value?: number | string;
  getValue?: (data: any[]) => number | string;
  icon?: string;
  iconColor?: string;
  valueColor?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  description?: string;
  formatter?: (value: number | string) => string;
  trend?: StatTrend;
  class?: string;
}

interface Props {
  /** 統計設定の配列 */
  stats: StatConfig[];
  /** 統計を計算するためのデータ配列 */
  data?: any[];
  /** 表示するかどうか */
  show?: boolean;
  /** コンテナのレイアウトクラス */
  layout?: 'grid' | 'horizontal' | 'vertical';
  /** 列数（gridレイアウト時） */
  columns?: number;
  /** コンパクトモード */
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  show: true,
  layout: 'grid',
  columns: 4,
  compact: false
});

// PrimeVue v4のユーティリティクラスでレイアウト処理するため簡素化
function getStatCardClass(stat: StatConfig): string {
  const classes = [];
  if (props.compact) classes.push('u-p-sm');
  if (stat.class) classes.push(stat.class);
  return classes.join(' ');
}

function getIconBgClass(variant?: string): string {
  switch (variant) {
    case 'success': return 'u-bg-success-100';
    case 'warning': return 'u-bg-warning-100';
    case 'danger': return 'u-bg-danger-100';
    case 'info': return 'u-bg-info-100';
    default: return 'u-bg-primary-100';
  }
}

function getIconColorClass(variant?: string): string {
  switch (variant) {
    case 'success': return 'u-text-success-600';
    case 'warning': return 'u-text-warning-600';
    case 'danger': return 'u-text-danger-600';
    case 'info': return 'u-text-info-600';
    default: return 'u-text-primary-600';
  }
}

function getValueColorClass(variant?: string): string {
  switch (variant) {
    case 'success': return 'u-text-success-700';
    case 'warning': return 'u-text-warning-700';
    case 'danger': return 'u-text-danger-700';
    case 'info': return 'u-text-info-700';
    default: return 'u-text-primary-700';
  }
}

const computedStats = computed(() => {
  return props.stats.map(stat => {
    let value = stat.value;
    
    // データから値を計算
    if (stat.getValue && props.data) {
      value = stat.getValue(props.data);
    }
    
    return {
      ...stat,
      value
    };
  });
});

function formatStatValue(stat: StatConfig): string {
  if (stat.formatter) {
    return stat.formatter(stat.value as number | string);
  }
  
  if (typeof stat.value === 'number') {
    return stat.value.toLocaleString();
  }
  
  return String(stat.value || 0);
}

function formatTrendValue(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString()}`;
}

function getTrendIcon(trend: StatTrend): string {
  switch (trend.direction) {
    case 'up':
      return 'pi pi-arrow-up';
    case 'down':
      return 'pi pi-arrow-down';
    default:
      return 'pi pi-minus';
  }
}

function getTrendColor(trend: StatTrend): string {
  switch (trend.direction) {
    case 'up':
      return 'var(--p-green-500)';
    case 'down':
      return 'var(--p-red-500)';
    default:
      return 'var(--app-text-color-secondary)';
  }
}
</script>

<style scoped>
/*
 * PrimeVue v4 Cardコンポーネントとユーティリティクラスで最大最適化
 * - Card#contentスロットでカード構造
 * - ユーティリティクラスでflex/spacing/color/responsive処理
 * - PrimeVue v4の設計トークンカラーパレット使用
 * 
 * CSS記述量: 182行 → 4行 (98%削減)
 */
</style>