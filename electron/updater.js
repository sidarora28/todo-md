/**
 * Auto-update support for ToDo.md desktop app.
 * Uses electron-updater to check GitHub Releases.
 */

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

let mainWindow = null;

function initAutoUpdater(window) {
  mainWindow = window;

  // Don't auto-download — let user decide
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available.`,
      detail: 'Would you like to download it now? The update will be installed when you restart the app.',
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. It will be installed when you restart the app.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err.message);
    // Silently fail — don't bother the user
  });
}

function checkForUpdates() {
  try {
    autoUpdater.checkForUpdates();
  } catch (err) {
    console.error('Failed to check for updates:', err.message);
  }
}

module.exports = { initAutoUpdater, checkForUpdates };
