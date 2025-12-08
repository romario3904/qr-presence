import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration pour Vite - Accès mobile activé
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',  // IMPORTANT: Permet l'accès depuis le réseau local
    open: false,       // Désactiver l'ouverture automatique
    strictPort: true,  // Forcer le port 3000
    cors: true,        // Activer CORS pour le développement
    hmr: {
      host: 'localhost', // Hot Module Replacement sur localhost
      protocol: 'ws'
    },
    watch: {
      usePolling: true // Meilleure détection des changements
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.43.78',
      '.local' // Tous les domaines .local
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser'
  },
  publicDir: 'public',
  base: '/',
  preview: {
    port: 3000,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})