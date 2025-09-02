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
  
  // Backend server management
  startBackendServer: () => ipcRenderer.invoke('start-backend-server'),
  stopBackendServer: () => ipcRenderer.invoke('stop-backend-server'),
  checkBackendHealth: () => ipcRenderer.invoke('check-backend-health'),
  
  // Generic API calling
  apiCall: (endpoint, method = 'GET', data) => ipcRenderer.invoke('api-call', endpoint, method, data),
  
  // Excel API functions
  excel: {
    addProduct: (productData) => ipcRenderer.invoke('excel-add-product', productData),
    addProductsBulk: (products) => ipcRenderer.invoke('excel-add-products-bulk', products),
    classifyProduct: (productData) => ipcRenderer.invoke('excel-classify-product', productData),
    getSheetInfo: () => ipcRenderer.invoke('excel-get-sheet-info'),
    testSample: () => ipcRenderer.invoke('excel-test-sample'),
    getMappingPreview: (productData) => ipcRenderer.invoke('excel-mapping-preview', productData)
  },
  
  // Event listeners for renderer process
  onShowExcelDialog: (callback) => {
    ipcRenderer.on('show-excel-dialog', callback);
  },
  
  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // System info
  isElectron: true,
  platform: process.platform
}); 