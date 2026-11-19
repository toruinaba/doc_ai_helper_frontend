<template>
  <Dialog
    :visible="visible"
    :header="title"
    :modal="modal"
    :closable="closable"
    :draggable="draggable"
    :blockScroll="blockScroll"
    :dismissableMask="dismissableMask"
    :closeOnEscape="closeOnEscape"
    :style="dialogStyle"
    :class="dialogClass"
    appendTo="body"
    @update:visible="handleVisibilityChange"
    @hide="$emit('hide')"
    @show="$emit('show')"
  >
    <template v-if="$slots.header" #header>
      <slot name="header"></slot>
    </template>
    
    <div class="details-dialog-content" :class="{ 'details-dialog-content--loading': loading }">
      <div v-if="loading" class="details-dialog-loading">
        <ProgressSpinner size="large" />
        <span v-if="loadingMessage" class="loading-message">{{ loadingMessage }}</span>
      </div>
      
      <div v-else-if="error" class="details-dialog-error">
        <StatusMessage
          :message="error"
          severity="error"
          :closable="false"
          title="読み込みエラー"
        />
        <div class="error-actions">
          <Button
            label="再試行"
            icon="pi pi-refresh"
            severity="secondary"
            size="small"
            @click="$emit('retry')"
          />
        </div>
      </div>
      
      <div v-else class="details-content">
        <slot></slot>
      </div>
    </div>
    
    <template v-if="$slots.footer || showDefaultFooter" #footer>
      <slot name="footer">
        <div class="details-dialog-footer">
          <Button
            v-if="showEditButton"
            :label="editButtonLabel"
            :icon="editButtonIcon"
            severity="primary"
            @click="$emit('edit')"
          />
          <Button
            :label="closeButtonLabel"
            :icon="closeButtonIcon"
            severity="secondary"
            @click="handleClose"
          />
        </div>
      </slot>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import StatusMessage from './StatusMessage.vue';

interface Props {
  /** ダイアログの表示状態 */
  visible: boolean;
  /** ダイアログタイトル */
  title?: string;
  /** モーダル表示 */
  modal?: boolean;
  /** 閉じるボタン表示 */
  closable?: boolean;
  /** ドラッグ可能 */
  draggable?: boolean;
  /** スクロールブロック */
  blockScroll?: boolean;
  /** マスククリックで閉じる */
  dismissableMask?: boolean;
  /** ESCで閉じる */
  closeOnEscape?: boolean;
  /** ローディング状態 */
  loading?: boolean;
  /** ローディングメッセージ */
  loadingMessage?: string;
  /** エラーメッセージ */
  error?: string;
  /** カスタムダイアログスタイル */
  dialogStyle?: string | Record<string, any>;
  /** カスタムダイアログクラス */
  customClass?: string;
  /** デフォルトフッターを表示 */
  showDefaultFooter?: boolean;
  /** 編集ボタンを表示 */
  showEditButton?: boolean;
  /** 編集ボタンのラベル */
  editButtonLabel?: string;
  /** 編集ボタンのアイコン */
  editButtonIcon?: string;
  /** 閉じるボタンのラベル */
  closeButtonLabel?: string;
  /** 閉じるボタンのアイコン */
  closeButtonIcon?: string;
  /** ダイアログの最大幅 */
  maxWidth?: string;
  /** ダイアログの最小幅 */
  minWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modal: true,
  closable: true,
  draggable: false,
  blockScroll: true,
  dismissableMask: false,
  closeOnEscape: true,
  loading: false,
  showDefaultFooter: true,
  showEditButton: false,
  editButtonLabel: '編集',
  editButtonIcon: 'pi pi-pencil',
  closeButtonLabel: '閉じる',
  closeButtonIcon: 'pi pi-times',
  maxWidth: '90vw',
  minWidth: '400px'
});

interface Emits {
  /** 表示状態変更 */
  (e: 'update:visible', value: boolean): void;
  /** ダイアログ非表示 */
  (e: 'hide'): void;
  /** ダイアログ表示 */
  (e: 'show'): void;
  /** 編集ボタンクリック */
  (e: 'edit'): void;
  /** 閉じるボタンクリック */
  (e: 'close'): void;
  /** 再試行ボタンクリック */
  (e: 'retry'): void;
}

const emit = defineEmits<Emits>();

const dialogClass = computed(() => {
  const classes = ['details-dialog'];
  
  if (props.customClass) {
    classes.push(props.customClass);
  }
  
  if (props.loading) {
    classes.push('details-dialog--loading');
  }
  
  if (props.error) {
    classes.push('details-dialog--error');
  }
  
  return classes.join(' ');
});

const dialogStyle = computed(() => {
  const baseStyle = {
    maxWidth: props.maxWidth,
    minWidth: props.minWidth,
    width: '100%'
  };
  
  if (typeof props.dialogStyle === 'string') {
    return baseStyle;
  }
  
  return {
    ...baseStyle,
    ...props.dialogStyle
  };
});

function handleVisibilityChange(value: boolean) {
  emit('update:visible', value);
}

function handleClose() {
  emit('close');
  emit('update:visible', false);
}
</script>

<style scoped>
.details-dialog-content {
  min-height: 200px;
  position: relative;
}

.details-dialog-content--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.details-dialog-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-spacing-base);
  text-align: center;
}

.loading-message {
  color: var(--app-text-color-secondary);
  font-size: var(--app-font-size-sm);
}

.details-dialog-error {
  padding: var(--app-spacing-base);
}

.error-actions {
  margin-top: var(--app-spacing-base);
  text-align: center;
}

.details-content {
  padding: var(--app-spacing-base);
}

.details-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--app-spacing-sm);
  padding: var(--app-spacing-base);
  border-top: 1px solid var(--app-surface-border);
  background-color: var(--app-surface-50);
}

/* ダイアログ全体のスタイリング */
:deep(.p-dialog) {
  border-radius: var(--app-border-radius-lg);
  box-shadow: var(--app-shadow-dialog);
}

:deep(.p-dialog-header) {
  padding: var(--app-spacing-lg);
  border-bottom: 1px solid var(--app-surface-border);
  background-color: var(--app-surface-0);
}

:deep(.p-dialog-content) {
  padding: 0;
  background-color: var(--app-surface-0);
}

:deep(.p-dialog-footer) {
  padding: 0;
  border-top: none;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  :deep(.p-dialog) {
    width: 95vw !important;
    max-width: none !important;
    margin: var(--app-spacing-base);
  }
  
  .details-dialog-footer {
    flex-direction: column-reverse;
  }
  
  .details-dialog-footer :deep(.p-button) {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .details-dialog-content--loading {
    min-height: 200px;
  }
  
  :deep(.p-dialog-header) {
    padding: var(--app-spacing-base);
  }
  
  .details-content {
    padding: var(--app-spacing-base);
  }
}
</style>