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

/**
 * モックリポジトリ構造取得
 */
export function getMockRepositoryStructure(): RepositoryStructureResponse {
  return {
    service: 'mock',
    owner: 'example',
    repo: 'docs-project',
    ref: 'main',
    tree: mockRepoStructure,
    last_updated: new Date().toISOString()
  };
}
