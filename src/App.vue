<script setup lang="ts">
// router-viewを使用してルーティングベースのアプリケーションに変更
</script>

<template>
  <router-view />
</template>

<style>
/* デザイントークン - PrimeVueテーマと連携する統一変数 */
:root {
  /* PrimeVue CSS変数を活用したカラーパレット */
  --app-primary-color: var(--p-primary-color, #3B82F6);
  --app-primary-50: var(--p-primary-50, #EFF6FF);
  --app-primary-100: var(--p-primary-100, #DBEAFE);
  --app-primary-500: var(--p-primary-500, #3B82F6);
  --app-primary-600: var(--p-primary-600, #2563EB);
  --app-primary-700: var(--p-primary-700, #1D4ED8);
  
  --app-surface-0: var(--p-surface-0, #FFFFFF);
  --app-surface-50: var(--p-surface-50, #F9FAFB);
  --app-surface-100: var(--p-surface-100, #F3F4F6);
  --app-surface-200: var(--p-surface-200, #E5E7EB);
  --app-surface-300: var(--p-surface-300, #D1D5DB);
  --app-surface-border: var(--p-surface-border, #E5E7EB);
  
  --app-text-color: var(--p-text-color, #1F2937);
  --app-text-color-secondary: var(--p-text-muted-color, #6B7280);
  --app-text-color-muted: var(--p-text-muted-color, #9CA3AF);
  
  /* スペーシング */
  --app-spacing-xs: 0.25rem;   /* 4px */
  --app-spacing-sm: 0.5rem;    /* 8px */
  --app-spacing-md: 0.75rem;   /* 12px */
  --app-spacing-base: 1rem;    /* 16px */
  --app-spacing-lg: 1.5rem;    /* 24px */
  --app-spacing-xl: 2rem;      /* 32px */
  --app-spacing-2xl: 3rem;     /* 48px */
  
  /* レイアウト */
  --app-header-height: 60px;
  --app-sidebar-width: 280px;
  --app-border-radius: 6px;
  --app-border-radius-sm: 4px;
  --app-border-radius-lg: 8px;
  
  /* シャドウ */
  --app-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --app-shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --app-shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --app-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  /* タイポグラフィ */
  --app-font-family: 'Noto Sans JP', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --app-font-size-xs: 0.75rem;
  --app-font-size-sm: 0.875rem;
  --app-font-size-base: 1rem;
  --app-font-size-lg: 1.125rem;
  --app-font-size-xl: 1.25rem;
  --app-font-size-2xl: 1.5rem;
  --app-font-size-3xl: 1.875rem;
  
  /* アニメーション */
  --app-transition-fast: 150ms ease-in-out;
  --app-transition-base: 200ms ease-in-out;
  --app-transition-slow: 300ms ease-in-out;
}

/* グローバルスタイル */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
  font-family: var(--app-font-family);
  color: var(--app-text-color);
  background-color: var(--app-surface-50);
}

* {
  box-sizing: border-box;
}

/* PrimeVue Dialog モーダルオーバーレイ修正 - デザイントークン適用 */
.p-dialog-mask {
  background-color: rgba(0, 0, 0, 0.4) !important;
  backdrop-filter: blur(2px);
  z-index: 1000 !important;
}

.p-dialog {
  border-radius: var(--app-border-radius-lg);
  box-shadow: var(--app-shadow-lg);
  z-index: 1001 !important;
}

.p-dialog .p-dialog-header {
  padding: var(--app-spacing-base) var(--app-spacing-lg);
}

.p-dialog .p-dialog-content {
  padding: var(--app-spacing-lg);
}

.p-dialog .p-dialog-footer {
  padding: var(--app-spacing-base) var(--app-spacing-lg);
}

.p-confirm-dialog .p-dialog-content {
  padding: var(--app-spacing-base);
}
</style>
