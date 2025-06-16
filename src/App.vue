<script setup lang="ts">
import MainLayout from './components/layout/MainLayout.vue'
</script>

<template>
  <MainLayout />
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
</style>
