/**
 * Preload script — exposes a safe IPC bridge to the renderer (frontend).
 * Used by setup.html, settings.html, and ide.html.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('todomd', {
  // Setup
  pickDataFolder: () => ipcRenderer.invoke('pick-data-folder'),
  completeSetup: (data) => ipcRenderer.invoke('complete-setup', data),

  // Settings
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (updates) => ipcRenderer.invoke('save-config', updates),
  changeDataDir: () => ipcRenderer.invoke('change-data-dir'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Check if we're running in Electron
  isElectron: true
});
