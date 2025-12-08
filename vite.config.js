import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: false,
    strictPort: true,
    cors: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws'
    },
    watch: {
      usePolling: true
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.43.78',
      '.local'
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['bootstrap', 'react-bootstrap', 'react-icons'],
          charts: ['recharts'],
          utils: ['axios', 'qrcode', 'jspdf']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  publicDir: 'public',
  base: '/',
  preview: {
    port: 3000,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['html5-qrcode']
  }
})