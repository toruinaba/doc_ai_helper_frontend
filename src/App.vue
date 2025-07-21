<script setup lang="ts">
// router-viewを使用してルーティングベースのアプリケーションに変更
</script>

<template>
  <router-view />
</template>

<style>
/* グローバルスタイル */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family: 'Noto Sans JP', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #333;
  background-color: #f9f9f9;
  overflow: hidden; /* スクロールバーが全体に表示されないようにする */
}

* {
  box-sizing: border-box;
}

/* PrimeVue Dialog モーダルオーバーレイ修正 */
.p-dialog-mask {
  background-color: rgba(0, 0, 0, 0.4) !important;
  backdrop-filter: blur(2px);
  z-index: 1000 !important;
}

.p-dialog {
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  background-color: white !important;
  border: 1px solid #e5e7eb !important;
  z-index: 1001 !important;
}

.p-dialog .p-dialog-header {
  background-color: white !important;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 1.5rem;
}

.p-dialog .p-dialog-content {
  background-color: white !important;
  padding: 1.5rem;
}

.p-dialog .p-dialog-footer {
  background-color: white !important;
  border-top: 1px solid #e5e7eb;
  padding: 1rem 1.5rem;
}

.p-confirm-dialog .p-dialog-content {
  padding: 1rem;
}
</style>
