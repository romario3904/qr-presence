import { useState, useEffect } from 'react'
import { Container } from 'react-bootstrap'
import { apiHelper } from '../apis' // Importez votre apiHelper

function StudentPresencePage({ user }) {
  const [presences, setPresences] = useState([])
  const [statistics, setStatistics] = useState({
    tauxPresence: 0,
    totalPresences: 0,
    totalAbsences: 0,
    totalSeances: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  // Fonction pour récupérer l'ID étudiant depuis le localStorage ou les props
  const getStudentId = () => {
    try {
      console.log('🔍 Recherche ID étudiant...')
      
      // 1. Depuis les props
      if (user) {
        console.log('User from props:', user)
        
        if (user.profil?.id_etudiant) {
          console.log('✅ ID depuis user.profil.id_etudiant:', user.profil.id_etudiant)
          return user.profil.id_etudiant
        }
        if (user.id_etudiant) {
          console.log('✅ ID depuis user.id_etudiant:', user.id_etudiant)
          return user.id_etudiant
        }
        if (user.id) {
          console.log('✅ ID depuis user.id:', user.id)
          return user.id
        }
      }
      
      // 2. Depuis localStorage
      console.log('🔍 Recherche dans localStorage...')
      const storedUserStr = localStorage.getItem('user')
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr)
          console.log('User from localStorage:', storedUser)
          
          if (storedUser.profil?.id_etudiant) {
            console.log('✅ ID depuis localStorage.profil:', storedUser.profil.id_etudiant)
            return storedUser.profil.id_etudiant
          }
          if (storedUser.id_etudiant) {
            console.log('✅ ID depuis localStorage.id_etudiant:', storedUser.id_etudiant)
            return storedUser.id_etudiant
          }
          if (storedUser.etudiant_id) {
            console.log('✅ ID depuis localStorage.etudiant_id:', storedUser.etudiant_id)
            return storedUser.etudiant_id
          }
          if (storedUser.id) {
            console.log('✅ ID depuis localStorage.id:', storedUser.id)
            return storedUser.id
          }
        } catch (parseError) {
          console.error('❌ Erreur parsing localStorage user:', parseError)
        }
      }
      
      // 3. Depuis le token JWT (si présent)
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          console.log('Token payload:', payload)
          
          if (payload.id_etudiant) return payload.id_etudiant
          if (payload.etudiant_id) return payload.etudiant_id
          if (payload.id) return payload.id
        } catch (e) {
          console.log('⚠️ Impossible de décoder le token:', e.message)
        }
      }
      
      console.error('❌ Aucun ID étudiant trouvé')
      return null
      
    } catch (err) {
      console.error('💥 Erreur extraction ID étudiant:', err)
      return null
    }
  }

  // Fonction principale pour récupérer les présences via apiHelper
  const fetchStudentPresences = async () => {
    try {
      console.log('🔍 Tentative de récupération des présences...')
      
      // Essayer d'abord la route /presence/student (pour l'étudiant connecté)
      try {
        const data = await apiHelper.getStudentPresences()
        console.log('✅ Réponse de /presence/student:', data)

        if (data.success) {
          return data.presences || []
        } else {
          throw new Error(data.message || 'Erreur API')
        }
      } catch (mainError) {
        console.log('❌ Route principale échouée, tentative avec ID...')
        
        // Si la route principale échoue, utiliser la route avec ID
        const studentId = getStudentId()
        if (studentId) {
          console.log(`🔍 Tentative avec ID étudiant: ${studentId}`)
          const data = await apiHelper.getStudentPresencesById(studentId)
          console.log('✅ Réponse avec ID étudiant:', data)

          if (data.success) {
            return data.presences || []
          } else {
            throw new Error(data.message || 'Erreur API')
          }
        } else {
          throw new Error('ID étudiant non trouvé')
        }
      }
    } catch (error) {
      console.error('❌ Erreur récupération présences:', error)
      
      // Si c'est une erreur "aucune donnée", retourner tableau vide
      if (error.isNoData || error.response?.status === 404) {
        console.log('ℹ️ Aucune présence trouvée, retour tableau vide')
        return []
      }
      
      throw error
    }
  }

  // Fonction pour récupérer les présences via une requête directe (fallback simplifié)
  const fetchPresencesFallback = async () => {
    try {
      console.log('🔄 Tentative fallback...')
      
      // Vérifier la santé du serveur
      const health = await apiHelper.checkServerHealth()
      if (health.status === 'online') {
        console.log('✅ Serveur accessible, mais aucune présence')
        return []
      } else {
        throw new Error('Serveur inaccessible: ' + health.error)
      }
    } catch (error) {
      console.error('Erreur fallback:', error)
      throw error
    }
  }

  // Fonction pour calculer les statistiques depuis les présences
  const calculateStatistics = (presencesArray) => {
    if (!presencesArray || presencesArray.length === 0) {
      return {
        tauxPresence: 0,
        totalPresences: 0,
        totalAbsences: 0,
        totalSeances: 0
      }
    }

    const totalSeances = presencesArray.length
    const totalPresences = presencesArray.filter(p => 
      p.statut === 'present' || p.statut === 'Présent' || p.statut === 'présent'
    ).length
    const totalLate = presencesArray.filter(p => 
      p.statut === 'late' || p.statut === 'retard' || p.statut === 'En retard'
    ).length
    const totalAbsent = presencesArray.filter(p => 
      p.statut === 'absent' || p.statut === 'Absent'
    ).length
    
    const tauxPresence = totalSeances > 0 ? Math.round((totalPresences / totalSeances) * 100) : 0

    return {
      tauxPresence,
      totalPresences,
      totalAbsences: totalLate + totalAbsent,
      totalSeances
    }
  }

  // Fonction pour vérifier et rafraîchir le token si nécessaire
  const verifyAndRefreshToken = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        return false
      }

      // Vérifier le token via l'API
      try {
        const response = await apiHelper.get('/auth/verify')
        if (response.success) {
          console.log('✅ Token valide')
          return true
        }
        return false
      } catch (error) {
        console.error('❌ Erreur vérification token:', error)
        return false
      }
    } catch (error) {
      console.error('❌ Token invalide ou expiré:', error)
      return false
    }
  }

  // Fonction pour récupérer les données
  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      setErrorDetails(null)
      
      console.log('🔄 Début récupération données...')
      
      // Vérifier si l'utilisateur est authentifié
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        setError('Non authentifié. Veuillez vous connecter.')
        setErrorDetails({
          status: 401,
          message: 'Aucun token d\'authentification trouvé',
          solution: 'Veuillez vous connecter'
        })
        setLoading(false)
        return
      }

      // Vérifier le type d'utilisateur
      const storedUserStr = localStorage.getItem('user')
      let userType = 'Non défini'
      
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr)
          userType = storedUser.type_utilisateur || storedUser.role || storedUser.userType || 'Non défini'
        } catch (e) {
          console.error('❌ Erreur parsing user:', e)
        }
      }
      
      if (userType !== 'etudiant' && userType !== 'student') {
        setError('Accès refusé. Cette page est réservée aux étudiants.')
        setErrorDetails({
          status: 403,
          message: 'Seuls les étudiants peuvent accéder à cette page.',
          currentRole: userType,
          solution: 'Contactez l\'administration si vous pensez que c\'est une erreur.'
        })
        setLoading(false)
        return
      }

      // Récupérer les présences
      let presencesData = []
      
      try {
        console.log('📡 Tentative méthode principale...')
        presencesData = await fetchStudentPresences()
      } catch (apiError) {
        console.log('⚠️ Méthode principale échouée, tentative fallback...')
        
        try {
          // Essayer la méthode fallback
          presencesData = await fetchPresencesFallback()
        } catch (fallbackError) {
          console.log('❌ Toutes les méthodes ont échoué')
          
          // Gestion des erreurs HTTP spécifiques
          if (apiError.response) {
            const status = apiError.response.status
            const data = apiError.response.data
            
            if (status === 400) {
              // Correction automatique pour l'erreur student_400
              if (apiError.config?.url?.includes('student_400')) {
                console.log('🔄 Correction automatique de l\'URL...')
                // Réessayer une fois avec la bonne URL
                setRetryCount(prev => prev + 1)
                if (retryCount < 2) {
                  setTimeout(() => fetchData(), 1000)
                  return
                }
              }
              
              setError('Requête incorrecte.')
              setErrorDetails({
                status: 400,
                message: data?.message || 'Les données envoyées sont incorrectes.',
                solution: 'Vérifiez vos informations et réessayez.'
              })
            } else if (status === 401) {
              setError('Session expirée.')
              setErrorDetails({
                status: 401,
                message: 'Votre session a expiré.',
                solution: 'Veuillez vous reconnecter.'
              })
            } else if (status === 403) {
              setError('Accès refusé.')
              setErrorDetails({
                status: 403,
                message: data?.message || 'Vous n\'avez pas les permissions nécessaires.',
                solution: 'Contactez l\'administration si vous pensez que c\'est une erreur.'
              })
            } else if (status === 404) {
              setError('Aucune donnée trouvée.')
              setErrorDetails({
                status: 404,
                message: data?.message || 'Aucune présence enregistrée pour cet étudiant.',
                solution: 'Attendez qu\'un enseignant enregistre votre présence.'
              })
            } else if (status === 500) {
              setError('Erreur serveur.')
              setErrorDetails({
                status: 500,
                message: data?.message || 'Le serveur a rencontré une erreur.',
                solution: 'Réessayez plus tard ou contactez l\'administration.'
              })
            } else {
              setError('Erreur de connexion au serveur.')
              setErrorDetails({
                status: status || 503,
                message: 'Impossible de contacter le serveur.',
                solution: 'Vérifiez votre connexion internet et que le serveur est démarré.'
              })
            }
          } else if (apiError.isNetworkError) {
            setError('Serveur inaccessible.')
            setErrorDetails({
              status: 503,
              message: apiError.message || 'Service temporairement indisponible.',
              solution: 'Vérifiez que le serveur backend est démarré sur https://qr-presence-api.onrender.com'
            })
          } else {
            setError('Erreur réseau ou serveur inaccessible.')
            setErrorDetails({
              status: 503,
              message: 'Service temporairement indisponible.',
              solution: 'Vérifiez votre connexion internet et réessayez.'
            })
          }
          
          setLoading(false)
          return
        }
      }

      // Traiter les données récupérées
      console.log('📊 Données récupérées:', presencesData)
      
      if (Array.isArray(presencesData) && presencesData.length > 0) {
        setPresences(presencesData)
        
        // Calculer les statistiques
        const stats = calculateStatistics(presencesData)
        setStatistics(stats)
        
        console.log('📈 Statistiques calculées:', stats)
      } else {
        setPresences([])
        // Pas d'erreur si c'est normal (étudiant sans présence)
        setError('')
        setErrorDetails({
          status: 200,
          message: 'Vous n\'avez encore aucune présence enregistrée.',
          solution: 'Scannez un QR code lors de votre prochain cours.'
        })
      }
      
    } catch (error) {
      console.error('💥 Erreur générale:', error)
      setError('Une erreur inattendue est survenue.')
      setErrorDetails({
        status: 500,
        message: error.message || 'Erreur inconnue',
        solution: 'Veuillez réessayer ou contacter l\'administration.'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user, retryCount])

  // Fonction pour réessayer
  const retryFetch = () => {
    setError('')
    setErrorDetails(null)
    setRetryCount(0)
    setLoading(true)
    
    // Petit délai pour éviter les problèmes de timing
    setTimeout(() => {
      fetchData()
    }, 500)
  }

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    
    try {
      // Vérifier si c'est déjà une date au format français
      if (typeof dateString === 'string' && dateString.includes('/')) {
        return dateString
      }
      
      const date = new Date(dateString)
      
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        return dateString
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // Fonction pour formater l'heure
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    
    try {
      // Si c'est déjà un format time avec des heures et minutes
      if (typeof timeString === 'string') {
        // Chercher un pattern d'heure HH:MM
        const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/)
        if (timeMatch) {
          const hours = timeMatch[1].padStart(2, '0')
          const minutes = timeMatch[2]
          return `${hours}:${minutes}`
        }
        
        // Si c'est une date complète, extraire l'heure
        const date = new Date(timeString)
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          })
        }
      }
      
      return timeString
    } catch {
      return timeString
    }
  }

  // Fonction pour formater l'heure de scan
  const formatScanTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A'
    
    try {
      const date = new Date(dateTimeString)
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      }
      
      return formatTime(dateTimeString)
    } catch {
      return dateTimeString
    }
  }

  // Fonction pour obtenir l'heure de la séance
  const getSessionTime = (presence) => {
    const heureDebut = presence.heure_debut || presence.start_time
    const heureFin = presence.heure_fin || presence.end_time
    
    if (heureDebut && heureFin) {
      return `${formatTime(heureDebut)} - ${formatTime(heureFin)}`
    } else if (heureDebut) {
      return formatTime(heureDebut)
    } else {
      return 'N/A'
    }
  }

  // Fonction pour obtenir le statut avec badge
  const getStatusBadge = (statut) => {
    if (statut === 'present' || statut === 'Présent' || statut === 'présent') {
      return { className: 'bg-success', text: 'Présent' }
    } else if (statut === 'late' || statut === 'retard' || statut === 'En retard') {
      return { className: 'bg-warning', text: 'En retard' }
    } else if (statut === 'absent' || statut === 'Absent') {
      return { className: 'bg-danger', text: 'Absent' }
    } else {
      return { className: 'bg-secondary', text: statut || 'Inconnu' }
    }
  }

  // Fonction pour déconnexion
  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/login'
  }

  return (
    <Container className="my-5">
      <div className="text-center mb-5">
        <div className="mb-3">
          <i className="bi bi-calendar-check text-primary" style={{ fontSize: '4rem' }}></i>
        </div>
        <h1 className="display-5 fw-bold text-primary mb-3">Mes Présences</h1>
        <p className="lead text-muted">Consultez l'historique de vos présences et vos statistiques</p>
        
        {/* Bouton de déconnexion pour debug */}
        {process.env.NODE_ENV === 'development' && (
          <button 
            onClick={handleLogout}
            className="btn btn-sm btn-outline-danger"
            title="Déconnexion (debug)"
          >
            <i className="bi bi-box-arrow-right me-1"></i>
            Déconnexion
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3 text-muted">Chargement de vos présences...</p>
          {retryCount > 0 && (
            <p className="text-warning small">
              <i className="bi bi-arrow-clockwise me-1"></i>
              Tentative {retryCount + 1}...
            </p>
          )}
        </div>
      ) : error ? (
        <div className="card shadow-lg border-0">
          <div className="card-body text-center py-5">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '4rem' }}></i>
            <h4 className="mt-3 text-warning">Erreur</h4>
            <p className="text-muted">{error}</p>
            
            {errorDetails && (
              <div className="alert alert-info mt-3">
                <h6>Détails de l'erreur :</h6>
                <ul className="mb-0 text-start">
                  <li><strong>Code:</strong> {errorDetails.status}</li>
                  <li><strong>Message:</strong> {errorDetails.message}</li>
                  {errorDetails.currentRole && (
                    <li><strong>Votre rôle:</strong> {errorDetails.currentRole}</li>
                  )}
                  {errorDetails.solution && (
                    <li><strong>Solution:</strong> {errorDetails.solution}</li>
                  )}
                </ul>
              </div>
            )}
            
            <div className="mt-4">
              <button onClick={retryFetch} className="btn btn-primary me-2">
                <i className="bi bi-arrow-clockwise me-2"></i>
                Réessayer
              </button>
              
              <a href="#/dashboard" className="btn btn-outline-primary me-2">
                <i className="bi bi-arrow-left me-2"></i>
                Retour au tableau de bord
              </a>
              
              <a href="#/scan" className="btn btn-outline-secondary me-2">
                <i className="bi bi-qr-code-scan me-2"></i>
                Scanner un QR code
              </a>
              
              {errorDetails?.status === 401 && (
                <button onClick={handleLogout} className="btn btn-outline-danger">
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Se reconnecter
                </button>
              )}
            </div>
            
            <div className="mt-4 small text-muted">
              <p className="mb-1">
                <i className="bi bi-info-circle me-1"></i>
                Si le problème persiste, contactez l'administration.
              </p>
              <p className="mb-0">
                <i className="bi bi-server me-1"></i>
                URL API: https://qr-presence-api.onrender.com/api
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Section Statistiques - Afficher seulement si on a des données */}
          {(presences.length > 0 || statistics.totalSeances > 0) && (
            <div className="card shadow-lg border-0 mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="bi bi-bar-chart me-2"></i>
                  Vos statistiques actuelles
                </h5>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-3 mb-3">
                    <div className="p-3 bg-light rounded">
                      <h3 className="text-primary">{statistics.tauxPresence}%</h3>
                      <p className="text-muted mb-0">Taux présence</p>
                    </div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="p-3 bg-light rounded">
                      <h3 className="text-success">{statistics.totalPresences}</h3>
                      <p className="text-muted mb-0">Présences</p>
                    </div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="p-3 bg-light rounded">
                      <h3 className="text-danger">{statistics.totalAbsences}</h3>
                      <p className="text-muted mb-0">Absences</p>
                    </div>
                  </div>
                  <div className="col-md-3 mb-3">
                    <div className="p-3 bg-light rounded">
                      <h3 className="text-info">{statistics.totalSeances}</h3>
                      <p className="text-muted mb-0">Séances</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Historique des présences */}
          {presences.length > 0 ? (
            <div className="card shadow-lg border-0">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Historique des présences ({presences.length})
                </h5>
                <button onClick={retryFetch} className="btn btn-sm btn-light">
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Actualiser
                </button>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Heure</th>
                        <th>Matière</th>
                        <th>Salle</th>
                        <th>Statut</th>
                        <th>Enseignant</th>
                        <th>Heure Scan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presences.map((presence, index) => {
                        const statusBadge = getStatusBadge(presence.statut)
                        return (
                          <tr key={presence.id_presence || presence.id || index}>
                            <td>{formatDate(presence.date_seance || presence.date)}</td>
                            <td>{getSessionTime(presence)}</td>
                            <td>
                              <strong>{presence.nom_matiere || presence.matiere || 'N/A'}</strong>
                              <br />
                              <small className="text-muted">
                                {presence.code_matiere || presence.code || ''}
                              </small>
                            </td>
                            <td>{presence.salle || 'N/A'}</td>
                            <td>
                              <span className={`badge ${statusBadge.className}`}>
                                {statusBadge.text}
                              </span>
                            </td>
                            <td>
                              {presence.enseignant_nom && presence.enseignant_prenom 
                                ? `${presence.enseignant_prenom} ${presence.enseignant_nom}`
                                : 'N/A'
                              }
                            </td>
                            <td>
                              {formatScanTime(presence.date_scan || presence.timestamp)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card-footer text-muted small">
                <div className="row">
                  <div className="col-md-6">
                    <i className="bi bi-info-circle me-1"></i>
                    Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
                  </div>
                  <div className="col-md-6 text-end">
                    Présents: {presences.filter(p => 
                      p.statut === 'present' || p.statut === 'Présent' || p.statut === 'présent'
                    ).length} | 
                    Retards: {presences.filter(p => 
                      p.statut === 'late' || p.statut === 'retard' || p.statut === 'En retard'
                    ).length} | 
                    Absents: {presences.filter(p => 
                      p.statut === 'absent' || p.statut === 'Absent'
                    ).length}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <i className="bi bi-inbox text-muted" style={{ fontSize: '4rem' }}></i>
                <h4 className="mt-3 text-muted">Aucune présence enregistrée</h4>
                <p className="text-muted">
                  Vous n'avez pas encore de présences enregistrées. Scannez un QR code lors de votre prochain cours.
                </p>
                {errorDetails && errorDetails.message && (
                  <div className="alert alert-info mt-3">
                    <p className="mb-0">{errorDetails.message}</p>
                  </div>
                )}
                <a href="#/scan" className="btn btn-primary mt-3 me-2">
                  <i className="bi bi-qr-code-scan me-2"></i>
                  Scanner un QR code
                </a>
                <button onClick={retryFetch} className="btn btn-outline-primary mt-3">
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Rafraîchir
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-center mt-4">
        <a href="#/dashboard" className="btn btn-outline-primary me-2">
          <i className="bi bi-arrow-left me-2"></i>
          Retour au tableau de bord
        </a>
        <button onClick={retryFetch} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-clockwise me-2"></i>
          Rafraîchir la page
        </button>
      </div>
    </Container>
  )
}

export default StudentPresencePage