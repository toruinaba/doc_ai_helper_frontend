/**
 * モックAPIサービス
 * 
 * バックエンドサーバーが利用できない場合のモックデータを提供
 */
import type { 
  DocumentResponse, 
  RepositoryStructureResponse, 
  FileTreeItem,
  DocumentType
} from '../api/types';

// モックドキュメントデータ
const mockDocuments: Record<string, DocumentResponse> = {
  'index.md': {
    path: 'index.md',
    name: 'index.md',
    type: 'markdown' as DocumentType,
    metadata: {
      size: 1024,
      last_modified: new Date().toISOString(),
      content_type: 'text/markdown'
    },
    content: {
      content: `---
title: ドキュメントAIヘルパー
description: ドキュメントAIヘルパーのサンプルドキュメント
author: AI開発者
---

# ドキュメントAIヘルパーへようこそ

これはドキュメントAIヘルパーのサンプルドキュメントです。

## 特徴

- マークダウンドキュメントの表示
- リポジトリナビゲーション
- LLMによる質問応答

## 使い方

1. 左側のナビゲーターからドキュメントを選択
2. ドキュメントの内容を閲覧
3. 質問があれば入力フォームに入力

## コードサンプル

\`\`\`typescript
// サンプルコード
function hello() {
  console.log('Hello, Document AI Helper!');
}
\`\`\`

詳細については[ドキュメント](sample.md)を参照してください。
`
    },
    repository: 'docs-project',
    owner: 'example',
    service: 'mock',
    ref: 'main',
    links: [
      {
        text: 'ドキュメント',
        url: 'sample.md',
        position: [0, 0],
        is_external: false
      }
    ]
  },
  'sample.md': {
    path: 'sample.md',
    name: 'sample.md',
    type: 'markdown' as DocumentType,
    metadata: {
      size: 512,
      last_modified: new Date().toISOString(),
      content_type: 'text/markdown'
    },
    content: {
      content: `---
title: サンプルドキュメント
description: ドキュメントAIヘルパーのサンプル詳細ドキュメント
---

# サンプルドキュメント

これはサンプル詳細ドキュメントです。

## 詳細情報

- 項目1
- 項目2
- 項目3

[トップに戻る](index.md)
`
    },
    repository: 'docs-project',
    owner: 'example',
    service: 'mock',
    ref: 'main',
    links: [
      {
        text: 'トップに戻る',
        url: 'index.md',
        position: [0, 0],
        is_external: false
      }
    ]
  }
};

// モックリポジトリ構造
const mockRepoStructure: FileTreeItem[] = [
  {
    path: 'index.md',
    name: 'index.md',
    type: 'file'
  },
  {
    path: 'sample.md',
    name: 'sample.md',
    type: 'file'
  },
  {
    path: 'docs',
    name: 'docs',
    type: 'directory',
    children: [
      {
        path: 'docs/advanced.md',
        name: 'advanced.md',
        type: 'file'
      }
    ]
  }
];

/**
 * モックドキュメント取得
 */
export function getMockDocument(path: string): DocumentResponse {
  // パスから先頭のスラッシュを削除
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // モックデータにパスが存在するか確認
  if (cleanPath in mockDocuments) {
    return mockDocuments[cleanPath];
  }
  
  // デフォルトのモックドキュメントを返す
  return mockDocuments['index.md'];
}

// モックデータにパスが存在しない場合は404エラーを模擬
throw new Error('Document not found: ' + path);

/**
 * モックチャットレスポンス取得
 */
export function getMockChatResponse(messages: any[], documentContext: any): any {
  // 最後のユーザーメッセージ
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  
  // モックレスポンス
  return {
    message: {
      role: 'assistant',
      content: `これはモックLLMレスポンスです。あなたの質問: "${lastUserMessage?.content}" について、表示中のドキュメントの内容に基づいて回答します。

実際のバックエンドが実装されると、このモックレスポンスは本物のLLMの応答に置き換えられます。

現在表示しているドキュメント: ${documentContext.path}
リポジトリ: ${documentContext.service}/${documentContext.owner}/${documentContext.repo}
`
    },
    usage: {
      prompt_tokens: 100,
      completion_tokens: 150,
      total_tokens: 250
    },
    execution_time_ms: 120
  };
}
