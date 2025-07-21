/**
 * Date Formatting Utilities
 * 
 * アプリケーション全体で使用される日付フォーマット機能を統一
 */

export interface DateFormatOptions {
  /** ロケール設定 */
  locale?: string;
  /** タイムゾーン */
  timeZone?: string;
  /** エラー時の代替テキスト */
  fallback?: string;
}

/**
 * 日付フォーマットのプリセット
 */
export const DateFormatter = {
  /**
   * チャットメッセージの時刻フォーマット (HH:MM)
   */
  messageTime: (timestamp: Date | string, options: DateFormatOptions = {}) => {
    const { locale = 'ja-JP', fallback = '--:--' } = options;
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return fallback;
      }
      
      return date.toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      console.warn('Failed to format message time:', e);
      return fallback;
    }
  },

  /**
   * ツール実行履歴の時刻フォーマット (HH:MM:SS)
   */
  historyTime: (time: Date | string, options: DateFormatOptions = {}) => {
    const { locale = 'ja-JP', fallback = '--:--:--' } = options;
    
    try {
      const date = new Date(time);
      if (isNaN(date.getTime())) {
        return fallback;
      }
      
      return date.toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch (e) {
      console.warn('Failed to format history time:', e);
      return fallback;
    }
  },

  /**
   * ドキュメントの最終更新日時フォーマット (YYYY年MM月DD日 HH:MM)
   */
  documentDate: (dateString: string, options: DateFormatOptions = {}) => {
    const { locale = 'ja-JP', fallback = '不明' } = options;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return fallback;
      }
      
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.warn('Failed to format document date:', e);
      return fallback;
    }
  },

  /**
   * 短縮形の日付フォーマット (MM/DD HH:MM)
   */
  shortDate: (timestamp: Date | string, options: DateFormatOptions = {}) => {
    const { locale = 'ja-JP', fallback = '--/-- --:--' } = options;
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return fallback;
      }
      
      return date.toLocaleDateString(locale, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.warn('Failed to format short date:', e);
      return fallback;
    }
  },

  /**
   * 完全な日時フォーマット (YYYY/MM/DD HH:MM:SS)
   */
  fullDateTime: (timestamp: Date | string, options: DateFormatOptions = {}) => {
    const { locale = 'ja-JP', fallback = '不明な日時' } = options;
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return fallback;
      }
      
      return date.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      console.warn('Failed to format full date time:', e);
      return fallback;
    }
  },

  /**
   * 相対時間フォーマット (XX秒前、XX分前など)
   */
  relativeTime: (timestamp: Date | string, options: DateFormatOptions = {}) => {
    const { locale = 'ja-JP', fallback = '不明' } = options;
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return fallback;
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) {
        return `${diffSeconds}秒前`;
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分前`;
      } else if (diffHours < 24) {
        return `${diffHours}時間前`;
      } else if (diffDays < 7) {
        return `${diffDays}日前`;
      } else {
        // 1週間以上前は通常の日付表示
        return DateFormatter.shortDate(date, options);
      }
    } catch (e) {
      console.warn('Failed to format relative time:', e);
      return fallback;
    }
  },

  /**
   * ISO文字列をローカル日時に変換
   */
  fromISOString: (isoString: string, options: DateFormatOptions = {}) => {
    const { locale = 'ja-JP', fallback = '不明な日時' } = options;
    
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return fallback;
      }
      
      return date.toLocaleString(locale);
    } catch (e) {
      console.warn('Failed to format ISO string:', e);
      return fallback;
    }
  }
};

/**
 * カスタム日付フォーマッター
 */
export function createDateFormatter(defaultOptions: DateFormatOptions = {}) {
  return {
    format: (
      timestamp: Date | string, 
      formatOptions: Intl.DateTimeFormatOptions, 
      options: DateFormatOptions = {}
    ) => {
      const mergedOptions = { ...defaultOptions, ...options };
      const { locale = 'ja-JP', fallback = '不明' } = mergedOptions;
      
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          return fallback;
        }
        
        return date.toLocaleString(locale, formatOptions);
      } catch (e) {
        console.warn('Failed to format date with custom options:', e);
        return fallback;
      }
    }
  };
}

/**
 * 日付の妥当性チェック
 */
export function isValidDate(date: Date | string): boolean {
  try {
    const d = new Date(date);
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
}

/**
 * 日付を日本語フォーマットに統一（後方互換性用）
 */
export function formatDate(dateString: string): string {
  return DateFormatter.documentDate(dateString);
}

/**
 * メッセージ時刻フォーマット（後方互換性用）
 */
export function formatMessageTime(timestamp: Date): string {
  return DateFormatter.messageTime(timestamp);
}

/**
 * 履歴時刻フォーマット（後方互換性用）
 */
export function formatHistoryTime(time: Date): string {
  return DateFormatter.historyTime(time);
}