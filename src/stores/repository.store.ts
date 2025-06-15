/**
 * リポジトリストア
 * 
 * リポジトリ一覧と管理を担当するPiniaストア
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';
import { types } from '../services/api';

export const useRepositoryStore = defineStore('repository', () => {
  // 状態
  const repositories = ref<types.RepositoryResponse[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // リポジトリ一覧取得
  async function fetchRepositories() {
    isLoading.value = true;
    error.value = null;
    
    try {
      repositories.value = await apiClient.listRepositories();
    } catch (err: any) {
      error.value = err.message || 'リポジトリ一覧の取得に失敗しました';
      console.error('リポジトリ一覧取得エラー:', err);
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
      repositories.value.push(newRepository);
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
      const index = repositories.value.findIndex(repo => repo.id === id);
      if (index !== -1) {
        repositories.value[index] = updatedRepository;
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
      repositories.value = repositories.value.filter(repo => repo.id !== id);
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
    
    // アクション
    fetchRepositories,
    createRepository,
    updateRepository,
    deleteRepository,
    getAvailableMockRepositories
  };
});
