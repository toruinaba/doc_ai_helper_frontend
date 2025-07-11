<!--
  RepositoryNavigator - バックアップ版（ファイルツリー実装）
  
  将来の参考として、元のファイルツリー実装を保持
  バグ修正や将来の機能拡張時の参考として使用
-->
<template>
  <div class="repository-navigator-container">
    <div class="repository-header">
      <div class="repository-title">
        <h2>{{ repositoryTitle }}</h2>
      </div>
      <div class="repository-actions">
        <Button
          icon="pi pi-refresh"
          class="p-button-text p-button-sm"
          @click="refreshRepository"
          :disabled="isLoading"
          title="リポジトリ構造を更新"
        />
      </div>
    </div>
    
    <Message v-if="error" severity="error" :closable="true" :sticky="true">
      {{ error }}
    </Message>
    
    <div v-if="isLoading" class="p-d-flex p-jc-center p-ai-center loading-container">
      <ProgressSpinner style="width: 30px; height: 30px" strokeWidth="5" />
      <span class="loading-text">リポジトリを読み込み中...</span>
    </div>
    
    <div v-else-if="noRepositoryData" class="p-d-flex p-jc-center p-ai-center empty-state">
      <div class="empty-state-content">
        <i class="pi pi-folder-open empty-icon"></i>
        <h3>リポジトリが選択されていません</h3>
        <p>リポジトリを選択してください。</p>
        <div class="mock-repo-list">
          <h4>利用可能なモックリポジトリ:</h4>
          <ul>
            <li v-for="repo in mockRepositories" :key="`${repo.service}/${repo.owner}/${repo.repo}`">
              <a href="#" @click.prevent="selectMockRepository(repo)">
                {{ repo.owner }}/{{ repo.repo }}
              </a>
              <div class="repo-description">{{ repo.description }}</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
    
    <div v-else class="repository-tree-container">
      <Tree
        v-model:selectionKeys="selectedNodeKey"
        :value="treeNodes"
        selectionMode="single"
        @node-select="onNodeSelect"
        class="repository-tree"
      >
        <template #default="{ node }">
          <div class="file-node">
            <i :class="getFileIcon(node)"></i>
            <span class="file-name">{{ node.label }}</span>
          </div>
        </template>
      </Tree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDocumentStore } from '@/stores/document.store';
import { useRepositoryStore } from '@/stores/repository.store';
import Tree from 'primevue/tree';
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import { types } from '@/services/api';

const documentStore = useDocumentStore();
const repositoryStore = useRepositoryStore();

// 状態
const selectedNodeKey = ref<{[key: string]: boolean}>({});
const treeNodes = ref<any[]>([]);

// 状態を参照
const isLoading = computed(() => documentStore.isLoading);
const error = computed(() => documentStore.error);
const repositoryStructure = computed(() => documentStore.repositoryStructure);
const mockRepositories = computed(() => repositoryStore.getAvailableMockRepositories());

// リポジトリタイトル
const repositoryTitle = computed(() => {
  return `${documentStore.currentOwner}/${documentStore.currentRepo}`;
});

// リポジトリデータの有無
const noRepositoryData = computed(() => {
  return !repositoryStructure.value || repositoryStructure.value.length === 0;
});

// ツリーノードの構築
watch(repositoryStructure, (newStructure) => {
  if (!newStructure) return;
  
  treeNodes.value = buildTreeNodes(newStructure);
}, { immediate: true });

/**
 * リポジトリ構造からツリーノードを構築
 * 注意: この実装にはバグがあり、将来修正が必要
 */
function buildTreeNodes(items: types.FileTreeItem[]): any[] {
  if (!items || items.length === 0) return [];
  
  // パスの区切りで分解してディレクトリ構造を構築
  const rootNodes: any[] = [];
  const nodeMap: Record<string, any> = {};
  
  // まずはディレクトリとファイルを分ける
  const sortedItems = [...items].sort((a, b) => {
    // ディレクトリを先に、ファイルを後に
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    // 同じタイプなら名前でソート
    return a.name.localeCompare(b.name);
  });
  
  // ディレクトリ構造を構築
  for (const item of sortedItems) {
    const pathParts = item.path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    // ノードの作成
    const node: any = {
      key: item.path,
      label: fileName || item.name,
      data: item,
      type: item.type,
      leaf: item.type === 'file',
      children: []
    };
    
    // パスの階層構造を管理するマップに追加
    nodeMap[item.path] = node;
    
    if (pathParts.length === 1 || item.path.indexOf('/') === -1) {
      // ルートレベルのファイルまたはディレクトリ
      rootNodes.push(node);
    } else {
      // 親ディレクトリのパスを取得
      const parentPath = pathParts.slice(0, -1).join('/');
      
      // 親ディレクトリが既にマップにあれば子として追加
      if (nodeMap[parentPath]) {
        nodeMap[parentPath].children.push(node);
      } else {
        // 親ディレクトリがない場合は、親ディレクトリを作成して追加
        const parentNode = {
          key: parentPath,
          label: pathParts[pathParts.length - 2],
          type: 'directory',
          leaf: false,
          children: [node]
        };
        nodeMap[parentPath] = parentNode;
        
        // 親の親を探索して、適切な位置に配置
        if (pathParts.length === 2) {
          rootNodes.push(parentNode);
        } else {
          const grandParentPath = pathParts.slice(0, -2).join('/');
          if (nodeMap[grandParentPath]) {
            nodeMap[grandParentPath].children.push(parentNode);
          }
          // 以下、再帰的に親の構築が必要な場合の処理を追加...
        }
      }
    }
  }
  
  // 各ディレクトリの子要素をソート
  const sortNodes = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        node.children.sort((a: any, b: any) => {
          // ディレクトリを先に、ファイルを後に
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          // 同じタイプなら名前でソート
          return a.label.localeCompare(b.label);
        });
        // 再帰的に子ノードもソート
        sortNodes(node.children);
      }
    }
  };
  
  sortNodes(rootNodes);
  return rootNodes;
}

/**
 * ファイルタイプに応じたアイコンクラスを取得
 */
function getFileIcon(node: any): string {
  if (node.type === 'directory') {
    return 'pi pi-folder';
  }
  
  // ファイル拡張子に基づいてアイコンを決定
  const fileName = node.label.toLowerCase();
  if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
    return 'pi pi-file-o';
  } else if (fileName.endsWith('.json')) {
    return 'pi pi-code';
  } else if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
    return 'pi pi-code';
  } else if (fileName.endsWith('.css') || fileName.endsWith('.scss')) {
    return 'pi pi-palette';
  } else if (fileName.endsWith('.html')) {
    return 'pi pi-desktop';
  } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.gif')) {
    return 'pi pi-image';
  }
  
  return 'pi pi-file';
}

/**
 * ノード選択時の処理
 */
function onNodeSelect(node: any) {
  if (node.type === 'file') {
    // マークダウンファイルかどうかチェック
    const isMarkdown = node.label.toLowerCase().endsWith('.md') || 
                       node.label.toLowerCase().endsWith('.markdown');
    
    if (isMarkdown) {
      documentStore.fetchDocument(node.key);
    } else {
      // マークダウン以外のファイルは現在サポートしていないメッセージ
      console.log('マークダウン以外のファイルは現在サポートしていません:', node.label);
    }
  } else {
    // ディレクトリの場合は何もしない
    console.log('ディレクトリが選択されました:', node.label);
  }
}

/**
 * リポジトリ更新
 */
function refreshRepository() {
  documentStore.fetchRepositoryStructure();
}

/**
 * モックリポジトリ選択
 */
function selectMockRepository(repo: any) {
  documentStore.setRepository(repo.service, repo.owner, repo.repo);
}

// コンポーネントマウント時の処理
onMounted(() => {
  // 初期リポジトリが設定されている場合は構造を取得
  if (documentStore.currentService && documentStore.currentOwner && documentStore.currentRepo) {
    documentStore.fetchRepositoryStructure();
  }
});
</script>

<style scoped>
.repository-navigator-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.repository-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #e0e0e0;
  border-bottom: 1px solid #ccc;
}

.repository-title h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  flex: 1;
}

.loading-text {
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.85rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  flex: 1;
  color: #999;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.mock-repo-list {
  margin-top: 1.5rem;
  text-align: left;
  width: 100%;
}

.mock-repo-list h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.mock-repo-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mock-repo-list li {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.mock-repo-list a {
  color: #0366d6;
  text-decoration: none;
  font-weight: 500;
}

.mock-repo-list a:hover {
  text-decoration: underline;
}

.repo-description {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.25rem;
}

.repository-tree-container {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem;
}

.repository-tree {
  font-size: 0.9rem;
}

.file-node {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.p-tree) {
  border: none;
  padding: 0;
  background: transparent;
}

:deep(.p-treenode-content) {
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
}

:deep(.p-treenode-content:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

:deep(.p-highlight) {
  background-color: #e3f2fd !important;
}
</style>
