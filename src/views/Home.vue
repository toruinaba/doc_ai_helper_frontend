<template>
  <div class="home-page">
    <AppNavigation />
    
    <main class="home-content">
      <div class="welcome-section">
        <div class="welcome-content">
          <h1>ドキュメントAIヘルパーへようこそ</h1>
          <p>ドキュメントを選択して閲覧とAIチャットを開始してください</p>
        </div>
      </div>

      <div class="repository-section">
        <div class="section-header">
          <h2>ドキュメントを選択</h2>
        </div>

        <!-- エラー表示 -->
        <Message
          v-if="repositoryStore.error"
          severity="error"
          :closable="true"
          @close="repositoryStore.error = null"
        >
          {{ repositoryStore.error }}
        </Message>

        <!-- ドキュメント一覧 -->
        <div class="repository-grid">
          <div 
            v-for="repository in repositoryStore.repositories" 
            :key="repository.id"
            class="repository-card"
            @click="selectRepository(repository)"
          >
            <div class="card-header">
              <div class="repo-info">
                <i class="pi pi-folder repo-icon"></i>
                <div class="repo-details">
                  <h3>{{ repository.name }}</h3>
                  <span class="repo-owner">{{ repository.owner }}</span>
                </div>
              </div>
              <Tag :value="repository.service_type" severity="info" size="small" />
            </div>
            
            <div v-if="repository.description" class="card-description">
              <p>{{ repository.description }}</p>
            </div>
            
            <div class="card-footer">
              <div class="repo-meta">
                <span class="branch">
                  <i class="pi pi-code-branch"></i>
                  {{ repository.default_branch }}
                </span>
                <span class="access-type">
                  <i :class="repository.is_public ? 'pi pi-globe' : 'pi pi-lock'"></i>
                  {{ repository.is_public ? '公開' : '非公開' }}
                </span>
              </div>
              <Button 
                label="開く" 
                size="small"
                @click.stop="selectRepository(repository)"
              />
            </div>
          </div>
        </div>

        <!-- 空状態 -->
        <div v-if="repositoryStore.repositories.length === 0 && !repositoryStore.isLoading" class="empty-state">
          <i class="pi pi-folder-open empty-icon"></i>
          <h3>ドキュメントがありません</h3>
          <p>まずはドキュメントを追加してください</p>
          <Button 
            label="ドキュメントを追加" 
            icon="pi pi-plus"
            @click="goToRepositoryManagement"
          />
        </div>

        <!-- ローディング状態 -->
        <div v-if="repositoryStore.isLoading" class="loading-state">
          <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
          <p>ドキュメントを読み込み中...</p>
        </div>
      </div>
    </main>
    
    <!-- トースト通知 -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useRepositoryStore } from '@/stores/repository.store';
import { useDocumentStore } from '@/stores/document.store';
import AppNavigation from '@/components/layout/AppNavigation.vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import type { components } from '@/services/api/types.auto';

type RepositoryResponse = components['schemas']['RepositoryResponse'];

const router = useRouter();
const toast = useToast();
const repositoryStore = useRepositoryStore();
const documentStore = useDocumentStore();

onMounted(async () => {
  try {
    await repositoryStore.fetchRepositories();
  } catch (error) {
    console.error('ドキュメント一覧の読み込みに失敗:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'ドキュメント一覧の読み込みに失敗しました',
      life: 5000
    });
  }
});

function goToRepositoryManagement() {
  router.push('/admin/repositories');
}

async function selectRepository(repository: RepositoryResponse) {
  try {
    // リポジトリを選択
    repositoryStore.selectRepository(repository);
    
    // ドキュメントストアを更新
    documentStore.currentService = repository.service_type;
    documentStore.currentOwner = repository.owner;
    documentStore.currentRepo = repository.name;
    documentStore.currentRef = repository.default_branch;
    
    // デフォルトドキュメントパスを設定
    // root_pathがファイルパスとして設定されている場合はそのまま使用
    const defaultPath = repository.root_path || 'README.md';
    
    // ドキュメント表示ページに遷移
    router.push(`/documents/${repository.id}`);
    
    toast.add({
      severity: 'success',
      summary: 'ドキュメント選択',
      detail: `${repository.name} を選択しました`,
      life: 2000
    });
    
  } catch (error) {
    console.error('ドキュメント選択エラー:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'ドキュメントの選択に失敗しました',
      life: 3000
    });
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--app-surface-50);
}

.home-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--app-spacing-xl) var(--app-spacing-base);
  width: 100%;
}

.welcome-section {
  text-align: center;
  margin-bottom: var(--app-spacing-2xl);
}

.welcome-content h1 {
  font-size: var(--app-font-size-3xl);
  color: var(--app-text-color);
  margin: 0 0 var(--app-spacing-base) 0;
  font-weight: 600;
}

.welcome-content p {
  font-size: var(--app-font-size-lg);
  color: var(--app-text-color-secondary);
  margin: 0;
}

.repository-section {
  width: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--app-spacing-lg);
}

.section-header h2 {
  font-size: var(--app-font-size-2xl);
  color: var(--app-text-color);
  margin: 0;
  font-weight: 600;
}

.repository-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--app-spacing-lg);
  margin-bottom: var(--app-spacing-2xl);
}

.repository-card {
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius-lg);
  padding: var(--app-spacing-lg);
  cursor: pointer;
  transition: var(--app-transition-base);
  box-shadow: var(--app-shadow-sm);
}

.repository-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--app-shadow-card);
  border-color: var(--app-primary-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--app-spacing-base);
}

.repo-info {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
}

.repo-icon {
  font-size: var(--app-font-size-xl);
  color: var(--app-primary-color);
}

.repo-details h3 {
  font-size: var(--app-font-size-lg);
  font-weight: 600;
  margin: 0;
  color: var(--app-text-color);
}

.repo-owner {
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
}

.card-description {
  margin-bottom: var(--app-spacing-base);
}

.card-description p {
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
  margin: 0;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.repo-meta {
  display: flex;
  gap: var(--app-spacing-base);
  font-size: var(--app-font-size-xs);
  color: var(--app-text-color-muted);
}

.branch, .access-type {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-xs);
}

.empty-state {
  text-align: center;
  padding: var(--app-spacing-2xl);
  color: var(--app-text-color-secondary);
}

.empty-icon {
  font-size: 4rem;
  color: var(--app-text-color-muted);
  margin-bottom: var(--app-spacing-base);
}

.empty-state h3 {
  font-size: var(--app-font-size-xl);
  margin: 0 0 var(--app-spacing-sm) 0;
}

.empty-state p {
  margin: 0 0 var(--app-spacing-lg) 0;
}

.loading-state {
  text-align: center;
  padding: var(--app-spacing-2xl);
  color: var(--app-text-color-secondary);
}

.loading-state p {
  margin-top: var(--app-spacing-base);
  margin-bottom: 0;
}
</style>