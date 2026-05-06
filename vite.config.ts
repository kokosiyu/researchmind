import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

const backendPort = process.env.BACKEND_PORT || '5000';
const backendTarget = `http://localhost:${backendPort}`;

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        timeout: 600000
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
