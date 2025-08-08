import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';

// Initialize electron store for persistent data
const store = new Store();

const isDev = process.env.ELECTRON_IS_DEV === 'true';

let mainWindow: BrowserWindow;

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

// IPC handlers
ipcMain.handle('select-images', selectImages);
ipcMain.handle('select-directory', selectDirectory);
ipcMain.handle('save-csv', saveCsv);
ipcMain.handle('save-log-csv', saveLogCsv);
ipcMain.handle('get-app-data', getAppData);
ipcMain.handle('set-app-data', setAppData);
ipcMain.handle('read-directory', readDirectory);

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
app.whenReady().then(() => {
  createWindow();

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

// Security: Prevent new window creation (updated for newer Electron)
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}); 