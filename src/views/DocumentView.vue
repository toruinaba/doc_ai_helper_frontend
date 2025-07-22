<template>
  <div class="document-view-page">
    <AppNavigation />
    
    <main class="document-content">
      <Splitter class="main-splitter">
        <SplitterPanel :size="20" :minSize="10">
          <div class="left-panel">
            <RepositorySelector 
              @branchChange="onBranchChange"
            />
            <div class="panel-divider" />
            <RepositoryNavigator />
          </div>
        </SplitterPanel>
        <SplitterPanel :size="50" :minSize="30">
          <DocumentViewer />
        </SplitterPanel>
        <SplitterPanel :size="30" :minSize="20">
          <DocumentAssistantInterface />
        </SplitterPanel>
      </Splitter>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDocumentStore } from '@/stores/document.store';
import { useRepositoryStore } from '@/stores/repository.store';
import { getDefaultRepositoryConfig } from '@/utils/config.util';
import AppNavigation from '@/components/layout/AppNavigation.vue';
import DocumentViewer from '@/components/document/DocumentViewer.vue';
import RepositoryNavigator from '@/components/repository/RepositoryNavigator.vue';
import RepositorySelector from '@/components/repository/RepositorySelector.vue';
import DocumentAssistantInterface from '@/components/assistant/DocumentAssistantInterface.vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import type { components } from '@/services/api/types.auto';

type RepositoryResponse = components['schemas']['RepositoryResponse'];

const route = useRoute();
const router = useRouter();
const documentStore = useDocumentStore();
const repositoryStore = useRepositoryStore();

// イベントハンドラー
function onBranchChange(branch: string) {
  console.log('Branch changed:', branch);
  // ブランチが変更された場合、現在のパスで再読み込み
  if (documentStore.currentPath) {
    documentStore.fetchDocument(documentStore.currentPath);
  }
}

// コンポーネントマウント時の処理
onMounted(async () => {
  const repositoryId = route.params.repositoryId as string;
  
  if (repositoryId) {
    // リポジトリIDが指定されている場合、そのリポジトリを読み込む
    try {
      // まず、リポジトリ一覧を取得（キャッシュされていない場合）
      if (repositoryStore.repositories.length === 0) {
        await repositoryStore.fetchRepositories();
      }
      
      // 指定されたリポジトリを検索
      const repository = repositoryStore.repositories.find(r => r.id === parseInt(repositoryId));
      if (repository) {
        // リポジトリを選択
        repositoryStore.selectRepository(repository);
        
        // ドキュメントストアにリポジトリ情報を設定
        documentStore.currentService = repository.service_type;
        documentStore.currentOwner = repository.owner;
        documentStore.currentRepo = repository.name;
        documentStore.currentRef = repository.default_branch;
        
        // デフォルトドキュメントを読み込み
        const defaultPath = repository.root_path ? 
          `${repository.root_path}/README.md` : 
          'README.md';
          
        await documentStore.fetchDocument(defaultPath);
      } else {
        // リポジトリが見つからない場合はホームに戻る
        console.warn(`Repository with ID ${repositoryId} not found`);
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load repository:', error);
      router.push('/');
    }
  } else {
    // デフォルトのパスを使用（環境変数から取得）
    const defaultConfig = getDefaultRepositoryConfig();
    documentStore.fetchDocument(documentStore.currentPath || defaultConfig.path);
  }
});
</script>

<style scoped>
.document-view-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--app-surface-50);
}

.document-content {
  flex: 1;
  overflow: hidden;
  background-color: var(--app-surface-0);
  display: flex;
  flex-direction: column;
}

.main-splitter {
  height: 100%;
  border: none;
}

:deep(.p-splitter) {
  border: none;
}

:deep(.p-splitter-panel) {
  overflow: auto;
}

.left-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--app-surface-100);
  border-right: 1px solid var(--app-surface-border);
}

.panel-divider {
  height: 1px;
  background-color: var(--app-surface-border);
  margin: var(--app-spacing-sm) 0;
}
</style>