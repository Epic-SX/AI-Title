/**
 * Debug Logging Utility for Electron App
 * This file helps track API calls and debug the 502 error issue
 */

// Log levels
const LOG_LEVELS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: 'ℹ️',
  DEBUG: '🐛',
  SUCCESS: '✅',
  API: '🌐',
  IPC: '📡',
  WINDOW: '🪟'
};

// Add timestamp to logs
function logWithTimestamp(level, message, ...args) {
  const timestamp = new Date().toISOString().substr(11, 8);
  console.log(`[${timestamp}] ${level} ${message}`, ...args);
}

// Export for use in main process and renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    error: (msg, ...args) => logWithTimestamp(LOG_LEVELS.ERROR, msg, ...args),
    warn: (msg, ...args) => logWithTimestamp(LOG_LEVELS.WARN, msg, ...args),
    info: (msg, ...args) => logWithTimestamp(LOG_LEVELS.INFO, msg, ...args),
    debug: (msg, ...args) => logWithTimestamp(LOG_LEVELS.DEBUG, msg, ...args),
    success: (msg, ...args) => logWithTimestamp(LOG_LEVELS.SUCCESS, msg, ...args),
    api: (msg, ...args) => logWithTimestamp(LOG_LEVELS.API, msg, ...args),
    ipc: (msg, ...args) => logWithTimestamp(LOG_LEVELS.IPC, msg, ...args),
    window: (msg, ...args) => logWithTimestamp(LOG_LEVELS.WINDOW, msg, ...args),
  };
}

// Instructions for debugging
console.log(`
🔍 ELECTRON DEBUG LOGGING ENABLED
===================================

When you run 'npm run electron', watch for these log patterns:

1. 🚀 App startup logs
2. 🔌 Preload script loading
3. 🪟 Window creation and loading
4. 📡 IPC calls between processes
5. 🌐 API calls and restrictions
6. ❌ Blocked or failed API calls

Key things to look for:
- Any API calls to image processing endpoints
- 502 errors from remote server
- IPC messages that might trigger unwanted API calls
- Configuration settings

To see all logs clearly:
1. Run: npm run electron
2. Open DevTools (F12) in the Electron window
3. Check both main process logs (terminal) and renderer logs (DevTools console)
4. Try clicking the batch processing button
5. Watch what API calls are attempted

Debug checklist:
□ Is the preload script loading with correct config?
□ Are image processing API calls being blocked?
□ Which process is making the unwanted API calls?
□ Are there any unhandled IPC messages?
□ Is the frontend calling APIs directly?
`);

// Browser environment (renderer process)
if (typeof window !== 'undefined') {
  window.electronDebug = {
    logApiCall: (endpoint, method, blocked = false) => {
      const status = blocked ? '🚫 BLOCKED' : '✅ ALLOWED';
      console.log(`🌐 ${status} API Call: ${method} ${endpoint}`);
    },
    
    logIpcCall: (channel, data) => {
      console.log(`📡 IPC Call: ${channel}`, data);
    },
    
    checkConfig: () => {
      if (window.electronAPI?.config) {
        console.log('📋 Current Configuration:', window.electronAPI.config);
        console.log('🚫 Image API Enabled:', window.electronAPI.config.enableImageProcessingAPI);
        console.log('✅ Excel API Enabled:', window.electronAPI.config.enableExcelAPI);
      } else {
        console.log('❌ No electronAPI config found');
      }
    }
  };
  
  // Auto-check config when page loads
  setTimeout(() => {
    if (window.electronDebug) {
      window.electronDebug.checkConfig();
    }
  }, 1000);
} 