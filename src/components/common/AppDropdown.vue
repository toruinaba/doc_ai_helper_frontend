<template>
  <Dropdown
    v-bind="$attrs"
    :class="['app-dropdown', $attrs.class]"
    :pt="dropdownPassThrough"
  >
    <!-- value slot のパススルー -->
    <template v-if="$slots.value" #value="slotProps">
      <slot name="value" v-bind="slotProps" />
    </template>
    
    <!-- option slot のパススルー -->
    <template v-if="$slots.option" #option="slotProps">
      <slot name="option" v-bind="slotProps" />
    </template>
    
    <!-- その他のスロットのパススルー -->
    <template v-for="(_, slotName) in $slots" :key="slotName" #[slotName]="slotProps">
      <slot v-if="slotName !== 'value' && slotName !== 'option'" :name="slotName" v-bind="slotProps" />
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import Dropdown from 'primevue/dropdown';

// Props inheritance を有効にして、すべてのDropdownプロパティをサポート
defineOptions({
  inheritAttrs: false
});

// PrimeVue PassThrough を使用してスタイルをオーバーライド
const dropdownPassThrough = {
  root: {
    class: 'app-dropdown-root'
  },
  input: {
    class: 'app-dropdown-input'
  },
  trigger: {
    class: 'app-dropdown-trigger'
  },
  panel: {
    class: 'app-dropdown-panel'
  },
  wrapper: {
    class: 'app-dropdown-wrapper'
  },
  list: {
    class: 'app-dropdown-list'
  },
  item: {
    class: 'app-dropdown-item'
  }
};
</script>

<style>
/* 特定のAppDropdownコンポーネントのみに適用 */
.app-dropdown .app-dropdown-panel {
  background-color: var(--app-surface-0) !important;
  border: 1px solid var(--app-surface-border) !important;
  border-radius: var(--app-border-radius) !important;
  box-shadow: var(--app-shadow-lg) !important;
  z-index: 1100 !important;
  backdrop-filter: none !important;
  
  /* 透明度を完全に削除 */
  opacity: 1 !important;
  
  /* overflow を確実に設定 */
  overflow: hidden !important;
}

.app-dropdown .app-dropdown-wrapper {
  background-color: var(--app-surface-0) !important;
}

.app-dropdown .app-dropdown-list {
  background-color: var(--app-surface-0) !important;
  padding: var(--app-spacing-xs) 0 !important;
}

.app-dropdown .app-dropdown-item {
  padding: var(--app-spacing-sm) var(--app-spacing-base) !important;
  transition: var(--app-transition-fast) !important;
  color: var(--app-text-color) !important;
  background-color: var(--app-surface-0) !important;
}

.app-dropdown .app-dropdown-item:hover {
  background-color: var(--app-surface-100) !important;
  color: var(--app-text-color) !important;
}

.app-dropdown .app-dropdown-item.p-highlight {
  background-color: var(--app-primary-50) !important;
  color: var(--app-primary-600) !important;
}

.app-dropdown .app-dropdown-item.p-focus {
  background-color: var(--app-surface-100) !important;
  box-shadow: none !important;
  outline: none !important;
}

/* Dropdown ルート要素のスタイル */
.app-dropdown .app-dropdown-root {
  border: 1px solid var(--app-surface-border) !important;
  border-radius: var(--app-border-radius) !important;
  background-color: var(--app-surface-0) !important;
  transition: var(--app-transition-fast) !important;
}

.app-dropdown .app-dropdown-root:hover {
  border-color: var(--app-primary-color) !important;
}

.app-dropdown .app-dropdown-root.p-focus {
  border-color: var(--app-primary-color) !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
}

.app-dropdown .app-dropdown-input {
  padding: var(--app-spacing-sm) var(--app-spacing-base) !important;
  color: var(--app-text-color) !important;
  background-color: transparent !important;
}

.app-dropdown .app-dropdown-input::placeholder {
  color: var(--app-text-color-muted) !important;
}

.app-dropdown .app-dropdown-trigger {
  color: var(--app-text-color-secondary) !important;
  padding: 0 var(--app-spacing-sm) !important;
}

.app-dropdown .app-dropdown-trigger:hover {
  color: var(--app-primary-color) !important;
}

/* ローディング状態 */
.app-dropdown .app-dropdown-root.p-disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
}

/* 小さいサイズのバリエーション */
.app-dropdown.p-dropdown-sm .app-dropdown-input {
  padding: var(--app-spacing-xs) var(--app-spacing-sm) !important;
  font-size: var(--app-font-size-sm) !important;
}

/* 大きいサイズのバリエーション */
.app-dropdown.p-dropdown-lg .app-dropdown-input {
  padding: var(--app-spacing-base) var(--app-spacing-lg) !important;
  font-size: var(--app-font-size-lg) !important;
}

/* エラー状態 */
.app-dropdown .app-dropdown-root.p-invalid {
  border-color: #ef4444 !important;
}

.app-dropdown .app-dropdown-root.p-invalid:focus-within {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1) !important;
}
</style>

<style scoped>
.app-dropdown {
  width: 100%;
}
</style>