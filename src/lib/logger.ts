// src/lib/logger.ts
import { IS_DEBUG_MODE } from '../config/constants';
const isDev = process.env.NODE_ENV !== 'production';

// Determine if debug logs should be enabled
const enableDebugLogs = IS_DEBUG_MODE || isDev;

export const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) =>
    enableDebugLogs && console.debug('[DEBUG]', ...args),
};

// src/lib/logger.ts
