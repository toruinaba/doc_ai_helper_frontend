<!-- filepath: /Users/toru_inaba/Developer/js/prjs/doc-ai-helper-frontend/.github/copilot-instructions.md -->
# ドキュメントAIヘルパーフロントエンド開発ガイド

このドキュメントでは、`doc_ai_helper_backend`の充実したモックデータを利用したフロントエンド開発の方法と、PrimeVueを活用したUIコンポーネントの実装方法について説明します。

## 概要

ドキュメントAIヘルパーフロントエンドは、`doc_ai_helper_backend`のAPIと連携し、マークダウンドキュメントの閲覧と、LLMを用いたドキュメントに関する質問応答機能を提供するVue 3アプリケーションです。UIコンポーネントライブラリとしてPrimeVueを採用し、洗練されたユーザーインターフェースを実現します。

名前は`doc-ai-helper-frontend`です。将来的にはQuartoドキュメント対応も予定されています。

### 主なユースケース

1. **ドキュメント表示**: Markdownドキュメントのレンダリングと表示
2. **LLM質問応答**: ドキュメントコンテキストを用いたLLMとの対話
   - 会話履歴の管理と最適化
   - マークダウン形式での応答表示
3. **将来的な拡張**: リポジトリナビゲーションなど

### 実装アプローチ

段階的な実装アプローチを採用しています：

1. **基本的なドキュメント表示（フェーズ1）**: まずMarkdownドキュメント表示機能を実装 [✅完了]
   - ドキュメントビューアの実装
   - APIとの連携
   - マークダウンレンダリングとシンタックスハイライト

2. **LLM対話機能（フェーズ2）**: LLMとの対話機能を追加 [✅基本実装完了]
   - チャットインターフェースの実装 [✅完了]
   - ドキュメントコンテキスト連携の実装 [✅完了]
   - 対話履歴管理の実装 [✅完了]
   - バックエンドLLM APIとの連携 [✅基本実装完了]

3. **拡張機能（フェーズ3）**: 機能拡張と最適化 [⏱️将来対応]
   - リポジトリナビゲーションの実装
   - 検索機能の実装
   - パフォーマンス最適化
   - UI/UXの改善

このアプローチにより、基本機能を早期に提供しながら、徐々に高度な機能を追加していくことが可能になります。現在は、フェーズ2が基本的に完了し、フェーズ3に向けた準備を進めている段階です。

## 技術スタック

- Vue 3
- TypeScript
- Vite
- Pinia (状態管理)
- Vue Router
- PrimeVue (UIコンポーネント)
- Axios (API通信)
- Marked (Markdownレンダリング)
- Highlight.js (シンタックスハイライト)

## 現在の開発状況

### 実装済み機能
- プロジェクト初期設定完了
- 開発環境構築完了
- 基本的なVue 3コンポーネント構造の設定
- ドキュメントビューアの実装
- APIサービスの実装
- チャットインターフェースの実装
  - メッセージ表示とスタイリング
  - 入力フォームとボタン（TextareaコンポーネントでUIを改善）
  - ツールチップとUI改善
- チャット対話履歴管理の実装
  - 会話履歴の保持と管理
  - サーバーから最適化された会話履歴の反映
  - 会話コンテキストの維持
- ドキュメントコンテキスト連携の実装完了
- LLMとの対話機能の基本実装完了
  - モックAPIサービスによるデモ応答表示
  - 実際のバックエンドAPIとの連携実装完了
  - 会話履歴を含めたLLMクエリ送信機能の実装

### 実装中の機能
- バックエンドLLM API連携の強化
  - エラーハンドリングの改善
  - パフォーマンス最適化
- メッセージ表示のUI改善
  - マークダウンのレンダリング強化
  - コードブロックのシンタックスハイライト改善

### 最近の実装内容

1. **LLM会話履歴管理機能の実装**
   - 会話履歴をバックエンドに送信する機能を実装
   - バックエンドから最適化された会話履歴を受け取って更新する機能を実装
   - クライアント側の会話管理とバックエンド側の会話管理を同期

2. **チャット応答表示の改善**
   - エラーハンドリングの強化
   - デバッグログの追加
   - 応答フローの改善

3. **APIサービスの強化**
   - 環境変数に基づいたAPI設定の管理
   - モックサービスと実際のAPIの切り替え
   - エラー処理の改善

### 未着手の機能
- リポジトリナビゲーションの実装
- 検索機能の実装
- GitHub連携機能の実装
- テスト実装

### 開発ステップ
1. **基本コンポーネントの実装** [✅完了]
   - ドキュメントビューアの実装
   - APIサービスの実装

2. **LLMチャットインターフェースの実装** [✅基本実装完了]
   - チャットUIの構築 [✅完了]
   - ドキュメントコンテキスト連携機能の実装 [✅完了]
   - 対話履歴管理の実装 [✅完了]
   - バックエンドLLM APIとの連携 [✅基本実装完了]
     - 会話履歴管理機能の実装完了
     - エラーハンドリングの基本実装完了

3. **リポジトリナビゲーションの実装** [⏱️将来対応]
   - ファイル構造表示の実装
   - ナビゲーション機能の実装

4. **拡張機能の実装** [⏱️将来対応]
   - 検索機能の実装
   - パフォーマンス最適化
   - ユーザー設定と拡張機能

## API エンドポイント

現在のアプリケーションは以下のAPIエンドポイントを使用します：

### ドキュメント取得

```
GET /api/v1/documents/contents/{service}/{owner}/{repo}/{path}?ref={ref}&transform_links={true|false}
```

例：
```
GET /api/v1/documents/contents/mock/example/docs-project/index.md?ref=main&transform_links=true
```

### チャットメッセージ送信

```
POST /api/v1/chat/message
```

リクエストボディ:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "以下のドキュメントに関する質問に答えてください。"
    },
    {
      "role": "user",
      "content": "ユーザーの質問内容"
    }
  ],
  "document_context": {
    "service": "mock",
    "owner": "example",
    "repo": "docs-project",
    "path": "index.md",
    "ref": "main"
  }
}
```

レスポンス:
```json
{
  "message": {
    "role": "assistant",
    "content": "アシスタントからの回答内容"
  },
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 150,
    "total_tokens": 250
  },
  "execution_time_ms": 120,
  "optimized_conversation_history": [
    {
      "role": "system",
      "content": "以下のドキュメントに関する質問に答えてください。"
    },
    {
      "role": "user",
      "content": "ユーザーの質問内容"
    },
    {
      "role": "assistant",
      "content": "アシスタントからの回答内容"
    }
  ]
}
```

### LLMクエリ送信

```
POST /api/v1/llm/query
```

リクエストボディ:
```json
{
  "prompt": "ユーザーの質問内容",
  "context_documents": ["index.md"],
  "conversation_history": [
    {
      "role": "system",
      "content": "システムプロンプト",
      "timestamp": "2025-06-19T10:00:00Z"
    },
    {
      "role": "user",
      "content": "以前の質問",
      "timestamp": "2025-06-19T10:01:00Z"
    },
    {
      "role": "assistant",
      "content": "以前の回答",
      "timestamp": "2025-06-19T10:02:00Z"
    }
  ]
}
```

## ブランチ戦略

このプロジェクトでは、GitHub Flowを採用しています：

- `main`: 常に安定しており、デプロイ可能な状態を維持するブランチ
- `feature/*`: 機能開発用の短期ブランチ（mainから分岐し、完了後にmainにマージ）
- `fix/*`: バグ修正用の短期ブランチ（mainから分岐し、完了後にmainにマージ）

開発は以下のフローで行います：
1. mainブランチから新しいブランチを作成（例: `feature/document-viewer`）
2. 変更をコミット
3. GitHubにプッシュしてプルリクエストを作成
4. コードレビュー後、mainブランチにマージ

## 実装計画

### コンポーネント構成

1. **ドキュメントビューア** [✅完了]
   - PrimeVueのCardコンポーネントを使用
   - Markdownレンダリングとシンタックスハイライト
   - フロントマター表示

2. **LLMチャットインターフェース** [✅基本実装完了]
   - PrimeVueのUIコンポーネントを使用
   - メッセージ表示とスタイリング
   - 入力フォームとボタン
   - 会話履歴の管理と表示
   - マークダウン形式の応答表示

3. **将来実装予定: リポジトリナビゲータ**
   - PrimeVueのTreeコンポーネントを活用
   - ファイル構造の階層表示
   - フォルダの展開/折りたたみ機能

4. **統合レイアウト** [✅基本実装完了]
   - PrimeVueのSplitterコンポーネントで画面分割
   - レスポンシブデザイン対応

### 状態管理

- Piniaストアを使用してドキュメントとチャットの状態を管理
  - ドキュメントストア: 現在表示しているドキュメントの状態管理
  - チャットストア: 会話履歴と応答状態の管理
  - リポジトリストア: リポジトリ構造とナビゲーション状態の管理
- APIサービスの実装によるバックエンドとの通信

## フロントエンド開発のユースケース

### 1. ドキュメントナビゲーション

`example/docs-project`リポジトリには、相互リンクされた複数のMarkdownファイルが含まれています。このリポジトリを使用して、以下の機能をテストできます：

- ドキュメント間のナビゲーション
- ディレクトリ構造に基づいたサイドバーの構築
- パンくずリストの実装

### 2. リンク解決

モックデータには様々なタイプのリンクが含まれています：

- 同一ディレクトリ内のドキュメントへのリンク
- 親ディレクトリのドキュメントへのリンク
- 子ディレクトリのドキュメントへのリンク
- 画像へのリンク
- 外部リンク
- セクションへのアンカーリンク

これらを使用してリンク解決とナビゲーションロジックをテストできます。

### 3. フロントマター処理

多くのドキュメントにはフロントマターが含まれており、これを使用して以下の機能をテストできます：

- タイトルの抽出と表示
- メタデータ（著者、日付、タグなど）の表示
- カスタムメタデータの処理

### 4. LLMチャット機能

現在表示しているドキュメントの内容をLLMに送信し、そのコンテキストに基づいて質問応答を行う機能を実装します：

- 現在表示中のドキュメントをコンテキストとして送信 [✅基本実装完了]
- ユーザーの質問と組み合わせてLLMに問い合わせ [✅基本実装完了]
  - 実際のLLM APIとの連携を実装済み
  - モックサービスとのフォールバック対応
- 返答の表示とフォーマット [✅基本実装完了]
- 会話履歴の管理と最適化 [✅基本実装完了]
  - クライアント側での会話履歴の保持
  - サーバー側から最適化された会話履歴の適用

### 5. コードブロックのシンタックスハイライト

様々な言語のコードブロックを含むドキュメントを使用して、シンタックスハイライト機能をテストできます。

## PrimeVueの活用

PrimeVueは豊富なUIコンポーネントを提供するライブラリで、特に以下のコンポーネントが本プロジェクトで有用です：

1. **Tree** - リポジトリ構造の表示
2. **Card** - ドキュメント表示のコンテナ
3. **Splitter/SplitterPanel** - レイアウト分割
4. **Message** - システムメッセージの表示
5. **InputText/Button** - フォーム入力
6. **ScrollPanel** - 長いコンテンツのスクロール

これらのコンポーネントを組み合わせることで、使いやすく見た目も美しいUIを構築できます。

## セットアップ手順

### 必要なパッケージのインストール

```sh
# Vue.jsの基本パッケージ
npm install

# PrimeVueとその依存関係
npm install primevue primeicons

# その他の必要なパッケージ
npm install axios marked highlight.js
```

### 開発サーバーの起動

```sh
npm run dev
```

### 本番用ビルド

```sh
npm run build
```

### ユニットテスト実行

```sh
npm run test:unit
```

## テスト方法

以下のステップでモックデータをテストできます：

1. バックエンドサーバーを起動する
2. フロントエンド開発サーバーを起動する：`npm run dev`
3. ブラウザでアクセスし、機能をテストする

### ユニットテスト実行

```sh
npm run test:unit
```

## 実装アプローチの詳細

### メインアプリケーション

アプリケーションのエントリーポイントとなる`main.ts`では、PrimeVueの設定とコンポーネントの登録を行います：

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config'

// PrimeVueコンポーネント
import Tree from 'primevue/tree'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Message from 'primevue/message'

// PrimeVueスタイル
import 'primevue/resources/themes/lara-light-indigo/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

app.use(PrimeVue)

// コンポーネント登録
app.component('Tree', Tree)
app.component('Card', Card)
app.component('InputText', InputText)
app.component('Button', Button)
app.component('Splitter', Splitter)
app.component('SplitterPanel', SplitterPanel)
app.component('Message', Message)

app.mount('#app')
```

### APIサービス実装

バックエンドAPIとの通信を担当する`api.service.ts`を実装します：

```typescript
// APIレスポンスの型定義
export interface DocumentResponse {
  content: string;
  frontmatter?: Record<string, any>;
  links?: Array<{
    href: string;
    text: string;
    type: string;
  }>;
}

export interface RepositoryStructure {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: RepositoryStructure[];
}

// APIサービスの実装
export const apiService = {
  async getDocument(service, owner, repo, path, ref, transformLinks): Promise<DocumentResponse> {
    // 実装
  },
  
  async getRepositoryStructure(service, owner, repo, ref, path): Promise<RepositoryStructure[]> {
    // 実装
  },
  
  async searchRepository(service, owner, repo, query, limit): Promise<SearchResult[]> {
    // 実装
  }
};
```

### ストア実装

ドキュメントとリポジトリの状態を管理するPiniaストア：

```typescript
// ドキュメントストア
export const useDocumentStore = defineStore('document', () => {
  // 状態
  const currentDocument = ref<DocumentResponse | null>(null);
  const repositoryStructure = ref<RepositoryStructure[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // アクション
  async function fetchDocument(path: string) {
    // 実装
  }
  
  async function fetchRepositoryStructure() {
    // 実装
  }
  
  // 他のアクションとゲッター
});

// チャットストア
export const useChatStore = defineStore('chat', () => {
  // 実装
});
```

### コンポーネント実装

各コンポーネントは個別のVueファイルとして実装し、Composition APIを使用します。

```vue
<script setup lang="ts">
// DocumentViewer.vue
import { ref, computed, onMounted } from 'vue';
import { marked } from 'marked';
import { useDocumentStore } from '@/stores/document.store';

// 状態とロジックの実装
</script>

<template>
  <!-- テンプレート実装 -->
</template>

<style scoped>
/* スタイル実装 */
</style>
```

## 使用方法

1. アプリケーションを起動してドキュメントを表示
   - 左側のリポジトリナビゲーターからドキュメントを選択（現在は自動的にデフォルトドキュメントが表示されます）
   - 中央のドキュメントビューアーでドキュメントの内容を閲覧

2. チャットインターフェースでドキュメントに関する質問
   - 右側のチャットインターフェースでドキュメントに関する質問を入力
   - AIからの回答を確認
   - 会話を継続して関連質問を行う（会話履歴が維持されます）

3. 環境変数による設定のカスタマイズ
   - `.env.local`ファイルで設定を変更し、実際のAPIサーバーに接続
   - モックAPIとのテストを行う場合は`VITE_USE_MOCK_API=true`に設定

## 環境設定

環境変数を使用してアプリケーションを設定できます：

```
# .env.local
# API Base URL (without /api/v1 at the end)
VITE_API_BASE_URL=http://localhost:8000

# Backend Base URL (for link transformations, without /api/v1 at the end)
VITE_BACKEND_URL=http://localhost:8000

# Always use real API
VITE_USE_MOCK_API=false

# Default repository settings
VITE_DEFAULT_SERVICE=mock
VITE_DEFAULT_OWNER=example
VITE_DEFAULT_REPO=docs-project
VITE_DEFAULT_REF=main
VITE_DEFAULT_PATH=index.md
```

これらの環境変数の説明：

- `VITE_API_BASE_URL` - バックエンドAPIのベースURL (/api/v1は自動的に追加されます)
- `VITE_BACKEND_URL` - リンク変換用のバックエンドURL
- `VITE_USE_MOCK_API` - モックAPIを使用するかどうか（`true`または`false`）
- `VITE_DEFAULT_SERVICE` - デフォルトのGitサービス（`github`, `gitlab`, `mock`など）
- `VITE_DEFAULT_OWNER` - デフォルトのリポジトリ所有者
- `VITE_DEFAULT_REPO` - デフォルトのリポジトリ名
- `VITE_DEFAULT_REF` - デフォルトのブランチまたはタグ名
- `VITE_DEFAULT_PATH` - デフォルトのドキュメントパス

## コーディングガイドライン

1. **Vue 3ベストプラクティス**
   - Composition APIを優先的に使用する
   - コンポーネントの責務を明確に分離する
   - 適切なTypeScriptの型定義を行う

2. **コンポーネント設計**
   - 単一責任の原則に従う
   - 再利用可能なコンポーネントを作成する
   - スロットを活用して柔軟なコンポーネントを設計する

3. **状態管理**
   - Piniaを使用して状態を管理する
   - ストアは機能ごとに分割する
   - コンポジションストアを活用する

4. **スタイリング**
   - スコープ付きCSSを使用する
   - 一貫性のあるスタイルガイドに従う
   - レスポンシブデザインを考慮する

5. **テスト**
   - コンポーネントの単体テストを作成する
   - ストアのテストを作成する
   - E2Eテストで主要な機能をカバーする

6. **ドキュメンテーション**
   - コンポーネントにはJSDocコメントを付与する
   - README.mdは最新の状態を維持する
   - 複雑なロジックには適切なコメントを付与する

7. **開発優先順位**
   - ドキュメントビューアとチャットインターフェースを最優先で実装（完了）
   - 会話履歴管理機能の実装（完了）
   - リポジトリナビゲーションの実装（次のフェーズで予定）
   - 検索機能は将来の拡張として位置付ける
   - LLMチャット機能は次のフェーズで実装
   - 検索機能は将来の拡張として位置付ける

## ブランチ戦略

このプロジェクトでは、GitHub Flowを採用しています：

- `main`: 常に安定しており、デプロイ可能な状態を維持するブランチ
- `feature/*`: 機能開発用の短期ブランチ（mainから分岐し、完了後にmainにマージ）
- `fix/*`: バグ修正用の短期ブランチ（mainから分岐し、完了後にmainにマージ）

開発は以下のフローで行います：
1. mainブランチから新しいブランチを作成（例: `feature/document-viewer`）
2. 変更をコミット
3. GitHubにプッシュしてプルリクエストを作成
4. コードレビュー後、mainブランチにマージ

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (Veturは無効化してください)

## 参考資料

- [Vue 3ドキュメント](https://v3.vuejs.org/)
- [Vite設定リファレンス](https://vitejs.dev/config/)
- [Piniaドキュメント](https://pinia.vuejs.org/)
- [PrimeVueドキュメント](https://primevue.org/)
- [Marked.js](https://marked.js.org/)
- [doc_ai_helper_backend](https://github.com/yourusername/doc-ai-helper-backend)

## ライセンス

MIT
