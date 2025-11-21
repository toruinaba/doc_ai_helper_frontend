<template>
  <Panel>
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <Avatar 
            icon="pi pi-folder" 
            size="small" 
            style="background-color: var(--p-primary-color); color: var(--p-primary-contrast)" 
          />
          <span style="font-weight: 600; font-size: 1.125rem;">{{ repository.name }}</span>
        </div>
      </div>
    </template>
    
    <template #icons>
      <div v-if="props.layout === 'detailed'" style="display: inline-flex; align-items: center; gap: 0.25rem;">
        <Button 
          icon="pi pi-cog"
          size="small"
          severity="secondary"
          text
          @click="$emit('edit', repository)"
        />
        <Button 
          icon="pi pi-trash"
          size="small"
          severity="danger"
          text
          @click="$emit('delete', repository)"
        />
      </div>
    </template>
    
    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
      <Tag 
        :value="repository.service_type" 
        :severity="getServiceSeverity(repository.service_type)"
        size="small"
      />
      <span>{{ repository.owner }}</span>
      <Badge 
        v-if="props.layout === 'detailed'" 
        :severity="'success'" 
        value="✓" 
        size="small"
      />
    </div>
    
    <p v-if="repository.description"><strong>説明:</strong> {{ repository.description }}</p>
    <p><strong>ブランチ:</strong> {{ repository.default_branch }}</p>
    <p v-if="repository.updated_at"><strong>更新:</strong> {{ formattedUpdatedAt }}</p>
    <p><strong>公開:</strong> {{ repository.is_public ? '公開リポジトリ' : '非公開リポジトリ' }}</p>
    
    <template #footer>
      <div style="display: flex; justify-content: center;">
        <Button 
          icon="pi pi-file-text"
          label="開く"
          style="width: 80%;"
          @click="navigateToDocument"
        />
      </div>
    </template>
  </Panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Panel from 'primevue/panel'
import Avatar from 'primevue/avatar'
import Tag from 'primevue/tag'
import Badge from 'primevue/badge'
import Button from 'primevue/button'

interface Props {
  repository: any
  layout?: 'simple' | 'detailed'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'detailed'
})

const router = useRouter()

const formattedUpdatedAt = computed(() => {
  if (!props.repository.updated_at) return 'N/A'
  return new Date(props.repository.updated_at).toLocaleDateString('ja-JP')
})

const getServiceSeverity = (serviceType: string) => {
  switch (serviceType) {
    case 'github': return 'secondary'
    case 'gitlab': return 'warn'
    default: return 'info'
  }
}

const buildDocumentPath = (repository: any): string => {
  // 新しいフィールド構造: document_root_directory + root_document_path
  if (repository.document_root_directory && repository.root_document_path) {
    const baseDir = repository.document_root_directory.endsWith('/') 
      ? repository.document_root_directory 
      : repository.document_root_directory + '/';
    return baseDir + repository.root_document_path;
  }
  
  // root_document_pathのみが設定されている場合
  if (repository.root_document_path) {
    return repository.root_document_path;
  }
  
  // レガシーフィールド: root_path
  if (repository.root_path) {
    return repository.root_path;
  }
  
  // デフォルト
  return 'README.md';
}

const navigateToDocument = () => {
  const defaultPath = buildDocumentPath(props.repository);
  
  router.push({
    name: 'DocumentView',
    params: { repositoryId: props.repository.id.toString() },
    query: { 
      path: defaultPath,
      ref: props.repository.default_branch 
    }
  });
}
</script>