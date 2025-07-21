<template>
  <div class="settings-page">
    <AppNavigation />
    
    <main class="settings-content">
      <div class="settings-header">
        <h1>設定</h1>
        <p>AIアシスタントとドキュメント閲覧の動作を設定できます</p>
      </div>

      <!-- LLMとストリーミング設定 -->
      <Card class="settings-section">
        <template #title>
          <div class="section-title">
            <i class="pi pi-cog"></i>
            <span>LLM設定</span>
          </div>
        </template>
        <template #content>
          <div class="settings-group">
            <h4>ストリーミング設定</h4>
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
            
            <div class="setting-item">
              <div class="setting-label">
                <label for="streaming-type">ストリーミング方式</label>
                <p class="setting-description">ストリーミング通信の実装方式を選択</p>
              </div>
              <div class="setting-control">
                <Select
                  id="streaming-type"
                  v-model="streamingSettings.type"
                  :options="streamingTypeOptions"
                  optionLabel="label"
                  optionValue="value"
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
                <label for="execution-mode">実行モード</label>
                <p class="setting-description">ツール実行の自動化レベルを設定</p>
              </div>
              <div class="setting-control">
                <Select
                  id="execution-mode"
                  v-model="mcpSettings.executionMode"
                  :options="executionModeOptions"
                  optionLabel="label"
                  optionValue="value"
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
            
            <div v-if="mcpSettings.enabled" class="setting-item">
              <div class="setting-label">
                <label>利用可能なツール</label>
                <p class="setting-description">使用するMCPツールを選択してください</p>
              </div>
              <div class="setting-control">
                <div class="tool-selection">
                  <div v-for="tool in availableTools" :key="tool.name" class="tool-item">
                    <Checkbox 
                      :id="`tool-${tool.name}`"
                      v-model="tool.enabled" 
                      :binary="true"
                      @change="() => { saveMCPSettingsHandler(); saveAvailableTools(availableTools); }"
                    />
                    <div class="tool-info">
                      <label :for="`tool-${tool.name}`" class="tool-name">{{ tool.name }}</label>
                      <p class="tool-description">{{ tool.description }}</p>
                    </div>
                  </div>
                </div>
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
                <label for="repository-context">リポジトリコンテキスト</label>
                <p class="setting-description">リポジトリの情報をAIに提供します</p>
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
            
            <div class="setting-item">
              <div class="setting-label">
                <label for="system-prompt-template">システムプロンプトテンプレート</label>
                <p class="setting-description">AIアシスタントの動作パターンを選択</p>
              </div>
              <div class="setting-control">
                <Select
                  id="system-prompt-template"
                  v-model="documentSettings.systemPromptTemplate"
                  :options="systemPromptTemplates"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="テンプレートを選択"
                  @change="saveDocumentSettingsHandler"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- UI設定 -->
      <Card class="settings-section">
        <template #title>
          <div class="section-title">
            <i class="pi pi-palette"></i>
            <span>UI設定</span>
          </div>
        </template>
        <template #content>
          <div class="settings-group">
            <div class="setting-item">
              <div class="setting-label">
                <label for="show-streaming-toggle">ストリーミング切り替えボタン</label>
                <p class="setting-description">メッセージ入力欄にストリーミング切り替えボタンを表示</p>
              </div>
              <div class="setting-control">
                <ToggleButton 
                  id="show-streaming-toggle"
                  v-model="uiSettings.showStreamingToggle" 
                  onLabel="表示" 
                  offLabel="非表示"
                  @change="saveUISettingsHandler"
                />
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-label">
                <label for="show-tools-toggle">ツール切り替えボタン</label>
                <p class="setting-description">メッセージ入力欄にツール使用切り替えボタンを表示</p>
              </div>
              <div class="setting-control">
                <ToggleButton 
                  id="show-tools-toggle"
                  v-model="uiSettings.showToolsToggle" 
                  onLabel="表示" 
                  offLabel="非表示"
                  @change="saveUISettingsHandler"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- リセット・エクスポート -->
      <Card class="settings-section">
        <template #title>
          <div class="section-title">
            <i class="pi pi-download"></i>
            <span>設定管理</span>
          </div>
        </template>
        <template #content>
          <div class="settings-group">
            <div class="setting-actions">
              <Button
                label="設定をリセット"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                @click="resetToDefaults"
              />
              <Button
                label="設定をエクスポート"
                icon="pi pi-download"
                severity="secondary"
                outlined
                @click="exportSettingsHandler"
              />
              <Button
                label="設定をインポート"
                icon="pi pi-upload"
                severity="secondary"
                outlined
                @click="importSettingsHandler"
              />
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
import Select from 'primevue/select';
import Card from 'primevue/card';
import ToggleButton from 'primevue/togglebutton';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import {
  loadSettings,
  saveStreamingSettings,
  saveMCPSettings,
  saveDocumentSettings,
  saveUISettings,
  resetSettings,
  exportSettings as exportSettingsUtil,
  importSettings as importSettingsUtil,
  loadAvailableTools,
  saveAvailableTools,
  type StreamingSettings,
  type MCPSettings,
  type DocumentSettings,
  type UISettings
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

const uiSettings = reactive<UISettings>({
  showStreamingToggle: false,
  showToolsToggle: false
});

const availableTools = reactive(loadAvailableTools());

// オプション
const streamingTypeOptions = [
  { label: '自動検出', value: 'auto' },
  { label: 'EventSource', value: 'eventsource' },
  { label: 'fetch API (推奨)', value: 'fetch' }
];

const executionModeOptions = [
  { label: '自動実行 (auto)', value: 'auto' },
  { label: '手動確認 (manual)', value: 'manual' },
  { label: '必須実行 (required)', value: 'required' },
  { label: '無効 (none)', value: 'none' }
];

const systemPromptTemplates = [
  { id: 'contextual_document_assistant_ja', name: 'コンテキスト対応アシスタント (日本語)' },
  { id: 'technical_writer_ja', name: 'テクニカルライター (日本語)' },
  { id: 'code_reviewer_ja', name: 'コードレビューアー (日本語)' },
  { id: 'general_assistant_ja', name: '汎用アシスタント (日本語)' }
];

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
  saveAvailableTools(availableTools);
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

function saveUISettingsHandler() {
  saveUISettings(uiSettings);
  toast.add({
    severity: 'success',
    summary: '設定を保存しました',
    detail: 'UI設定を更新しました',
    life: 3000
  });
}

// 設定の読み込み
function loadSettingsHandler() {
  const allSettings = loadSettings();
  
  Object.assign(streamingSettings, allSettings.streaming);
  Object.assign(mcpSettings, allSettings.mcp);
  Object.assign(documentSettings, allSettings.document);
  Object.assign(uiSettings, allSettings.ui);
  
  // ツール設定も更新
  const tools = loadAvailableTools();
  Object.assign(availableTools, tools);
}

// 設定管理
function resetToDefaults() {
  const defaultSettings = resetSettings();
  
  Object.assign(streamingSettings, defaultSettings.streaming);
  Object.assign(mcpSettings, defaultSettings.mcp);
  Object.assign(documentSettings, defaultSettings.document);
  Object.assign(uiSettings, defaultSettings.ui);
  
  // ツール設定もリセット
  const defaultTools = loadAvailableTools();
  Object.assign(availableTools, defaultTools);

  toast.add({
    severity: 'info',
    summary: '設定をリセットしました',
    detail: '全ての設定がデフォルト値に戻されました',
    life: 3000
  });
}

function exportSettingsHandler() {
  const jsonString = exportSettingsUtil();
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'doc-ai-helper-settings.json';
  a.click();
  URL.revokeObjectURL(url);

  toast.add({
    severity: 'success',
    summary: '設定をエクスポートしました',
    detail: 'ファイルがダウンロードされました',
    life: 3000
  });
}

function importSettingsHandler() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = importSettingsUtil(e.target?.result as string);
          
          Object.assign(streamingSettings, importedSettings.streaming);
          Object.assign(mcpSettings, importedSettings.mcp);
          Object.assign(documentSettings, importedSettings.document);
          Object.assign(uiSettings, importedSettings.ui);

          toast.add({
            severity: 'success',
            summary: '設定をインポートしました',
            detail: '設定ファイルが正常に読み込まれました',
            life: 3000
          });
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: 'インポートエラー',
            detail: error instanceof Error ? error.message : '設定ファイルの形式が正しくありません',
            life: 5000
          });
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
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