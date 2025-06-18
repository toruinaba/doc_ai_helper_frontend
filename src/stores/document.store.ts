/**
 * ドキュメントストア
 * 
 * ドキュメントの状態を管理するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';
import { types } from '../services/api';
import { getDefaultRepositoryConfig, getApiConfig } from '../utils/config.util';

export const useDocumentStore = defineStore('document', () => {
  // デフォルト設定を取得
  const defaultConfig = getDefaultRepositoryConfig();
  const apiConfig = getApiConfig();

  // 状態
  const currentDocument = ref<types.DocumentResponse | null>(null);
  const repositoryStructure = ref<types.FileTreeItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentService = ref<string>(defaultConfig.service);
  const currentOwner = ref<string>(defaultConfig.owner);
  const currentRepo = ref<string>(defaultConfig.repo);
  const currentPath = ref<string>(defaultConfig.path);
  const currentRef = ref<string>(defaultConfig.ref);
  
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
    
    console.log(`Fetching document: ${path}`, {
      timestamp: new Date().toISOString(),
      service: currentService.value,
      owner: currentOwner.value,
      repo: currentRepo.value,
      ref: ref
    });
    
    try {
      // 実際のAPIを使用
      console.log(`Using API for document fetch: ${currentService.value}/${currentOwner.value}/${currentRepo.value}/${path}`);
      
      // バックエンドのURLを環境変数から取得
      const apiConfig = getApiConfig();
      const backendUrl = apiConfig.backendUrl;
      // API部分を削除して、ドメイン部分だけにする
      const baseUrlForLinks = backendUrl.replace(/\/api\/v1\/?$/, '');
      console.log(`Using backend URL for links: ${baseUrlForLinks} (original: ${backendUrl})`);
      
      currentDocument.value = await apiClient.getDocument(
        currentService.value,
        currentOwner.value,
        currentRepo.value,
        path,
        ref,
        true,
        baseUrlForLinks
      );
      console.log('Document fetched successfully:', {
        path,
        name: currentDocument.value.name,
        type: currentDocument.value.type,
        contentLength: currentDocument.value.content.content.length,
        hasLinks: currentDocument.value.links?.length || 0,
        timestamp: new Date().toISOString()
      });
      currentPath.value = path;
    } catch (err: any) {
      error.value = err.message || 'ドキュメントの取得に失敗しました';
      console.error('ドキュメント取得エラー:', err);
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
  }

  // リポジトリ構造取得
  async function fetchRepositoryStructure() {
    isLoading.value = true;
    error.value = null;
    
    try {
      console.log(`Fetching repository structure: ${currentService.value}/${currentOwner.value}/${currentRepo.value}`);
      
      const response = await apiClient.getRepositoryStructure(
        currentService.value,
        currentOwner.value,
        currentRepo.value,
        currentRef.value
      );
      
      repositoryStructure.value = response.tree;
      console.log('Repository structure fetched successfully:', {
        service: currentService.value,
        owner: currentOwner.value,
        repo: currentRepo.value,
        itemCount: repositoryStructure.value.length,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      error.value = err.message || 'リポジトリ構造の取得に失敗しました';
      console.error('リポジトリ構造取得エラー:', err);
    } finally {
      isLoading.value = false;
    }
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
    setRepository,
    navigateToLink,
    fetchRepositoryStructure
  };
});
