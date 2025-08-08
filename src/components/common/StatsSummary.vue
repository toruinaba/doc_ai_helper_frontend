<template>
  <div v-if="show && computedStats.length > 0" class="stats-summary">
    <div class="stats-container" :class="containerClass">
      <div 
        v-for="(stat, index) in computedStats" 
        :key="stat.key || index"
        class="stat-card"
        :class="[`stat-card--${stat.variant || 'default'}`, stat.class]"
      >
        <div class="stat-header">
          <div class="stat-icon-wrapper" v-if="stat.icon">
            <i :class="stat.icon" class="stat-icon" :style="{ color: stat.iconColor }"></i>
          </div>
          <div class="stat-info">
            <h4 class="stat-label">{{ stat.label }}</h4>
            <div class="stat-value" :style="{ color: stat.valueColor }">
              {{ formatStatValue(stat) }}
            </div>
          </div>
        </div>
        
        <div v-if="stat.description" class="stat-description">
          <small>{{ stat.description }}</small>
        </div>
        
        <div v-if="stat.trend" class="stat-trend">
          <i 
            :class="getTrendIcon(stat.trend)" 
            class="trend-icon"
            :style="{ color: getTrendColor(stat.trend) }"
          ></i>
          <span class="trend-text" :style="{ color: getTrendColor(stat.trend) }">
            {{ stat.trend.label || formatTrendValue(stat.trend.value) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

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

const containerClass = computed(() => {
  const classes = [`stats-layout--${props.layout}`];
  
  if (props.layout === 'grid') {
    classes.push(`stats-grid--${props.columns}`);
  }
  
  if (props.compact) {
    classes.push('stats-summary--compact');
  }
  
  return classes;
});

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
.stats-summary {
  margin-bottom: var(--app-spacing-lg);
}

.stats-container {
  display: flex;
  gap: var(--app-spacing-base);
}

.stats-layout--grid {
  display: grid;
  gap: var(--app-spacing-base);
}

.stats-grid--2 {
  grid-template-columns: repeat(2, 1fr);
}

.stats-grid--3 {
  grid-template-columns: repeat(3, 1fr);
}

.stats-grid--4 {
  grid-template-columns: repeat(4, 1fr);
}

.stats-layout--horizontal {
  flex-direction: row;
  flex-wrap: wrap;
}

.stats-layout--vertical {
  flex-direction: column;
}

.stat-card {
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius);
  padding: var(--app-spacing-base);
  transition: all var(--app-transition-fast);
  min-width: 0; /* Prevent flex overflow */
}

.stat-card:hover {
  box-shadow: var(--app-shadow-sm);
  border-color: var(--app-primary-200);
}

.stat-card--primary {
  border-color: var(--app-primary-200);
  background: var(--app-primary-50);
}

.stat-card--success {
  border-color: var(--p-green-200);
  background: var(--p-green-50);
}

.stat-card--warning {
  border-color: var(--p-orange-200);
  background: var(--p-orange-50);
}

.stat-card--danger {
  border-color: var(--p-red-200);
  background: var(--p-red-50);
}

.stat-card--info {
  border-color: var(--p-blue-200);
  background: var(--p-blue-50);
}

.stat-header {
  display: flex;
  align-items: flex-start;
  gap: var(--app-spacing-sm);
  margin-bottom: var(--app-spacing-xs);
}

.stat-icon-wrapper {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: var(--app-surface-100);
  border-radius: var(--app-border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  font-size: 1.2rem;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  margin: 0;
  font-size: var(--app-font-size-sm);
  font-weight: 500;
  color: var(--app-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: var(--app-font-size-xl);
  font-weight: 700;
  color: var(--app-text-color);
  line-height: 1.2;
  margin-top: var(--app-spacing-xs);
}

.stat-description {
  margin-top: var(--app-spacing-xs);
  color: var(--app-text-color-secondary);
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
  margin-top: var(--app-spacing-xs);
  font-size: var(--app-font-size-sm);
}

.trend-icon {
  font-size: var(--app-font-size-xs);
}

.trend-text {
  font-weight: 500;
}

/* コンパクトモード */
.stats-summary--compact .stat-card {
  padding: var(--app-spacing-sm);
}

.stats-summary--compact .stat-icon-wrapper {
  width: 32px;
  height: 32px;
}

.stats-summary--compact .stat-icon {
  font-size: 1rem;
}

.stats-summary--compact .stat-value {
  font-size: var(--app-font-size-lg);
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .stats-grid--4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid--3,
  .stats-grid--4 {
    grid-template-columns: 1fr;
  }
  
  .stats-grid--2 {
    grid-template-columns: 1fr;
  }
  
  .stats-layout--horizontal {
    flex-direction: column;
  }
  
  .stat-header {
    align-items: center;
  }
  
  .stat-value {
    font-size: var(--app-font-size-lg);
  }
}

@media (max-width: 480px) {
  .stats-container {
    gap: var(--app-spacing-sm);
  }
  
  .stat-card {
    padding: var(--app-spacing-sm);
  }
}
</style>