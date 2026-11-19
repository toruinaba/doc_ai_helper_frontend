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
          <RepositoryCard
            v-for="repository in repositoryStore.repositories" 
            :key="repository.id"
            :repository="repository"
            :isHealthy="true"
            :isLoading="false"
            layout="simple"
            @open="selectRepository"
          />
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
import RepositoryCard from '@/components/repository/RepositoryCard.vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
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

/**
 * リポジトリ設定からドキュメントパスを構築
 */
function buildDocumentPath(repository: RepositoryResponse): string {
  // 新しいフィールド構造: document_root_directory + root_document_path
  if (repository.document_root_directory && repository.root_document_path) {
    const baseDir = repository.document_root_directory.endsWith('/') 
      ? repository.document_root_directory 
      : repository.document_root_directory + '/';
    return baseDir + repository.root_document_path;
  }
  
  // root_document_pathのみが設定されている場合
  if (repository.root_document_path) {
    return repository.root_document_path;
  }
  
  // レガシーフィールド: root_path
  if (repository.root_path) {
    return repository.root_path;
  }
  
  // デフォルト
  return 'README.md';
}

async function selectRepository(repository: RepositoryResponse) {
  try {
    // リポジトリを選択（メタデータのみ）
    repositoryStore.selectRepository(repository);
    
    // デフォルトドキュメントパスを設定
    // Phase 2実装: 新しいフィールド構造でパスを構築
    const defaultPath = buildDocumentPath(repository);
    
    console.log('Document path construction:', {
      repository: {
        document_root_directory: repository.document_root_directory,
        root_document_path: repository.root_document_path,
        root_path: repository.root_path
      },
      constructedPath: defaultPath
    });
    
    // 新しい設計: router-driven navigation with query parameters
    router.push({
      name: 'DocumentView',
      params: { repositoryId: repository.id.toString() },
      query: { 
        path: defaultPath,
        ref: repository.default_branch 
      }
    });
    
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
  padding-top: var(--app-header-height);
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

/* タブレット・モバイル対応 */
@media (max-width: 992px) {
  .repository-grid {
    grid-template-columns: 1fr;
    gap: var(--app-spacing-base);
  }
  
  .home-content {
    padding: var(--app-spacing-lg) var(--app-spacing-base);
  }
  
  .welcome-content h1 {
    font-size: var(--app-font-size-2xl);
  }
  
  .welcome-content p {
    font-size: var(--app-font-size-base);
  }
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