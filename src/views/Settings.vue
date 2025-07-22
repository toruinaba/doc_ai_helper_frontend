<template>
  <div class="settings-page">
    <AppNavigation />
    
    <main class="settings-content">
      <div class="settings-header">
        <h1>設定</h1>
        <p>AIアシスタントとドキュメント閲覧の動作を設定できます</p>
      </div>

      <!-- AI設定 -->
      <Card class="settings-section">
        <template #title>
          <div class="section-title">
            <i class="pi pi-cog"></i>
            <span>AI設定</span>
          </div>
        </template>
        <template #content>
          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-label">
                <label for="streaming-mode">ストリーミングモード</label>
                <p class="setting-description">リアルタイムでAIの回答を表示します</p>
              </div>
              <div class="setting-control">
                <ToggleButton 
                  id="streaming-mode"
                  v-model="streamingSettings.enabled" 
                  onLabel="有効" 
                  offLabel="無効"
                  @change="saveStreamingSettingsHandler"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- MCPツール設定 -->
      <Card class="settings-section">
        <template #title>
          <div class="section-title">
            <i class="pi pi-wrench"></i>
            <span>MCPツール設定</span>
          </div>
        </template>
        <template #content>
          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-label">
                <label for="mcp-enabled">MCPツール機能</label>
                <p class="setting-description">Model Context Protocol (MCP) ツールを有効にします</p>
              </div>
              <div class="setting-control">
                <ToggleButton 
                  id="mcp-enabled"
                  v-model="mcpSettings.enabled" 
                  onLabel="有効" 
                  offLabel="無効"
                  @change="saveMCPSettingsHandler"
                />
              </div>
            </div>
            
            <div v-if="mcpSettings.enabled" class="setting-item">
              <div class="setting-label">
                <label for="auto-detect">自動判定</label>
                <p class="setting-description">質問内容からツール使用を自動判定</p>
              </div>
              <div class="setting-control">
                <ToggleButton 
                  id="auto-detect"
                  v-model="mcpSettings.autoDetect" 
                  onLabel="有効" 
                  offLabel="無効"
                  @change="saveMCPSettingsHandler"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- ドキュメントコンテキスト設定 -->
      <Card class="settings-section">
        <template #title>
          <div class="section-title">
            <i class="pi pi-file-text"></i>
            <span>ドキュメント設定</span>
          </div>
        </template>
        <template #content>
          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-label">
                <label for="include-document">ドキュメント自動インクルード</label>
                <p class="setting-description">システムプロンプトに現在のドキュメント内容を含める</p>
              </div>
              <div class="setting-control">
                <ToggleButton 
                  id="include-document"
                  v-model="documentSettings.includeDocumentInSystemPrompt" 
                  onLabel="有効" 
                  offLabel="無効"
                  @change="saveDocumentSettingsHandler"
                />
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-label">
                <label for="repository-context">ドキュメントコンテキスト</label>
                <p class="setting-description">ドキュメントの情報をAIに提供します</p>
              </div>
              <div class="setting-control">
                <ToggleButton 
                  id="repository-context"
                  v-model="documentSettings.enableRepositoryContext" 
                  onLabel="有効" 
                  offLabel="無効"
                  @change="saveDocumentSettingsHandler"
                />
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-label">
                <label for="document-metadata">ドキュメントメタデータ</label>
                <p class="setting-description">ファイルの更新日時などのメタデータを含める</p>
              </div>
              <div class="setting-control">
                <ToggleButton 
                  id="document-metadata"
                  v-model="documentSettings.enableDocumentMetadata" 
                  onLabel="有効" 
                  offLabel="無効"
                  @change="saveDocumentSettingsHandler"
                />
              </div>
            </div>
            
          </div>
        </template>
      </Card>


    </main>
    
    <!-- 設定変更通知 -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import AppNavigation from '@/components/layout/AppNavigation.vue';
import Card from 'primevue/card';
import ToggleButton from 'primevue/togglebutton';
import Toast from 'primevue/toast';
import {
  loadSettings,
  saveStreamingSettings,
  saveMCPSettings,
  saveDocumentSettings,
  type StreamingSettings,
  type MCPSettings,
  type DocumentSettings
} from '@/utils/settings.util';

const toast = useToast();

// リアクティブな設定オブジェクト
const streamingSettings = reactive<StreamingSettings>({
  enabled: true,
  type: 'fetch'
});

const mcpSettings = reactive<MCPSettings>({
  enabled: false,
  executionMode: 'auto',
  autoDetect: true
});

const documentSettings = reactive<DocumentSettings>({
  includeDocumentInSystemPrompt: true,
  enableRepositoryContext: true,
  enableDocumentMetadata: true,
  systemPromptTemplate: 'contextual_document_assistant_ja'
});

// 設定の保存
function saveStreamingSettingsHandler() {
  saveStreamingSettings(streamingSettings);
  toast.add({
    severity: 'success',
    summary: '設定を保存しました',
    detail: 'ストリーミング設定を更新しました',
    life: 3000
  });
}

function saveMCPSettingsHandler() {
  saveMCPSettings(mcpSettings);
  toast.add({
    severity: 'success',
    summary: '設定を保存しました',
    detail: 'MCPツール設定を更新しました',
    life: 3000
  });
}

function saveDocumentSettingsHandler() {
  saveDocumentSettings(documentSettings);
  toast.add({
    severity: 'success',
    summary: '設定を保存しました',
    detail: 'ドキュメント設定を更新しました',
    life: 3000
  });
}


// 設定の読み込み
function loadSettingsHandler() {
  const allSettings = loadSettings();
  
  Object.assign(streamingSettings, allSettings.streaming);
  Object.assign(mcpSettings, allSettings.mcp);
  Object.assign(documentSettings, allSettings.document);
}

onMounted(() => {
  loadSettingsHandler();
});
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--app-surface-50);
  overflow-y: auto;
}

.settings-content {
  flex: 1;
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--app-spacing-xl) var(--app-spacing-base);
  width: 100%;
}

.settings-header {
  margin-bottom: var(--app-spacing-2xl);
  text-align: center;
}

.settings-header h1 {
  font-size: var(--app-font-size-3xl);
  color: var(--app-text-color);
  margin: 0 0 var(--app-spacing-base) 0;
  font-weight: 600;
}

.settings-header p {
  font-size: var(--app-font-size-lg);
  color: var(--app-text-color-secondary);
  margin: 0;
}

.settings-section {
  margin-bottom: var(--app-spacing-xl);
  box-shadow: var(--app-shadow-card);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm);
  font-size: var(--app-font-size-xl);
  font-weight: 600;
  color: var(--app-text-color);
}

.section-title i {
  color: var(--app-primary-color);
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-lg);
}

.settings-group h4 {
  font-size: var(--app-font-size-lg);
  color: var(--app-text-color);
  margin: 0 0 var(--app-spacing-base) 0;
  border-bottom: 1px solid var(--app-surface-border);
  padding-bottom: var(--app-spacing-sm);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--app-spacing-lg);
  padding: var(--app-spacing-base);
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius);
  background-color: var(--app-surface-0);
}

.setting-label {
  flex: 1;
}

.setting-label label {
  font-size: var(--app-font-size-base);
  font-weight: 500;
  color: var(--app-text-color);
  display: block;
  margin-bottom: var(--app-spacing-xs);
}

.setting-description {
  font-size: var(--app-font-size-sm);
  color: var(--app-text-color-secondary);
  margin: 0;
  line-height: 1.4;
}

.setting-control {
  min-width: 200px;
  display: flex;
  justify-content: flex-end;
}

/* Select コンポーネントのスタイル調整 */
.setting-control :deep(.p-select) {
  width: 100%;
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius);
}

.setting-control :deep(.p-select:hover) {
  border-color: var(--app-primary-color);
}

.setting-control :deep(.p-select:focus-within) {
  border-color: var(--app-primary-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.tool-selection {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-base);
}

.tool-item {
  display: flex;
  align-items: flex-start;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-sm);
  border: 1px solid var(--app-surface-border);
  border-radius: var(--app-border-radius-sm);
  background-color: var(--app-surface-50);
}

.tool-info {
  flex: 1;
}

.tool-name {
  font-size: var(--app-font-size-sm);
  font-weight: 500;
  color: var(--app-text-color);
  display: block;
  margin-bottom: var(--app-spacing-xs);
}

.tool-description {
  font-size: var(--app-font-size-xs);
  color: var(--app-text-color-secondary);
  margin: 0;
}

.setting-actions {
  display: flex;
  gap: var(--app-spacing-base);
  justify-content: center;
  flex-wrap: wrap;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: var(--app-spacing-base);
  }
  
  .setting-control {
    min-width: unset;
    justify-content: stretch;
  }
  
  .setting-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>