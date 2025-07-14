/**
 * リポジトリストア
 * 
 * リポジトリ一覧と管理を担当するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';
import { types } from '../services/api';
import { getDefaultRepositoryConfig } from '../utils/config.util';

type GitServiceType = 'github' | 'gitlab' | 'bitbucket' | 'mock';

interface Repository {
  id: number;
  name: string;
  owner: string;
  service: GitServiceType;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useRepositoryStore = defineStore('repository', () => {
  // デフォルト設定を取得
  const defaultConfig = getDefaultRepositoryConfig();

  // 状態
  const repositories = ref<Repository[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentService = ref<string>(defaultConfig.service);
  const currentOwner = ref<string>(defaultConfig.owner);
  const currentRepo = ref<string>(defaultConfig.repo);
  const currentRef = ref<string>(defaultConfig.ref);
  
  // リポジトリ一覧取得
  async function fetchRepositories() {
    isLoading.value = true;
    error.value = null;
    
    try {
      repositories.value = await apiClient.listRepositories() as Repository[];
    } catch (err: any) {
      error.value = err.message || 'リポジトリ一覧の取得に失敗しました';
      console.error('リポジトリ一覧取得エラー:', err);
    } finally {
      isLoading.value = false;
    }
  }
  
  // リポジトリ構造取得
  async function fetchRepositoryStructure(
    service: string = currentService.value,
    owner: string = currentOwner.value,
    repo: string = currentRepo.value,
    ref: string = currentRef.value,
    path: string = ''
  ) {
    isLoading.value = true;
    error.value = null;
    
    try {
      return await apiClient.getRepositoryStructure(service, owner, repo, ref, path);
    } catch (err: any) {
      error.value = err.message || 'リポジトリ構造の取得に失敗しました';
      console.error('リポジトリ構造取得エラー:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  // リポジトリ検索
  async function searchRepository(
    query: types.SearchQuery,
    service: string = currentService.value,
    owner: string = currentOwner.value,
    repo: string = currentRepo.value
  ) {
    isLoading.value = true;
    error.value = null;
    
    try {
      return await apiClient.searchRepository(service, owner, repo, query);
    } catch (err: any) {
      error.value = err.message || 'リポジトリ検索に失敗しました';
      console.error('リポジトリ検索エラー:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  // リポジトリ作成
  async function createRepository(data: types.RepositoryCreate) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const newRepository = await apiClient.createRepository(data);
      repositories.value.push(newRepository as Repository);
      return newRepository;
    } catch (err: any) {
      error.value = err.message || 'リポジトリの作成に失敗しました';
      console.error('リポジトリ作成エラー:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  // リポジトリ更新
  async function updateRepository(id: number, data: types.RepositoryUpdate) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const updatedRepository = await apiClient.updateRepository(id, data);
      const index = repositories.value.findIndex((repo: Repository) => repo.id === id);
      if (index !== -1) {
        repositories.value[index] = updatedRepository as Repository;
      }
      return updatedRepository;
    } catch (err: any) {
      error.value = err.message || 'リポジトリの更新に失敗しました';
      console.error('リポジトリ更新エラー:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }
  
  // リポジトリ削除
  async function deleteRepository(id: number) {
    isLoading.value = true;
    error.value = null;
    
    try {
      await apiClient.deleteRepository(id);
      repositories.value = repositories.value.filter((repo: Repository) => repo.id !== id);
      return true;
    } catch (err: any) {
      error.value = err.message || 'リポジトリの削除に失敗しました';
      console.error('リポジトリ削除エラー:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 利用可能なモックリポジトリ取得
  function getAvailableMockRepositories() {
    return [
      {
        service: 'mock',
        owner: 'octocat',
        repo: 'Hello-World',
        description: '基本的なサンプルリポジトリ'
      },
      {
        service: 'mock',
        owner: 'example',
        repo: 'docs-project',
        description: '複雑なドキュメントプロジェクト（リンク、フロントマター、コードブロックなど）'
      }
    ];
  }
  
  return {
    // 状態
    repositories,
    isLoading,
    error,
    currentService,
    currentOwner,
    currentRepo,
    currentRef,
    
    // アクション
    fetchRepositories,
    createRepository,
    updateRepository,
    deleteRepository,
    getAvailableMockRepositories,
    fetchRepositoryStructure,
    searchRepository
  };
});
