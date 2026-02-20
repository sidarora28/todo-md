/**
 * Structured logger for ToDo.md backend.
 * Prefixes messages with ISO timestamp and level for easier debugging in Vercel logs.
 */

const LEVELS = { error: 'ERROR', warn: 'WARN', info: 'INFO' };

function format(level, msg, ...args) {
  const ts = new Date().toISOString();
  return [`[${ts}] ${LEVELS[level]} ${msg}`, ...args];
}

const log = {
  info:  (msg, ...args) => console.log(...format('info', msg, ...args)),
  warn:  (msg, ...args) => console.warn(...format('warn', msg, ...args)),
  error: (msg, ...args) => console.error(...format('error', msg, ...args)),
};

module.exports = { log };
