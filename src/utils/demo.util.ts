/**
 * 新しいバックエンド仕様のデモ機能
 * 
 * このファイルは新しいバックエンド仕様の動作確認用のデモ機能を提供します。
 */

import type { DocumentContextConfig } from '@/utils/config.util';

// デモ用のドキュメントコンテキスト設定プリセット
export const demoContextPresets: Record<string, DocumentContextConfig> = {
  // 標準設定
  standard: {
    includeDocumentInSystemPrompt: true,
    systemPromptTemplate: 'contextual_document_assistant_ja',
    enableRepositoryContext: true,
    enableDocumentMetadata: true,
    completeToolFlow: true
  },

  // コード解析モード
  codeAnalysis: {
    includeDocumentInSystemPrompt: true,
    systemPromptTemplate: 'code_analysis_assistant',
    enableRepositoryContext: true,
    enableDocumentMetadata: true,
    completeToolFlow: true
  },

  // 軽量モード（コンテキスト最小限）
  lightweight: {
    includeDocumentInSystemPrompt: false,
    systemPromptTemplate: 'contextual_document_assistant_ja',
    enableRepositoryContext: false,
    enableDocumentMetadata: false,
    completeToolFlow: false
  },

  // 技術文書作成モード
  technicalWriter: {
    includeDocumentInSystemPrompt: true,
    systemPromptTemplate: 'technical_writer_assistant',
    enableRepositoryContext: true,
    enableDocumentMetadata: true,
    completeToolFlow: true
  }
};

// デモメッセージのサンプル
export const demoMessages = [
  {
    text: 'このドキュメントについて説明してください',
    description: '基本的なドキュメント内容の説明を求める'
  },
  {
    text: 'このコードの問題点を指摘してください',
    description: 'コード解析を依頼する（コード解析モード推奨）'
  },
  {
    text: 'このドキュメントを元により詳細な技術仕様書を作成してください',
    description: '技術文書作成を依頼する（技術文書作成モード推奨）'
  },
  {
    text: 'リポジトリ全体の構造について教えてください',
    description: 'リポジトリコンテキストを活用した質問'
  },
  {
    text: '関連する他のファイルはありますか？',
    description: 'ドキュメント間の関連性を問う質問'
  }
];

// 新機能のデモンストレーション用ヘルパー関数
export class NewBackendSpecDemo {
  /**
   * 指定されたプリセットを適用
   */
  static applyPreset(presetName: keyof typeof demoContextPresets): DocumentContextConfig {
    const preset = demoContextPresets[presetName];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}`);
    }
    return { ...preset };
  }

  /**
   * デモ用のログ出力
   */
  static logDemoAction(action: string, config: DocumentContextConfig) {
    console.group(`🎭 Demo: ${action}`);
    console.log('📋 Applied Configuration:', config);
    console.log('🔧 System Prompt Template:', config.systemPromptTemplate);
    console.log('📄 Include Document in System Prompt:', config.includeDocumentInSystemPrompt);
    console.log('📂 Repository Context Enabled:', config.enableRepositoryContext);
    console.log('📊 Document Metadata Enabled:', config.enableDocumentMetadata);
    console.log('⚙️ Complete Tool Flow:', config.completeToolFlow);
    console.groupEnd();
  }

  /**
   * 設定の違いを比較表示
   */
  static compareConfigs(config1: DocumentContextConfig, config2: DocumentContextConfig, labels?: [string, string]) {
    const [label1, label2] = labels || ['Config 1', 'Config 2'];
    
    console.group(`⚖️ Configuration Comparison: ${label1} vs ${label2}`);
    console.table({
      [label1]: config1,
      [label2]: config2
    });
    console.groupEnd();
  }

  /**
   * 新機能のガイドを表示
   */
  static showFeatureGuide() {
    console.group('🎯 新しいバックエンド仕様の主要機能');
    console.log(`
1. 🏗️ リポジトリコンテキスト機能
   - 現在のリポジトリ、オーナー、ブランチ情報を自動的にLLMに提供
   - ドキュメントの場所と関連ファイルの理解を向上

2. 📋 ドキュメントメタデータ統合
   - ファイルサイズ、更新日時、拡張子などの情報を含める
   - より精密なコンテキスト理解を実現

3. 🎨 システムプロンプトテンプレート
   - 用途に応じたプリセットテンプレート
   - カスタマイズ可能な応答スタイル

4. ⚙️ 完全なツールフロー制御
   - MCPツールの実行フローを詳細制御
   - パフォーマンスと精度のバランス調整

5. 🔧 動的設定管理
   - リアルタイムでの設定変更
   - 設定の永続化とプリセット機能
    `);
    console.groupEnd();
  }

  /**
   * パフォーマンス測定用のタイマー
   */
  static createPerformanceTimer(label: string) {
    const startTime = performance.now();
    
    return {
      stop: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }
}

// デモ実行用の便利関数
export const runBackendSpecDemo = () => {
  console.log('🚀 新しいバックエンド仕様のデモを開始します');
  
  // 機能ガイドを表示
  NewBackendSpecDemo.showFeatureGuide();
  
  // プリセットのデモ
  Object.entries(demoContextPresets).forEach(([name, config]) => {
    NewBackendSpecDemo.logDemoAction(`プリセット: ${name}`, config);
  });
  
  // 設定比較のデモ
  NewBackendSpecDemo.compareConfigs(
    demoContextPresets.standard,
    demoContextPresets.lightweight,
    ['標準設定', '軽量設定']
  );
  
  console.log('✨ デモ完了！新しい機能をお試しください。');
};
