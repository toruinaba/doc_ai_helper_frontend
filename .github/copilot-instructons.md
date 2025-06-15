# ドキュメントAIヘルパーフロントエンド開発ガイド

このドキュメントでは、`doc_ai_helper_backend`の充実したモックデータを利用したフロントエンド開発の方法と、PrimeVueを活用したUIコンポーネントの実装方法について説明します。

## 概要

ドキュメントAIヘルパーフロントエンドは、`doc_ai_helper_backend`のAPIと連携し、マークダウンドキュメントの閲覧と、LLMを用いたドキュメントに関する質問応答機能を提供するVue 3アプリケーションです。UIコンポーネントライブラリとしてPrimeVueを採用し、洗練されたユーザーインターフェースを実現します。

## 実装計画

### コンポーネント構成

1. **ドキュメントビューア**
   - PrimeVueのCardコンポーネントを使用
   - Markdownレンダリングとシンタックスハイライト
   - フロントマター表示

2. **リポジトリナビゲータ**
   - PrimeVueのTreeコンポーネントを活用
   - ファイル構造の階層表示
   - フォルダの展開/折りたたみ機能

3. **LLMチャットインターフェース**
   - PrimeVueのChat UIコンポーネントを使用
   - メッセージ表示とスタイリング
   - 入力フォームとボタン

4. **統合レイアウト**
   - PrimeVueのSplitterコンポーネントで画面分割
   - レスポンシブデザイン対応

### 状態管理

- Piniaストアを使用してドキュメントとチャットの状態を管理
- APIサービスの実装によるバックエンドとの通信

## API エンドポイント

### ドキュメント取得

```
GET /api/v1/documents/contents/{service}/{owner}/{repo}/{path}?ref={ref}&transform_links={true|false}
```

例：
```
GET /api/v1/documents/contents/mock/example/docs-project/index.md?ref=main&transform_links=true
```

### リポジトリ構造取得

```
GET /api/v1/repositories/structure/{service}/{owner}/{repo}?ref={ref}&path={path}
```

例：
```
GET /api/v1/repositories/structure/mock/example/docs-project?ref=main
```

### 検索

```
GET /api/v1/search/{service}/{owner}/{repo}?query={query}&limit={limit}
```

例：
```
GET /api/v1/search/mock/example/docs-project?query=api&limit=10
```

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

- 現在表示中のドキュメントをコンテキストとして送信
- ユーザーの質問と組み合わせてLLMに問い合わせ
- 返答の表示とフォーマット

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

1. 必要なパッケージのインストール

```bash
# Vue.jsの基本パッケージ
npm install

# PrimeVueとその依存関係
npm install primevue primeicons

# その他の必要なパッケージ
npm install axios marked highlight.js
```

2. `main.ts`でのPrimeVue設定

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

## テスト方法

以下のステップでモックデータをテストできます：

1. バックエンドサーバーを起動する
2. フロントエンド開発サーバーを起動する：`npm run dev`
3. ブラウザでアクセスし、機能をテストする

## 参考資料

- [Vue 3ドキュメント](https://v3.vuejs.org/)
- [PrimeVueドキュメント](https://primevue.org/)
- [Marked.js](https://marked.js.org/)
- [Highlight.js](https://highlightjs.org/)
- [Pinia](https://pinia.vuejs.org/)