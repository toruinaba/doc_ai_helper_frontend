<template>
  <div class="page-header" :class="{ 'page-header--compact': compact, 'page-header--centered': centered }">
    <div class="page-header-content">
      <div v-if="breadcrumb && breadcrumb.length > 0" class="page-header-breadcrumb">
        <span v-for="(item, index) in breadcrumb" :key="index" class="breadcrumb-item">
          <a v-if="item.to" :href="item.to" class="breadcrumb-link">{{ item.label }}</a>
          <span v-else class="breadcrumb-text">{{ item.label }}</span>
          <i v-if="index < breadcrumb.length - 1" class="pi pi-angle-right breadcrumb-separator"></i>
        </span>
      </div>
      
      <div class="page-title-section">
        <h1 class="page-title">
          <i v-if="icon" :class="icon" class="title-icon"></i>
          {{ title }}
        </h1>
        <p v-if="description" class="page-description">{{ description }}</p>
      </div>
      
      <div v-if="$slots.subtitle || subtitle" class="page-subtitle">
        <slot name="subtitle">
          <span>{{ subtitle }}</span>
        </slot>
      </div>
    </div>
    
    <div v-if="$slots.actions || $slots.default" class="page-header-actions">
      <slot name="actions">
        <slot></slot>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface Props {
  /** ページタイトル */
  title: string;
  /** ページ説明 */
  description?: string;
  /** サブタイトル */
  subtitle?: string;
  /** タイトルアイコン */
  icon?: string;
  /** ブレッドクラム */
  breadcrumb?: BreadcrumbItem[];
  /** コンパクトモード（小さめのスペーシング） */
  compact?: boolean;
  /** センター揃え */
  centered?: boolean;
}

withDefaults(defineProps<Props>(), {
  compact: false,
  centered: false
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--app-spacing-xl);
  padding: var(--app-spacing-lg) 0;
  border-bottom: 1px solid var(--app-surface-border);
  gap: var(--app-spacing-lg);
}

.page-header--compact {
  margin-bottom: var(--app-spacing-lg);
  padding: var(--app-spacing-base) 0;
}

.page-header--centered {
  text-align: center;
  flex-direction: column;
  align-items: center;
}

.page-header--centered .page-header-actions {
  margin-top: var(--app-spacing-base);
}

.page-header-content {
  flex: 1;
  min-width: 0; /* Prevent flex item overflow */
}

.page-header-breadcrumb {
  margin-bottom: var(--app-spacing-sm);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--app-spacing-xs);
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
}

.breadcrumb-link {
  color: var(--app-primary-color);
  text-decoration: none;
  transition: color var(--app-transition-fast);
}

.breadcrumb-link:hover {
  color: var(--app-primary-600);
  text-decoration: underline;
}

.breadcrumb-text {
  color: var(--app-text-color-secondary);
}

.breadcrumb-separator {
  font-size: var(--app-font-size-xs);
  color: var(--app-text-color-muted);
}

.page-title-section {
  margin-bottom: var(--app-spacing-xs);
}

.page-title {
  margin: 0;
  font-size: var(--app-font-size-2xl);
  font-weight: 700;
  color: var(--app-text-color);
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  line-height: 1.2;
}

.title-icon {
  color: var(--app-primary-color);
  font-size: 1.5rem;
}

.page-description {
  margin: var(--app-spacing-xs) 0 0;
  font-size: var(--app-font-size-base);
  color: var(--app-text-color-secondary);
  line-height: 1.4;
}

.page-subtitle {
  margin-top: var(--app-spacing-sm);
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
}

.page-header-actions {
  display: flex;
  align-items: flex-start;
  gap: var(--app-spacing-sm);
  flex-shrink: 0;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--app-spacing-base);
  }
  
  .page-header-actions {
    align-items: stretch;
    justify-content: flex-end;
  }
  
  .page-title {
    font-size: var(--app-font-size-xl);
  }
  
  .page-header-breadcrumb {
    font-size: var(--app-font-size-xs);
  }
}

@media (max-width: 480px) {
  .page-header-actions {
    flex-direction: column;
  }
  
  .page-header-actions :deep(.p-button) {
    width: 100%;
    justify-content: center;
  }
}
</style>