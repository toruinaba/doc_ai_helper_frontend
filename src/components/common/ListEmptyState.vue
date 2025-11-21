<template>
  <div v-if="shouldShow" class="list-empty-state" :class="emptyStateClass">
    <div class="empty-state-content">
      <div class="empty-state-icon">
        <i :class="computedIcon" class="empty-icon"></i>
      </div>
      
      <div class="empty-state-text">
        <h3 class="empty-title">{{ computedTitle }}</h3>
        <p class="empty-description">{{ computedDescription }}</p>
      </div>
      
      <div v-if="$slots.actions || primaryAction" class="empty-state-actions">
        <slot name="actions">
          <Button
            v-if="primaryAction"
            :label="primaryAction.label"
            :icon="primaryAction.icon"
            :severity="primaryAction.severity || 'primary'"
            @click="handlePrimaryAction"
          />
        </slot>
      </div>
      
      <div v-if="secondaryActions.length > 0" class="empty-state-secondary-actions">
        <Button
          v-for="action in secondaryActions"
          :key="action.label"
          :label="action.label"
          :icon="action.icon"
          :severity="action.severity || 'secondary'"
          text
          @click="action.onClick"
        />
      </div>
    </div>
    
    <!-- カスタムコンテンツスロット -->
    <div v-if="$slots.default" class="empty-state-custom">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';

interface EmptyStateAction {
  label: string;
  icon?: string;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'help' | 'danger';
  onClick: () => void;
}

type EmptyStateType = 'no-data' | 'no-results' | 'error' | 'loading' | 'custom';

interface Props {
  /** 表示するかどうか */
  show?: boolean;
  /** 空状態のタイプ */
  type?: EmptyStateType;
  /** カスタムアイコン */
  icon?: string;
  /** カスタムタイトル */
  title?: string;
  /** カスタム説明 */
  description?: string;
  /** プライマリアクション */
  primaryAction?: EmptyStateAction;
  /** セカンダリアクション配列 */
  secondaryActions?: EmptyStateAction[];
  /** 検索クエリ（結果なし状態用） */
  searchQuery?: string;
  /** リソース名（単数形） */
  resourceName?: string;
  /** リソース名（複数形） */
  resourceNamePlural?: string;
  /** コンパクトモード */
  compact?: boolean;
  /** カスタムCSSクラス */
  customClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  type: 'no-data',
  secondaryActions: () => [],
  resourceName: 'アイテム',
  resourceNamePlural: 'アイテム',
  compact: false
});

interface Emits {
  /** プライマリアクションクリック時 */
  (e: 'primaryAction'): void;
}

const emit = defineEmits<Emits>();

const shouldShow = computed(() => props.show);

const emptyStateClass = computed(() => {
  const classes = [`empty-state--${props.type}`];
  
  if (props.compact) {
    classes.push('list-empty-state--compact');
  }
  
  if (props.customClass) {
    classes.push(props.customClass);
  }
  
  return classes;
});

const computedIcon = computed(() => {
  if (props.icon) return props.icon;
  
  switch (props.type) {
    case 'no-data':
      return 'pi pi-inbox';
    case 'no-results':
      return 'pi pi-search';
    case 'error':
      return 'pi pi-exclamation-triangle';
    case 'loading':
      return 'pi pi-spin pi-spinner';
    default:
      return 'pi pi-info-circle';
  }
});

const computedTitle = computed(() => {
  if (props.title) return props.title;
  
  switch (props.type) {
    case 'no-data':
      return `${props.resourceNamePlural}がありません`;
    case 'no-results':
      return props.searchQuery 
        ? `"${props.searchQuery}" の検索結果はありません`
        : '検索結果がありません';
    case 'error':
      return 'データの読み込みに失敗しました';
    case 'loading':
      return '読み込み中...';
    default:
      return '表示するデータがありません';
  }
});

const computedDescription = computed(() => {
  if (props.description) return props.description;
  
  switch (props.type) {
    case 'no-data':
      return `新しい${props.resourceName}を作成して始めましょう。`;
    case 'no-results':
      return props.searchQuery 
        ? '検索キーワードを変更して再度お試しください。'
        : 'フィルターを調整するか、検索キーワードを変更してください。';
    case 'error':
      return 'ネットワーク接続を確認するか、しばらく後でもう一度お試しください。';
    case 'loading':
      return 'データを読み込んでいます。しばらくお待ちください。';
    default:
      return '';
  }
});

function handlePrimaryAction() {
  if (props.primaryAction?.onClick) {
    props.primaryAction.onClick();
  }
  emit('primaryAction');
}
</script>

<style scoped>
.list-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--app-spacing-xxl) var(--app-spacing-lg);
  text-align: center;
  min-height: 300px;
}

.list-empty-state--compact {
  padding: var(--app-spacing-xl) var(--app-spacing-base);
  min-height: 200px;
}

.empty-state-content {
  max-width: 400px;
}

.empty-state-icon {
  margin-bottom: var(--app-spacing-lg);
}

.empty-icon {
  font-size: 4rem;
  color: var(--app-text-color-muted);
}

.empty-state--no-data .empty-icon {
  color: var(--app-primary-300);
}

.empty-state--no-results .empty-icon {
  color: var(--p-blue-300);
}

.empty-state--error .empty-icon {
  color: var(--p-red-400);
}

.empty-state--loading .empty-icon {
  color: var(--app-primary-400);
}

.empty-state-text {
  margin-bottom: var(--app-spacing-lg);
}

.empty-title {
  margin: 0 0 var(--app-spacing-sm);
  font-size: var(--app-font-size-xl);
  font-weight: 600;
  color: var(--app-text-color);
}

.empty-description {
  margin: 0;
  font-size: var(--app-font-size-base);
  color: var(--app-text-color-secondary);
  line-height: 1.5;
}

.empty-state-actions {
  margin-bottom: var(--app-spacing-base);
}

.empty-state-secondary-actions {
  display: flex;
  gap: var(--app-spacing-sm);
  flex-wrap: wrap;
  justify-content: center;
}

.empty-state-custom {
  margin-top: var(--app-spacing-lg);
}

/* コンパクトモード調整 */
.list-empty-state--compact .empty-icon {
  font-size: 3rem;
}

.list-empty-state--compact .empty-title {
  font-size: var(--app-font-size-lg);
}

.list-empty-state--compact .empty-description {
  font-size: var(--app-font-size-sm);
}

.list-empty-state--compact .empty-state-icon {
  margin-bottom: var(--app-spacing-base);
}

.list-empty-state--compact .empty-state-text {
  margin-bottom: var(--app-spacing-base);
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .list-empty-state {
    padding: var(--app-spacing-lg) var(--app-spacing-base);
    min-height: 250px;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
  
  .empty-title {
    font-size: var(--app-font-size-lg);
  }
  
  .empty-description {
    font-size: var(--app-font-size-sm);
  }
  
  .empty-state-secondary-actions {
    flex-direction: column;
  }
  
  .empty-state-secondary-actions :deep(.p-button) {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .list-empty-state {
    padding: var(--app-spacing-base);
    min-height: 200px;
  }
  
  .empty-state-content {
    max-width: 100%;
  }
}

/* アニメーション */
.list-empty-state {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>