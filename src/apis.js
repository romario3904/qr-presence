// apis.js
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://qr-presence-api.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 15000
})

// Configuration des tentatives de reconnection
const MAX_RETRIES = 2
const RETRY_DELAY = 1000

// Fonction pour retenter une requête
const retryRequest = async (error, retryCount = 0) => {
  if (retryCount >= MAX_RETRIES) {
    throw error
  }

  // Ne retenter que pour les erreurs réseau/timeout
  const shouldRetry = 
    error.code === 'ECONNABORTED' || // Timeout
    error.code === 'ERR_NETWORK' || // Erreur réseau
    error.response?.status === 429 || // Trop de requêtes
    error.response?.status === 500 || // Erreur serveur
    error.response?.status === 502 || // Bad Gateway
    error.response?.status === 503 || // Service indisponible
    error.response?.status === 504   // Gateway Timeout

  if (!shouldRetry) {
    throw error
  }

  // Attendre avant de réessayer (délai exponentiel)
  const delay = RETRY_DELAY * Math.pow(2, retryCount)
  console.log(`🔄 Tentative ${retryCount + 1}/${MAX_RETRIES} dans ${delay}ms...`)
  
  await new Promise(resolve => setTimeout(resolve, delay))
  
  // Vérifier que error.config existe avant de réessayer
  if (!error.config) {
    throw error
  }
  
  // Marquer la requête comme étant un retry pour éviter la récursion infinie
  error.config._retryCount = retryCount + 1
  
  try {
    return await api.request(error.config)
  } catch (retryError) {
    // Si le retry échoue, réessayer avec un compteur incrémenté
    if (retryError.config && retryError.config._retryCount < MAX_RETRIES) {
      return await retryRequest(retryError, retryError.config._retryCount)
    }
    throw retryError
  }
}

// Intercepteur pour ajouter le token aux requêtes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Empêcher le cache pour les requêtes GET
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    return config
  },
  (error) => {
    console.error('❌ Erreur configuration requête:', error)
    return Promise.reject(error)
  }
)

// Intercepteur pour les réponses avec gestion des retry
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    // Gestion des retry
    if (error.config && !error.config._retryCount) {
      error.config._retryCount = 0
      try {
        return await retryRequest(error, 0)
      } catch (retryError) {
        error = retryError
      }
    }
    
    // Gestion des erreurs spécifiques
    if (error.response) {
      const status = error.response.status
      
      switch (status) {
        case 401:
          console.log('🔐 Token expiré, déconnexion...')
          localStorage.removeItem('token')
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          
          // Rediriger vers la page de login
          if (!window.location.hash.includes('login')) {
            setTimeout(() => {
              window.location.hash = '#/login'
            }, 1000)
          }
          break
          
        case 403:
          error.message = error.response.data?.message || 'Accès refusé'
          error.isForbidden = true
          break
          
        case 404:
          // Pour les routes /presence/student, ne pas considérer comme une erreur grave
          if (error.config?.url?.includes('/presence/student')) {
            error.isNoData = true
            error.message = 'Aucune présence enregistrée'
            error.response.data = { success: true, presences: [] }
            return Promise.resolve(error.response)
          }
          break
          
        case 400:
          // Corriger les URLs mal formées
          if (error.config?.url?.includes('student_400')) {
            const correctedUrl = error.config.url.replace('student_400', 'student')
            console.log(`🔄 Correction URL: ${error.config.url} -> ${correctedUrl}`)
            error.config.url = correctedUrl
            return api.request(error.config)
          }
          break
      }
    } else if (!error.response && error.code === 'ERR_NETWORK') {
      error.message = 'Serveur inaccessible. Vérifiez que le backend est démarré.'
      error.isNetworkError = true
    }
    
    return Promise.reject(error)
  }
)

// Fonctions API spécifiques
export const apiHelper = {
  // ==================== PRÉSENCES ÉTUDIANT ====================
  async getStudentPresences() {
    try {
      console.log('🔍 Récupération des présences étudiant...')
      const response = await api.get('/qr/presence/student')
      console.log('✅ Présences récupérées:', response?.data)
      return response?.data
    } catch (error) {
      console.error('❌ Erreur récupération présences:', error.message)
      
      // Si c'est une erreur 404 (aucune donnée), retourner tableau vide
      if (error.isNoData || error.response?.status === 404) {
        return { success: true, presences: [] }
      }
      
      throw error
    }
  },
  
  async getStudentPresencesById(studentId) {
    try {
      console.log(`🔍 Récupération présences étudiant ID: ${studentId}`)
      const response = await api.get(`/qr/presence/student/${studentId}`)
      return response.data
    } catch (error) {
      console.error(`❌ Erreur récupération présences ID ${studentId}:`, error.message)
      
      // Si c'est une erreur 404 (aucune donnée), retourner tableau vide
      if (error.response?.status === 404) {
        return { success: true, presences: [] }
      }
      
      throw error
    }
  },
  
  // ==================== QR CODES ====================
  async generateQRCode(data) {
    try {
      console.log('🎫 Génération QR code...')
      const response = await api.post('/qr/generate', data)
      console.log('✅ QR code généré:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erreur génération QR code:', error.message)
      throw error
    }
  },
  
  async verifyQRCode(qrToken) {
    try {
      console.log('🔍 Vérification QR code...')
      const response = await api.post('/qr/verify', { qr_token: qrToken })
      console.log('✅ QR code vérifié:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erreur vérification QR code:', error.message)
      throw error
    }
  },
  
  async scanQRCode(scanData) {
    try {
      console.log('📱 Scan QR code...')
      const response = await api.post('/qr/scan', scanData)
      console.log('✅ QR code scanné:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erreur scan QR code:', error.message)
      throw error
    }
  },
  
  // ==================== ENSEIGNANTS ====================
  async getTeacherSeances() {
    try {
      console.log('📅 Récupération séances enseignant...')
      const response = await api.get('/qr/seances')
      console.log('✅ Séances récupérées:', response.data?.seances?.length || 0)
      return response.data
    } catch (error) {
      console.error('❌ Erreur récupération séances:', error.message)
      throw error
    }
  },
  
  async getTeacherMatieres() {
    try {
      console.log('📚 Récupération matières enseignant...')
      const response = await api.get('/matiere')
      console.log('✅ Matières récupérées:', response.data?.matieres?.length || 0)
      return response.data
    } catch (error) {
      console.error('❌ Erreur récupération matières:', error.message)
      throw error
    }
  },
  
  // ==================== UTILITAIRES ====================
  async checkServerHealth() {
    try {
      const response = await api.get('/health', { timeout: 5000 })
      return { status: 'online', data: response.data }
    } catch (error) {
      return { status: 'offline', error: error.message }
    }
  },
  
  async checkConnectivity() {
    try {
      await api.get('/health', { timeout: 3000 })
      return { connected: true }
    } catch (error) {
      return { 
        connected: false, 
        error: error.message
      }
    }
  },
  
  // Méthodes HTTP génériques
  async get(url, config = {}) {
    try {
      const response = await api.get(url, config)
      return response.data
    } catch (error) {
      console.error(`❌ GET ${url} failed:`, error.message)
      throw error
    }
  },
  
  async post(url, data, config = {}) {
    try {
      const response = await api.post(url, data, config)
      return response.data
    } catch (error) {
      console.error(`❌ POST ${url} failed:`, error.message)
      throw error
    }
  },
  
  async put(url, data, config = {}) {
    try {
      const response = await api.put(url, data, config)
      return response.data
    } catch (error) {
      console.error(`❌ PUT ${url} failed:`, error.message)
      throw error
    }
  },
  
  async delete(url, config = {}) {
    try {
      const response = await api.delete(url, config)
      return response.data
    } catch (error) {
      console.error(`❌ DELETE ${url} failed:`, error.message)
      throw error
    }
  }
}

export default api

