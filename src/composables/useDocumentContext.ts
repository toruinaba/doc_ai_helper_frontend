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
   */
  const repositoryInfo = computed(() => ({
    service: documentStore.currentService || defaultConfig.service,
    owner: documentStore.currentOwner || defaultConfig.owner,
    repo: documentStore.currentRepo || defaultConfig.repo,
    ref: documentStore.currentRef || defaultConfig.ref,
    path: documentStore.currentPath || defaultConfig.path
  }));

  /**
   * ドキュメントコンテキストを含むシステムプロンプトを生成
   */
  function createDocumentSystemPrompt(): string {
    const doc = currentDocument.value;
    const repo = repositoryInfo.value;
    
    if (!doc) {
      return 'ドキュメントが選択されていません。';
    }

    return `以下のドキュメントに関する質問に答えてください：

リポジトリ: ${repo.service}/${repo.owner}/${repo.repo}
ファイル: ${repo.path}
ブランチ: ${repo.ref}

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
    
    return { valid: true };
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
    
    // 直接アクセス用
    documentStore,
    repositoryStore,
    defaultConfig
  };
}