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
        <slot name="controls-content">
          <!-- 標準テンプレート形式の内容 -->
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
              <ServiceSelector
                v-if="showServiceFilter"
                :modelValue="selectedService"
                placeholder="サービス"
                class="service-filter"
                @update:modelValue="handleServiceChange"
              />
              
              <Dropdown
                v-for="filter in customFilters"
                :key="filter.key"
                :modelValue="filter.value"
                :options="filter.options"
                optionLabel="label"
                optionValue="value"
                :placeholder="filter.label"
                :showClear="filter.showClear !== false"
                :class="`filter-${filter.key}`"
                @update:modelValue="(value) => handleCustomFilterChange(filter.key, value)"
              />
            </div>
            
            <!-- アクションセクション -->
            <div class="actions-section">
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
        </slot>
      </div>
    </FormSection>
    
    <div v-else class="controls-content">
      <slot name="controls-content">
        <!-- 標準テンプレート形式の内容 -->
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
            <ServiceSelector
              v-if="showServiceFilter"
              :modelValue="selectedService"
              placeholder="サービス"
              class="service-filter"
              @update:modelValue="handleServiceChange"
            />
            
            <Dropdown
              v-for="filter in customFilters"
              :key="filter.key"
              :modelValue="filter.value"
              :options="filter.options"
              optionLabel="label"
              optionValue="value"
              :placeholder="filter.label"
              :showClear="filter.showClear !== false"
              :class="`filter-${filter.key}`"
              @update:modelValue="(value) => handleCustomFilterChange(filter.key, value)"
            />
          </div>
          
          <!-- アクションセクション -->
          <div class="actions-section">
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
      </slot>
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
  /** 更新ボタンクリック */
  (e: 'refresh'): void;
}

const emit = defineEmits<Emits>();

const controlsClass = computed(() => ({
  [`layout-${props.layout}`]: true,
  'compact': props.compact,
  'loading': props.loading
}));

// デフォルトのソートオプション
const defaultSortOptions: SortOption[] = [
  { label: '名前順', value: 'name', icon: 'pi pi-sort-alpha-down' },
  { label: '更新日時順', value: 'updated', icon: 'pi pi-sort-numeric-down' },
  { label: '作成日時順', value: 'created', icon: 'pi pi-sort-numeric-down' }
];

const computedSortOptions = computed(() => {
  return props.sortOptions.length > 0 ? props.sortOptions : defaultSortOptions;
});

function handleSearchInput(value: string) {
  emit('update:searchQuery', value);
}

function handleServiceChange(value: GitServiceType | null) {
  emit('update:selectedService', value);
}

function handleCustomFilterChange(filterKey: string, value: any) {
  emit('update:customFilter', filterKey, value);
}

function handleSortChange(value: string) {
  emit('update:sortBy', value);
}

function handleViewModeChange(value: string) {
  emit('update:viewMode', value);
}

function handleRefresh() {
  emit('refresh');
}

// 標準Vue SFC形式への簡略化完了
</script>

<style scoped>
.list-controls {
  margin-bottom: var(--app-spacing-base);
}

.compact {
  margin-bottom: var(--app-spacing-sm);
}

.controls-content {
  width: 100%;
}

.controls-grid {
  display: flex;
  gap: var(--app-spacing-base);
  align-items: center;
  flex-wrap: wrap;
}

.layout-vertical .controls-grid {
  flex-direction: column;
  align-items: stretch;
}

.layout-grid .controls-grid {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--app-spacing-base);
}

.search-section {
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
}

.filter-section {
  display: flex;
  gap: var(--app-spacing-sm);
  flex-wrap: wrap;
  align-items: center;
}

.actions-section {
  display: flex;
  gap: var(--app-spacing-sm);
  align-items: center;
  flex-shrink: 0;
}

/* フィルターコンポーネントのスタイル */
.service-filter,
.sort-dropdown,
.filter-section :deep(.p-dropdown) {
  min-width: 140px;
}

/* コンパクトモード */
.compact .controls-grid {
  gap: var(--app-spacing-sm);
}

.compact .search-section {
  min-width: 200px;
}

.compact .filter-section {
  gap: var(--app-spacing-xs);
}

.compact .service-filter,
.compact .sort-dropdown,
.compact .filter-section :deep(.p-dropdown) {
  min-width: 120px;
}

.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .layout-grid .controls-grid {
    grid-template-columns: 1fr;
    gap: var(--app-spacing-sm);
  }
}

@media (max-width: 768px) {
  .controls-grid {
    flex-direction: column;
    align-items: stretch;
    gap: var(--app-spacing-sm);
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .actions-section {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .search-section {
    min-width: unset;
  }
  
  .service-filter,
  .sort-dropdown,
  .filter-section :deep(.p-dropdown) {
    min-width: unset;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .actions-section {
    flex-direction: column;
  }
  
  .actions-section :deep(.p-selectbutton) {
    width: 100%;
  }
  
  .actions-section :deep(.p-button) {
    width: 100%;
    justify-content: center;
  }
}
</style>