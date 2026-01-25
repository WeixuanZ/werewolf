import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

let commitHash = process.env.COMMIT_SHA || 'unknown';
let version = process.env.VERSION || '0.0.0';

if (commitHash === 'unknown' || version === '0.0.0') {
  try {
    if (commitHash === 'unknown') {
      commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    }
    if (version === '0.0.0') {
      version = execSync('git describe --tags --always').toString().trim();
    }
  } catch (e) {
    console.warn('Failed to get git info:', e);
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
});
