const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectImages: () => ipcRenderer.invoke('select-images'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveCsv: (data) => ipcRenderer.invoke('save-csv', data),
  saveLogCsv: (data) => ipcRenderer.invoke('save-log-csv', data),
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  
  // Data persistence
  getAppData: (key) => ipcRenderer.invoke('get-app-data', key),
  setAppData: (key, value) => ipcRenderer.invoke('set-app-data', key, value),
  
  // System info
  isElectron: true,
  platform: process.platform
}); 