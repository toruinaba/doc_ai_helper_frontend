<template>
  <div class="layout-container">
    <header class="app-header">
      <div class="app-logo">
        <img src="@/assets/logo.svg" alt="Logo" class="logo-image" />
        <h1 class="app-title">ドキュメントAIヘルパー</h1>
      </div>
      <div class="app-menu">
        <nav class="navigation">
          <router-link to="/" class="nav-link">
            <i class="pi pi-home"></i>
            <span>ホーム</span>
          </router-link>
          <router-link to="/repositories" class="nav-link">
            <i class="pi pi-folder"></i>
            <span>リポジトリ管理</span>
          </router-link>
        </nav>
      </div>
    </header>

    <main class="app-content">
      <Splitter class="main-splitter">
        <SplitterPanel :size="20" :minSize="10">
          <div class="left-panel">
            <RepositorySelector 
              @repositoryChange="onRepositoryChange"
              @branchChange="onBranchChange"
              @pathChange="onPathChange"
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

    <footer class="app-footer">
      <div class="footer-content">
        <p>© 2025 ドキュメントAIヘルパー</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import DocumentViewer from '@/components/document/DocumentViewer.vue';
import RepositoryNavigator from '@/components/repository/RepositoryNavigator.vue';
import RepositorySelector from '@/components/repository/RepositorySelector.vue';
import DocumentAssistantInterface from '@/components/assistant/DocumentAssistantInterface.vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { useDocumentStore } from '@/stores/document.store';
import { useRepositoryStore } from '@/stores/repository.store';
import { getDefaultRepositoryConfig } from '@/utils/config.util';
import type { components } from '@/services/api/types.auto';

type RepositoryResponse = components['schemas']['RepositoryResponse'];

const documentStore = useDocumentStore();
const repositoryStore = useRepositoryStore();

// イベントハンドラー
function onRepositoryChange(repository: RepositoryResponse | null) {
  console.log('Repository changed:', repository);
  if (repository) {
    // 新しいリポジトリが選択された場合、現在のドキュメントパスをクリア
    documentStore.currentPath = '';
    
    // リポジトリのデフォルトドキュメントを読み込む可能性がある場合
    // デフォルトパス（例：README.md）を設定
    const defaultPath = repository.root_path ? 
      `${repository.root_path}/README.md` : 
      'README.md';
    
    // ドキュメントの存在確認後に読み込み（オプション）
    // documentStore.fetchDocument(defaultPath);
  }
}

function onBranchChange(branch: string) {
  console.log('Branch changed:', branch);
  // ブランチが変更された場合、現在のパスで再読み込み
  if (documentStore.currentPath) {
    documentStore.fetchDocument(documentStore.currentPath);
  }
}

function onPathChange(path: string) {
  console.log('Path changed:', path);
  // パスが変更された場合、ドキュメントを読み込み
  if (path.trim()) {
    documentStore.fetchDocument(path);
  }
}

// コンポーネントマウント時の処理
onMounted(() => {
  // ファイルツリー機能を一時的に無効化しているため、リポジトリ構造の取得をスキップ
  // documentStore.fetchRepositoryStructure();
  
  // デフォルトのパスを使用（環境変数から取得）
  const defaultConfig = getDefaultRepositoryConfig();
  documentStore.fetchDocument(documentStore.currentPath || defaultConfig.path);
});
</script>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #1976d2;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-image {
  height: 2rem;
  width: auto;
}

.app-title {
  font-size: 1.2rem;
  font-weight: 500;
  margin: 0;
}

.navigation {
  display: flex;
  gap: 1rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  font-size: 0.9rem;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: 500;
}

.app-content {
  flex: 1;
  overflow: hidden;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.main-splitter {
  height: 100%;
  border: none;
}

.app-footer {
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  font-size: 0.85rem;
  color: #666;
}

.footer-content {
  text-align: center;
}

.footer-content p {
  margin: 0;
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
  background: var(--surface-card);
}

.panel-divider {
  height: 1px;
  background: var(--surface-border);
  margin: 0.5rem 0;
}
</style>
