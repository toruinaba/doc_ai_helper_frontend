/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * バックエンドAPIのベースURL
   * 例: http://localhost:8000/api/v1
   */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
