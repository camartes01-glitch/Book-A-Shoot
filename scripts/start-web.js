/**
 * start-web.js
 *
 * Ensures NODE_ENV and BABEL_ENV are explicitly set to "development" before
 * launching the Expo Metro dev server.
 *
 * When NODE_ENV is externally set to "production" in the shell environment,
 * Metro's development bundler shims `react.production.js` with `empty-module.js`,
 * causing Node SSR to evaluate `require('react')` as an empty object `{}` and throwing:
 * `TypeError: React.default.createContext is not a function` at Module._compile.
 */

process.env.NODE_ENV = 'development';
process.env.BABEL_ENV = 'development';

const { spawn } = require('child_process');
const path = require('path');

const cliPath = path.resolve(__dirname, '../node_modules/expo/bin/cli');

const child = spawn(
  process.execPath,
  [
    '--max-old-space-size=4096',
    cliPath,
    'start',
    '--web',
    '--port',
    '43158',
    '--host',
    'lan',
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      BABEL_ENV: 'development',
    },
  }
);

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
