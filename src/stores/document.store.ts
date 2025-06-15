/**
 * ドキュメントストア
 * 
 * ドキュメントとリポジトリの状態を管理するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';
import { types } from '../services/api';

export const useDocumentStore = defineStore('document', () => {
  // 状態
  const currentDocument = ref<types.DocumentResponse | null>(null);
  const repositoryStructure = ref<types.FileTreeItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentService = ref<string>('mock'); // デフォルトはmock
  const currentOwner = ref<string>('example');
  const currentRepo = ref<string>('docs-project');
  const currentPath = ref<string>('');
  const currentRef = ref<string>('main');
  
  // リポジトリの完全パス
  const repositoryFullPath = computed(() => {
    return `${currentService.value}/${currentOwner.value}/${currentRepo.value}`;
  });

  // ドキュメントのタイトル
  const documentTitle = computed(() => {
    if (!currentDocument.value) return '';
    return currentDocument.value.name;
  });

  // ドキュメント取得
  async function fetchDocument(path: string, ref: string = currentRef.value) {
    isLoading.value = true;
    error.value = null;
    
    try {
      currentDocument.value = await apiClient.getDocument(
        currentService.value,
        currentOwner.value,
        currentRepo.value,
        path,
        ref,
        true
      );
      currentPath.value = path;
    } catch (err: any) {
      error.value = err.message || 'ドキュメントの取得に失敗しました';
      console.error('ドキュメント取得エラー:', err);
    } finally {
      isLoading.value = false;
    }
  }

  // リポジトリ構造取得
  async function fetchRepositoryStructure(path: string = '', ref: string = currentRef.value) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await apiClient.getRepositoryStructure(
        currentService.value,
        currentOwner.value,
        currentRepo.value,
        ref,
        path
      );
      repositoryStructure.value = response.tree;
    } catch (err: any) {
      error.value = err.message || 'リポジトリ構造の取得に失敗しました';
      console.error('リポジトリ構造取得エラー:', err);
    } finally {
      isLoading.value = false;
    }
  }

  // リポジトリ設定
  function setRepository(service: string, owner: string, repo: string, ref: string = 'main') {
    currentService.value = service;
    currentOwner.value = owner;
    currentRepo.value = repo;
    currentRef.value = ref;
    // リポジトリを変更したら構造を再取得
    fetchRepositoryStructure();
  }

  // ドキュメントのリンクをクリックしたときの処理
  async function navigateToLink(link: types.LinkInfo) {
    if (link.is_external) {
      // 外部リンクは新しいタブで開く
      window.open(link.url, '_blank');
      return;
    }

    // 内部リンクの場合はドキュメントを取得
    await fetchDocument(link.url);
  }

  return {
    // 状態
    currentDocument,
    repositoryStructure,
    isLoading,
    error,
    currentService,
    currentOwner,
    currentRepo,
    currentPath,
    currentRef,
    
    // 算出プロパティ
    repositoryFullPath,
    documentTitle,
    
    // アクション
    fetchDocument,
    fetchRepositoryStructure,
    setRepository,
    navigateToLink
  };
});
