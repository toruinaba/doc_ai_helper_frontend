<template>
  <div class="list-controls" :class="controlsClass">
    <FormSection 
      v-if="showAsSection"
      :title="sectionTitle" 
      :icon="sectionIcon"
      :collapsible="sectionCollapsible"
      :collapsed="sectionCollapsed"
    >
      <div class="controls-content">
        <ControlsContent />
      </div>
    </FormSection>
    
    <div v-else class="controls-content">
      <ControlsContent />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FormSection from './FormSection.vue';
import ServiceSelector from './ServiceSelector.vue';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import type { components } from '@/services/api/types.auto';

// 自動生成型のエイリアス
type GitServiceType = components['schemas']['GitServiceType'];

interface FilterOption {
  label: string;
  value: any;
  icon?: string;
}

interface SortOption {
  label: string;
  value: string;
  icon?: string;
}

interface ViewModeOption {
  label: string;
  value: string;
  icon: string;
}

interface Props {
  /** 検索クエリ */
  searchQuery?: string;
  /** 検索プレースホルダー */
  searchPlaceholder?: string;
  /** 検索を表示するか */
  showSearch?: boolean;
  
  /** 選択されたサービス */
  selectedService?: GitServiceType | null;
  /** サービスフィルターを表示するか */
  showServiceFilter?: boolean;
  
  /** カスタムフィルターの設定 */
  customFilters?: {
    key: string;
    label: string;
    options: FilterOption[];
    value?: any;
    showClear?: boolean;
  }[];
  
  /** ソート設定 */
  sortOptions?: SortOption[];
  /** 選択されたソート */
  sortBy?: string;
  /** ソートを表示するか */
  showSort?: boolean;
  
  /** ビューモード設定 */
  viewModeOptions?: ViewModeOption[];
  /** 選択されたビューモード */
  viewMode?: string;
  /** ビューモード切り替えを表示するか */
  showViewMode?: boolean;
  
  /** 更新ボタンを表示するか */
  showRefresh?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  
  /** セクションとして表示するか */
  showAsSection?: boolean;
  /** セクションタイトル */
  sectionTitle?: string;
  /** セクションアイコン */
  sectionIcon?: string;
  /** セクションを折り畳み可能にするか */
  sectionCollapsible?: boolean;
  /** セクションの初期折り畳み状態 */
  sectionCollapsed?: boolean;
  
  /** レイアウトモード */
  layout?: 'horizontal' | 'vertical' | 'grid';
  /** コンパクトモード */
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  searchPlaceholder: '検索...',
  showSearch: true,
  showServiceFilter: false,
  customFilters: () => [],
  sortOptions: () => [],
  showSort: true,
  viewModeOptions: () => [
    { label: 'カード', value: 'card', icon: 'pi pi-th-large' },
    { label: 'リスト', value: 'list', icon: 'pi pi-list' }
  ],
  showViewMode: true,
  showRefresh: true,
  loading: false,
  showAsSection: false,
  sectionTitle: 'フィルター・検索',
  sectionIcon: 'pi pi-filter',
  sectionCollapsible: true,
  sectionCollapsed: false,
  layout: 'horizontal',
  compact: false
});

interface Emits {
  /** 検索クエリ変更 */
  (e: 'update:searchQuery', value: string): void;
  /** サービス選択変更 */
  (e: 'update:selectedService', value: GitServiceType | null): void;
  /** カスタムフィルター変更 */
  (e: 'update:customFilter', key: string, value: any): void;
  /** ソート変更 */
  (e: 'update:sortBy', value: string): void;
  /** ビューモード変更 */
  (e: 'update:viewMode', value: string): void;
  /** 更新 */
  (e: 'refresh'): void;
}

const emit = defineEmits<Emits>();

// コンピューテッドクラス
const controlsClass = computed(() => ({
  [`layout-${props.layout}`]: true,
  'compact': props.compact,
  'loading': props.loading
}));

// イベントハンドラー
const handleSearchInput = (value: string) => {
  emit('update:searchQuery', value);
};

const handleServiceChange = (value: GitServiceType | null) => {
  emit('update:selectedService', value);
};

const handleCustomFilterChange = (key: string, value: any) => {
  emit('update:customFilter', key, value);
};

const handleSortChange = (value: string) => {
  emit('update:sortBy', value);
};

const handleViewModeChange = (value: string) => {
  emit('update:viewMode', value);
};

const handleRefresh = () => {
  emit('refresh');
};
</script>

<!-- ControlsContent子コンポーネント (standard SFC approach) -->
<script setup lang="ts" generic="T">
import { defineComponent } from 'vue';

const ControlsContent = defineComponent({
  name: 'ControlsContent',
  template: `
    <div class="controls-grid">
      <!-- 検索セクション -->
      <div v-if="showSearch" class="search-section">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText 
            :modelValue="searchQuery"
            :placeholder="searchPlaceholder"
            class="search-input"
            @update:modelValue="handleSearchInput"
          />
        </IconField>
      </div>
      
      <!-- フィルターセクション -->
      <div class="filter-section">
        <!-- サービスフィルター -->
        <ServiceSelector
          v-if="showServiceFilter"
          :modelValue="selectedService"
          :placeholder="'サービス'"
          class="service-filter"
          @update:modelValue="handleServiceChange"
        />
        
        <!-- カスタムフィルター -->
        <Dropdown
          v-for="filter in customFilters"
          :key="filter.key"
          :modelValue="filter.value"
          :options="filter.options"
          :optionLabel="(option) => option.label"
          :optionValue="(option) => option.value"
          :placeholder="filter.label"
          :showClear="filter.showClear !== false"
          :class="[\`filter-\${filter.key}\`]"
          @update:modelValue="(value) => handleCustomFilterChange(filter.key, value)"
        />
      </div>
      
      <!-- ソート・ビューモードセクション -->
      <div class="actions-section">
        <!-- ソート -->
        <Dropdown
          v-if="showSort && sortOptions?.length"
          :modelValue="sortBy"
          :options="sortOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="ソート"
          class="sort-dropdown"
          @update:modelValue="handleSortChange"
        />
        
        <!-- ビューモード切り替え -->
        <SelectButton
          v-if="showViewMode && viewModeOptions?.length"
          :modelValue="viewMode"
          :options="viewModeOptions"
          optionLabel="label"
          optionValue="value"
          class="view-mode-selector"
          @update:modelValue="handleViewModeChange"
        >
          <template #option="{ option }">
            <i :class="option.icon"></i>
          </template>
        </SelectButton>
        
        <!-- 更新ボタン -->
        <Button
          v-if="showRefresh"
          :loading="loading"
          :disabled="loading"
          icon="pi pi-refresh"
          class="refresh-button"
          severity="secondary"
          @click="handleRefresh"
        />
      </div>
    </div>
  `,
  setup() {
    return {
      // 継承されたpropsとemitを使用
      ...props,
      handleSearchInput,
      handleServiceChange,
      handleCustomFilterChange,
      handleSortChange,
      handleViewModeChange,
      handleRefresh
    };
  }
});
</script>

<style scoped lang="scss">
.list-controls {
  margin-bottom: var(--app-spacing-lg);
}

.controls-content {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-md);
}

.controls-grid {
  display: grid;
  gap: var(--app-spacing-md);
  grid-template-columns: 1fr;
}

// レイアウトバリエーション
.layout-horizontal .controls-grid {
  grid-template-columns: 1fr auto auto;
  align-items: center;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
}

.layout-vertical .controls-grid {
  grid-template-columns: 1fr;
}

.layout-grid .controls-grid {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

// セクション
.search-section,
.filter-section,
.actions-section {
  display: flex;
  gap: var(--app-spacing-sm);
  flex-wrap: wrap;
  align-items: center;
}

.search-section {
  flex: 1;
}

// コンパクトモード
.compact {
  .controls-content {
    gap: var(--app-spacing-sm);
  }
  
  .controls-grid {
    gap: var(--app-spacing-sm);
  }
  
  .search-section,
  .filter-section,
  .actions-section {
    gap: var(--app-spacing-xs);
  }
}

// ローディング状態
.loading {
  opacity: 0.6;
  pointer-events: none;
}

// 各コントロール
.search-input {
  min-width: 200px;
  
  .compact & {
    min-width: 150px;
  }
}

.service-filter,
.sort-dropdown {
  min-width: 120px;
  
  .compact & {
    min-width: 100px;
  }
}

.view-mode-selector :deep(.p-selectbutton) {
  display: flex;
}

.view-mode-selector :deep(.p-button) {
  padding: 0.5rem;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-button {
  aspect-ratio: 1;
  padding: 0.5rem;
}

// レスポンシブ対応
@media (max-width: 768px) {
  .layout-horizontal .controls-grid {
    grid-template-columns: 1fr;
  }
  
  .layout-grid .controls-grid {
    grid-template-columns: 1fr;
  }
  
  .search-section,
  .filter-section,
  .actions-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input {
    min-width: unset;
    width: 100%;
  }
}
</style>