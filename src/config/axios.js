// src/config/axios.js
import axios from 'axios';

// Configuration d'Axios
const getApiBaseUrl = () => {
  // Méthode 1: Vérifier si c'est un environnement de développement
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'https://qr-presence-api.onrender.com/api';
  }
  // Méthode 2: Pour la production, utiliser le même domaine
  else {
    return '/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour les requêtes
axiosInstance.interceptors.request.use(
  (config) => {
    // Récupérer le token depuis localStorage
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ajouter le rôle de l'utilisateur si disponible
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.role) {
      config.headers['X-User-Role'] = userData.role;
    }
    
    console.log(`🔄 API Call: ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Gestion des erreurs d'authentification
    if (error.response?.status === 401) {
      console.warn('⚠️ Token invalide ou expiré - Redirection vers la page de connexion');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      const currentPath = window.location.hash || '#/';
      const loginPaths = ['/login', '#/login'];
      const isAlreadyOnLoginPage = loginPaths.some(path => currentPath.includes(path));
      
      if (!isAlreadyOnLoginPage) {
        setTimeout(() => {
          window.location.hash = '#/login?redirect=' + encodeURIComponent(currentPath);
        }, 100);
      }
    }
    
    // Gestion des erreurs de permission (403)
    if (error.response?.status === 403) {
      console.warn('⛔ Accès refusé - Permissions insuffisantes');
    }
    
    // Gestion des erreurs réseau
    if (!error.response) {
      console.error('📡 Erreur réseau - Vérifiez la connexion internet');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

