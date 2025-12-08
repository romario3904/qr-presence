// vite-dev-server.js - Serveur de développement avec support SPA
import { createServer } from 'vite'

const server = await createServer({
  configFile: false,
  server: {
    port: 3000,
    host: true,
    middlewareMode: true,
  },
  appType: 'spa'
})

await server.listen()

console.log('🚀 Serveur Vite démarré sur http://localhost:3000/')