/**
 * 新しいバックエンド仕様対応の動作テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDocumentAssistantStore } from '@/stores/document-assistant.store';
import { useDocumentStore } from '@/stores/document.store';
import type { DocumentResponse, LLMQueryRequest } from '@/services/api/types';

// モックデータ
const mockDocument: DocumentResponse = {
  path: 'README.md',
  name: 'README.md',
  type: 'markdown' as any,
  metadata: {
    size: 1024,
    last_modified: '2025-06-25T12:00:00Z',
    content_type: 'text/markdown',
    sha: 'abc123',
    download_url: null,
    html_url: null,
    raw_url: null,
    extra: {}
  },
  content: {
    content: '# Test Document\n\nThis is a test document.',
    encoding: 'utf-8'
  },
  repository: 'test-repo',
  owner: 'test-owner',
  service: 'github',
  ref: 'main',
  links: null,
  transformed_content: null
};

// LLMクエリのモック
const mockLLMQuery = vi.fn();
vi.mock('@/services/api/modules', () => ({
  sendLLMQuery: mockLLMQuery,
  sendLLMQueryWithTools: mockLLMQuery,
  shouldUseMCPTools: vi.fn(() => false),
  getLLMTemplates: vi.fn(() => Promise.resolve([
    'contextual_document_assistant_ja',
    'contextual_document_assistant_en',
    'code_analysis_assistant'
  ]))
}));

describe('新しいバックエンド仕様対応テスト', () => {
  let assistantStore: ReturnType<typeof useDocumentAssistantStore>;
  let documentStore: ReturnType<typeof useDocumentStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    assistantStore = useDocumentAssistantStore();
    documentStore = useDocumentStore();
    
    // モックのリセット
    mockLLMQuery.mockClear();
    mockLLMQuery.mockResolvedValue({
      content: 'テストレスポンス',
      model: 'gpt-3.5-turbo',
      provider: 'openai',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    });
  });

  it('ドキュメントコンテキストを含むメッセージ送信', async () => {
    // ドキュメントストアにモックドキュメントを設定
    documentStore.currentDocument = mockDocument;

    // メッセージ送信
    await assistantStore.sendMessageWithConfig('このドキュメントについて教えて');

    // LLMクエリが正しく呼ばれたことを確認
    expect(mockLLMQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'このドキュメントについて教えて',
        repository_context: expect.objectContaining({
          service: 'github',
          owner: 'test-owner',
          repo: 'test-repo',
          ref: 'main',
          current_path: 'README.md'
        }),
        document_metadata: expect.objectContaining({
          title: 'README.md',
          filename: 'README.md',
          file_extension: 'md',
          file_size: 1024
        }),
        document_content: '# Test Document\n\nThis is a test document.',
        include_document_in_system_prompt: true,
        system_prompt_template: 'contextual_document_assistant_ja'
      })
    );
  });

  it('設定を指定したメッセージ送信', async () => {
    // ドキュメントストアにモックドキュメントを設定
    documentStore.currentDocument = mockDocument;

    // カスタム設定でメッセージ送信
    await assistantStore.sendMessageWithConfig('コード解析をして', {
      provider: 'openai',
      model: 'gpt-4',
      includeHistory: true
    });

    // 設定が正しく適用されたことを確認
    expect(mockLLMQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'コード解析をして',
        repository_context: null, // enableRepositoryContextがfalse
        document_content: null,   // includeDocumentInSystemPromptがfalse
        include_document_in_system_prompt: false,
        system_prompt_template: 'code_analysis_assistant'
      })
    );
  });

  it('会話履歴が正しく構築される', async () => {
    // 複数のメッセージを送信
    assistantStore.addUserMessage('最初の質問');
    assistantStore.addAssistantMessage('最初の回答');
    
    documentStore.currentDocument = mockDocument;
    await assistantStore.sendMessageWithConfig('続きの質問');

    // 会話履歴が含まれていることを確認 (新しい階層構造)
    const callArgs = mockLLMQuery.mock.calls[0][0] as LLMQueryRequest;
    expect(callArgs.query.conversation_history).toHaveLength(3); // システム + ユーザー + アシスタント + 新しいユーザー
    expect(callArgs.query.conversation_history![0].role).toBe('user');
    expect(callArgs.query.conversation_history![0].content).toBe('最初の質問');
    expect(callArgs.query.conversation_history![1].role).toBe('assistant');
    expect(callArgs.query.conversation_history![1].content).toBe('最初の回答');
    expect(callArgs.query.conversation_history![2].role).toBe('user');
    expect(callArgs.query.conversation_history![2].content).toBe('続きの質問');
  });

  it('ドキュメントがない場合のコンテキスト処理', async () => {
    // ドキュメントストアを空に設定
    documentStore.currentDocument = null;

    await assistantStore.sendMessageWithConfig('一般的な質問');

    // ドキュメント関連のコンテキストがnullになることを確認
    expect(mockLLMQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        repository_context: null,
        document_metadata: null,
        document_content: null
      })
    );
  });
});
