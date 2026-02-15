/**
 * ToDo.md Desktop App — Electron Main Process
 *
 * Embeds the Express server and loads the IDE in a BrowserWindow.
 * Separates app code from user data via DATA_DIR.
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { buildMenu } = require('./menu');
const { initAutoUpdater, checkForUpdates } = require('./updater');

// Set the app name (shows in macOS menu bar during development)
app.name = 'ToDo.md';

// Keep references so they don't get garbage collected
let mainWindow = null;
let setupWindow = null;
let settingsWindow = null;
let server = null;
let serverPort = null;

// Determine the app root directory (where server.js, ide.html, etc. live)
// In development: project root. In production: inside the app.asar archive.
const APP_ROOT = path.join(__dirname, '..');

// ─── App Lifecycle ───────────────────────────────────────────────

app.whenReady().then(async () => {
  // Initialize config system with Electron's per-user data path
  config.init(app.getPath('userData'));

  if (config.needsSetup()) {
    showSetupWindow();
  } else {
    await startApp();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (config.needsSetup()) {
      showSetupWindow();
    } else {
      startApp();
    }
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
    server = null;
  }
});

// ─── Setup Window (first launch) ────────────────────────────────

function showSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 560,
    height: 480,
    resizable: false,
    maximizable: false,
    title: 'ToDo.md — Setup',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  setupWindow.loadFile(path.join(__dirname, 'setup.html'));
  setupWindow.setMenu(null);

  setupWindow.on('closed', () => {
    setupWindow = null;
    // If user closed setup without completing it, quit
    if (config.needsSetup()) {
      app.quit();
    }
  });
}

// ─── Settings Window ────────────────────────────────────────────

function showSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: true,
    title: 'ToDo.md — Settings',
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.setMenu(null);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ─── Start the App ──────────────────────────────────────────────

async function startApp() {
  try {
    serverPort = await startServer();
    createMainWindow();
    Menu.setApplicationMenu(buildMenu(app, mainWindow, showSettingsWindow));

    // Check for updates (if enabled)
    if (config.get('autoUpdate') !== false) {
      initAutoUpdater(mainWindow);
      checkForUpdates();
    }
  } catch (err) {
    dialog.showErrorBox('ToDo.md — Startup Error',
      `Failed to start the server:\n\n${err.message}\n\nPlease check your settings and try again.`);
    app.quit();
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    const dataDir = config.getDataDir();

    // Inject DATA_DIR and LLM config into the environment before loading server.js
    process.env.DATA_DIR = dataDir;
    process.env.PORT = '0'; // Let OS pick an available port

    // Inject LLM config from our settings
    const serverEnv = config.getServerEnv();
    Object.assign(process.env, serverEnv);

    // Set APP_ROOT so server.js knows where to serve static files from
    process.env.APP_ROOT = APP_ROOT;

    try {
      // Clear require cache so server.js picks up new env vars if restarted
      delete require.cache[require.resolve(path.join(APP_ROOT, 'server.js'))];

      const serverModule = require(path.join(APP_ROOT, 'server.js'));

      // server.js exports an http.Server instance.
      // It may still be binding (PORT=0), so wait for the 'listening' event.
      if (serverModule && typeof serverModule.address === 'function') {
        const addr = serverModule.address();
        if (addr) {
          // Already listening
          serverPort = addr.port;
          server = serverModule;
          console.log(`Server started on port ${serverPort}`);
          resolve(serverPort);
        } else {
          // Not yet listening — wait for it
          serverModule.on('listening', () => {
            serverPort = serverModule.address().port;
            server = serverModule;
            console.log(`Server started on port ${serverPort}`);
            resolve(serverPort);
          });
          serverModule.on('error', (err) => {
            reject(err);
          });
        }
      } else {
        reject(new Error('Server did not start properly. Is server.js updated for desktop mode?'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

function createMainWindow() {
  const bounds = config.get('windowBounds') || { width: 1400, height: 900 };

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    title: 'ToDo.md',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(`http://localhost:${serverPort}/ide.html`);

  // Save window position/size on close
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    config.set({ windowBounds: bounds });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// ─── IPC Handlers ───────────────────────────────────────────────

// Setup: pick data folder
ipcMain.handle('pick-data-folder', async () => {
  const window = setupWindow || mainWindow;
  const result = await dialog.showOpenDialog(window, {
    title: 'Choose where to store your ToDo.md files',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use This Folder'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// Setup: save initial config and start the app
ipcMain.handle('complete-setup', async (event, setupData) => {
  const { dataDir, llmApiKey, llmProvider, llmModel } = setupData;

  // Ensure required directories exist in the data folder
  const dirs = ['projects', 'daily', 'inbox'];
  for (const dir of dirs) {
    const dirPath = path.join(dataDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Create default files if they don't exist
  const defaultFiles = {
    'inbox.md': '# Inbox\n\nCapture quick ideas here.\n',
    'tasks.md': '# Quick Tasks\n\nAdd tasks here and they\'ll be synced to your projects.\n',
    'HOWTOUSE.md': fs.existsSync(path.join(APP_ROOT, 'HOWTOUSE.md'))
      ? fs.readFileSync(path.join(APP_ROOT, 'HOWTOUSE.md'), 'utf8')
      : '# How to Use ToDo.md\n\nSee the documentation at https://github.com/sidarora28/todo-md\n'
  };

  for (const [file, content] of Object.entries(defaultFiles)) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
    }
  }

  // Save config
  config.set({
    dataDir,
    llmApiKey: llmApiKey || null,
    llmProvider: llmProvider || null,
    llmModel: llmModel || null
  });

  // Close setup window and start the main app
  if (setupWindow) {
    setupWindow.close();
  }

  await startApp();
  return true;
});

// Settings: get all config
ipcMain.handle('get-config', () => {
  return config.getAll();
});

// Settings: update config
ipcMain.handle('save-config', async (event, updates) => {
  config.set(updates);

  // If LLM settings changed, update server environment
  if (updates.llmApiKey !== undefined || updates.llmProvider !== undefined || updates.llmModel !== undefined) {
    const serverEnv = config.getServerEnv();
    Object.assign(process.env, serverEnv);

    // Clear keys if removed
    if (!updates.llmApiKey) delete process.env.LLM_API_KEY;
    if (!updates.llmProvider) delete process.env.LLM_PROVIDER;
    if (!updates.llmModel) delete process.env.LLM_MODEL;
  }

  return true;
});

// Settings: change data directory
ipcMain.handle('change-data-dir', async () => {
  const result = await dialog.showOpenDialog(settingsWindow || mainWindow, {
    title: 'Choose a new data folder',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use This Folder'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// Open data folder in OS file manager
ipcMain.handle('open-data-folder', () => {
  const dataDir = config.getDataDir();
  if (dataDir) {
    shell.openPath(dataDir);
  }
});

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Expose showSettingsWindow to menu
module.exports = { showSettingsWindow };
