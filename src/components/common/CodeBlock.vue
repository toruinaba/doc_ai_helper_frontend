<template>
  <div class="code-block-container">
    <div class="code-header" v-if="language">
      <span class="language-tag">{{ language }}</span>
      <Button 
        icon="pi pi-copy" 
        class="p-button-text p-button-sm copy-button"
        @click="copyToClipboard"
        :disabled="isCopying"
        :title="isCopying ? 'コピーしました' : 'クリップボードにコピー'"
      />
    </div>
    <pre class="hljs"><code :class="`language-${language}`" v-html="highlightedCode"></code></pre>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import hljs from 'highlight.js';
import Button from 'primevue/button';

interface Props {
  code: string;
  language?: string;
}

const props = defineProps<Props>();
const isCopying = ref(false);

/**
 * コードをハイライトする
 */
const highlightedCode = computed(() => {
  const validLanguage = props.language && hljs.getLanguage(props.language) 
    ? props.language 
    : 'plaintext';
    
  try {
    return hljs.highlight(props.code, { language: validLanguage }).value;
  } catch (e) {
    console.error('シンタックスハイライトに失敗しました', e);
    return hljs.highlightAuto(props.code).value;
  }
});

/**
 * コードをクリップボードにコピーする
 */
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.code);
    isCopying.value = true;
    
    // 2秒後にコピー状態をリセット
    setTimeout(() => {
      isCopying.value = false;
    }, 2000);
  } catch (err) {
    console.error('クリップボードへのコピーに失敗しました', err);
  }
}
</script>

<style scoped>
.code-block-container {
  margin: 1rem 0;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #e0e0e0;
  font-family: monospace;
  font-size: 0.85rem;
}

.language-tag {
  text-transform: uppercase;
  font-weight: bold;
  color: #555;
}

.copy-button {
  padding: 0.25rem;
  margin: -0.25rem;
}

pre {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
}

code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
}

:deep(.hljs) {
  background-color: transparent;
  padding: 0;
}
</style>
