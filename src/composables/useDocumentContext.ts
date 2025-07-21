/**
 * Document Context Composable
 * 
 * ドキュメントコンテキストの統合と管理を行うコンポーザブル
 */
import { computed } from 'vue';
import { useDocumentStore } from '@/stores/document.store';
import { useRepositoryStore } from '@/stores/repository.store';
import { getDefaultRepositoryConfig, type DocumentContextConfig } from '@/utils/config.util';

export function useDocumentContext() {
  // デフォルト設定を取得
  const defaultConfig = getDefaultRepositoryConfig();
  
  // 関連ストア
  const documentStore = useDocumentStore();
  const repositoryStore = useRepositoryStore();

  /**
   * 現在のドキュメント情報を取得
   */
  const currentDocument = computed(() => documentStore.currentDocument);

  /**
   * リポジトリ情報を取得
   * 新しいリポジトリ管理システムが優先、フォールバックで環境変数設定を使用
   */
  const repositoryInfo = computed(() => {
    // 選択されたリポジトリがある場合はそれを使用
    if (repositoryStore.selectedRepository) {
      const selectedRepo = repositoryStore.selectedRepository;
      const context = repositoryStore.selectedRepositoryContext;
      
      return {
        service: context?.service || selectedRepo.service_type,
        owner: context?.owner || selectedRepo.owner,
        repo: context?.repo || selectedRepo.name,
        ref: context?.ref || selectedRepo.default_branch,
        path: context?.current_path || documentStore.currentPath || defaultConfig.path,
        // 追加のメタデータ
        repositoryId: selectedRepo.id,
        isPublic: selectedRepo.is_public,
        description: selectedRepo.description,
        rootPath: selectedRepo.root_path
      };
    }
    
    // フォールバック: 環境変数ベースの設定
    return {
      service: documentStore.currentService || defaultConfig.service,
      owner: documentStore.currentOwner || defaultConfig.owner,
      repo: documentStore.currentRepo || defaultConfig.repo,
      ref: documentStore.currentRef || defaultConfig.ref,
      path: documentStore.currentPath || defaultConfig.path,
      repositoryId: null,
      isPublic: true,
      description: null,
      rootPath: null
    };
  });

  /**
   * ドキュメントコンテキストを含むシステムプロンプトを生成
   */
  function createDocumentSystemPrompt(): string {
    const doc = currentDocument.value;
    const repo = repositoryInfo.value;
    
    if (!doc) {
      return 'ドキュメントが選択されていません。';
    }

    // リポジトリメタデータの生成
    let repositoryMetadata = `リポジトリ: ${repo.service}/${repo.owner}/${repo.repo}`;
    if (repo.description) {
      repositoryMetadata += `\n説明: ${repo.description}`;
    }
    repositoryMetadata += `\nアクセス: ${repo.isPublic ? '公開' : '非公開'}`;
    if (repo.rootPath) {
      repositoryMetadata += `\nドキュメントルート: ${repo.rootPath}`;
    }

    return `以下のドキュメントに関する質問に答えてください：

${repositoryMetadata}
ファイル: ${repo.path}
ブランチ/リビジョン: ${repo.ref}

ドキュメント内容:
${doc.content.content}`;
  }

  /**
   * 設定を統合してマージ
   */
  function mergeConfig(config?: Partial<DocumentContextConfig>) {
    return {
      enableRepositoryContext: config?.enableRepositoryContext ?? true,
      enableDocumentMetadata: config?.enableDocumentMetadata ?? true,
      includeDocumentInSystemPrompt: config?.includeDocumentInSystemPrompt ?? true,
      systemPromptTemplate: config?.systemPromptTemplate ?? 'contextual_document_assistant_ja',
      completeToolFlow: config?.completeToolFlow ?? true,
      ...config
    };
  }

  /**
   * ドキュメントが利用可能かチェック
   */
  function isDocumentAvailable(): boolean {
    return !!currentDocument.value;
  }

  /**
   * ドキュメント情報を検証
   */
  function validateDocumentContext(): { valid: boolean; error?: string } {
    if (!currentDocument.value) {
      return { valid: false, error: 'ドキュメントが選択されていません' };
    }
    
    const repo = repositoryInfo.value;
    if (!repo.service || !repo.owner || !repo.repo) {
      return { valid: false, error: 'リポジトリ情報が不完全です' };
    }
    
    // 選択されたリポジトリの健全性チェック
    if (repo.repositoryId) {
      const health = repositoryStore.healthStatus[repo.repositoryId];
      if (health === false) {
        return { valid: false, error: 'リポジトリへの接続に問題があります' };
      }
    }
    
    return { valid: true };
  }

  /**
   * リポジトリ健全性チェック
   */
  function checkRepositoryHealth(): boolean {
    const repo = repositoryInfo.value;
    if (!repo.repositoryId) return true; // 環境変数ベースの場合は常にtrue
    
    return repositoryStore.healthStatus[repo.repositoryId] !== false;
  }

  /**
   * リポジトリの接続状態を取得
   */
  function getRepositoryStatus(): 'healthy' | 'unhealthy' | 'unknown' {
    const repo = repositoryInfo.value;
    if (!repo.repositoryId) return 'unknown';
    
    const health = repositoryStore.healthStatus[repo.repositoryId];
    if (health === true) return 'healthy';
    if (health === false) return 'unhealthy';
    return 'unknown';
  }

  return {
    // 計算されたプロパティ
    currentDocument,
    repositoryInfo,
    
    // アクション
    createDocumentSystemPrompt,
    mergeConfig,
    isDocumentAvailable,
    validateDocumentContext,
    checkRepositoryHealth,
    getRepositoryStatus,
    
    // 直接アクセス用
    documentStore,
    repositoryStore,
    defaultConfig
  };
}