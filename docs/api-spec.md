# Document AI Helper バックエンドAPI仕様書

## 概要

Document AI Helperは、GitリポジトリのMarkdownドキュメントを表示し、LLMを用いた質問応答機能を提供するアプリケーションのバックエンドAPIです。このAPIは以下の主要機能を提供します：

1. Gitリポジトリからのドキュメント取得と表示
2. リポジトリ構造の取得とナビゲーション
3. ドキュメントコンテキストを用いたLLMとの対話
4. リポジトリ内の検索機能

- **バージョン**: 0.1.0
- **ベースURL**: `/api/v1`

## API エンドポイント一覧

- [ヘルスチェック](#ヘルスチェック)
- [ドキュメント関連](#ドキュメント関連)
  - [ドキュメント取得](#ドキュメント取得)
  - [リポジトリ構造取得](#リポジトリ構造取得)
- [リポジトリ関連](#リポジトリ関連)
  - [リポジトリ一覧取得](#リポジトリ一覧取得)
  - [リポジトリ作成](#リポジトリ作成)
  - [リポジトリ詳細取得](#リポジトリ詳細取得)
  - [リポジトリ更新](#リポジトリ更新)
  - [リポジトリ削除](#リポジトリ削除)
- [検索関連](#検索関連)
  - [リポジトリ内検索](#リポジトリ内検索)
- [チャット関連](#チャット関連)
  - [チャットメッセージ送信](#チャットメッセージ送信) (会話履歴サポート)
- [LLM関連](#llm関連)
  - [LLMクエリ送信](#llmクエリ送信) (会話履歴サポート)
  - [LLM機能取得](#llm機能取得)
  - [テンプレート一覧取得](#テンプレート一覧取得)
  - [プロンプトフォーマット](#プロンプトフォーマット)
  - [LLMレスポンスストリーミング](#llmレスポンスストリーミング) (会話履歴サポート)

## ヘルスチェック

### ヘルスチェック

```
GET /health/
```

APIの稼働状況を確認するエンドポイントです。

**レスポンス**:
- `200 OK`: APIが正常に動作しています

## ドキュメント関連

### ドキュメント取得

```
GET /documents/contents/{service}/{owner}/{repo}/{path}
```

Gitリポジトリからドキュメントを取得します。

**パスパラメータ**:
- `service`: Gitサービス（github, gitlab, mockなど）
- `owner`: リポジトリオーナー
- `repo`: リポジトリ名
- `path`: ドキュメントパス

**クエリパラメータ**:
- `ref`: ブランチまたはタグ名（デフォルト: "main"）
- `transform_links`: 相対リンクを絶対リンクに変換するかどうか（デフォルト: true）
- `base_url`: リンク変換のベースURL（オプション）

**レスポンス**:
- `200 OK`: ドキュメントが正常に取得できました
  - レスポンスボディ: [DocumentResponse](#documentresponse)
- `422 Unprocessable Entity`: パラメータが無効です

### リポジトリ構造取得

```
GET /documents/structure/{service}/{owner}/{repo}
```

Gitリポジトリの構造を取得します。

**パスパラメータ**:
- `service`: Gitサービス（github, gitlab, mockなど）
- `owner`: リポジトリオーナー
- `repo`: リポジトリ名

**クエリパラメータ**:
- `ref`: ブランチまたはタグ名（デフォルト: "main"）
- `path`: フィルタリングするパスプレフィックス（デフォルト: ""）

**レスポンス**:
- `200 OK`: リポジトリ構造が正常に取得できました
  - レスポンスボディ: [RepositoryStructureResponse](#repositorystructureresponse)
- `422 Unprocessable Entity`: パラメータが無効です

## リポジトリ関連

### リポジトリ一覧取得

```
GET /repositories/
```

登録されているリポジトリの一覧を取得します。

**クエリパラメータ**:
- `skip`: スキップするリポジトリ数（デフォルト: 0）
- `limit`: 返却する最大リポジトリ数（デフォルト: 100）

**レスポンス**:
- `200 OK`: リポジトリ一覧が正常に取得できました
  - レスポンスボディ: [RepositoryResponse](#repositoryresponse)の配列
- `422 Unprocessable Entity`: パラメータが無効です

### リポジトリ作成

```
POST /repositories/
```

新しいリポジトリを登録します。

**リクエストボディ**: [RepositoryCreate](#repositorycreate)

**レスポンス**:
- `201 Created`: リポジトリが正常に作成されました
  - レスポンスボディ: [RepositoryResponse](#repositoryresponse)
- `422 Unprocessable Entity`: リクエストボディが無効です

### リポジトリ詳細取得

```
GET /repositories/{repository_id}
```

指定したIDのリポジトリ詳細を取得します。

**パスパラメータ**:
- `repository_id`: リポジトリID

**レスポンス**:
- `200 OK`: リポジトリ詳細が正常に取得できました
  - レスポンスボディ: [RepositoryResponse](#repositoryresponse)
- `422 Unprocessable Entity`: パラメータが無効です

### リポジトリ更新

```
PUT /repositories/{repository_id}
```

指定したIDのリポジトリを更新します。

**パスパラメータ**:
- `repository_id`: リポジトリID

**リクエストボディ**: [RepositoryUpdate](#repositoryupdate)

**レスポンス**:
- `200 OK`: リポジトリが正常に更新されました
  - レスポンスボディ: [RepositoryResponse](#repositoryresponse)
- `422 Unprocessable Entity`: パラメータまたはリクエストボディが無効です

### リポジトリ削除

```
DELETE /repositories/{repository_id}
```

指定したIDのリポジトリを削除します。

**パスパラメータ**:
- `repository_id`: リポジトリID

**レスポンス**:
- `204 No Content`: リポジトリが正常に削除されました
- `422 Unprocessable Entity`: パラメータが無効です

## 検索関連

### リポジトリ内検索

```
POST /search/{service}/{owner}/{repo}
```

リポジトリ内のコンテンツを検索します。

**パスパラメータ**:
- `service`: Gitサービス（github, gitlab, mockなど）
- `owner`: リポジトリオーナー
- `repo`: リポジトリ名

**リクエストボディ**: [SearchQuery](#searchquery)

**レスポンス**:
- `200 OK`: 検索結果が正常に取得できました
  - レスポンスボディ: [SearchResponse](#searchresponse)
- `422 Unprocessable Entity`: パラメータまたはリクエストボディが無効です

## チャット関連

### チャットメッセージ送信

```
POST /chat/message
```

ドキュメントコンテキストを用いたチャットメッセージを送信します。

**リクエストボディ**:
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

**レスポンス**:
- `200 OK`: メッセージが正常に処理されました
  - レスポンスボディ:
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
- `422 Unprocessable Entity`: リクエストボディが無効です

## LLM関連

### LLMクエリ送信

```
POST /llm/query
```

ドキュメントコンテキストを含むオプションでLLMにクエリを送信します。会話履歴をサポートしており、過去のメッセージのコンテキストを維持した連続した対話が可能です。

**リクエストボディ**: [LLMQueryRequest](#llmqueryrequest)

**レスポンス**:
- `200 OK`: LLMからのレスポンスが正常に取得できました
  - レスポンスボディ: [LLMResponse](#llmresponse)
- `422 Unprocessable Entity`: リクエストボディが無効です

### LLM機能取得

```
GET /llm/capabilities
```

設定されているLLMプロバイダーの機能を取得します。

**クエリパラメータ**:
- `provider`: 機能を確認するLLMプロバイダー（オプション）

**レスポンス**:
- `200 OK`: LLM機能が正常に取得できました
- `422 Unprocessable Entity`: パラメータが無効です

### テンプレート一覧取得

```
GET /llm/templates
```

利用可能なプロンプトテンプレートの一覧を取得します。

**レスポンス**:
- `200 OK`: テンプレート一覧が正常に取得できました
  - レスポンスボディ: 文字列の配列

### プロンプトフォーマット

```
POST /llm/format-prompt
```

提供された変数でプロンプトテンプレートをフォーマットします。

**クエリパラメータ**:
- `template_id`: フォーマットするテンプレートのID

**リクエストボディ**: テンプレート変数を含むオブジェクト

**レスポンス**:
- `200 OK`: プロンプトが正常にフォーマットされました
  - レスポンスボディ: フォーマットされたプロンプト文字列
- `422 Unprocessable Entity`: パラメータまたはリクエストボディが無効です

### LLMレスポンスストリーミング

```
POST /llm/stream
```

Server-Sent Events (SSE)を使用してLLMからのレスポンスをリアルタイムでストリーミングします。会話履歴をサポートしており、連続した対話が可能です。

**リクエストボディ**: [LLMQueryRequest](#llmqueryrequest)

**レスポンス**:
- `200 OK`: ストリームが正常に開始されました
- `422 Unprocessable Entity`: リクエストボディが無効です

## データモデル

### DocumentResponse

ドキュメントレスポンスモデル。

```json
{
  "path": "string",              // リポジトリ内のドキュメントパス
  "name": "string",              // ドキュメント名
  "type": "markdown",            // ドキュメントタイプ (markdown, quarto, html, other)
  "metadata": {                  // ドキュメントメタデータ
    "size": 0,                   // バイト単位のサイズ
    "last_modified": "date-time", // 最終更新日時
    "content_type": "string",    // コンテンツタイプ
    "sha": "string",             // SHAハッシュ
    "download_url": "string",    // ダウンロードURL
    "html_url": "string",        // HTML URL
    "raw_url": "string",         // Raw URL
    "extra": {}                  // その他のメタデータ
  },
  "content": {                   // ドキュメントコンテンツ
    "content": "string",         // コンテンツ本文
    "encoding": "utf-8"          // エンコーディング
  },
  "repository": "string",        // リポジトリ名
  "owner": "string",             // リポジトリオーナー
  "service": "string",           // Gitサービス
  "ref": "main",                 // ブランチまたはタグ名
  "links": [                     // ドキュメント内のリンク
    {
      "text": "string",          // リンクテキスト
      "url": "string",           // リンクURL
      "is_image": false,         // 画像リンクかどうか
      "position": [0, 0],        // リンクの位置（開始,終了）
      "is_external": false       // 外部リンクかどうか
    }
  ],
  "transformed_content": "string" // 変換済みコンテンツ
}
```

### RepositoryStructureResponse

リポジトリ構造レスポンスモデル。

```json
{
  "service": "string",          // Gitサービス
  "owner": "string",            // リポジトリオーナー
  "repo": "string",             // リポジトリ名
  "ref": "main",                // ブランチまたはタグ名
  "tree": [                     // リポジトリツリー
    {
      "path": "string",         // アイテムへのパス
      "name": "string",         // アイテム名
      "type": "string",         // アイテムタイプ（fileまたはdirectory）
      "size": 0,                // バイト単位のサイズ
      "sha": "string",          // SHAハッシュ
      "download_url": "string", // ダウンロードURL
      "html_url": "string",     // HTML URL
      "git_url": "string"       // Git URL
    }
  ],
  "last_updated": "date-time"   // 最終更新日時
}
```

### RepositoryResponse

リポジトリレスポンスモデル。

```json
{
  "name": "string",              // リポジトリ名
  "owner": "string",             // リポジトリオーナー
  "service_type": "github",      // Gitサービスタイプ (github, gitlab)
  "url": "string",               // リポジトリURL
  "branch": "main",              // デフォルトブランチ
  "description": "string",       // リポジトリの説明
  "is_public": true,             // 公開リポジトリかどうか
  "id": 0,                       // リポジトリID
  "created_at": "date-time",     // 作成日時
  "updated_at": "date-time",     // 更新日時
  "metadata": {}                 // リポジトリメタデータ
}
```

### RepositoryCreate

リポジトリ作成モデル。

```json
{
  "name": "string",              // リポジトリ名
  "owner": "string",             // リポジトリオーナー
  "service_type": "github",      // Gitサービスタイプ (github, gitlab)
  "url": "string",               // リポジトリURL
  "branch": "main",              // デフォルトブランチ
  "description": "string",       // リポジトリの説明
  "is_public": true,             // 公開リポジトリかどうか
  "access_token": "string",      // プライベートリポジトリ用アクセストークン
  "metadata": {}                 // リポジトリメタデータ
}
```

### RepositoryUpdate

リポジトリ更新モデル。

```json
{
  "name": "string",              // リポジトリ名
  "owner": "string",             // リポジトリオーナー
  "service_type": "github",      // Gitサービスタイプ (github, gitlab)
  "url": "string",               // リポジトリURL
  "branch": "string",            // デフォルトブランチ
  "description": "string",       // リポジトリの説明
  "is_public": true,             // 公開リポジトリかどうか
  "access_token": "string",      // プライベートリポジトリ用アクセストークン
  "metadata": {}                 // リポジトリメタデータ
}
```

### SearchQuery

検索クエリモデル。

```json
{
  "query": "string",             // 検索クエリ
  "limit": 10,                   // 最大結果数
  "offset": 0,                   // 結果オフセット
  "file_extensions": ["string"], // ファイル拡張子によるフィルタ
  "path_prefix": "string",       // パスプレフィックスによるフィルタ
  "metadata_filters": {}         // メタデータによるフィルタ
}
```

### SearchResponse

検索レスポンスモデル。

```json
{
  "total": 0,                    // 合計結果数
  "offset": 0,                   // 結果オフセット
  "limit": 0,                    // 最大結果数
  "query": "string",             // 検索クエリ
  "results": [                   // 検索結果
    {
      "path": "string",          // ファイルへのパス
      "name": "string",          // ファイル名
      "type": "string",          // ファイルタイプ
      "repository": "string",    // リポジトリ名
      "owner": "string",         // リポジトリオーナー
      "service": "string",       // Gitサービス
      "score": 0,                // 検索スコア
      "highlight": "string",     // 検索ハイライト
      "metadata": {}             // ファイルメタデータ
    }
  ],
  "execution_time_ms": 0         // 検索実行時間（ミリ秒）
}
```

### LLMQueryRequest

LLMクエリリクエストモデル。

```json
{
  "prompt": "string",                  // LLMに送信するプロンプト
  "context_documents": ["string"],     // コンテキストに含めるドキュメントパスのリスト
  "provider": "openai",                // 使用するLLMプロバイダー
  "model": "string",                   // 使用する特定のモデル
  "options": {},                       // LLMプロバイダー用の追加オプション
  "disable_cache": false,              // trueの場合、キャッシュをバイパスして常に新しいAPI呼び出しを行う
  "conversation_history": [            // 会話の履歴（コンテキスト用）
    {
      "role": "user",                  // メッセージの役割 (user, assistant, system)
      "content": "string",             // メッセージの内容
      "timestamp": "date-time"         // メッセージが作成されたタイムスタンプ（オプション）
    }
  ]
}
```

### LLMResponse

LLMレスポンスモデル。

```json
{
  "content": "string",                 // LLMから返されたコンテンツ
  "model": "string",                   // 生成に使用されたモデル
  "provider": "string",                // LLMプロバイダー
  "usage": {                           // トークン使用情報
    "prompt_tokens": 0,                // プロンプト内のトークン数
    "completion_tokens": 0,            // 補完内のトークン数
    "total_tokens": 0                  // 使用された合計トークン数
  },
  "raw_response": {},                  // プロバイダーからの生レスポンス
  "optimized_conversation_history": [  // フロントエンドが次のリクエストに使用すべき最適化された会話履歴
    {
      "role": "user",                  // メッセージの役割 (user, assistant, system)
      "content": "string",             // メッセージの内容
      "timestamp": "date-time"         // メッセージが作成されたタイムスタンプ（オプション）
    }
  ],
  "history_optimization_info": {}      // 会話履歴の最適化に関する情報
}
```

### MessageItem

会話内の単一メッセージモデル。

```json
{
  "role": "user",                      // メッセージの送信者の役割 (user, assistant, system)
  "content": "string",                 // メッセージの内容
  "timestamp": "date-time"             // メッセージが作成されたタイムスタンプ（オプション）
}
```

### ChatMessage

チャットメッセージモデル。

```json
{
  "role": "string",                    // メッセージの役割 (user, assistant, system)
  "content": "string"                  // メッセージの内容
}
```

### ChatRequest

チャットリクエストモデル。

```json
{
  "messages": [                        // チャットメッセージの履歴
    {
      "role": "system",                // システムメッセージ
      "content": "string"
    },
    {
      "role": "user",                  // ユーザーメッセージ
      "content": "string"
    }
  ],
  "document_context": {                // ドキュメントコンテキスト
    "service": "string",               // Gitサービス
    "owner": "string",                 // リポジトリオーナー
    "repo": "string",                  // リポジトリ名
    "path": "string",                  // ドキュメントパス
    "ref": "string"                    // ブランチまたはタグ名
  }
}
```

### ChatResponse

チャットレスポンスモデル。

```json
{
  "message": {                         // アシスタントからの応答メッセージ
    "role": "assistant",
    "content": "string"
  },
  "usage": {                           // トークン使用情報
    "prompt_tokens": 0,                // プロンプト内のトークン数
    "completion_tokens": 0,            // 補完内のトークン数
    "total_tokens": 0                  // 使用された合計トークン数
  },
  "execution_time_ms": 0,              // 実行時間（ミリ秒）
  "optimized_conversation_history": [  // 最適化された会話履歴
    {
      "role": "string",                // メッセージの役割
      "content": "string",             // メッセージの内容
      "timestamp": "date-time"         // メッセージのタイムスタンプ（オプション）
    }
  ]
}
```
