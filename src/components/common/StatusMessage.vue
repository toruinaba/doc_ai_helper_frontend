<template>
  <Message
    v-if="message"
    :severity="severity"
    :closable="closable"
    :sticky="sticky"
    :life="life"
    :class="messageClass"
    @close="handleClose"
  >
    
    <div class="status-message-content">
      <i v-if="showIcon && icon" :class="icon" class="status-message-icon"></i>
      
      <div class="status-message-text">
        <strong v-if="title" class="status-message-title">{{ title }}</strong>
        <div class="status-message-body">
          <slot>{{ message }}</slot>
        </div>
        <div v-if="details" class="status-message-details">
          <small>{{ details }}</small>
        </div>
      </div>
    </div>
  </Message>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Message from 'primevue/message';

type SeverityType = 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';

interface Props {
  /** メッセージテキスト */
  message?: string;
  /** メッセージタイトル */
  title?: string;
  /** 詳細情報 */
  details?: string;
  /** メッセージの重要度 */
  severity?: SeverityType;
  /** 閉じるボタンを表示するか */
  closable?: boolean;
  /** スティッキーモード（自動で消えない） */
  sticky?: boolean;
  /** 自動で閉じるまでの時間（ms） */
  life?: number;
  /** カスタムアイコン */
  icon?: string;
  /** アイコンを表示するか */
  showIcon?: boolean;
  /** カスタムCSSクラス */
  customClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'info',
  closable: true,
  sticky: false,
  life: 3000,
  showIcon: true
});

interface Emits {
  /** メッセージが閉じられた時 */
  (e: 'close'): void;
  /** メッセージがクリアされた時 */
  (e: 'clear'): void;
}

const emit = defineEmits<Emits>();

const messageClass = computed(() => {
  const classes = ['status-message'];
  
  if (props.customClass) {
    classes.push(props.customClass);
  }
  
  if (props.title) {
    classes.push('status-message--with-title');
  }
  
  return classes.join(' ');
});

const icon = computed(() => {
  if (props.icon) return props.icon;
  
  // デフォルトアイコン
  switch (props.severity) {
    case 'success':
      return 'pi pi-check-circle';
    case 'info':
      return 'pi pi-info-circle';
    case 'warn':
      return 'pi pi-exclamation-triangle';
    case 'error':
      return 'pi pi-times-circle';
    default:
      return 'pi pi-info-circle';
  }
});

function handleClose() {
  emit('close');
  emit('clear');
}
</script>

<style scoped>
.status-message {
  margin-bottom: var(--app-spacing-base);
}

.status-message-content {
  display: flex;
  align-items: flex-start;
  gap: var(--app-spacing-sm);
  width: 100%;
}

.status-message-icon {
  flex-shrink: 0;
  font-size: 1.1rem;
  margin-top: 2px;
}

.status-message-text {
  flex: 1;
  min-width: 0; /* Prevent overflow */
}

.status-message-title {
  display: block;
  margin-bottom: var(--app-spacing-xs);
  font-weight: 600;
  font-size: var(--app-font-size-base);
}

.status-message-body {
  line-height: 1.4;
}

.status-message-details {
  margin-top: var(--app-spacing-xs);
  opacity: 0.8;
}

/* Severity-specific icon colors */
:deep(.p-message-success) .status-message-icon {
  color: var(--p-green-600);
}

:deep(.p-message-info) .status-message-icon {
  color: var(--p-blue-600);
}

:deep(.p-message-warn) .status-message-icon {
  color: var(--p-orange-600);
}

:deep(.p-message-error) .status-message-icon {
  color: var(--p-red-600);
}

/* Enhanced styling for messages with titles */
.status-message--with-title :deep(.p-message-wrapper) {
  padding: var(--app-spacing-base);
}

/* Compact mode for inline messages */
.status-message--compact .status-message-content {
  align-items: center;
}

.status-message--compact .status-message-icon {
  font-size: 1rem;
  margin-top: 0;
}

/* Animation for dynamic messages */
.status-message {
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>