<template>
  <div v-if="data && hasEntries" class="meta-display-container p-mb-3">
    <div class="p-card p-component p-shadow-2">
      <div class="p-card-body">
        <div class="p-card-title">{{ title }}</div>
        <div class="p-card-content">
          <ul class="meta-list">
            <li v-for="(value, key) in data" :key="key" class="meta-item">
              <strong>{{ formatKey(key) }}:</strong> {{ formatValue(value) }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /** メタデータオブジェクト */
  data: Record<string, any> | null;
  /** 表示タイトル */
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'メタデータ'
});

// データにエントリがあるかチェック
const hasEntries = computed(() => {
  return props.data && Object.keys(props.data).length > 0;
});

/**
 * キーをフォーマットする（camelCaseをスペース区切りに変換など）
 */
function formatKey(key: string): string {
  // キャメルケースをスペース区切りに変換し、最初の文字を大文字にする
  return key
    .replace(/([A-Z])/g, ' $1') // camelCase -> camel Case
    .replace(/^./, str => str.toUpperCase()); // 最初の文字を大文字に
}

/**
 * 値をフォーマットする（配列は文字列に変換するなど）
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return value.toString();
}
</script>

<style scoped>
.meta-display-container {
  margin-bottom: 1.5rem;
}

.meta-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.meta-item {
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.meta-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
</style>
