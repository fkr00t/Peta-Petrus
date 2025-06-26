/**
 * Logger utility untuk aplikasi Peta Petrus
 * Menyediakan fungsi logging yang berbeda berdasarkan environment
 */

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

// Konstanta untuk level logging
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Konfigurasi logging
const loggerConfig = {
  level: (() => {
    const configLevel = env.LOG_LEVEL?.toLowerCase();
    if (configLevel === 'error') return LOG_LEVELS.ERROR;
    if (configLevel === 'warn') return LOG_LEVELS.WARN;
    if (configLevel === 'info') return LOG_LEVELS.INFO;
    if (configLevel === 'debug') return LOG_LEVELS.DEBUG;
    
    // Default: DEBUG di development, INFO di production
    return dev ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
  })()
};

// Format timestamp: YYYY-MM-DD HH:MM:SS
function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Format pesan log
function formatLogMessage(level: string, message: string, meta?: Record<string, any>) {
  const timestamp = getTimestamp();
  let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (meta) {
    try {
      logMessage += ` ${JSON.stringify(meta)}`;
    } catch (error) {
      logMessage += ` [Meta tidak dapat dikonversi ke JSON]`;
    }
  }
  
  return logMessage;
}

// Fungsi logger
const logger = {
  error(message: string, meta?: Record<string, any>) {
    if (loggerConfig.level >= LOG_LEVELS.ERROR) {
      console.error(formatLogMessage('ERROR', message, meta));
    }
  },
  
  warn(message: string, meta?: Record<string, any>) {
    if (loggerConfig.level >= LOG_LEVELS.WARN) {
      console.warn(formatLogMessage('WARN', message, meta));
    }
  },
  
  info(message: string, meta?: Record<string, any>) {
    if (loggerConfig.level >= LOG_LEVELS.INFO) {
      console.info(formatLogMessage('INFO', message, meta));
    }
  },
  
  debug(message: string, meta?: Record<string, any>) {
    if (loggerConfig.level >= LOG_LEVELS.DEBUG) {
      console.debug(formatLogMessage('DEBUG', message, meta));
    }
  },
  
  security(message: string, meta?: Record<string, any>) {
    // Security logging selalu diaktifkan terlepas dari level
    console.warn(formatLogMessage('SECURITY', message, meta));
  }
};

export default logger; 