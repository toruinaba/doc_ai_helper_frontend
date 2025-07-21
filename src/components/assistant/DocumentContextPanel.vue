<template>
  <div class="document-context-panel">
    <div class="context-settings-header">
      <Button 
        icon="pi pi-file-text" 
        size="small" 
        text 
        severity="secondary"
        @click="showConfig = !showConfig"
        v-tooltip.bottom="'ドキュメントコンテキスト設定'"
        class="context-config-toggle"
      />
      <span class="context-status">
        <i v-if="config.includeDocumentInSystemPrompt" 
           class="pi pi-check-circle text-green-500" 
           v-tooltip.bottom="'ドキュメントコンテキスト有効'" />
        <i v-else 
           class="pi pi-times-circle text-red-500" 
           v-tooltip.bottom="'ドキュメントコンテキスト無効'" />
      </span>
    </div>
    
    <div v-if="showConfig" class="document-context-config">
      <div class="config-section">
        <div class="p-field-checkbox">
          <Checkbox 
            v-model="config.includeDocumentInSystemPrompt" 
            :binary="true" 
            inputId="includeDocument" 
          />
          <label for="includeDocument">システムプロンプトにドキュメントを含める</label>
        </div>
      </div>
      
      <div class="config-section">
        <div class="p-field-checkbox">
          <Checkbox 
            v-model="config.enableRepositoryContext" 
            :binary="true" 
            inputId="enableRepoContext" 
          />
          <label for="enableRepoContext">リポジトリコンテキストを有効にする</label>
        </div>
      </div>
      
      <div class="config-section">
        <div class="p-field-checkbox">
          <Checkbox 
            v-model="config.enableDocumentMetadata" 
            :binary="true" 
            inputId="enableDocMetadata" 
          />
          <label for="enableDocMetadata">ドキュメントメタデータを含める</label>
        </div>
      </div>
      
      <div class="config-section">
        <label class="config-label">システムプロンプトテンプレート:</label>
        <AppDropdown 
          v-model="config.systemPromptTemplate" 
          :options="systemPromptTemplates" 
          optionLabel="name" 
          optionValue="id" 
          placeholder="テンプレートを選択"
          class="w-full"
        />
      </div>
      
      <div class="config-section">
        <div class="p-field-checkbox">
          <Checkbox 
            v-model="config.completeToolFlow" 
            :binary="true" 
            inputId="completeToolFlow" 
          />
          <label for="completeToolFlow">完全なツールフローを使用</label>
        </div>
      </div>
      
      <!-- 現在のコンテキスト情報表示 -->
      <div v-if="currentDocument" class="current-context-info">
        <h5>現在のドキュメントコンテキスト</h5>
        <div class="context-details">
          <div class="context-item">
            <strong>ファイル:</strong> {{ currentDocument.name }}
          </div>
          <div class="context-item">
            <strong>リポジトリ:</strong> {{ currentDocument.owner }}/{{ currentDocument.repository }}
          </div>
          <div class="context-item">
            <strong>パス:</strong> {{ currentDocument.path }}
          </div>
          <div class="context-item">
            <strong>サイズ:</strong> {{ formatFileSize(currentDocument.metadata.size) }}
          </div>
        </div>
      </div>
      
      <!-- 設定操作ボタン -->
      <div class="config-actions">
        <Button 
          icon="pi pi-refresh" 
          size="small" 
          text 
          severity="secondary"
          @click="loadTemplates"
          v-tooltip.bottom="'テンプレート一覧を更新'"
          label="更新"
        />
        <Button 
          icon="pi pi-undo" 
          size="small" 
          text 
          severity="secondary"
          @click="resetConfig"
          v-tooltip.bottom="'設定をリセット'"
          label="リセット"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import AppDropdown from '@/components/common/AppDropdown.vue';
import { usePersistedConfig } from '@/composables/usePersistedConfig';

// Props
interface Props {
  /** 現在のドキュメント情報 */
  currentDocument?: any;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  /** 設定が変更された */
  (event: 'config-changed', config: any): void;
}

const emit = defineEmits<Emits>();

// 設定パネルの表示状態
const showConfig = ref(false);

// 永続化されたドキュメントコンテキスト設定
const { config } = usePersistedConfig({
  key: 'documentContextConfig',
  defaultConfig: {
    includeDocumentInSystemPrompt: true,
    systemPromptTemplate: 'contextual_document_assistant_ja',
    enableRepositoryContext: true,
    enableDocumentMetadata: true,
    completeToolFlow: true
  },
  onChange: (newConfig) => {
    console.log('ドキュメントコンテキスト設定が変更されました:', newConfig);
    emit('config-changed', newConfig);
  }
});

// システムプロンプトテンプレートのオプション
const systemPromptTemplates = ref([
  { 
    id: 'contextual_document_assistant_ja', 
    name: 'ドキュメントアシスタント（日本語）' 
  },
  { 
    id: 'contextual_document_assistant_en', 
    name: 'Document Assistant (English)' 
  },
  { 
    id: 'code_analysis_assistant', 
    name: 'コード解析アシスタント' 
  },
  { 
    id: 'technical_writer_assistant', 
    name: 'テクニカルライターアシスタント' 
  },
  { 
    id: 'api_documentation_assistant', 
    name: 'API仕様書アシスタント' 
  },
  { 
    id: 'tutorial_assistant', 
    name: 'チュートリアルアシスタント' 
  }
]);

/**
 * 利用可能なテンプレート一覧を読み込み
 */
const loadTemplates = async () => {
  try {
    // APIから利用可能なテンプレート一覧を取得
    const { getLLMTemplates } = await import('@/services/api/llm');
    const templates = await getLLMTemplates();
    
    // テンプレート選択肢を更新
    systemPromptTemplates.value = templates.map(id => ({
      id,
      name: getTemplateDisplayName(id)
    }));
    
    console.log('利用可能なシステムプロンプトテンプレート:', systemPromptTemplates.value);
  } catch (error) {
    console.warn('システムプロンプトテンプレート一覧の取得に失敗しました:', error);
  }
};

/**
 * テンプレートIDから表示名を生成
 */
const getTemplateDisplayName = (templateId: string): string => {
  const nameMap: Record<string, string> = {
    'contextual_document_assistant_ja': 'ドキュメントアシスタント（日本語）',
    'contextual_document_assistant_en': 'Document Assistant (English)',
    'code_analysis_assistant': 'コード解析アシスタント',
    'technical_writer_assistant': 'テクニカルライターアシスタント',
    'api_documentation_assistant': 'API仕様書アシスタント',
    'tutorial_assistant': 'チュートリアルアシスタント'
  };
  
  return nameMap[templateId] || templateId;
};

/**
 * 設定をデフォルトにリセット
 */
const resetConfig = () => {
  config.value = {
    includeDocumentInSystemPrompt: true,
    systemPromptTemplate: 'contextual_document_assistant_ja',
    enableRepositoryContext: true,
    enableDocumentMetadata: true,
    completeToolFlow: true
  };
  console.log('ドキュメントコンテキスト設定をリセットしました');
};

/**
 * ファイルサイズのフォーマット
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 初期化時にテンプレート一覧を読み込み
onMounted(() => {
  loadTemplates();
});
</script>

<style scoped>
.document-context-panel {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 6px;
  font-size: 0.9rem;
}

.context-settings-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.context-config-toggle {
  margin-left: auto;
}

.document-context-config {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #c8e6c9;
}

.config-section {
  margin-bottom: 1rem;
}

.config-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.p-field-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-context-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f1f8e9;
  border-radius: 4px;
}

.current-context-info h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #2e7d32;
}

.context-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.context-item {
  font-size: 0.85rem;
  color: #333;
}

.config-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #c8e6c9;
}
</style>