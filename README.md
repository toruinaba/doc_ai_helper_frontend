# ドキュメントAIヘルパーフロントエンド

## 概要

ドキュメントAIヘルパーフロントエンドは、`doc_ai_helper_backend`のAPIと連携し、マークダウンドキュメントの閲覧と、LLMを用いたドキュメントに関する質問応答機能を提供するVue 3アプリケーションです。UIコンポーネントライブラリとしてPrimeVueを採用し、洗練されたユーザーインターフェースを実現します。

## 主要機能

- ドキュメント表示（Markdownレンダリング）
- リポジトリ構造のナビゲーション
- LLMを使用したドキュメントに関する質問応答
- シンタックスハイライト付きコードブロック表示
- フロントマターの解析と表示
- レスポンシブデザイン

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

## PrimeVueの設定

`main.ts`でPrimeVueを設定し、必要なコンポーネントを登録します：

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

## 使用方法

1. リポジトリナビゲーターからドキュメントを選択
2. ドキュメントの内容を閲覧
3. チャットインターフェースでドキュメントに関する質問を入力
4. AIからの回答を確認

## 環境設定

環境変数を使用してアプリケーションを設定できます：

```
# .env.local
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

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
