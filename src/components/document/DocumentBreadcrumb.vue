<template>
  <div v-if="repositoryContext" class="breadcrumb-row">
    <Breadcrumb :model="breadcrumbItems" class="document-breadcrumb">
      <template #item="{ item }">
        <span v-if="!item.command" class="p-menuitem-text">
          <i v-if="item.icon" :class="item.icon"></i>
          <span v-if="item.label">{{ item.label }}</span>
        </span>
        <span v-else @click="(event: Event) => item.command && item.command(event as any)" class="p-menuitem-link" style="cursor: pointer;">
          <i v-if="item.icon" :class="item.icon"></i>
          <span v-if="item.label" class="p-menuitem-text">{{ item.label }}</span>
        </span>
      </template>
    </Breadcrumb>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Breadcrumb from 'primevue/breadcrumb';

interface Props {
  /** リポジトリコンテキスト */
  repositoryContext: any;
  /** 現在のパス */
  currentPath: string;
  /** ルートドキュメントかどうか */
  isRootDocument: boolean;
  /** ルートドキュメントへのナビゲーション関数 */
  navigateToRoot?: () => Promise<void>;
}

const props = defineProps<Props>();

// Breadcrumbアイテム
const breadcrumbItems = computed(() => {
  const items: Array<{
    label?: string;
    icon?: string;
    command?: () => void;
  }> = [];
  
  if (!props.currentPath) {
    return items;
  }

  // リポジトリルートを追加（アイコンのみ）
  items.push({
    icon: 'pi pi-home',
    command: !props.isRootDocument && props.navigateToRoot ? async () => await props.navigateToRoot!() : undefined
  });

  // パスを分割してBreadcrumbを構築
  const pathParts = props.currentPath.split('/').filter(part => part !== '');
  
  if (pathParts.length > 1) {
    // ディレクトリ部分（最後のファイル以外）
    for (let i = 0; i < pathParts.length - 1; i++) {
      items.push({
        label: pathParts[i],
        // 途中のディレクトリにはナビゲーション機能は付けない（要求仕様通り）
      });
    }
  }
  
  // 現在のファイル
  if (pathParts.length > 0) {
    const fileName = pathParts[pathParts.length - 1];
    items.push({
      label: fileName.replace(/\.[^/.]+$/, ''), // 拡張子を除去
    });
  }

  return items;
});
</script>

<style scoped>
.breadcrumb-row {
  margin-bottom: var(--app-spacing-xs);
  padding-bottom: var(--app-spacing-xs);
}

.document-breadcrumb {
  width: 100%;
}

.breadcrumb-row :deep(.p-breadcrumb) {
  background: none;
  border: none;
  padding: 0;
}

.breadcrumb-row :deep(.p-breadcrumb .p-breadcrumb-list) {
  margin: 0;
}

.breadcrumb-row :deep(.p-menuitem-text) {
  font-size: var(--app-font-size-base);
  color: var(--app-text-color);
  font-weight: 500;
}

.breadcrumb-row :deep(.p-menuitem-link) {
  color: var(--app-primary-color);
  text-decoration: none;
  border-radius: var(--app-border-radius-sm);
  padding: var(--app-spacing-xs) var(--app-spacing-sm);
  transition: var(--app-transition-fast);
}

.breadcrumb-row :deep(.p-menuitem-link:hover) {
  background-color: var(--app-primary-50);
}

.breadcrumb-row :deep(.p-menuitem-text i) {
  font-size: 1.1rem;
  color: var(--app-primary-color);
  margin-right: var(--app-spacing-xs);
}

.breadcrumb-row :deep(.p-menuitem-link i) {
  font-size: 1.1rem;
  color: var(--app-primary-color);
  transition: var(--app-transition-fast);
}

.breadcrumb-row :deep(.p-menuitem-link:hover i) {
  color: var(--app-primary-600);
}
</style>