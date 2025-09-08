const { contextBridge, ipcRenderer } = require('electron');

console.log('🔌 PRELOAD: Script loading...');

// Override console methods to add better tracking
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  const stack = new Error().stack;
  if (args[0] && typeof args[0] === 'string' && args[0].includes('API')) {
    originalLog.apply(console, ['🔍 PRELOAD CONSOLE:', ...args]);
    if (stack) {
      originalLog.apply(console, ['📍 Call Stack:', stack.split('\n').slice(0, 5).join('\n')]);
    }
  } else {
    originalLog.apply(console, args);
  }
};

console.error = function(...args) {
  originalError.apply(console, ['🚨 PRELOAD ERROR:', ...args]);
  const stack = new Error().stack;
  if (stack) {
    originalError.apply(console, ['📍 Error Stack:', stack.split('\n').slice(0, 5).join('\n')]);
  }
};

// Override fetch to intercept and block image processing API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const urlString = typeof url === 'string' ? url : url.toString();
  
  // Block image processing API calls
  if (urlString.includes('/api/generate-title') || 
      urlString.includes('/process-images') ||
      urlString.includes('/api/process-image') ||
      urlString.includes('/api/analyze-image')) {
    
    console.warn(`🚫 PRELOAD: Blocked image processing API call to: ${urlString}`);
    console.log('📍 Call stack:', new Error().stack?.split('\n').slice(0, 5).join('\n'));
    
    // Extract request data if available for local processing
    let requestData = null;
    try {
      if (args[1] && args[1].body) {
        requestData = JSON.parse(args[1].body);
      }
    } catch (e) {
      console.log('Could not parse request data for local processing');
    }
    
    // Generate a realistic mock response structure based on the expected API response
    const mockResponse = {
      status: 'success',
      message: 'Processed locally (API calls blocked)',
      raw_response: {
        title: `ローカル処理済み商品 ${requestData?.product_id || Date.now()}`,
        brand: requestData?.brand || '不明',
        color: requestData?.color || '不明', 
        product_type: requestData?.product_type || '不明',
        material: requestData?.material || '不明',
        size: requestData?.size || '不明',
        key_features: ['ローカル処理済み', 'API無効化'],
        accessories: '不明',
        tailoring_storage: '不明',
        remaining_fabric: '不明'
      },
      title_validation: {
        is_valid: true,
        current_length: 50,
        max_length: 120,
        over_limit_by: 0,
        has_management_number: false,
        marketplace: 'local',
        validation_issues: []
      },
      data_quality: {
        quality_score: 50,
        max_score: 100,
        grade: 'C',
        grade_description: 'ローカル処理',
        completion_rate: '50%',
        issues: ['リモートAPI無効化のため限定的な処理'],
        recommendations: ['詳細な商品情報を手動で入力してください'],
        field_completeness: {
          title: true,
          brand: false,
          product_type: false,
          color: false,
          size: false,
          material: false
        }
      },
      marketplace_variants: {},
      processed_locally: true,
      blocked_api_call: urlString
    };
    
    console.log(`🖼️ PRELOAD: Returning mock response for blocked API call`);
    return Promise.resolve(new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  
  // Allow other API calls to proceed
  console.log(`🔍 PRELOAD: Allowing fetch call to: ${urlString}`);
  return originalFetch.apply(this, args);
};

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
  checkBackendHealth: () => ipcRenderer.invoke('check-backend-health'),
  
  // Excel API integration
  excel: {
    getSheetInfo: () => ipcRenderer.invoke('excel-get-sheet-info'),
    classifyProduct: (productData) => ipcRenderer.invoke('excel-classify-product', productData),
    addProduct: (productData) => ipcRenderer.invoke('excel-add-product', productData),
    testSample: () => ipcRenderer.invoke('excel-test-sample'),
    getMappingPreview: (productData) => ipcRenderer.invoke('excel-get-mapping-preview', productData),
    downloadUpdatedFile: () => ipcRenderer.invoke('excel-download-updated-file'),
    cleanupCopy: () => ipcRenderer.invoke('excel-cleanup-copy'),
    refreshCopy: () => ipcRenderer.invoke('excel-refresh-copy'),
    overwriteOriginal: () => ipcRenderer.invoke('excel-overwrite-original')
  },
  
  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Helper functions
  shouldUseRemoteImageProcessing: () => {
    return false; // Always use local image processing
  },
  
  // System info
  isElectron: true,
  platform: process.platform,
  
  // Local image processing fallback
  processImagesLocally: async (imageData) => {
    console.log('🖼️ PRELOAD: Processing images locally (fallback)');
    
    // Basic local processing - extract some info from filenames/data
    const results = [];
    const images = Array.isArray(imageData.product_images) ? imageData.product_images : [imageData.product_images];
    
    for (let i = 0; i < images.length; i++) {
      // Create a basic mock result for each image
      const basicResult = {
        status: 'success',
        title: `Local Processed Product ${imageData.product_id || Date.now()}_${i + 1}`,
        brand: imageData.brand || '不明',
        color: imageData.color || '不明',
        product_type: imageData.product_type || '不明',
        material: imageData.material || '不明', 
        size: imageData.size || '不明',
        key_features: ['ローカル処理済み'],
        raw_response: {
          title: `Local Processed Product ${imageData.product_id || Date.now()}_${i + 1}`,
          brand: imageData.brand || '不明',
          color: imageData.color || '不明',
          product_type: imageData.product_type || '不明',
          material: imageData.material || '不明',
          size: imageData.size || '不明',
          key_features: ['ローカル処理済み']
        },
        processed_locally: true,
        processing_time: Date.now()
      };
      
      results.push(basicResult);
    }
    
    return {
      status: 'success',
      message: 'Images processed locally',
      results: results,
      processed_locally: true
    };
  },

  // Configuration flags
  config: {
    enableImageProcessingAPI: false,  // Disable image processing API calls
    backendUrl: 'http://162.43.19.70', // Remote backend URL
    useLocalImageProcessing: true     // Use local image processing instead
  }
});

console.log('✅ PRELOAD: electronAPI exposed to window');
console.log('📋 PRELOAD: Configuration set:');
console.log('  - enableImageProcessingAPI:', false);
console.log('  - backendUrl:', 'http://162.43.19.70');
console.log('  - useLocalImageProcessing:', true);
console.log('🚫 PRELOAD: Image processing API calls will be BLOCKED');
console.log('🖼️ PRELOAD: Local image processing fallback enabled');
console.log('🚀 PRELOAD: Ready for renderer process');

// Add a global notification about the blocking
setTimeout(() => {
  console.log('%c🚫 IMAGE API BLOCKING ACTIVE 🚫', 'color: red; font-weight: bold; font-size: 16px;');
  console.log('%cAll image processing API calls will be intercepted and blocked.', 'color: orange; font-weight: bold;');
  console.log('%cLocal processing fallback is enabled for basic functionality.', 'color: blue; font-weight: bold;');
  console.log('%cTo debug: Use window.electronAPI.config to check settings', 'color: green;');
}, 1000); 