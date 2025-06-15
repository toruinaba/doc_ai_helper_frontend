<template>
  <div v-if="frontmatter && hasEntries" class="frontmatter-container p-mb-3">
    <div class="p-card p-component p-shadow-2">
      <div class="p-card-body">
        <div class="p-card-title">メタデータ</div>
        <div class="p-card-content">
          <ul class="frontmatter-list">
            <li v-for="(value, key) in frontmatter" :key="key" class="frontmatter-item">
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
  frontmatter: Record<string, any> | null;
}

const props = defineProps<Props>();

// フロントマターにエントリがあるかチェック
const hasEntries = computed(() => {
  return props.frontmatter && Object.keys(props.frontmatter).length > 0;
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
.frontmatter-container {
  margin-bottom: 1.5rem;
}

.frontmatter-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.frontmatter-item {
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.frontmatter-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}
</style>
