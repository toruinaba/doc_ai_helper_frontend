<template>
  <header style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem;">
    <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
      <router-link to="/" style="display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: inherit;">
        <img src="@/assets/logo.svg" alt="Logo" class="logo-image" />
        <h1 style="margin: 0; font-size: 1.25rem; font-weight: 600;">ドキュメントAIヘルパー</h1>
      </router-link>
    </div>
    
    <div style="display: flex; align-items: center; justify-content: center; flex: 1;">
      <!-- 選択されたリポジトリの情報表示 -->
      <div 
        v-if="selectedRepository" 
        style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; cursor: pointer; background-color: var(--p-surface-100); border: 1px solid var(--p-surface-200);"
        @click="navigateToDocument"
        v-tooltip.bottom="'ドキュメント画面に戻る'"
      >
        <i class="pi pi-folder"></i>
        <span style="font-weight: 500;">{{ selectedRepository.owner }}/{{ selectedRepository.name }}</span>
        <Tag :value="selectedRepository.service_type" severity="info" size="small" />
      </div>
    </div>
    
    <!-- デスクトップ用メニュー -->
    <div style="flex: 1; display: flex; justify-content: flex-end;">
      <nav style="display: flex; gap: 0.5rem;">
        <router-link to="/admin/repositories" style="display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; text-decoration: none; color: inherit; transition: background-color 0.15s;">
          <i class="pi pi-folder"></i>
          <span>ドキュメント管理</span>
        </router-link>
        <router-link to="/settings" style="display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; text-decoration: none; color: inherit; transition: background-color 0.15s;">
          <i class="pi pi-cog"></i>
          <span>設定</span>
        </router-link>
      </nav>
    </div>

    <!-- モバイル用ハンバーガーメニュー -->
    <div class="mobile-menu">
      <Button 
        icon="pi pi-bars" 
        class="hamburger-button"
        @click="toggleMobileMenu"
        :class="{ 'active': showMobileMenu }"
        severity="secondary"
        text
      />
      
      <!-- モバイルメニューオーバーレイ -->
      <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="closeMobileMenu">
        <div class="mobile-menu-content" @click.stop>
          <div class="mobile-menu-header">
            <h3>メニュー</h3>
            <Button 
              icon="pi pi-times" 
              class="close-button"
              @click="closeMobileMenu"
              severity="secondary"
              text
            />
          </div>
          
          <nav class="mobile-navigation">
            <router-link 
              to="/admin/repositories" 
              class="mobile-nav-link"
              @click="closeMobileMenu"
            >
              <i class="pi pi-folder"></i>
              <span>ドキュメント管理</span>
            </router-link>
            <router-link 
              to="/settings" 
              class="mobile-nav-link"
              @click="closeMobileMenu"
            >
              <i class="pi pi-cog"></i>
              <span>設定</span>
            </router-link>
          </nav>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import { useRepositoryStore } from '@/stores/repository.store';

const router = useRouter();
const repositoryStore = useRepositoryStore();

const selectedRepository = computed(() => repositoryStore.selectedRepository);
const showMobileMenu = ref(false);

/**
 * モバイルメニューの表示/非表示を切り替え
 */
function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value;
}

/**
 * モバイルメニューを閉じる
 */
function closeMobileMenu() {
  showMobileMenu.value = false;
}

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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-index-fixed);
}

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  flex: 1;
}

.app-title-link {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  text-decoration: none;
  color: inherit;
  transition: var(--app-transition-fast);
  border-radius: var(--app-border-radius-sm);
  padding: var(--app-spacing-xs);
  margin: calc(-1 * var(--app-spacing-xs));
}

.app-title-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.logo-image {
  height: 2rem;
  width: auto;
  transition: var(--app-transition-fast);
}

.app-title-link:hover .logo-image {
  transform: scale(1.05);
}

.app-title {
  font-size: var(--app-font-size-lg);
  font-weight: 500;
  margin: 0;
  color: var(--app-surface-0);
  transition: var(--app-transition-fast);
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
  color: var(--app-surface-0);
}

.app-menu {
  justify-content: flex-end;
}

.nav-link {
  color: var(--app-surface-0);
  text-decoration: none;
  border-radius: var(--app-border-radius-sm);
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

/* レスポンシブメニュー */
.desktop-menu {
  display: flex;
}

.mobile-menu {
  display: none;
}

/* タブレット以下でモバイルメニューに切り替え */
@media (max-width: 992px) {
  .desktop-menu {
    display: none;
  }
  
  .mobile-menu {
    display: flex;
    align-items: center;
  }
  
  .app-center {
    display: none; /* モバイルでは中央の情報を非表示 */
  }
  
  .app-title {
    font-size: var(--app-font-size-base); /* タイトルを小さく */
  }
}

/* ハンバーガーボタン */
.hamburger-button {
  min-height: var(--app-touch-target-min);
  min-width: var(--app-touch-target-min);
  color: var(--app-surface-0) !important;
  border: 2px solid transparent;
  transition: var(--app-transition-fast);
}

.hamburger-button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2);
}

.hamburger-button.active {
  background-color: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.3);
}

/* モバイルメニューオーバーレイ */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: var(--z-index-modal-backdrop);
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(2px);
}

.mobile-menu-content {
  width: 280px;
  height: 100%;
  background-color: var(--app-surface-0);
  box-shadow: var(--app-shadow-lg);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.2s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.mobile-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--app-spacing-lg);
  border-bottom: 1px solid var(--app-surface-border);
  background-color: var(--app-surface-50);
}

.mobile-menu-header h3 {
  margin: 0;
  color: var(--app-text-color);
  font-size: var(--app-font-size-lg);
  font-weight: 600;
}

.close-button {
  min-height: var(--app-touch-target-min);
  min-width: var(--app-touch-target-min);
  color: var(--app-text-color-secondary) !important;
}

/* モバイルナビゲーション */
.mobile-navigation {
  flex: 1;
  padding: var(--app-spacing-base);
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-xs);
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-base);
  color: var(--app-text-color);
  text-decoration: none;
  border-radius: var(--app-border-radius);
  transition: var(--app-transition-fast);
  font-size: var(--app-font-size-base);
  font-weight: 400;
  min-height: var(--app-touch-target-min);
}

.mobile-nav-link:hover {
  background-color: var(--app-surface-100);
  color: var(--app-primary-color);
}

.mobile-nav-link.router-link-active {
  background-color: var(--app-primary-50);
  color: var(--app-primary-color);
  font-weight: 600;
}

.mobile-nav-link i {
  font-size: var(--app-font-size-lg);
  width: 20px;
  text-align: center;
}
</style>