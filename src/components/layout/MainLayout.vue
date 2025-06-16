<template>
  <div class="layout-container">
    <header class="app-header">
      <div class="app-logo">
        <img src="@/assets/logo.svg" alt="Logo" class="logo-image" />
        <h1 class="app-title">ドキュメントAIヘルパー</h1>
      </div>
      <div class="app-menu">
        <!-- ここに将来的にメニューアイテムなどを追加 -->
      </div>
    </header>

    <main class="app-content">
      <Splitter class="main-splitter">
        <SplitterPanel :size="20" :minSize="10">
          <RepositoryNavigator />
        </SplitterPanel>
        <SplitterPanel :size="80">
          <DocumentViewer />
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
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { useDocumentStore } from '@/stores/document.store';

const documentStore = useDocumentStore();

// コンポーネントマウント時の処理
onMounted(() => {
  // デフォルトリポジトリとドキュメントを設定
  documentStore.setRepository('mock', 'example', 'docs-project', 'main');
  documentStore.fetchRepositoryStructure();
  documentStore.fetchDocument('index.md');
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
</style>
