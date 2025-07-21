/**
 * Document Utilities Service
 * 
 * ドキュメント関連のユーティリティ機能を提供
 */
import type { 
  DocumentResponse,
  DocumentMetadataInput,
  RepositoryContext,
  DocumentTypeInput,
  GitService
} from '../types';

/**
 * ドキュメント情報からDocumentMetadataInputを生成する
 * @param document ドキュメントレスポンス
 * @returns DocumentMetadataInput
 */
export function createDocumentMetadataInput(document: DocumentResponse | null): DocumentMetadataInput | null {
  if (!document) return null;
  
  // ファイル拡張子の抽出
  const fileExtension = document.name.includes('.') 
    ? document.name.split('.').pop() 
    : null;
  
  // ドキュメントタイプのマッピング（文字列リテラル型に対応）
  const typeMapping: Record<string, DocumentTypeInput> = {
    'markdown': 'markdown',
    'html': 'html',
    'text': 'text',
    'python': 'python',
    'javascript': 'javascript',
    'typescript': 'typescript',
    'json': 'json',
    'yaml': 'yaml',
    'xml': 'xml'
  };
  
  const documentType = typeMapping[document.type.toLowerCase()] || 'other';
  
  return {
    title: document.name,
    type: documentType,
    filename: document.name,
    file_extension: fileExtension || null,
    last_modified: document.metadata.last_modified,
    file_size: document.metadata.size,
    encoding: document.content.encoding || 'utf-8',
    language: null // 言語検出は将来的に実装
  };
}

/**
 * リポジトリ情報からRepositoryContextを生成する
 * @param document ドキュメントレスポンス
 * @returns RepositoryContext
 */
export function createRepositoryContext(document: DocumentResponse | null): RepositoryContext | null {
  if (!document) return null;
  
  // サービス名のマッピング（文字列リテラル型に対応）
  const serviceMapping: Record<string, GitService> = {
    'github': 'github',
    'gitlab': 'gitlab',
    'bitbucket': 'bitbucket'
  };
  
  const service = serviceMapping[document.service.toLowerCase()] || 'github';
  
  return {
    service,
    owner: document.owner,
    repo: document.repository,
    ref: document.ref || 'main',
    current_path: document.path,
    base_url: null // 必要に応じて設定
  };
}

/**
 * ドキュメントの内容から要約を生成する
 * @param content ドキュメントの内容
 * @param maxLength 要約の最大文字数
 * @returns 要約文字列
 */
export function createDocumentSummary(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  // 最初の段落を取得
  const firstParagraph = content.split('\n\n')[0];
  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }
  
  // 文字数で切り詰め
  return content.substring(0, maxLength - 3) + '...';
}

/**
 * ドキュメントの言語を推測する
 * @param filename ファイル名
 * @param content ドキュメントの内容
 * @returns 推測された言語
 */
export function detectDocumentLanguage(filename: string, content?: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const extensionMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'xml': 'xml',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'zsh',
    'fish': 'fish',
    'ps1': 'powershell',
    'dockerfile': 'dockerfile'
  };
  
  if (extension && extensionMap[extension]) {
    return extensionMap[extension];
  }
  
  // ファイル名による特殊ケース
  const specialFiles: Record<string, string> = {
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'rakefile': 'ruby',
    'gemfile': 'ruby',
    'package.json': 'json',
    'tsconfig.json': 'json',
    'webpack.config.js': 'javascript',
    'babel.config.js': 'javascript'
  };
  
  const lowercaseFilename = filename.toLowerCase();
  if (specialFiles[lowercaseFilename]) {
    return specialFiles[lowercaseFilename];
  }
  
  // 内容ベースの推測（簡易版）
  if (content) {
    if (content.includes('#!/usr/bin/env python') || content.includes('import ')) {
      return 'python';
    }
    if (content.includes('#!/bin/bash') || content.includes('#!/usr/bin/bash')) {
      return 'bash';
    }
    if (content.includes('<?php')) {
      return 'php';
    }
    if (content.includes('<!DOCTYPE html') || content.includes('<html')) {
      return 'html';
    }
  }
  
  return null;
}

/**
 * ドキュメントの統計情報を計算する
 * @param content ドキュメントの内容
 * @returns 統計情報
 */
export function calculateDocumentStats(content: string): {
  characterCount: number;
  wordCount: number;
  lineCount: number;
  paragraphCount: number;
  estimatedReadingTime: number; // 分単位
} {
  const characterCount = content.length;
  const lineCount = content.split('\n').length;
  const paragraphCount = content.split('\n\n').length;
  
  // 単語数の計算（日本語と英語の混在に対応）
  const words = content
    .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  const wordCount = words.length;
  
  // 読書時間の推定（1分間に200単語と仮定）
  const estimatedReadingTime = Math.ceil(wordCount / 200);
  
  return {
    characterCount,
    wordCount,
    lineCount,
    paragraphCount,
    estimatedReadingTime
  };
}

/**
 * ドキュメントのタイプを詳細に判定する
 * @param filename ファイル名
 * @param content ドキュメントの内容
 * @returns ドキュメントタイプの詳細情報
 */
export function analyzeDocumentType(filename: string, content?: string): {
  type: DocumentTypeInput;
  category: 'source_code' | 'documentation' | 'configuration' | 'data' | 'other';
  description: string;
} {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // ソースコード
  const sourceCodeExtensions = ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala'];
  if (extension && sourceCodeExtensions.includes(extension)) {
    return {
      type: (extension === 'js' ? 'javascript' : extension === 'ts' ? 'typescript' : extension === 'py' ? 'python' : 'other') as DocumentTypeInput,
      category: 'source_code',
      description: 'プログラミング言語のソースコードファイル'
    };
  }
  
  // ドキュメント
  const documentExtensions = ['md', 'html', 'txt', 'rst', 'tex'];
  if (extension && documentExtensions.includes(extension)) {
    return {
      type: (extension === 'md' ? 'markdown' : extension === 'html' ? 'html' : 'text') as DocumentTypeInput,
      category: 'documentation',
      description: 'ドキュメントまたはテキストファイル'
    };
  }
  
  // 設定ファイル
  const configExtensions = ['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config'];
  if (extension && configExtensions.includes(extension)) {
    return {
      type: (extension === 'json' ? 'json' : extension === 'yaml' || extension === 'yml' ? 'yaml' : 'other') as DocumentTypeInput,
      category: 'configuration',
      description: '設定ファイル'
    };
  }
  
  // データファイル
  const dataExtensions = ['csv', 'xml', 'sqlite', 'db'];
  if (extension && dataExtensions.includes(extension)) {
    return {
      type: (extension === 'xml' ? 'xml' : 'other') as DocumentTypeInput,
      category: 'data',
      description: 'データファイル'
    };
  }
  
  return {
    type: 'other',
    category: 'other',
    description: 'その他のファイル'
  };
}
