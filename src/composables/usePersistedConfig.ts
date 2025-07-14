/**
 * Persisted Configuration Composable
 * 
 * localStorageを使用した設定の永続化とリアクティブ管理を提供
 */
import { ref, watch, type Ref, type DeepReadonly } from 'vue';

export interface PersistedConfigOptions<T> {
  /** localStorageのキー */
  key: string;
  /** デフォルト設定 */
  defaultConfig: T;
  /** 変更の監視を有効にするか */
  enableWatch?: boolean;
  /** 深い監視を有効にするか */
  deep?: boolean;
  /** エラーログを出力するか */
  enableErrorLogging?: boolean;
  /** 保存前の検証関数 */
  validator?: (config: T) => boolean;
  /** 設定変更時のコールバック */
  onChange?: (newConfig: T, oldConfig: T) => void;
}

export interface PersistedConfigReturn<T> {
  /** リアクティブな設定オブジェクト */
  config: Ref<T>;
  /** 設定を手動で保存 */
  saveConfig: () => void;
  /** 設定をデフォルトにリセット */
  resetConfig: () => void;
  /** localStorageから設定を再読み込み */
  reloadConfig: () => void;
  /** 設定の妥当性をチェック */
  isValid: () => boolean;
  /** 現在の設定をJSONで取得 */
  toJSON: () => string;
  /** JSONから設定を読み込み */
  fromJSON: (json: string) => boolean;
}

/**
 * localStorageに永続化される設定を管理するコンポーザブル
 */
export function usePersistedConfig<T extends Record<string, any>>(
  options: PersistedConfigOptions<T>
): PersistedConfigReturn<T> {
  const {
    key,
    defaultConfig,
    enableWatch = true,
    deep = true,
    enableErrorLogging = true,
    validator,
    onChange
  } = options;

  // リアクティブな設定
  const config = ref<T>({ ...defaultConfig }) as Ref<T>;

  /**
   * localStorageから設定を読み込み
   */
  const loadConfig = (): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) {
        return { ...defaultConfig };
      }

      const parsed = JSON.parse(saved) as T;
      
      // 検証関数がある場合はチェック
      if (validator && !validator(parsed)) {
        if (enableErrorLogging) {
          console.warn(`Invalid config loaded for key "${key}", using default:`, parsed);
        }
        return { ...defaultConfig };
      }

      // デフォルト設定とマージ（新しいフィールドが追加された場合の対応）
      return { ...defaultConfig, ...parsed };
    } catch (error) {
      if (enableErrorLogging) {
        console.warn(`Failed to load config for key "${key}":`, error);
      }
      return { ...defaultConfig };
    }
  };

  /**
   * localStorageに設定を保存
   */
  const saveConfig = (): void => {
    try {
      // 検証関数がある場合はチェック
      if (validator && !validator(config.value)) {
        if (enableErrorLogging) {
          console.warn(`Invalid config, not saving for key "${key}":`, config.value);
        }
        return;
      }

      const json = JSON.stringify(config.value);
      localStorage.setItem(key, json);
      
      if (enableErrorLogging) {
        console.log(`Config saved for key "${key}":`, config.value);
      }
    } catch (error) {
      if (enableErrorLogging) {
        console.error(`Failed to save config for key "${key}":`, error);
      }
    }
  };

  /**
   * 設定をデフォルトにリセット
   */
  const resetConfig = (): void => {
    const oldConfig = { ...config.value };
    config.value = { ...defaultConfig };
    saveConfig();
    
    if (onChange) {
      onChange(config.value, oldConfig);
    }
  };

  /**
   * localStorageから設定を再読み込み
   */
  const reloadConfig = (): void => {
    const oldConfig = { ...config.value };
    const loaded = loadConfig();
    config.value = loaded;
    
    if (onChange) {
      onChange(config.value, oldConfig);
    }
  };

  /**
   * 設定の妥当性をチェック
   */
  const isValid = (): boolean => {
    if (!validator) {
      return true;
    }
    return validator(config.value);
  };

  /**
   * 現在の設定をJSON文字列で取得
   */
  const toJSON = (): string => {
    try {
      return JSON.stringify(config.value, null, 2);
    } catch (error) {
      if (enableErrorLogging) {
        console.error(`Failed to serialize config for key "${key}":`, error);
      }
      return '{}';
    }
  };

  /**
   * JSON文字列から設定を読み込み
   */
  const fromJSON = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as T;
      
      if (validator && !validator(parsed)) {
        if (enableErrorLogging) {
          console.warn(`Invalid config in JSON for key "${key}":`, parsed);
        }
        return false;
      }

      const oldConfig = { ...config.value };
      config.value = { ...defaultConfig, ...parsed };
      saveConfig();
      
      if (onChange) {
        onChange(config.value, oldConfig);
      }
      
      return true;
    } catch (error) {
      if (enableErrorLogging) {
        console.error(`Failed to parse JSON for key "${key}":`, error);
      }
      return false;
    }
  };

  // 初期化時にlocalStorageから読み込み
  config.value = loadConfig();

  // 変更監視の設定
  if (enableWatch) {
    watch(
      config,
      (newConfig, oldConfig) => {
        saveConfig();
        if (onChange) {
          onChange(newConfig, oldConfig);
        }
      },
      { deep }
    );
  }

  return {
    config,
    saveConfig,
    resetConfig,
    reloadConfig,
    isValid,
    toJSON,
    fromJSON
  };
}

/**
 * 設定の検証用ヘルパー関数
 */
export const ConfigValidators = {
  /**
   * 必須フィールドをチェック
   */
  requireFields: <T>(fields: Array<keyof T>) => {
    return (config: T): boolean => {
      return fields.every(field => config[field] !== undefined && config[field] !== null);
    };
  },

  /**
   * 数値の範囲をチェック
   */
  numberRange: (field: string, min: number, max: number) => {
    return (config: any): boolean => {
      const value = config[field];
      return typeof value === 'number' && value >= min && value <= max;
    };
  },

  /**
   * 文字列の長さをチェック
   */
  stringLength: (field: string, minLength: number, maxLength?: number) => {
    return (config: any): boolean => {
      const value = config[field];
      if (typeof value !== 'string') return false;
      if (value.length < minLength) return false;
      if (maxLength !== undefined && value.length > maxLength) return false;
      return true;
    };
  },

  /**
   * 列挙値をチェック
   */
  enum: <T>(field: string, allowedValues: T[]) => {
    return (config: any): boolean => {
      const value = config[field];
      return allowedValues.includes(value);
    };
  },

  /**
   * 複数の検証を組み合わせ
   */
  combine: <T>(...validators: Array<(config: T) => boolean>) => {
    return (config: T): boolean => {
      return validators.every(validator => validator(config));
    };
  }
};

/**
 * よく使われる設定パターンのプリセット
 */
export const ConfigPresets = {
  /**
   * boolean フラグの設定
   */
  booleanFlag: (key: string, defaultValue: boolean = false) => {
    return usePersistedConfig({
      key,
      defaultConfig: { enabled: defaultValue },
      validator: (config) => typeof config.enabled === 'boolean'
    });
  },

  /**
   * UI表示設定
   */
  uiSettings: (key: string) => {
    return usePersistedConfig({
      key,
      defaultConfig: {
        showPanel: false,
        theme: 'light' as 'light' | 'dark',
        fontSize: 14
      },
      validator: ConfigValidators.combine(
        ConfigValidators.enum('theme', ['light', 'dark']),
        ConfigValidators.numberRange('fontSize', 10, 24)
      )
    });
  },

  /**
   * ツール設定
   */
  toolsConfig: (key: string) => {
    return usePersistedConfig({
      key,
      defaultConfig: {
        enabled: true,
        mode: 'auto' as 'auto' | 'manual',
        selectedTools: [] as string[]
      },
      validator: ConfigValidators.enum('mode', ['auto', 'manual'])
    });
  }
};