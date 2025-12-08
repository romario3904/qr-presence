import { useState, useEffect, Component } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import './App.css'

// Import des composants
import Login from './components/Login'
import Register from './components/Register'
import CustomNavbar from './components/Navbar'
import QrScanner from './components/QrScanner'
import Dashboard from './components/Dashboard'
import StudentPresencePage from './components/StudentPresencePage'
import TeacherManagementPage from './components/TeacherManagementPage'

// IMPORT CORRIGÉ : Import conditionnel pour éviter l'erreur 500
import { lazy, Suspense } from 'react'

// Composant de chargement
const LoadingFallback = () => (
  <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
    <div className="text-center">
      <div className="spinner-border text-info" role="status">
        <span className="visually-hidden">Chargement...</span>
      </div>
      <p className="mt-3 text-muted">Chargement du module...</p>
    </div>
  </Container>
)

// Import paresseux pour éviter les erreurs de chargement
const MatiereManagementPage = lazy(() => import('./components/MatiereManagementPage')
  .catch((error) => {
    console.error('Erreur de chargement de MatiereManagementPage:', error)
    // Retourner un composant de secours
    return { 
      default: () => (
        <Container className="my-5">
          <div className="alert alert-warning">
            <h4>Module indisponible</h4>
            <p>La page de gestion des matières est temporairement indisponible.</p>
            <a href="#/dashboard" className="btn btn-primary">
              Retour au tableau de bord
            </a>
          </div>
        </Container>
      )
    }
  })
)

// Fonction utilitaire pour les messages d'erreur
export const getApiErrorMessage = (error, fallbackMessage = 'Une erreur inattendue est survenue') => {
  if (error?.response) {
    const apiMessage = error.response.data?.message
    const validationErrors = error.response.data?.errors

    if (apiMessage) {
      return apiMessage
    }

    if (validationErrors) {
      const firstErrorKey = Object.keys(validationErrors)[0]
      if (firstErrorKey) {
        return validationErrors[firstErrorKey]
      }
    }

    return fallbackMessage
  }

  if (error?.request) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.'
  }

  return fallbackMessage
}

// Error Boundary pour capturer les erreurs React
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erreur React:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="my-5">
          <div className="alert alert-danger">
            <h4>Une erreur s'est produite</h4>
            <p className="text-danger">{this.state.error?.toString() || 'Erreur inconnue'}</p>
            {this.state.errorInfo && (
              <details className="mt-3">
                <summary>Détails techniques</summary>
                <pre className="bg-dark text-white p-3 mt-2" style={{ fontSize: '12px' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="mt-3">
              <button className="btn btn-primary me-2" onClick={() => window.location.reload()}>
                Recharger la page
              </button>
              <a href="#/dashboard" className="btn btn-secondary">
                Retour au tableau de bord
              </a>
            </div>
          </div>
        </Container>
      )
    }
    return this.props.children
  }
}

// Composant pour la page d'authentification
function AuthPage({ onShowRegister, onLogin, showRegister }) {
  if (showRegister) {
    return (
      <Register 
        onLogin={onLogin}
        onShowLogin={() => onShowRegister(false)}
      />
    )
  }
  return (
    <Login 
      onLogin={onLogin}
      onShowRegister={() => onShowRegister(true)}
    />
  )
}

// Composant de protection de route
function ProtectedRoute({ user, children, requiredRole = null }) {
  if (!user) {
    return <Navigate to="/" replace />
  }

  if (requiredRole && user.type_utilisateur !== requiredRole) {
    return (
      <Container className="my-5">
        <div className="alert alert-warning">
          <h4>Accès non autorisé</h4>
          <p>Cette page est réservée aux {requiredRole === 'enseignant' ? 'enseignants' : 'étudiants'}.</p>
          <a href="#/dashboard" className="btn btn-primary">
            Retour au tableau de bord
          </a>
        </div>
      </Container>
    )
  }

  return children
}

// Fonction utilitaire pour vérifier l'authentification
const checkAuthentication = async () => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken')
  const savedUser = localStorage.getItem('user')

  if (!token || !savedUser) {
    return null
  }

  try {
    // Import dynamique pour éviter les erreurs de dépendance circulaire
    const axios = (await import('./config/axios')).default
    
    // Option 1: Vérifier avec une requête API (si votre backend a un endpoint /auth/verify)
    try {
      const response = await axios.get('/auth/verify')
      if (response.data.success) {
        return JSON.parse(savedUser)
      }
    } catch (apiError) {
      console.log('Endpoint /auth/verify non disponible, vérification alternative...')
    }
    
    // Option 2: Vérifier simplement si le token existe
    // Pour JWT, vous pourriez vérifier l'expiration ici
    const user = JSON.parse(savedUser)
    return user
    
  } catch (error) {
    console.error('❌ Erreur de vérification d\'authentification:', error)
    return null
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const authenticatedUser = await checkAuthentication()
        
        if (authenticatedUser) {
          setUser(authenticatedUser)
          console.log('✅ Utilisateur authentifié:', authenticatedUser)
          
          // Initialiser axios avec le token si nécessaire
          try {
            const axiosModule = await import('./config/axios')
            if (axiosModule.initializeAuth) {
              axiosModule.initializeAuth()
            }
          } catch (axiosError) {
            console.warn('⚠️ Impossible d\'initialiser axios:', axiosError)
          }
        } else {
          console.log('🔐 Aucun utilisateur authentifié trouvé')
          // Nettoyer le localStorage si l'authentification a échoué
          localStorage.removeItem('token')
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de l\'application:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeApp()
  }, [])

  const handleLogin = (userData, token) => {
    setUser(userData)
    
    // Stocker les données d'authentification
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', token)
    localStorage.setItem('authToken', token)
    
    setShowRegister(false)
    console.log('✅ Utilisateur connecté:', userData)
    
    // Rediriger vers le dashboard
    window.location.hash = '/dashboard'
  }

  const handleLogout = () => {
    setUser(null)
    
    // Nettoyer le localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('authToken')
    
    console.log('🔐 Utilisateur déconnecté')
    
    // Rediriger vers la page de login
    window.location.hash = '/'
  }

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3 text-muted">Chargement de l'application...</p>
        </div>
      </Container>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          {user && <CustomNavbar user={user} onLogout={handleLogout} />}
          
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route 
                path="/" 
                element={
                  user ? 
                    <Navigate to="/dashboard" replace /> : 
                    <AuthPage 
                      onLogin={handleLogin}
                      onShowRegister={setShowRegister}
                      showRegister={showRegister}
                    />
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute user={user}>
                    <Dashboard user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/scan" 
                element={
                  <ProtectedRoute user={user} requiredRole="etudiant">
                    <QrScanner user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student" 
                element={
                  <ProtectedRoute user={user} requiredRole="etudiant">
                    <StudentPresencePage user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/teacher" 
                element={
                  <ProtectedRoute user={user} requiredRole="enseignant">
                    <TeacherManagementPage user={user} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matieres" 
                element={
                  <ProtectedRoute user={user} requiredRole="enseignant">
                    <Suspense fallback={<LoadingFallback />}>
                      <MatiereManagementPage user={user} />
                    </Suspense>
                  </ProtectedRoute>
                } 
              />
              {/* Route de secours pour les pages en erreur */}
              <Route 
                path="/matieres-error" 
                element={
                  <Container className="my-5">
                    <div className="alert alert-warning">
                      <h4>Page temporairement indisponible</h4>
                      <p>La gestion des matières est en cours de maintenance.</p>
                      <div className="mt-3">
                        <a href="#/teacher" className="btn btn-primary me-2">
                          Retour aux cours
                        </a>
                        <a href="#/dashboard" className="btn btn-secondary">
                          Tableau de bord
                        </a>
                      </div>
                    </div>
                  </Container>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App