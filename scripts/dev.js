/**
 * Cross-platform dev runner: starts server or client with correct cwd.
 * Usage: node scripts/dev.js server | node scripts/dev.js client
 * Called by concurrently from npm run dev.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const arg = process.argv[2];
const dirName = arg === 'client' ? 'client' : arg === 'functions' ? 'functions' : 'server';
const dir = path.join(root, dirName);
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

const r = spawnSync(npm, ['run', 'dev'], {
  cwd: dir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' },
});
process.exit(r.status ?? 1);
