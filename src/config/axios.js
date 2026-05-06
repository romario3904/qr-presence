// src/config/axios.js
import axios from 'axios'

const normalizeBase = (url) => (url ? url.replace(/\/+$/, '') : url)

// Vite: seules les variables préfixées par VITE_ sont exposées au front.
// Fallback: garder l'API Render si la variable n'est pas définie.
const API_ORIGIN = normalizeBase(import.meta.env.VITE_API_URL) || 'https://qr-presence-api.onrender.com'
const API_BASE_URL = `${API_ORIGIN}/api`

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercepteur pour les requêtes
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    if (userData.role) {
      config.headers['X-User-Role'] = userData.role
    }

    console.log(`🔄 API Call: ${config.method?.toUpperCase()} ${config.url}`)

    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Intercepteur pour les réponses
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Token invalide ou expiré - Redirection vers la page de connexion')
      localStorage.removeItem('token')
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')

      const currentPath = window.location.hash || '#/'
      const loginPaths = ['/login', '#/login']
      const isAlreadyOnLoginPage = loginPaths.some(path => currentPath.includes(path))

      if (!isAlreadyOnLoginPage) {
        setTimeout(() => {
          window.location.hash = '#/login?redirect=' + encodeURIComponent(currentPath)
        }, 100)
      }
    }

    if (error.response?.status === 403) {
      console.warn('⛔ Accès refusé - Permissions insuffisantes')
    }

    if (!error.response) {
      console.error('📡 Erreur réseau - Vérifiez la connexion internet')
    }

    return Promise.reject(error)
  }
)

export default axiosInstance

