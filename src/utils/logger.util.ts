/**
 * Logger utility for consistent logging across the application
 * Enables/disables debug logs based on environment
 */

export interface Logger {
  debug: (message?: unknown, ...optionalParams: unknown[]) => void;
  info: (message?: unknown, ...optionalParams: unknown[]) => void;
  warn: (message?: unknown, ...optionalParams: unknown[]) => void;
  error: (message?: unknown, ...optionalParams: unknown[]) => void;
}

/**
 * Creates a logger with environment-aware debug logging
 * @param module - Module name for log prefixing
 * @returns Logger instance
 */
export function createLogger(module?: string): Logger {
  const prefix = module ? `[${module}]` : '';
  
  return {
    debug: import.meta.env.DEV 
      ? (message?: unknown, ...optionalParams: unknown[]) => 
          console.log(`${prefix}`, message, ...optionalParams)
      : () => {},
    
    info: (message?: unknown, ...optionalParams: unknown[]) => 
      console.info(`${prefix}`, message, ...optionalParams),
    
    warn: (message?: unknown, ...optionalParams: unknown[]) => 
      console.warn(`${prefix}`, message, ...optionalParams),
    
    error: (message?: unknown, ...optionalParams: unknown[]) => 
      console.error(`${prefix}`, message, ...optionalParams),
  };
}

/**
 * Default application logger
 */
export const logger = createLogger();

/**
 * Creates a scoped logger for specific modules
 * @param module - Module name
 * @returns Scoped logger instance
 */
export function getLogger(module: string): Logger {
  return createLogger(module);
}