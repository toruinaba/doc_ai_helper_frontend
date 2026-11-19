<template>
  <div class="document-view-page">
    <AppNavigation />
    
    <main class="document-content">
      <!-- デスクトップ用レイアウト (ドキュメント + チャット併設) -->
      <div class="desktop-layout">
        <Splitter :style="{ height: 'calc(100vh - var(--app-header-height))' }" class="main-splitter">
          <SplitterPanel :size="60" :minSize="40" class="document-panel">
            <DocumentViewer 
              :repository-id="documentViewerProps.repositoryId"
              :document-path="documentViewerProps.documentPath"
              :ref-name="documentViewerProps.ref"
            />
          </SplitterPanel>
          <SplitterPanel :size="40" :minSize="30" class="chat-panel">
            <DocumentAssistantInterface />
          </SplitterPanel>
        </Splitter>
      </div>

      <!-- タブレット・モバイル用レイアウト (ドキュメント単体表示 + モーダルチャット) -->
      <div class="mobile-layout">
        <DocumentViewer 
          :repository-id="documentViewerProps.repositoryId"
          :document-path="documentViewerProps.documentPath"
          :ref-name="documentViewerProps.ref"
        />
        
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
        :closable="true" 
        :showHeader="false"
        :style="{ width: '80vw', maxWidth: '800px' }"
        :contentStyle="{ height: '70vh', minHeight: '70vh', maxHeight: '70vh' }"
        class="chat-dialog"
      >
        <template #default>
          <div class="dialog-content-wrapper">
            <!-- 手動で閉じるボタンを追加 -->
            <Button 
              icon="pi pi-times" 
              class="dialog-close-button"
              @click="showChatDialog = false"
              text
              rounded
              size="small"
            />
            <DocumentAssistantInterface />
          </div>
        </template>
      </Dialog>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppNavigation from '@/components/layout/AppNavigation.vue'
import DocumentViewer from '@/components/document/DocumentViewer.vue'
import DocumentAssistantInterface from '@/components/assistant/DocumentAssistantInterface.vue'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import type { DocumentViewProps } from '@/types/router'

// Get route information directly instead of props
const route = useRoute()

// Extract route data
const repositoryId = computed(() => route.params.repositoryId as string)
const documentPath = computed(() => route.query.path as string || '')
const documentRef = computed(() => route.query.ref as string || '')

// Create props object for DocumentViewer
const documentViewerProps = computed(() => ({
  repositoryId: repositoryId.value,
  documentPath: documentPath.value,
  ref: documentRef.value
}))

// チャットモーダルの表示状態
const showChatDialog = ref(false)

/**
 * チャットダイアログを開く
 */
function openChatDialog() {
  showChatDialog.value = true
}
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
  height: calc(100vh - var(--app-header-height));
  overflow: hidden;
}

.desktop-layout {
  height: 100%;
}

.mobile-layout {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  touch-action: pan-y;
}

/* Splitter基本設定 */
.main-splitter {
  border: none;
}

/* ドキュメントパネル：スクロール可能 */
:deep(.document-panel) {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  touch-action: pan-y;
}

/* チャットパネル：固定高さ、内部でflexbox管理 */
:deep(.chat-panel) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
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

/* Dialogのシンプルな設定 - ヘッダー・フッター削除 */
.chat-dialog :deep(.p-dialog) {
  height: auto;
}

/* ヘッダーを完全に削除（タイトルなし、×ボタンのみ） */
.chat-dialog :deep(.p-dialog-header) {
  display: none;
}

/* 閉じるボタンを右上に配置 */
.chat-dialog :deep(.p-dialog-close) {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-dialog :deep(.p-dialog-content) {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* フッターを完全に削除 */
.chat-dialog :deep(.p-dialog-footer) {
  display: none;
}

/* Dialog content wrapper */
.dialog-content-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 手動で追加した閉じるボタン */
.dialog-close-button {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  z-index: 1001;
  background: rgba(0, 0, 0, 0.7) !important;
  color: white !important;
  width: 0.625rem;
  height: 0.625rem;
  min-width: 0.625rem;
  font-size: 0.3rem;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* DocumentAssistantInterface in Dialog */
.dialog-content-wrapper :deep(.chat-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dialog-content-wrapper :deep(.chat-header) {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
}

/* DocumentAssistantInterface内のヘッダータイトルも小さく */
.dialog-content-wrapper :deep(.chat-header h2) {
  font-size: 1rem;
  margin: 0;
}

.dialog-content-wrapper :deep(.messages-container) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  touch-action: pan-y;
}

.dialog-content-wrapper :deep(.input-container) {
  flex-shrink: 0;
}



/* Dialog内の入力フォームのpaddingも縮小 */
.dialog-content-wrapper :deep(.chat-input) {
  padding: 0.5rem 1rem; /* paddingを縮小 */
}

</style>