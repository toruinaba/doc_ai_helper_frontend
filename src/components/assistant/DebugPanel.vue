<template>
  <div v-if="showDebugPanel" class="debug-panel">
    <div class="debug-options">
      <div>
        <div class="option-label">ストリーミング方式：</div>
        <div class="p-field-radiobutton">
          <RadioButton v-model="streamingType" inputId="auto" name="streamingType" value="auto" />
          <label for="auto">自動検出</label>
        </div>
        <div class="p-field-radiobutton">
          <RadioButton v-model="streamingType" inputId="eventsource" name="streamingType" value="eventsource" />
          <label for="eventsource">EventSource</label>
        </div>
        <div class="p-field-radiobutton">
          <RadioButton v-model="streamingType" inputId="fetch" name="streamingType" value="fetch" />
          <label for="fetch">fetch API</label>
        </div>
        <div class="debug-info">
          現在の設定: {{ streamingType }} 
          <span v-if="streamingType === 'fetch'" class="recommended">(推奨)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import RadioButton from 'primevue/radiobutton';

// Props
interface Props {
  /** ストリーミングタイプの初期値 */
  initialStreamingType?: string;
}

const props = withDefaults(defineProps<Props>(), {
  initialStreamingType: 'fetch'
});

// Emits
interface Emits {
  /** ストリーミングタイプが変更された */
  (event: 'streaming-type-changed', type: string): void;
}

const emit = defineEmits<Emits>();

// デバッグパネルの表示状態
const showDebugPanel = ref(import.meta.env.DEV || import.meta.env.VITE_SHOW_DEBUG_PANEL === 'true');

// ストリーミングタイプ
const streamingType = ref<string>(props.initialStreamingType);

// ストリーミングタイプが変更されたときの処理
watch(streamingType, (newType) => {
  emit('streaming-type-changed', newType);
  console.log(`ストリーミングタイプを変更しました: ${newType}`);
});
</script>

<style scoped>
/* デバッグパネルのスタイル */
.debug-panel {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.8rem;
}

.debug-options {
  display: flex;
  flex-direction: column;
}

.option-label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.p-field-radiobutton {
  display: flex;
  align-items: center;
  margin: 0.25rem 0;
}

.debug-info {
  margin-top: 0.5rem;
  font-style: italic;
  color: #666;
}

.recommended {
  color: #2196F3;
  font-weight: bold;
}
</style>