<!-- 
  RepositoryNavigator - 一時的に無効化
  
  将来の実装予定:
  - ファイル構造ナビゲーションから目次（Table of Contents）表示に変更
  - index.mdなどの特定のドキュメントの目次を表示
  - 現在のドキュメントの章・節構造をナビゲーション可能に
  
  現在のファイルツリー実装にバグがあるため一時的に無効化
-->
<template>
  <div class="repository-navigator-container disabled">
    <div class="repository-header">
      <div class="repository-title">
        <h2>目次</h2>
      </div>
    </div>
    
    <div class="placeholder-content">
      <div class="placeholder-icon">
        <i class="pi pi-list"></i>
      </div>
      <h3>目次機能 開発予定</h3>
      <p>現在のドキュメントの目次を表示する機能を開発中です</p>
      <div class="feature-list">
        <ul>
          <li>ドキュメントの章・節構造の表示</li>
          <li>セクションへのクイックナビゲーション</li>
          <li>現在の読書位置のハイライト</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 将来の目次機能実装のための基本構造
// 現在は無効化状態

/*
将来の実装予定:
1. 目次（Table of Contents）機能
   - 現在表示中のMarkdownドキュメントから見出し（h1, h2, h3...）を抽出
   - 階層構造で目次を表示
   - 各見出しクリックでその位置にスクロール
   
2. ドキュメントナビゲーション
   - 現在の読書位置のハイライト表示
   - 章・節の完読状況の表示
   
3. 拡張機能
   - 検索機能との連携
   - ブックマーク機能
   - 印刷時の目次生成
*/

// 将来の目次実装で使用予定の型定義
interface TableOfContentsItem {
  id: string;
  level: number; // 1-6 (h1-h6)
  text: string;
  anchor: string;
  children?: TableOfContentsItem[];
}

// 現在は何もしない
</script>

<style scoped>
/* 基本的なレイアウトスタイルは将来の目次機能でも再利用 */
.repository-navigator-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.repository-navigator-container.disabled {
  background-color: #f9f9f9;
}

.repository-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #e0e0e0;
  border-bottom: 1px solid #ccc;
}

.repository-title h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #666;
}

/* プレースホルダー用のスタイル */
.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  flex: 1;
  text-align: center;
  color: #666;
}

.placeholder-icon {
  font-size: 3rem;
  color: #ccc;
  margin-bottom: 1rem;
}

.placeholder-content h3 {
  color: #555;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.placeholder-content p {
  color: #777;
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.feature-list {
  text-align: left;
  max-width: 250px;
}

.feature-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  padding: 0.4rem 0;
  font-size: 0.85rem;
  color: #666;
  position: relative;
  padding-left: 1.2rem;
}

.feature-list li:before {
  content: '•';
  color: #999;
  position: absolute;
  left: 0;
}

/* 将来の目次機能で使用予定のスタイル（プリザーブ） */
/*
.toc-container {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem;
}

.toc-item {
  display: flex;
  align-items: center;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9rem;
}

.toc-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.toc-item.active {
  background-color: #e3f2fd;
  font-weight: 500;
}

.toc-level-1 { margin-left: 0; }
.toc-level-2 { margin-left: 1rem; }
.toc-level-3 { margin-left: 2rem; }
.toc-level-4 { margin-left: 3rem; }
.toc-level-5 { margin-left: 4rem; }
.toc-level-6 { margin-left: 5rem; }
*/
</style>
