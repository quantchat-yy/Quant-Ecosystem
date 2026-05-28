/**
 * Environment-aware logger that suppresses non-error output in production.
 * In production (NODE_ENV === 'production'), only error() logs.
 * In development/test, all methods log normally.
 */

type LogLevel = 'debug' | 'log' | 'warn' | 'error';

function shouldLog(level: LogLevel): boolean {
  if (level === 'error') return true;
  return typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;
}

export const logger = {
  debug(...args: unknown[]): void {
    if (shouldLog('debug')) console.debug('[QUANT]', ...args);
  },
  log(...args: unknown[]): void {
    if (shouldLog('log')) console.log('[QUANT]', ...args);
  },
  warn(...args: unknown[]): void {
    if (shouldLog('warn')) console.warn('[QUANT]', ...args);
  },
  error(...args: unknown[]): void {
    if (shouldLog('error')) console.error('[QUANT]', ...args);
  },
};
