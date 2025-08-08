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
        <ControlsGrid />
      </div>
    </FormSection>
    
    <div v-else class="controls-content">
      <ControlsGrid />
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
  searchQuery?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  selectedService?: GitServiceType | null;
  showServiceFilter?: boolean;
  customFilters?: {
    key: string;
    label: string;
    options: FilterOption[];
    value?: any;
    showClear?: boolean;
  }[];
  sortOptions?: SortOption[];
  sortBy?: string;
  showSort?: boolean;
  viewModeOptions?: ViewModeOption[];
  viewMode?: string;
  showViewMode?: boolean;
  showRefresh?: boolean;
  loading?: boolean;
  showAsSection?: boolean;
  sectionTitle?: string;
  sectionIcon?: string;
  sectionCollapsible?: boolean;
  sectionCollapsed?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
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
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:selectedService', value: GitServiceType | null): void;
  (e: 'update:customFilter', key: string, value: any): void;
  (e: 'update:sortBy', value: string): void;
  (e: 'update:viewMode', value: string): void;
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
const handleSearchInput = (value: string) => emit('update:searchQuery', value);
const handleServiceChange = (value: GitServiceType | null) => emit('update:selectedService', value);
const handleCustomFilterChange = (key: string, value: any) => emit('update:customFilter', key, value);
const handleSortChange = (value: string) => emit('update:sortBy', value);
const handleViewModeChange = (value: string) => emit('update:viewMode', value);
const handleRefresh = () => emit('refresh');
</script>

<!-- 標準SFC子コンポーネント -->
<script setup lang="ts" name="ControlsGrid">
import { defineComponent } from 'vue';

const ControlsGrid = defineComponent({
  name: 'ControlsGrid',
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
          :class="'filter-' + filter.key"
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
  `,
  props: [...Object.keys(props)],
  setup() {
    return {
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

.loading {
  opacity: 0.6;
  pointer-events: none;
}

.search-input {
  min-width: 200px;
}

.service-filter,
.sort-dropdown {
  min-width: 120px;
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