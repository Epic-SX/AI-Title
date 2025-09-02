import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { spawn, ChildProcess } from 'child_process';

// Initialize electron store for persistent data
const store = new Store();

const isDev = process.env.ELECTRON_IS_DEV === 'true';

let mainWindow: BrowserWindow;
let backendProcess: ChildProcess | null = null;
const BACKEND_PORT = 5000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

function createWindow(): void {
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
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
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
          label: 'バックエンドサーバー開始',
          click: () => {
            startBackendServer();
          }
        },
        {
          label: 'バックエンドサーバー停止',
          click: () => {
            stopBackendServer();
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
  if (backendProcess) {
    console.log('Backend server is already running');
    return true;
  }

  try {
    const backendPath = path.join(__dirname, '..', 'backend');
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    
    console.log('Starting backend server...');
    backendProcess = spawn(pythonExecutable, ['wsgi.py'], {
      cwd: backendPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    backendProcess.stdout?.on('data', (data) => {
      console.log(`Backend stdout: ${data}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      console.error(`Backend stderr: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const isRunning = await checkBackendHealth();
    if (isRunning) {
      console.log('Backend server started successfully');
      return true;
    } else {
      console.error('Backend server failed to start');
      stopBackendServer();
      return false;
    }
  } catch (error) {
    console.error('Error starting backend server:', error);
    return false;
  }
}

function stopBackendServer(): void {
  if (backendProcess) {
    console.log('Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
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

// API calling functions
async function makeApiCall(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  try {
    const url = `${BACKEND_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
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

// IPC handlers
ipcMain.handle('select-images', selectImages);
ipcMain.handle('select-directory', selectDirectory);
ipcMain.handle('save-csv', saveCsv);
ipcMain.handle('save-log-csv', saveLogCsv);
ipcMain.handle('get-app-data', getAppData);
ipcMain.handle('set-app-data', setAppData);
ipcMain.handle('read-directory', readDirectory);

// Backend API IPC handlers
ipcMain.handle('start-backend-server', startBackendServer);
ipcMain.handle('stop-backend-server', stopBackendServer);
ipcMain.handle('check-backend-health', checkBackendHealth);
ipcMain.handle('api-call', (event, endpoint, method, data) => makeApiCall(endpoint, method, data));

// Excel API IPC handlers
ipcMain.handle('excel-add-product', (event, productData) => addProductToExcel(productData));
ipcMain.handle('excel-add-products-bulk', (event, products) => addProductsBulk(products));
ipcMain.handle('excel-classify-product', (event, productData) => classifyProduct(productData));
ipcMain.handle('excel-get-sheet-info', getSheetInfo);
ipcMain.handle('excel-test-sample', testSampleData);
ipcMain.handle('excel-mapping-preview', (event, productData) => getMappingPreview(productData));

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
  createWindow();
  
  // Auto-start backend server in production
  if (!isDev) {
    console.log('Auto-starting backend server...');
    await startBackendServer();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackendServer(); // Clean up backend process
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackendServer(); // Ensure backend is stopped when app quits
});

// Security: Prevent new window creation (updated for newer Electron)
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}); 