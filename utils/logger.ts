/**
 * Lightweight logger that is a no-op in production.
 * Use `logger.log`, `logger.warn`, and `logger.error` instead of bare console calls.
 */
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    // Always log errors (even in production) so crash reporters can capture them
    console.error(...args);
  },
};
