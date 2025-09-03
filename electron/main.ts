import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';

// Initialize electron store for persistent data
const store = new Store();

const isDev = process.env.ELECTRON_IS_DEV === 'true';

let mainWindow: BrowserWindow;
// Use local backend for Excel functionality
const BACKEND_URL = `http://localhost:5000`;
const REMOTE_BACKEND_URL = `http://162.43.19.70`;

function createWindow(): void {
  console.log('🪟 Creating main window...');
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'AIタイトル生成システム',
    show: false // Don't show until ready
  });

  // Load the app
  if (isDev) {
    console.log('🛠️ Development mode: Loading from localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const htmlPath = path.join(__dirname, '../build/index.html');
    console.log('🏭 Production mode: Loading from', htmlPath);
    mainWindow.loadFile(htmlPath);
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('🎉 Window ready to show');
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    console.log('🚪 Main window closed');
    mainWindow = null as any;
  });

  // Create application menu
  createMenu();
}

function createMenu(): void {
  const template: any[] = [
    {
      label: 'ファイル',
      submenu: [
        {
          label: '画像を選択...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            selectImages();
          }
        },
        {
          label: 'ディレクトリを選択...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            selectDirectory();
          }
        },
        { type: 'separator' },
        {
          label: 'Excel出品データ追加',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            // This will be handled by the renderer process
            mainWindow.webContents.send('show-excel-dialog');
          }
        },
        {
          label: 'PL出品マクロ.xlsmを保存...',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            saveExcelFileAs();
          }
        },
        { type: 'separator' },
        {
          label: '終了',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '元に戻す' },
        { role: 'redo', label: 'やり直し' },
        { type: 'separator' },
        { role: 'cut', label: '切り取り' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: '貼り付け' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'forceReload', label: '強制再読み込み' },
        { role: 'toggleDevTools', label: '開発者ツール' },
        { type: 'separator' },
        { role: 'resetZoom', label: '実際のサイズ' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全画面表示' }
      ]
    },
    {
      label: 'ツール',
      submenu: [
        {
          label: 'バックエンドサーバー接続テスト',
          click: () => {
            startBackendServer();
          }
        },
        {
          label: 'バックエンドサーバー状況確認',
          click: () => {
            checkBackendStatus();
          }
        }
      ]
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'バージョン情報',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'バージョン情報',
              message: 'AIタイトル生成システム',
              detail: `バージョン: 1.0.0\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Backend server management
async function startBackendServer(): Promise<boolean> {
  // First try local backend server
  console.log('Checking local backend server...');
  const localRunning = await checkBackendHealth();
  
  if (localRunning) {
    console.log('Local backend server is accessible');
    return true;
  } else {
    console.log('Local backend server not running, attempting to start it...');
    
    // Try to start local backend server
    const { spawn } = require('child_process');
    const path = require('path');
    
    try {
      const backendPath = path.join(__dirname, '..', 'backend');
      const pythonProcess = spawn('python', ['wsgi.py'], {
        cwd: backendPath,
        detached: true,
        stdio: 'ignore'
      });
      
      // Give it a few seconds to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if it's running now
      const isNowRunning = await checkBackendHealth();
      if (isNowRunning) {
        console.log('✅ Local backend server started successfully');
        return true;
      }
    } catch (error) {
      console.error('Failed to start local backend server:', error);
    }
    
    // If local backend failed, show error
    console.error('Could not start or connect to local backend server');
    dialog.showErrorBox('Backend Server Error', 
      `Cannot start local backend server at ${BACKEND_URL}\n\n` +
      `Please make sure:\n` +
      `1. Python is installed and in PATH\n` +
      `2. Backend dependencies are installed (pip install -r requirements.txt)\n` +
      `3. You can manually run: cd backend && python wsgi.py`
    );
    return false;
  }
}

function stopBackendServer(): void {
  // Remote server - nothing to stop locally
  console.log('Using remote backend server - no local process to stop');
}

async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function checkBackendStatus(): Promise<void> {
  const isRunning = await checkBackendHealth();
  const status = isRunning ? 'バックエンドサーバーは動作中です' : 'バックエンドサーバーは停止中です';
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'サーバー状況',
    message: status,
    detail: `URL: ${BACKEND_URL}`
  });
}

// API calling functions - restricted to Excel endpoints only
async function makeApiCall(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  console.log(`🌐 API Call attempt: ${method} ${endpoint}`);
  
  // Only allow Excel-related and health check endpoints
  const allowedEndpoints = [
    '/health',
    '/excel/add-product',
    '/excel/add-products-bulk', 
    '/excel/classify-product',
    '/excel/sheet-info',
    '/excel/test-sample',
    '/excel/mapping-preview',
    '/excel/save-file',
    '/excel/file-info',
    '/excel/export-to-excel'
  ];
  
  if (!allowedEndpoints.includes(endpoint)) {
    const error = `❌ API endpoint BLOCKED: ${endpoint}`;
    console.error(error);
    console.log('📋 Allowed endpoints:', allowedEndpoints);
    throw new Error(error);
  }
  
  console.log(`✅ API endpoint ALLOWED: ${endpoint}`);
  
  try {
    const url = `${BACKEND_URL}${endpoint}`;
    console.log(`🔗 Making request to: ${url}`);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
      console.log(`📤 Request data:`, data);
    }

    console.log(`⏳ Sending ${method} request...`);
    const response = await fetch(url, options);
    console.log(`📨 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP error! status: ${response.status}, body: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ API call successful:`, result);
    return result;
  } catch (error) {
    console.error('❌ API call failed:', error);
    throw error;
  }
}

// Excel API functions
async function addProductToExcel(productData: any): Promise<any> {
  return makeApiCall('/excel/add-product', 'POST', productData);
}

async function addProductsBulk(products: any[]): Promise<any> {
  return makeApiCall('/excel/add-products-bulk', 'POST', { products });
}

async function classifyProduct(productData: any): Promise<any> {
  return makeApiCall('/excel/classify-product', 'POST', productData);
}

async function getSheetInfo(): Promise<any> {
  return makeApiCall('/excel/sheet-info', 'GET');
}

async function testSampleData(): Promise<any> {
  return makeApiCall('/excel/test-sample', 'POST');
}

async function getMappingPreview(productData: any): Promise<any> {
  return makeApiCall('/excel/mapping-preview', 'POST', productData);
}

async function getExcelFileInfo(): Promise<any> {
  return makeApiCall('/excel/file-info', 'GET');
}

async function saveExcelFile(targetPath: string): Promise<any> {
  return makeApiCall('/excel/save-file', 'POST', { target_path: targetPath });
}

async function saveExcelFileAs(): Promise<string | null> {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'PL出品マクロ.xlsmを保存',
      defaultPath: 'PL出品マクロ.xlsm',
      filters: [
        {
          name: 'Excel Macro File',
          extensions: ['xlsm']
        },
        {
          name: 'Excel File',
          extensions: ['xlsx']
        },
        {
          name: 'All Files',
          extensions: ['*']
        }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    // Call backend to save the file
    console.log(`💾 Saving Excel file to: ${result.filePath}`);
    const response = await saveExcelFile(result.filePath);
    
    if (response.success) {
      console.log(`✅ Excel file saved successfully: ${response.target_path}`);
      
      // Show success message
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '保存完了',
        message: 'Excel ファイルの保存が完了しました',
        detail: `保存場所: ${response.target_path}`
      });
      
      return response.target_path;
    } else {
      console.error(`❌ Failed to save Excel file: ${response.message}`);
      
      // Show error message
      dialog.showErrorBox('保存エラー', `Excel ファイルの保存に失敗しました:\n${response.message}`);
      
      return null;
    }
  } catch (error) {
    console.error('❌ Error saving Excel file:', error);
    
    // Show error message
    dialog.showErrorBox('保存エラー', `Excel ファイルの保存中にエラーが発生しました:\n${error}`);
    
    return null;
  }
}

// Bulk Excel export function for processed results
async function exportProcessedResultsToExcel(processedResults: any): Promise<any> {
  const itemCount = Array.isArray(processedResults) ? processedResults.length : Object.keys(processedResults).length;
  console.log(`📊 Exporting ${itemCount} processed results to Excel...`);
  
  // First check if backend is healthy
  try {
    console.log('🔍 Testing backend health before Excel export...');
    const healthCheck = await makeApiCall('/health', 'GET');
    console.log('✅ Backend health check passed:', healthCheck);
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    
    // Show user-friendly error dialog
    dialog.showErrorBox('Backend Connection Error', 
      `Cannot connect to the local backend server at ${BACKEND_URL}\n\n` +
      `Please ensure the backend server is running:\n` +
      `1. Open a terminal in the backend folder\n` +
      `2. Run: python wsgi.py\n` +
      `3. Make sure you see "Running on http://localhost:5000"\n\n` +
      `Error details: ${error}`
    );
    
    throw new Error(`Backend server is not accessible: ${error}`);
  }
  
  // Use the new export-to-excel API which handles classification and data transformation
  console.log('🔗 Calling export-to-excel endpoint...');
  return makeApiCall('/excel/export-to-excel', 'POST', { processed_results: processedResults });
}

// IPC handlers
ipcMain.handle('select-images', selectImages);
ipcMain.handle('select-directory', selectDirectory);
ipcMain.handle('save-csv', saveCsv);
ipcMain.handle('save-log-csv', saveLogCsv);
ipcMain.handle('get-app-data', getAppData);
ipcMain.handle('set-app-data', setAppData);
ipcMain.handle('read-directory', readDirectory);

// Backend API IPC handlers
ipcMain.handle('start-backend-server', async () => {
  console.log('📡 IPC: start-backend-server called');
  return await startBackendServer();
});
ipcMain.handle('stop-backend-server', () => {
  console.log('📡 IPC: stop-backend-server called');
  return stopBackendServer();
});
ipcMain.handle('check-backend-health', async () => {
  console.log('📡 IPC: check-backend-health called');
  return await checkBackendHealth();
});
ipcMain.handle('api-call', async (event, endpoint, method, data) => {
  console.log(`📡 IPC: api-call received - ${method} ${endpoint}`);
  return await makeApiCall(endpoint, method, data);
});

// Excel API IPC handlers
ipcMain.handle('excel-add-product', async (event, productData) => {
  console.log('📊 IPC: excel-add-product called');
  return await addProductToExcel(productData);
});
ipcMain.handle('excel-add-products-bulk', async (event, products) => {
  console.log('📊 IPC: excel-add-products-bulk called');
  return await addProductsBulk(products);
});
ipcMain.handle('excel-classify-product', async (event, productData) => {
  console.log('📊 IPC: excel-classify-product called');
  return await classifyProduct(productData);
});
ipcMain.handle('excel-get-sheet-info', async () => {
  console.log('📊 IPC: excel-get-sheet-info called');
  return await getSheetInfo();
});
ipcMain.handle('excel-test-sample', async () => {
  console.log('📊 IPC: excel-test-sample called');
  return await testSampleData();
});
ipcMain.handle('excel-mapping-preview', async (event, productData) => {
  console.log('📊 IPC: excel-mapping-preview called');
  return await getMappingPreview(productData);
});
ipcMain.handle('excel-export-processed-results', async (event, processedResults) => {
  console.log('📊 IPC: excel-export-processed-results called');
  return await exportProcessedResultsToExcel(processedResults);
});
ipcMain.handle('excel-get-file-info', async () => {
  console.log('📊 IPC: excel-get-file-info called');
  return await getExcelFileInfo();
});
ipcMain.handle('excel-save-file', async (event, targetPath) => {
  console.log('📊 IPC: excel-save-file called');
  return await saveExcelFile(targetPath);
});
ipcMain.handle('excel-save-file-as', async () => {
  console.log('📊 IPC: excel-save-file-as called');
  return await saveExcelFileAs();
});

async function selectImages(): Promise<string[] | null> {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '画像ファイルを選択',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: '画像ファイル',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
      },
      {
        name: 'すべてのファイル',
        extensions: ['*']
      }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths;
}

async function selectDirectory(): Promise<string | null> {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'ディレクトリを選択',
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
}

async function saveCsv(event: any, data: { content: string; filename: string; defaultPath?: string }): Promise<string | null> {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'CSVファイルを保存',
    defaultPath: data.defaultPath || data.filename,
    filters: [
      {
        name: 'CSVファイル',
        extensions: ['csv']
      }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    fs.writeFileSync(result.filePath, data.content, 'utf8');
    return result.filePath;
  } catch (error) {
    console.error('Error saving CSV:', error);
    throw error;
  }
}

async function saveLogCsv(event: any, data: { content: string; filename: string }): Promise<string | null> {
  // For log CSV, we want to append to existing file or create new one
  const defaultPath = path.join(app.getPath('documents'), 'AIタイトル生成システム', data.filename);
  
  // Ensure directory exists
  const dir = path.dirname(defaultPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    // Check if file exists to determine if we need headers
    const fileExists = fs.existsSync(defaultPath);
    
    if (fileExists) {
      // Append to existing file (skip headers)
      const lines = data.content.split('\n');
      const dataLines = lines.slice(1); // Remove header line
      fs.appendFileSync(defaultPath, '\n' + dataLines.join('\n'), 'utf8');
    } else {
      // Create new file with headers
      fs.writeFileSync(defaultPath, data.content, 'utf8');
    }
    
    return defaultPath;
  } catch (error) {
    console.error('Error saving log CSV:', error);
    throw error;
  }
}

async function getAppData(event: any, key: string): Promise<any> {
  return store.get(key);
}

async function setAppData(event: any, key: string, value: any): Promise<void> {
  store.set(key, value);
}

async function readDirectory(event: any, directoryPath: string): Promise<{ files: string[]; error?: string }> {
  try {
    if (!fs.existsSync(directoryPath)) {
      return { files: [], error: 'ディレクトリが存在しません' };
    }

    const files = fs.readdirSync(directoryPath);
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
      })
      .map(file => path.join(directoryPath, file));

    return { files: imageFiles };
  } catch (error) {
    console.error('Error reading directory:', error);
    return { files: [], error: 'ディレクトリの読み取りに失敗しました' };
  }
}

// App event listeners
app.whenReady().then(async () => {
  console.log('🚀 Electron app starting...');
  console.log('📍 Backend URL configured:', BACKEND_URL);
  console.log('🔧 Development mode:', isDev);
  
  createWindow();
  
  // Check remote backend server availability
  console.log('🔍 Checking remote backend server availability...');
  const healthStatus = await checkBackendHealth();
  console.log('❤️ Backend health status:', healthStatus);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Remote server - no cleanup needed
});

// Security: Prevent new window creation (updated for newer Electron)
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}); 