/**
 * リポジトリストア
 * 
 * リポジトリ一覧と管理を担当するPiniaストア
 * 新しいリポジトリ管理API対応版
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositoryService } from '../services/api/repository.service';
import type { components } from '../services/api/types.auto';
import { getDefaultRepositoryConfig } from '../utils/config.util';

// OpenAPIから自動生成された型を使用
type RepositoryResponse = components['schemas']['RepositoryResponse'];
type RepositoryCreate = components['schemas']['RepositoryCreate'];
type RepositoryUpdate = components['schemas']['RepositoryUpdate'];
type RepositoryContext = components['schemas']['RepositoryContext'];
type SearchQuery = components['schemas']['SearchQuery'];
type SearchResponse = components['schemas']['SearchResponse'];
type GitServiceType = components['schemas']['GitServiceType'];

export const useRepositoryStore = defineStore('repository', () => {
  // デフォルト設定を取得
  const defaultConfig = getDefaultRepositoryConfig();

  // 状態
  const repositories = ref<RepositoryResponse[]>([]);
  const selectedRepository = ref<RepositoryResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const healthStatus = ref<Record<number, boolean>>({});
  
  // レガシー対応：既存の環境変数ベース設定
  const currentService = ref<string>(defaultConfig.service);
  const currentOwner = ref<string>(defaultConfig.owner);
  const currentRepo = ref<string>(defaultConfig.repo);
  const currentRef = ref<string>(defaultConfig.ref);
  
  // リポジトリ一覧取得
  async function fetchRepositories(options?: { skip?: number; limit?: number }) {
    isLoading.value = true;
    error.value = null;
    
    try {
      repositories.value = await repositoryService.listRepositories(options);
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
  async function createRepository(data: RepositoryCreate) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const newRepository = await repositoryService.createRepository(data);
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
  async function updateRepository(id: number, data: RepositoryUpdate) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const updatedRepository = await repositoryService.updateRepository(id, data);
      const index = repositories.value.findIndex((repo) => repo.id === id);
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
      await repositoryService.deleteRepository(id);
      repositories.value = repositories.value.filter((repo) => repo.id !== id);
      
      // 削除されたリポジトリが選択中だった場合はクリア
      if (selectedRepository.value?.id === id) {
        selectedRepository.value = null;
      }
      
      // ヘルスステータスからも削除
      delete healthStatus.value[id];
      
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
  
  // ===== 新機能 =====
  
  // リポジトリを選択
  function selectRepository(repository: RepositoryResponse) {
    selectedRepository.value = repository;
  }
  
  // リポジトリのヘルスチェック
  async function checkRepositoryHealth(repository: RepositoryResponse) {
    try {
      const isHealthy = await repositoryService.checkRepositoryHealth(repository);
      healthStatus.value[repository.id] = isHealthy;
      return isHealthy;
    } catch (err: any) {
      console.error('ヘルスチェックエラー:', err);
      healthStatus.value[repository.id] = false;
      return false;
    }
  }
  
  // 複数リポジトリのヘルスチェック
  async function checkMultipleRepositoryHealth() {
    try {
      const results = await repositoryService.checkMultipleRepositoryHealth(repositories.value);
      healthStatus.value = { ...healthStatus.value, ...results };
      return results;
    } catch (err: any) {
      console.error('一括ヘルスチェックエラー:', err);
      return {};
    }
  }
  
  // リポジトリコンテキストを取得
  async function getRepositoryContext(repositoryId: number, options?: { ref?: string; current_path?: string }) {
    try {
      return await repositoryService.getRepositoryContext(repositoryId, options);
    } catch (err: any) {
      console.error('リポジトリコンテキスト取得エラー:', err);
      return null;
    }
  }
  
  // リポジトリからコンテキスト生成
  function createContextFromRepository(repository: RepositoryResponse, options?: { ref?: string; current_path?: string }) {
    return repositoryService.createContextFromRepository(repository, options);
  }
  
  // ===== Computed Properties =====
  
  // 健全なリポジトリのみ
  const healthyRepositories = computed(() => 
    repositories.value.filter(repo => healthStatus.value[repo.id] === true)
  );
  
  // 問題のあるリポジトリ
  const unhealthyRepositories = computed(() => 
    repositories.value.filter(repo => healthStatus.value[repo.id] === false)
  );
  
  // 選択中リポジトリのコンテキスト
  const selectedRepositoryContext = computed(() => {
    if (!selectedRepository.value) return null;
    return createContextFromRepository(selectedRepository.value);
  });

  return {
    // 状態
    repositories,
    selectedRepository,
    isLoading,
    error,
    healthStatus,
    currentService,
    currentOwner,
    currentRepo,
    currentRef,
    
    // Computed
    healthyRepositories,
    unhealthyRepositories,
    selectedRepositoryContext,
    
    // アクション
    fetchRepositories,
    createRepository,
    updateRepository,
    deleteRepository,
    selectRepository,
    checkRepositoryHealth,
    checkMultipleRepositoryHealth,
    getRepositoryContext,
    createContextFromRepository,
    getAvailableMockRepositories,
    fetchRepositoryStructure,
    searchRepository
  };
});
