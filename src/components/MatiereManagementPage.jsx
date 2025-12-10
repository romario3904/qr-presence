import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert, Form, Modal, Table } from 'react-bootstrap'

function MatiereManagementPage({ user }) {
  const [matieres, setMatieres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMatiere, setEditingMatiere] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [formData, setFormData] = useState({
    nom_matiere: '',
    code_matiere: '',
    description: '',
    credit: '',
    niveau_enseignee: '',
    mention_enseignee: '',
    parcours_enseignee: ''
  })

  // Configuration API
  const API_BASE_URL = 'https://qr-presence-api.onrender.com/api'

  useEffect(() => {
    fetchMatieres()
  }, [])

  // Fonction pour décoder le token JWT (base64 URL-safe)
  const base64UrlDecode = (str) => {
    // Remplacer les caractères URL-safe
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    
    // Ajouter le padding si nécessaire
    const padding = str.length % 4
    if (padding) {
      str += '='.repeat(4 - padding)
    }
    
    // Décoder
    try {
      return decodeURIComponent(
        atob(str)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    } catch (error) {
      console.error('Erreur de décodage base64:', error)
      return ''
    }
  }

  const isTokenExpired = (token) => {
    if (!token) return true
    try {
      // Séparer les parties du token JWT
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.error('Token JWT invalide: pas 3 parties')
        return true
      }
      
      // Décoder la payload (partie 2)
      const payloadBase64 = parts[1]
      const payloadJson = base64UrlDecode(payloadBase64)
      if (!payloadJson) {
        console.error('Impossible de décoder la payload du token')
        return true
      }
      
      const payload = JSON.parse(payloadJson)
      
      // Vérifier l'expiration
      if (!payload.exp) {
        console.warn('Token sans date d\'expiration')
        return false // Considérer comme valide si pas d'exp
      }
      
      const expirationTime = payload.exp * 1000
      const isExpired = Date.now() >= expirationTime
      console.log('Token expiré?', isExpired, 'Expire le:', new Date(expirationTime))
      return isExpired
    } catch (error) {
      console.error('Erreur de décodage du token:', error)
      return true
    }
  }

  const handleTokenError = () => {
    localStorage.removeItem('token')
    setTimeout(() => {
      window.location.href = '/login'
    }, 2000)
  }

  const fetchMatieres = async () => {
    try {
      setLoading(true)
      setError('')

      // Vérifier le token
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Token d\'authentification manquant. Veuillez vous reconnecter.')
        handleTokenError()
        setLoading(false)
        return
      }

      if (isTokenExpired(token)) {
        setError('Votre session a expiré. Veuillez vous reconnecter.')
        handleTokenError()
        setLoading(false)
        return
      }

      console.log('Tentative de récupération des matières avec token...')

      // Ajout d'un timeout customisé
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      let response
      try {
        response = await fetch(`${API_BASE_URL}/matiere`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        })
      } catch (fetchError) {
        console.error('Erreur fetch matières:', fetchError)
        throw fetchError
      }

      clearTimeout(timeoutId)

      // Vérifier les erreurs d'authentification
      if (response.status === 401 || response.status === 403) {
        throw new Error('Session expirée ou invalide. Veuillez vous reconnecter.')
      }

      // D'abord vérifier le statut 404
      if (response.status === 404) {
        // Si 404, c'est normal pour une nouvelle installation sans données
        console.log('Aucune matière trouvée (404), tableau vide')
        setMatieres([])
        setLoading(false)
        return
      }

      // Vérifier si la réponse est du JSON
      const contentType = response.headers.get('content-type')
      const isJson = contentType && contentType.includes('application/json')
      
      if (!isJson) {
        // Si ce n'est pas du JSON, lire le texte
        const text = await response.text()
        console.error('Réponse non-JSON reçue:', text.substring(0, 200))
        throw new Error('Le serveur a retourné une réponse non-JSON. Vérifiez la configuration de l\'API.')
      }

      if (!response.ok) {
        try {
          const errorData = await response.json()
          throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`)
        } catch (jsonError) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`)
        }
      }

      // Si tout va bien, parser le JSON
      const data = await response.json()
      console.log('Données reçues:', data)

      // Vérifier la structure des données
      let matieresData = []
      if (data && data.success !== false) {
        if (Array.isArray(data.matieres)) {
          // Format API : { success: true, count: X, matieres: [...] }
          matieresData = data.matieres
        } else if (Array.isArray(data)) {
          // Format attendu : tableau de matières
          matieresData = data
        } else if (data.data && Array.isArray(data.data)) {
          // Format alternatif : { data: [...] }
          matieresData = data.data
        }
      } else if (data && data.message) {
        console.warn('Message d'erreur de l\'API:', data.message)
      }

      setMatieres(matieresData)

    } catch (error) {
      console.error('Erreur récupération matières:', error)

      if (error.message.includes('Token') || error.message.includes('Session') || error.message.includes('authentification')) {
        setError(`Erreur d'authentification: ${error.message}`)
        handleTokenError()
      } else if (error.name === 'AbortError') {
        setError('La requête a expiré. Vérifiez que le serveur backend est en cours d\'exécution.')
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setError('Impossible de se connecter au serveur. Vérifiez que le serveur backend est en cours d\'exécution.')
      } else if (error.message.includes('non-JSON')) {
        setError('Le serveur retourne une réponse non-JSON. Vérifiez que l\'API est correctement configurée.')
      } else if (error.message.includes('404')) {
        // 404 est acceptable si aucune matière n'existe
        console.log('Aucune matière trouvée (404)')
        setMatieres([])
      } else if (error.message.includes('401') || error.message.includes('403')) {
        setError('Accès non autorisé. Veuillez vous reconnecter.')
        handleTokenError()
      } else {
        setError(`Erreur lors de la récupération des matières: ${error.message}`)
      }

      // En cas d'erreur, laisser le tableau vide
      setMatieres([])
    } finally {
      try {
        setLoading(false)
      } catch (finalError) {
        console.error('Erreur dans finally:', finalError)
      }
    }
  }

  // Options pour les menus déroulants
  const niveauOptions = ['L1', 'L2', 'L3', 'M1', 'M2']
  const mentionOptions = ['Informatique', 'Intelligence Artificielle', 'Expertise Digitale']

  // Parcours par mention
  const parcoursByMention = {
    'Informatique': ['GB', 'IG', 'ASR'],
    'Intelligence Artificielle': ['GID', 'OCC'],
    'Expertise Digitale': ['MDI', 'ASI']
  }

  const handleOpenModal = (matiere = null) => {
    if (matiere) {
      setEditingMatiere(matiere)
      setFormData({
        nom_matiere: matiere.nom_matiere || '',
        code_matiere: matiere.code_matiere || '',
        description: matiere.description || '',
        credit: matiere.credit || '',
        niveau_enseignee: matiere.niveau_enseignee || '',
        mention_enseignee: matiere.mention_enseignee || '',
        parcours_enseignee: matiere.parcours_enseignee || ''
      })
    } else {
      setEditingMatiere(null)
      setFormData({
        nom_matiere: '',
        code_matiere: '',
        description: '',
        credit: '',
        niveau_enseignee: '',
        mention_enseignee: '',
        parcours_enseignee: ''
      })
    }
    setShowModal(true)
    setFormErrors({})
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingMatiere(null)
    setFormErrors({})
  }

  // Gérer le changement de mention pour mettre à jour les parcours disponibles
  const handleMentionChange = (mention) => {
    const updatedFormData = {
      ...formData,
      mention_enseignee: mention,
      parcours_enseignee: '' // Réinitialiser le parcours lorsque la mention change
    }
    setFormData(updatedFormData)
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.nom_matiere.trim()) errors.nom_matiere = 'Le nom est requis'
    if (!formData.code_matiere.trim()) errors.code_matiere = 'Le code est requis'
    if (formData.credit && (isNaN(formData.credit) || formData.credit < 0)) {
      errors.credit = 'Le crédit doit être un nombre positif'
    }

    // Validation des parcours selon la mention
    if (formData.mention_enseignee && formData.parcours_enseignee) {
      const parcoursValides = parcoursByMention[formData.mention_enseignee] || []
      if (!parcoursValides.includes(formData.parcours_enseignee)) {
        errors.parcours_enseignee = `Pour la mention "${formData.mention_enseignee}", les parcours valides sont: ${parcoursValides.join(', ')}`
      }
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setError('')
      setSuccess('')
      setFormErrors({})

      // Validation
      const errors = validateForm()
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors)
        return
      }

      // Vérifier le token avant l'envoi
      const token = localStorage.getItem('token')
      if (!token || isTokenExpired(token)) {
        setError('Votre session a expiré. Veuillez vous reconnecter.')
        handleTokenError()
        return
      }

      // Préparation des données pour l'API
      const matiereData = {
        nom_matiere: formData.nom_matiere,
        code_matiere: formData.code_matiere,
        description: formData.description || null,
        credit: formData.credit ? parseInt(formData.credit) : null,
        niveau_enseignee: formData.niveau_enseignee || null,
        mention_enseignee: formData.mention_enseignee || null,
        parcours_enseignee: formData.parcours_enseignee || null
      }

      console.log('Données envoyées:', matiereData)

      let response
      let url = editingMatiere
        ? `${API_BASE_URL}/matiere/${editingMatiere.id_matiere}`
        : `${API_BASE_URL}/matiere`

      // Configuration de la requête avec timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      response = await fetch(url, {
        method: editingMatiere ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(matiereData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Vérifier les erreurs d'authentification
      if (response.status === 401 || response.status === 403) {
        throw new Error('Session expirée ou invalide. Veuillez vous reconnecter.')
      }

      // Vérifier le type de contenu
      const contentType = response.headers.get('content-type')
      const isJson = contentType && contentType.includes('application/json')
      
      if (!isJson) {
        const text = await response.text()
        console.error('Réponse non-JSON:', text.substring(0, 200))
        throw new Error('Le serveur a retourné une réponse non-JSON')
      }

      const data = await response.json()
      console.log('Réponse API:', data)

      if (!response.ok) {
        throw new Error(data.message || data.error || `Erreur ${response.status}: ${response.statusText}`)
      }

      if (editingMatiere) {
        setSuccess('Matière mise à jour avec succès')
        // Mettre à jour localement
        setMatieres(prev => prev.map(m =>
          m.id_matiere === editingMatiere.id_matiere
            ? { ...m, ...matiereData }
            : m
        ))
      } else {
        setSuccess('Matière créée avec succès')
        // Ajouter la nouvelle matière au tableau immédiatement
        if (data && data.matiere && data.matiere.id_matiere) {
          // Format avec objet matiere complet
          const nouvelleMatiere = {
            ...data.matiere
          }
          setMatieres(prev => [...prev, nouvelleMatiere])
        } else if (data && data.id_matiere) {
          // Format avec seulement id_matiere
          const nouvelleMatiere = {
            id_matiere: data.id_matiere,
            ...matiereData,
            date_creation: new Date().toISOString()
          }
          setMatieres(prev => [...prev, nouvelleMatiere])
        }
      }

      handleCloseModal()

      // Rafraîchir la liste après un délai pour s'assurer que les données sont à jour
      setTimeout(() => {
        fetchMatieres()
      }, 500)

    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      
      if (error.message.includes('Token') || error.message.includes('Session') || error.message.includes('authentification')) {
        setError(`Erreur d'authentification: ${error.message}`)
        handleTokenError()
      } else if (error.name === 'AbortError') {
        setError('La requête a expiré. Vérifiez votre connexion réseau.')
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setError('Impossible de se connecter au serveur. Vérifiez que le serveur backend est en cours d\'exécution.')
      } else if (error.message.includes('DOCTYPE') || error.message.includes('html')) {
        setError('Le serveur retourne du HTML au lieu de JSON. Vérifiez la configuration de l\'API backend.')
      } else if (error.message.includes('401') || error.message.includes('403')) {
        setError('Accès non autorisé. Veuillez vous reconnecter.')
        handleTokenError()
      } else {
        setError(error.message || 'Erreur lors de la sauvegarde')
      }
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette matière ?')) {
      return
    }

    try {
      setError('')

      // Vérifier le token avant suppression
      const token = localStorage.getItem('token')
      if (!token || isTokenExpired(token)) {
        setError('Votre session a expiré. Veuillez vous reconnecter.')
        handleTokenError()
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(`${API_BASE_URL}/matiere/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Vérifier les erreurs d'authentification
      if (response.status === 401 || response.status === 403) {
        throw new Error('Session expirée ou invalide. Veuillez vous reconnecter.')
      }

      if (!response.ok) {
        if (response.status === 404) {
          // Si la matière n'existe pas déjà, considérer comme supprimée
          setSuccess('Matière supprimée')
          setMatieres(prev => prev.filter(m => m.id_matiere !== id))
          return
        }

        const errorData = await response.json()
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`)
      }

      setSuccess('Matière supprimée avec succès')
      // Supprimer localement
      setMatieres(prev => prev.filter(m => m.id_matiere !== id))

    } catch (error) {
      console.error('Erreur suppression:', error)
      if (error.message.includes('Token') || error.message.includes('Session') || error.message.includes('authentification')) {
        setError(`Erreur d'authentification: ${error.message}`)
        handleTokenError()
      } else if (error.name === 'AbortError') {
        setError('La requête de suppression a expiré.')
      } else if (error.message.includes('Failed to fetch')) {
        setError('Impossible de se connecter au serveur.')
      } else if (error.message.includes('401') || error.message.includes('403')) {
        setError('Accès non autorisé. Veuillez vous reconnecter.')
        handleTokenError()
      } else {
        setError('Erreur lors de la suppression: ' + error.message)
      }
    }
  }

  // Formater la date pour l'affichage
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Date invalide'
    }
  }

  return (
    <Container className="my-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="mb-3">
          <i className="bi bi-book-half me-2"></i>
          Gestion des Matières
        </h1>
        <p className="text-muted">
          Gérez vos matières : ajoutez, modifiez ou supprimez des matières
        </p>
      </div>

      {/* Alertes */}
      {error && (
        <Alert variant={error.includes('authentification') ? 'warning' : 'danger'} dismissible onClose={() => setError('')}>
          <Alert.Heading>
            <i className={`bi ${error.includes('authentification') ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
            {error.includes('authentification') ? 'Problème d\'authentification' : 'Erreur'}
          </Alert.Heading>
          <p className="mb-0">{error}</p>
          {error.includes('authentification') && (
            <div className="mt-2">
              <p className="mb-2 small">Redirection vers la page de connexion...</p>
              <Button
                variant="outline-warning"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('token')
                  window.location.href = '/login'
                }}
              >
                <i className="bi bi-box-arrow-in-right me-1"></i>
                Se reconnecter maintenant
              </Button>
            </div>
          )}
          {error.includes('localhost:3002') && (
            <div className="mt-2 small">
              <strong>Solution rapide :</strong>
              <ul className="mb-0 mt-1">
                <li>Vérifiez que le serveur backend est en cours d'exécution</li>
                <li>Exécutez dans le terminal : <code>node server.js</code> ou <code>npm run server</code></li>
                <li>Vérifiez que le port 3002 n'est pas utilisé par une autre application</li>
                <li>Vérifiez que l'API retourne du JSON et non du HTML</li>
                <li>Route API : <code>/api/matiere</code> (au singulier)</li>
              </ul>
            </div>
          )}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <Alert.Heading>
            <i className="bi bi-check-circle-fill me-2"></i>
            Succès
          </Alert.Heading>
          <p className="mb-0">{success}</p>
        </Alert>
      )}

      {/* Statistiques */}
      <Row className="mb-4">
        <Col md={3}>
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-journal-check fs-3 text-primary"></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">{matieres.length}</div>
                  <small className="text-muted">Matières</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-star fs-3 text-success"></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">
                    {matieres.reduce((acc, m) => acc + (m.credit || 0), 0)}
                  </div>
                  <small className="text-muted">Crédits totaux</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-layers fs-3 text-warning"></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">
                    {[...new Set(matieres.map(m => m.niveau_enseignee).filter(Boolean))].length}
                  </div>
                  <small className="text-muted">Niveaux différents</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-calendar-date fs-3 text-info"></i>
                </div>
                <div>
                  <div className="fs-4 fw-bold">
                    {matieres.filter(m => m.credit && m.credit >= 6).length}
                  </div>
                  <small className="text-muted">Matières ≥ 6 crédits</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Liste des matières */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-list-ul me-2"></i>
              Mes Matières
              <Badge bg="light" text="dark" className="ms-2">{matieres.length}</Badge>
            </h5>
            <Button variant="light" size="sm" onClick={() => handleOpenModal()}>
              <i className="bi bi-plus-circle me-2"></i>
              Nouvelle matière
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
              <p className="mt-2 text-muted">Chargement des matières...</p>
              <p className="small text-muted">Route API: /api/matiere</p>
            </div>
          ) : matieres.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-journal-x display-1 text-muted mb-3"></i>
              <h5 className="text-muted">Aucune matière enregistrée</h5>
              <p className="text-muted mb-4">
                Commencez par ajouter votre première matière
              </p>
              <Button variant="primary" onClick={() => handleOpenModal()}>
                <i className="bi bi-plus-circle me-2"></i>
                Ajouter une matière
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Nom</th>
                    <th>Description</th>
                    <th>Crédits</th>
                    <th>Niveau</th>
                    <th>Mention</th>
                    <th>Parcours</th>
                    <th>Création</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matieres.map((matiere) => (
                    <tr key={matiere.id_matiere}>
                      <td>
                        <Badge bg="secondary">{matiere.code_matiere}</Badge>
                      </td>
                      <td>
                        <div className="fw-bold">{matiere.nom_matiere}</div>
                      </td>
                      <td>
                        <small className="text-muted">
                          {matiere.description || 'Aucune description'}
                        </small>
                      </td>
                      <td>
                        {matiere.credit ? (
                          <Badge bg="info">{matiere.credit}</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {matiere.niveau_enseignee ? (
                          <Badge bg="primary">{matiere.niveau_enseignee}</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {matiere.mention_enseignee ? (
                          <Badge bg={matiere.mention_enseignee === 'Informatique' ? 'success' :
                            matiere.mention_enseignee === 'Intelligence Artificielle' ? 'warning' :
                              'info'}>
                            {matiere.mention_enseignee}
                          </Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {matiere.parcours_enseignee ? (
                          <Badge bg="secondary">{matiere.parcours_enseignee}</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <small className="text-muted">
                          {formatDate(matiere.date_creation)}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenModal(matiere)}
                            title="Modifier"
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(matiere.id_matiere)}
                            title="Supprimer"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal de création/modification */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-journal-plus me-2"></i>
            {editingMatiere ? 'Modifier la matière' : 'Nouvelle matière'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Nom de la matière *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.nom_matiere}
                    onChange={(e) => setFormData({ ...formData, nom_matiere: e.target.value })}
                    placeholder="Ex: Mathématiques"
                    required
                    isInvalid={!!formErrors.nom_matiere}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.nom_matiere}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Code matière *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.code_matiere}
                    onChange={(e) => setFormData({ ...formData, code_matiere: e.target.value.toUpperCase() })}
                    placeholder="Ex: MATH101"
                    required
                    isInvalid={!!formErrors.code_matiere}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.code_matiere}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>
                Description
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la matière..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Crédits
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.credit}
                    onChange={(e) => setFormData({ ...formData, credit: e.target.value })}
                    placeholder="Ex: 6"
                    min="0"
                    step="1"
                    isInvalid={!!formErrors.credit}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.credit}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Laisser vide si non applicable
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Niveau enseigné
                  </Form.Label>
                  <Form.Select
                    value={formData.niveau_enseignee}
                    onChange={(e) => setFormData({ ...formData, niveau_enseignee: e.target.value })}
                  >
                    <option value="">Sélectionner un niveau</option>
                    {niveauOptions.map(niveau => (
                      <option key={niveau} value={niveau}>{niveau}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Mention enseignée
                  </Form.Label>
                  <Form.Select
                    value={formData.mention_enseignee}
                    onChange={(e) => handleMentionChange(e.target.value)}
                    isInvalid={!!formErrors.mention_enseignee}
                  >
                    <option value="">Sélectionner une mention</option>
                    {mentionOptions.map(mention => (
                      <option key={mention} value={mention}>{mention}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.mention_enseignee}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Parcours enseigné
                  </Form.Label>
                  <Form.Select
                    value={formData.parcours_enseignee}
                    onChange={(e) => setFormData({ ...formData, parcours_enseignee: e.target.value })}
                    disabled={!formData.mention_enseignee}
                    isInvalid={!!formErrors.parcours_enseignee}
                  >
                    <option value="">Sélectionner un parcours</option>
                    {formData.mention_enseignee && parcoursByMention[formData.mention_enseignee] &&
                      parcoursByMention[formData.mention_enseignee].map(parcours => (
                        <option key={parcours} value={parcours}>{parcours}</option>
                      ))
                    }
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.parcours_enseignee}
                  </Form.Control.Feedback>
                  {formData.mention_enseignee && (
                    <Form.Text className="text-muted">
                      Parcours disponibles pour {formData.mention_enseignee}: {parcoursByMention[formData.mention_enseignee]?.join(', ')}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {editingMatiere && (
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                ID de la matière : <strong>{editingMatiere.id_matiere}</strong>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              <i className="bi bi-check-circle me-2"></i>
              {editingMatiere ? 'Modifier' : 'Créer'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Informations */}
      <div className="mt-4 p-3 bg-light rounded">
        <h6 className="mb-2">
          <i className="bi bi-info-circle me-2"></i>
          Informations
        </h6>
        <ul className="small text-muted mb-0">
          <li>Les champs marqués d'un * sont obligatoires</li>
          <li>Le code matière doit être unique</li>
          <li>La date de création est automatiquement générée</li>
          <li>Route API : <code>/api/matiere</code></li>
          <li>Token JWT requis pour l'authentification</li>
          <li>La session expire automatiquement après un certain temps</li>
          <li><strong>Mentions disponibles :</strong> Informatique, Intelligence Artificielle, Expertise Digitale</li>
          <li><strong>Parcours par mention :</strong>
            <ul className="mt-1 mb-0">
              <li>Informatique : GB, IG, ASR</li>
              <li>Intelligence Artificielle : GID, OCC</li>
              <li>Expertise Digitale : MDI, ASI</li>
            </ul>
          </li>
        </ul>
      </div>
    </Container>
  )
}

export default MatiereManagementPage