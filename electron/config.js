/**
 * Config system for ToDo.md desktop app.
 * Replaces .env — stores settings in the OS-standard config location:
 *   Mac:    ~/Library/Application Support/todo-md/config.json
 *   Win:    %APPDATA%/todo-md/config.json
 *   Linux:  ~/.config/todo-md/config.json
 */

const fs = require('fs');
const path = require('path');

let configPath = null;
let cachedConfig = null;

const DEFAULTS = {
  dataDir: null,         // User picks on first launch
  llmProvider: null,     // openai | anthropic | openrouter
  llmApiKey: null,
  llmModel: null,
  theme: 'dark',
  editorFontSize: 14,
  editorFontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
  editorWordWrap: 'on',
  launchOnStartup: false,
  autoUpdate: true,
  windowBounds: null     // { x, y, width, height }
};

/**
 * Initialize the config system. Must be called after app.getPath('userData') is available.
 * @param {string} userDataPath - Electron's app.getPath('userData')
 */
function init(userDataPath) {
  configPath = path.join(userDataPath, 'config.json');
  cachedConfig = null;
}

/**
 * Read all config values.
 */
function getAll() {
  if (cachedConfig) return cachedConfig;

  if (!configPath) {
    throw new Error('Config not initialized. Call config.init() first.');
  }

  let stored = {};
  if (fs.existsSync(configPath)) {
    try {
      stored = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error('Failed to parse config.json, using defaults:', e.message);
      stored = {};
    }
  }

  cachedConfig = { ...DEFAULTS, ...stored };
  return cachedConfig;
}

/**
 * Get a single config value.
 */
function get(key) {
  return getAll()[key];
}

/**
 * Set one or more config values and persist to disk.
 */
function set(updates) {
  const current = getAll();
  Object.assign(current, updates);
  cachedConfig = current;

  // Ensure directory exists
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
  return current;
}

/**
 * Check if initial setup is needed (no data directory configured).
 */
function needsSetup() {
  const config = getAll();
  return !config.dataDir || !fs.existsSync(config.dataDir);
}

/**
 * Get the data directory path.
 */
function getDataDir() {
  return get('dataDir');
}

/**
 * Build the environment variables that server.js expects from .env,
 * using our config values instead.
 */
function getServerEnv() {
  const config = getAll();
  const env = {};

  if (config.llmApiKey) {
    env.LLM_API_KEY = config.llmApiKey;
  }
  if (config.llmProvider) {
    env.LLM_PROVIDER = config.llmProvider;
  }
  if (config.llmModel) {
    env.LLM_MODEL = config.llmModel;
  }

  return env;
}

module.exports = {
  init,
  getAll,
  get,
  set,
  needsSetup,
  getDataDir,
  getServerEnv,
  DEFAULTS
};
