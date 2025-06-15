# ドキュメントAIヘルパーフロントエンド

## プロジェクト概要

ドキュメントAIヘルパーフロントエンドは、`doc_ai_helper_backend`のAPIと連携し、マークダウンドキュメントの閲覧機能を提供するシンプルなVue 3アプリケーションです。UIコンポーネントライブラリとしてPrimeVueを採用し、洗練されたユーザーインターフェースを実現します。

名前は`doc-ai-helper-frontend`です。将来的にはQuartoドキュメント対応も予定されています。

### 主なユースケース

1. **ドキュメント表示**: Markdownドキュメントのレンダリングと表示
2. **将来的な拡張**: LLM質問応答、リポジトリナビゲーションなど

### 実装アプローチ

シンプルな実装アプローチを採用しています：

1. **基本的なドキュメント表示（現段階）**: まずMarkdownドキュメント表示機能を実装 [✅完了]
   - ドキュメントビューアの実装
   - APIとの連携

2. **LLM対話機能（フェーズ2）**: LLMとの対話機能を追加 [⏱️計画中]
   - チャットインターフェースの実装
   - ドキュメントコンテキスト連携
   - 対話履歴管理

3. **拡張機能（フェーズ3）**: 機能拡張と最適化 [⏱️将来対応]
   - リポジトリナビゲーションの実装
   - 検索機能の実装
   - パフォーマンス最適化

このアプローチにより、基本機能を早期に提供しながら、徐々に高度な機能を追加していくことが可能になります。

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
- モック機能の削除とシンプル化

### 実装方針の明確化
- PrimeVueを使用したUIコンポーネント実装
- Piniaを使用した状態管理
- Markdownレンダリングとシンタックスハイライトの実装
- バックエンドAPIとの連携機能の実装

### 未着手の機能
- LLMチャットインターフェースの実装
- リポジトリナビゲーションの実装
- 検索機能の実装
- テスト実装

### 開発ステップ
1. **基本コンポーネントの実装** [✅完了]
   - ドキュメントビューアの実装
   - APIサービスの実装

2. **LLMチャットインターフェースの実装** [⏱️計画中]
   - チャットUIの構築
   - ドキュメントコンテキスト連携機能の実装
   - 対話履歴管理の実装

3. **リポジトリナビゲーションの実装** [⏱️将来対応]
   - ファイル構造表示の実装
   - ナビゲーション機能の実装

4. **拡張機能の実装** [⏱️将来対応]
   - 検索機能の実装
   - パフォーマンス最適化
   - ユーザー設定と拡張機能

## 実装計画

### コンポーネント構成

1. **ドキュメントビューア**
   - PrimeVueのCardコンポーネントを使用
   - Markdownレンダリングとシンタックスハイライト
   - フロントマター表示

2. **将来実装予定: LLMチャットインターフェース**
   - PrimeVueのChat UIコンポーネントを使用
   - メッセージ表示とスタイリング
   - 入力フォームとボタン

3. **将来実装予定: リポジトリナビゲータ**
   - PrimeVueのTreeコンポーネントを活用
   - ファイル構造の階層表示
   - フォルダの展開/折りたたみ機能

### 状態管理

- Piniaストアを使用してドキュメントの状態を管理
- APIサービスの実装によるバックエンドとの通信

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
2. ドキュメントの内容を閲覧
3. 将来的に: チャットインターフェースでドキュメントに関する質問を入力
4. 将来的に: AIからの回答を確認

## 環境設定

環境変数を使用してアプリケーションを設定できます：

```
# .env.local
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_USE_MOCK_API=false
VITE_DEFAULT_SERVICE=mock
VITE_DEFAULT_OWNER=example
VITE_DEFAULT_REPO=docs-project
VITE_DEFAULT_REF=main
VITE_DEFAULT_DOCUMENT=index.md
```

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
   - ドキュメントビューアとリポジトリナビゲーターを最優先で実装
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

## IDEの推奨設定

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
