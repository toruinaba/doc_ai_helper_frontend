<template>
  <header class="app-header">
    <div class="app-logo">
      <img src="@/assets/logo.svg" alt="Logo" class="logo-image" />
      <h1 class="app-title">ドキュメントAIヘルパー</h1>
    </div>
    
    <div class="app-center">
      <!-- 選択されたリポジトリの情報表示 -->
      <div 
        v-if="selectedRepository" 
        class="selected-repository clickable"
        @click="navigateToDocument"
        v-tooltip.bottom="'ドキュメント画面に戻る'"
      >
        <i class="pi pi-folder"></i>
        <span class="repo-name">{{ selectedRepository.owner }}/{{ selectedRepository.name }}</span>
        <Tag :value="selectedRepository.service_type" severity="info" size="small" />
      </div>
    </div>
    
    <div class="app-menu">
      <nav class="navigation">
        <router-link to="/" class="nav-link">
          <i class="pi pi-home"></i>
          <span>ホーム</span>
        </router-link>
        <router-link to="/admin/repositories" class="nav-link">
          <i class="pi pi-folder"></i>
          <span>リポジトリ管理</span>
        </router-link>
        <router-link to="/settings" class="nav-link">
          <i class="pi pi-cog"></i>
          <span>設定</span>
        </router-link>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Tag from 'primevue/tag';
import { useRepositoryStore } from '@/stores/repository.store';

const router = useRouter();
const repositoryStore = useRepositoryStore();

const selectedRepository = computed(() => repositoryStore.selectedRepository);

/**
 * 選択されたリポジトリのドキュメント画面に移動
 */
function navigateToDocument() {
  if (selectedRepository.value) {
    // 現在既にそのリポジトリのドキュメント画面にいる場合は何もしない
    const currentRoute = router.currentRoute.value;
    if (currentRoute.name === 'DocumentView' && 
        currentRoute.params.repositoryId === selectedRepository.value.id.toString()) {
      return;
    }
    
    router.push({
      name: 'DocumentView',
      params: { repositoryId: selectedRepository.value.id }
    });
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--app-spacing-sm) var(--app-spacing-base);
  background-color: var(--app-primary-color);
  color: var(--app-surface-0);
  box-shadow: var(--app-shadow-base);
  height: var(--app-header-height);
  position: relative;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  flex: 1;
}

.logo-image {
  height: 2rem;
  width: auto;
  transition: var(--app-transition-fast);
}

.logo-image:hover {
  transform: scale(1.05);
}

.app-title {
  font-size: var(--app-font-size-lg);
  font-weight: 500;
  margin: 0;
  color: var(--app-surface-0);
}

.app-center {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  max-width: 400px;
}

.selected-repository {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  background-color: rgba(255, 255, 255, 0.1);
  padding: var(--app-spacing-xs) var(--app-spacing-sm);
  border-radius: var(--app-border-radius);
  font-size: var(--app-font-size-sm);
  transition: var(--app-transition-fast);
}

.selected-repository.clickable {
  cursor: pointer;
}

.selected-repository.clickable:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: var(--app-shadow-sm);
}

.selected-repository i {
  color: var(--app-surface-0);
}

.repo-name {
  font-weight: 500;
  color: var(--app-surface-0);
}

.app-menu {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.navigation {
  display: flex;
  gap: var(--app-spacing-base);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
  padding: var(--app-spacing-sm) var(--app-spacing-base);
  color: var(--app-surface-0);
  text-decoration: none;
  border-radius: var(--app-border-radius-sm);
  transition: var(--app-transition-fast);
  font-size: var(--app-font-size-sm);
  font-weight: 400;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.nav-link.router-link-active {
  background-color: rgba(255, 255, 255, 0.25);
  font-weight: 600;
  box-shadow: var(--app-shadow-sm);
}
</style>