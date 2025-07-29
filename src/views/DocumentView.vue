<template>
  <div class="document-view-page">
    <AppNavigation />
    
    <main class="document-content">
      <!-- デスクトップ用レイアウト (ドキュメント + チャット併設) -->
      <div class="desktop-layout">
        <Splitter class="main-splitter">
          <SplitterPanel :size="60" :minSize="40">
            <DocumentViewer />
          </SplitterPanel>
          <SplitterPanel :size="40" :minSize="30">
            <DocumentAssistantInterface />
          </SplitterPanel>
        </Splitter>
      </div>

      <!-- タブレット・モバイル用レイアウト (ドキュメント単体表示 + モーダルチャット) -->
      <div class="mobile-layout">
        <DocumentViewer />
        
        <!-- フローティングチャットボタン -->
        <Button 
          icon="pi pi-comments" 
          class="floating-chat-button"
          @click="openChatDialog"
          severity="primary"
          rounded
          size="large"
          v-tooltip.left="'AIチャットを開く'"
        />
        
      </div>
      
      <!-- PrimeVue Dialogでのチャットモーダル -->
      <Dialog 
        v-model:visible="showChatDialog" 
        modal 
        header="AIチャット" 
        :style="{ width: '80vw', maxWidth: '800px', height: '70vh' }"
      >
        <div style="height: 60vh; overflow: hidden;">
          <DocumentAssistantInterface />
        </div>
        <template #footer>
          <Button label="閉じる" @click="showChatDialog = false" />
        </template>
      </Dialog>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDocumentStore } from '@/stores/document.store';
import { useRepositoryStore } from '@/stores/repository.store';
import { getDefaultRepositoryConfig } from '@/utils/config.util';
import AppNavigation from '@/components/layout/AppNavigation.vue';
import DocumentViewer from '@/components/document/DocumentViewer.vue';
import DocumentAssistantInterface from '@/components/assistant/DocumentAssistantInterface.vue';
import ChatModal from '@/components/assistant/ChatModal.vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import type { components } from '@/services/api/types.auto';

type RepositoryResponse = components['schemas']['RepositoryResponse'];

const route = useRoute();
const router = useRouter();
const documentStore = useDocumentStore();
const repositoryStore = useRepositoryStore();

// チャットモーダルの表示状態
const showChatDialog = ref(false);

// Template refs

// イベントハンドラー
function onBranchChange(branch: string) {
  console.log('Branch changed:', branch);
  // ブランチが変更された場合、現在のパスで再読み込み
  if (documentStore.currentPath) {
    documentStore.fetchDocument(documentStore.currentPath);
  }
}

/**
 * チャットダイアログを開く
 */
function openChatDialog() {
  showChatDialog.value = true;
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
        // root_pathがファイルパスとして設定されている場合はそのまま使用
        const defaultPath = repository.root_path || 'README.md';
          
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--app-surface-50);
  padding-top: var(--app-header-height);
}

.document-content {
  flex: 1;
  background-color: var(--app-surface-0);
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - var(--app-header-height));
}

.main-splitter {
  height: 100%;
  border: none;
}

.desktop-layout {
  height: 100%;
}

.mobile-layout {
  height: 100%;
}

:deep(.p-splitter) {
  border: none;
}

:deep(.p-splitter-panel) {
  overflow: auto;
}

/* レスポンシブレイアウト */
.desktop-layout {
  display: block;
  flex: 1;
}

.mobile-layout {
  display: none;
  flex: 1;
}

/* タブレット以下でモバイルレイアウトに切り替え */
@media (max-width: 992px) {
  .desktop-layout {
    display: none;
  }
  
  .mobile-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
  }
}

/* フローティングチャットボタン */
.floating-chat-button {
  position: fixed;
  bottom: var(--app-spacing-xl);
  right: var(--app-spacing-xl);
  z-index: var(--z-index-sticky);
  width: 60px;
  height: 60px;
  box-shadow: var(--app-shadow-lg);
  transition: var(--app-transition-base);
}

.floating-chat-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.floating-chat-button :deep(.p-button-icon) {
  font-size: 1.5rem;
}

/* モバイル対応でボタンサイズ調整 */
@media (max-width: 992px) {
  .floating-chat-button {
    bottom: var(--app-spacing-lg);
    right: var(--app-spacing-lg);
    width: 56px;
    height: 56px;
  }
  
  .floating-chat-button :deep(.p-button-icon) {
    font-size: 1.3rem;
  }
}

/* チャットモーダルのスタイル */
.chat-modal-content {
  height: 60vh;
  overflow: hidden;
  padding: 0;
}

</style>