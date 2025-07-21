<template>
  <div class="test-page">
    <h1>PrimeVue Select テスト</h1>
    
    <!-- 最小限のSelectテスト -->
    <div class="test-section">
      <h2>基本的なSelect</h2>
      <Select
        v-model="selectedValue"
        :options="options"
        optionLabel="label"
        optionValue="value"
        placeholder="選択してください"
        style="width: 300px;"
      />
      <p>選択された値: {{ selectedValue }}</p>
    </div>

    <!-- ストリーミング方式のテスト -->
    <div class="test-section">
      <h2>ストリーミング方式（Settings.vueから）</h2>
      <Select
        v-model="streamingType"
        :options="streamingTypeOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="選択してください"
        style="width: 300px;"
      />
      <p>選択された値: {{ streamingType }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Select from 'primevue/select';

const selectedValue = ref(null);
const options = [
  { label: 'オプション 1', value: 'option1' },
  { label: 'オプション 2', value: 'option2' },
  { label: 'オプション 3', value: 'option3' }
];

const streamingType = ref('fetch');
const streamingTypeOptions = [
  { label: '自動検出', value: 'auto' },
  { label: 'EventSource', value: 'eventsource' },
  { label: 'fetch API (推奨)', value: 'fetch' }
];
</script>

<style scoped>
.test-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

h1, h2 {
  color: #1f2937;
}

p {
  margin-top: 1rem;
  color: #6b7280;
}
</style>