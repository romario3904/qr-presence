import { useState, useEffect } from 'react'
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap'
import api from '../apis'
import './Login.css'

function Register({ onLogin, onShowLogin }) {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    matricule: '',
    mot_de_passe: '',
    confirm_password: '',
    role: 'etudiant',
    // Champs pour étudiant
    niveau: 'L1',
    mention: 'Informatique',
    parcours: 'GB',
    // Champs pour enseignant (enseigne plusieurs niveaux)
    niveaux_enseignes: ['L1'], // Tableau pour plusieurs niveaux
    mention_enseignee: 'Informatique',
    parcours_enseignes: ['GB'] // Tableau pour plusieurs parcours
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validated, setValidated] = useState(false)

  // Options selon le concept ENI
  const niveauxOptions = ['L1', 'L2', 'L3', 'M1', 'M2']
  const mentionsOptions = ['Informatique', 'Intelligence Artificielle', 'Expertise Digitale']
  
  // Parcours par mention selon les règles ENI
  const parcoursParMention = {
    'Informatique': ['GB', 'IG', 'ASR'],
    'Intelligence Artificielle': ['GID', 'OCC'],
    'Expertise Digitale': ['MDI', 'ASI']
  }

  // Parcours disponibles selon la mention sélectionnée
  const [parcoursOptions, setParcoursOptions] = useState(parcoursParMention['Informatique'])

  useEffect(() => {
    // Mettre à jour les parcours disponibles quand la mention change
    if (formData.role === 'etudiant') {
      setParcoursOptions(parcoursParMention[formData.mention] || [])
      
      // Si le parcours actuel n'est pas dans la nouvelle liste, réinitialiser
      if (!parcoursParMention[formData.mention]?.includes(formData.parcours)) {
        setFormData(prev => ({
          ...prev,
          parcours: parcoursParMention[formData.mention]?.[0] || 'GB'
        }))
      }
    } else {
      // Pour enseignant, réinitialiser les parcours enseignés
      const parcoursDisponibles = parcoursParMention[formData.mention_enseignee] || ['GB']
      setParcoursOptions(parcoursDisponibles)
      
      // Filtrer les parcours enseignés pour garder seulement ceux disponibles
      const parcoursFiltres = formData.parcours_enseignes.filter(p => 
        parcoursDisponibles.includes(p)
      )
      if (parcoursFiltres.length === 0 && parcoursDisponibles.length > 0) {
        setFormData(prev => ({
          ...prev,
          parcours_enseignes: [parcoursDisponibles[0]]
        }))
      }
    }
  }, [formData.mention, formData.mention_enseignee, formData.role])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      if (name === 'niveaux_enseignes') {
        setFormData(prev => {
          const newNiveaux = checked 
            ? [...prev.niveaux_enseignes, value]
            : prev.niveaux_enseignes.filter(n => n !== value)
          return { ...prev, niveaux_enseignes: newNiveaux }
        })
      } else if (name === 'parcours_enseignes') {
        setFormData(prev => {
          const newParcours = checked 
            ? [...prev.parcours_enseignes, value]
            : prev.parcours_enseignes.filter(p => p !== value)
          return { ...prev, parcours_enseignes: newParcours }
        })
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
    
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    const form = e.currentTarget
    e.preventDefault()
    
    // ✅ AJOUT: Vérifier la connexion Internet
    if (!navigator.onLine) {
      setError('❌ Pas de connexion Internet. Vérifiez votre WiFi/Données mobiles.')
      return
    }
    
    if (form.checkValidity() === false) {
      e.stopPropagation()
      setValidated(true)
      return
    }

    // Validation spécifique pour les enseignants
    if (formData.role === 'enseignant') {
      if (formData.niveaux_enseignes.length === 0) {
        setError('Veuillez sélectionner au moins un niveau enseigné.')
        return
      }
      if (formData.parcours_enseignes.length === 0) {
        setError('Veuillez sélectionner au moins un parcours enseigné.')
        return
      }
    }

    if (formData.mot_de_passe !== formData.confirm_password) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (formData.mot_de_passe.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    setError('')
    setValidated(true)

    try {
      // Préparer les données selon le rôle
      let submitData = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim().toLowerCase(),
        matricule: formData.matricule.trim(),
        mot_de_passe: formData.mot_de_passe,
        role: formData.role
      }

      // Ajouter les champs spécifiques selon le rôle
      if (formData.role === 'etudiant') {
        submitData.niveau = formData.niveau
        submitData.mention = formData.mention
        submitData.parcours = formData.parcours
      } else if (formData.role === 'enseignant') {
        submitData.niveaux_enseignes = formData.niveaux_enseignes
        submitData.mention_enseignee = formData.mention_enseignee
        submitData.parcours_enseignes = formData.parcours_enseignes
      }

      // ✅ AJOUT: Log pour vérifier les données avant envoi
      console.log('📤 Données préparées pour envoi:', submitData)
      console.log('📤 JSON stringifié:', JSON.stringify(submitData))
      
      const response = await api.post('/auth/register', submitData)
      onLogin(response.data.user, response.data.token)
    } catch (error) {
      console.error('Erreur d\'inscription complète:', error)
      
      // ✅ AMÉLIORATION: Gestion détaillée des erreurs
      if (error.response?.status === 500) {
        setError('Erreur serveur (500). Le backend a un problème. Veuillez réessayer plus tard ou contacter l\'administrateur.')
      } else if (error.response?.status === 400) {
        setError('Données invalides. Vérifiez que tous les champs sont correctement remplis.')
      } else if (error.code === 'ERR_NETWORK') {
        setError('Impossible de joindre le serveur. Vérifiez votre connexion Internet.')
      } else if (error.isServerError) {
        setError('Problème serveur. Le backend ne fonctionne pas correctement.')
      } else {
        setError(error.response?.data?.message || 'Erreur lors de l\'inscription. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  const Icon = ({ name, fallback, className = "" }) => {
    return (
      <>
        <i className={`bi bi-${name} ${className}`}></i>
        {fallback && <span className="ms-1">{fallback}</span>}
      </>
    )
  }

  // ✅ AJOUT: Fonction de test pour debug
  const testBackendConnection = async () => {
    try {
      console.log('🧪 Test connexion backend...')
      const response = await fetch('https://qr-presence-api.onrender.com/api/health')
      const data = await response.json()
      console.log('✅ Health check:', data)
      alert(`Backend status: ${response.ok ? 'OK' : 'ERROR'}\nMessage: ${data.message || 'No message'}`)
    } catch (error) {
      console.error('❌ Test échoué:', error)
      alert('Backend inaccessible. Vérifiez que le serveur est démarré.')
    }
  }

  return (
    <div className="login-fullscreen-container">
      <div className="login-fullscreen-background">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>
      
      <Container fluid className="login-fullscreen-content h-100">
        <Row className="g-0 h-100">
          {/* Partie gauche - Illustration/Branding */}
          <Col lg={6} className="d-none d-lg-flex login-brand-section">
            <div className="login-brand-content">
              <div className="brand-logo mb-4">
                <Icon name="person-check-fill" className="text-white" />
              </div>
              <h1 className="text-white fw-bold display-5 mb-3">
                Contrôle de Présence ENI
              </h1>
              <p className="text-white-50 lead mb-4">
                Système intelligent de gestion des présences - École Nationale d'Informatique
              </p>
              <div className="features-list">
                <div className="feature-item">
                  <Icon name="check-circle-fill" className="text-success me-3" />
                  <span className="text-white">Inscription rapide</span>
                </div>
                <div className="feature-item">
                  <Icon name="check-circle-fill" className="text-success me-3" />
                  <span className="text-white">Accès immédiat</span>
                </div>
                <div className="feature-item">
                  <Icon name="check-circle-fill" className="text-success me-3" />
                  <span className="text-white">Interface intuitive</span>
                </div>
              </div>
              
              {/* ✅ AJOUT: Bouton de test temporaire */}
              <Button 
                variant="outline-light" 
                size="sm" 
                className="mt-4"
                onClick={testBackendConnection}
              >
                <Icon name="wifi" className="me-2" />
                Tester connexion backend
              </Button>
            </div>
          </Col>

          {/* Partie droite - Formulaire */}
          <Col lg={6} className="d-flex align-items-center justify-content-center login-form-section">
            <div className="login-form-container">
              <Card className="login-card shadow-lg border-0">
                <Card.Body className="p-4 p-md-5">
                  <div className="text-center mb-4">
                    <div className="login-logo mb-3 d-lg-none">
                      <Icon name="person-check-fill" className="text-white" />
                    </div>
                    <h2 className="text-primary fw-bold mb-2">Inscription ENI</h2>
                    <p className="text-muted mb-0">Créez votre compte personnel</p>
                  </div>
                  
                  {error && (
                    <Alert 
                      variant="danger" 
                      className="d-flex align-items-center"
                      dismissible
                      onClose={() => setError('')}
                    >
                      <Icon name="exclamation-triangle-fill" className="me-2" />
                      {error}
                    </Alert>
                  )}
                  
                  <Form noValidate validated={validated} onSubmit={handleSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold text-dark">
                            <Icon name="person" className="me-2 text-primary" />
                            Nom
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="nom"
                            value={formData.nom}
                            onChange={handleChange}
                            required
                            placeholder="Votre nom"
                            className="py-3 px-3 border-0 bg-light"
                            disabled={loading}
                          />
                          <Form.Control.Feedback type="invalid">
                            Veuillez saisir votre nom.
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold text-dark">
                            Prénom
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="prenom"
                            value={formData.prenom}
                            onChange={handleChange}
                            required
                            placeholder="Votre prénom"
                            className="py-3 px-3 border-0 bg-light"
                            disabled={loading}
                          />
                          <Form.Control.Feedback type="invalid">
                            Veuillez saisir votre prénom.
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold text-dark">
                        <Icon name="envelope" className="me-2 text-primary" />
                        Email
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="votre@email.com"
                        className="py-3 px-3 border-0 bg-light"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        Veuillez saisir un email valide.
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold text-dark">
                        <Icon name="person-badge" className="me-2 text-primary" />
                        Matricule
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="matricule"
                        value={formData.matricule}
                        onChange={handleChange}
                        required
                        placeholder="Votre matricule ENI"
                        className="py-3 px-3 border-0 bg-light"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        Veuillez saisir votre matricule.
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold text-dark">
                        <Icon name="person-gear" className="me-2 text-primary" />
                        Rôle
                      </Form.Label>
                      <Form.Select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="py-3 px-3 border-0 bg-light"
                        disabled={loading}
                      >
                        <option value="etudiant">Étudiant</option>
                        <option value="enseignant">Enseignant</option>
                      </Form.Select>
                    </Form.Group>

                    {/* Champs spécifiques selon le rôle */}
                    {formData.role === 'etudiant' ? (
                      <>
                        <Row>
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold text-dark">
                                <Icon name="book" className="me-2 text-primary" />
                                Niveau
                              </Form.Label>
                              <Form.Select
                                name="niveau"
                                value={formData.niveau}
                                onChange={handleChange}
                                className="py-3 px-3 border-0 bg-light"
                                disabled={loading}
                              >
                                {niveauxOptions.map(niveau => (
                                  <option key={niveau} value={niveau}>{niveau}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold text-dark">
                                Mention
                              </Form.Label>
                              <Form.Select
                                name="mention"
                                value={formData.mention}
                                onChange={handleChange}
                                className="py-3 px-3 border-0 bg-light"
                                disabled={loading}
                              >
                                {mentionsOptions.map(mention => (
                                  <option key={mention} value={mention}>{mention}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold text-dark">
                                Parcours
                              </Form.Label>
                              <Form.Select
                                name="parcours"
                                value={formData.parcours}
                                onChange={handleChange}
                                className="py-3 px-3 border-0 bg-light"
                                disabled={loading}
                              >
                                {parcoursOptions.map(parcours => (
                                  <option key={parcours} value={parcours}>{parcours}</option>
                                ))}
                              </Form.Select>
                              <Form.Text className="text-muted">
                                {formData.mention === 'Informatique'}
                                {formData.mention === 'Intelligence Artificielle'}
                                {formData.mention === 'Expertise Digitale'}
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      </>
                    ) : (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold text-dark">
                            <Icon name="book" className="me-2 text-primary" />
                            Niveaux enseignés (multi-sélection)
                          </Form.Label>
                          <div className="border rounded p-3 bg-light">
                            {niveauxOptions.map(niveau => (
                              <Form.Check
                                key={niveau}
                                type="checkbox"
                                id={`niveau-${niveau}`}
                                name="niveaux_enseignes"
                                value={niveau}
                                label={niveau}
                                checked={formData.niveaux_enseignes.includes(niveau)}
                                onChange={handleChange}
                                className="mb-2"
                              />
                            ))}
                          </div>
                          <Form.Text className="text-muted">
                            Sélectionnez tous les niveaux que vous enseignez
                          </Form.Text>
                        </Form.Group>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold text-dark">
                                Mention enseignée
                              </Form.Label>
                              <Form.Select
                                name="mention_enseignee"
                                value={formData.mention_enseignee}
                                onChange={handleChange}
                                className="py-3 px-3 border-0 bg-light"
                                disabled={loading}
                              >
                                {mentionsOptions.map(mention => (
                                  <option key={mention} value={mention}>{mention}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-semibold text-dark">
                                Parcours enseignés
                              </Form.Label>
                              <div className="border rounded p-3 bg-light">
                                {parcoursOptions.map(parcours => (
                                  <Form.Check
                                    key={parcours}
                                    type="checkbox"
                                    id={`parcours-${parcours}`}
                                    name="parcours_enseignes"
                                    value={parcours}
                                    label={parcours}
                                    checked={formData.parcours_enseignes.includes(parcours)}
                                    onChange={handleChange}
                                    className="mb-2"
                                  />
                                ))}
                              </div>
                              <Form.Text className="text-muted">
                                {formData.mention_enseignee === 'Informatique'}
                                {formData.mention_enseignee === 'Intelligence Artificielle'}
                                {formData.mention_enseignee === 'Expertise Digitale'}
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      </>
                    )}

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold text-dark">
                            <Icon name="lock-fill" className="me-2 text-primary" />
                            Mot de passe
                          </Form.Label>
                          <Form.Control
                            type="password"
                            name="mot_de_passe"
                            value={formData.mot_de_passe}
                            onChange={handleChange}
                            required
                            placeholder="Mot de passe"
                            className="py-3 px-3 border-0 bg-light"
                            disabled={loading}
                            minLength={6}
                          />
                          <Form.Control.Feedback type="invalid">
                            Le mot de passe doit contenir au moins 6 caractères.
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-semibold text-dark">
                            Confirmation
                          </Form.Label>
                          <Form.Control
                            type="password"
                            name="confirm_password"
                            value={formData.confirm_password}
                            onChange={handleChange}
                            required
                            placeholder="Confirmer le mot de passe"
                            className="py-3 px-3 border-0 bg-light"
                            disabled={loading}
                          />
                          <Form.Control.Feedback type="invalid">
                            Veuillez confirmer votre mot de passe.
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Button 
                      variant="primary" 
                      type="submit" 
                      className="w-100 py-3 login-btn fw-semibold border-0" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Inscription en cours...
                        </>
                      ) : (
                        <>
                          <Icon name="person-plus" className="me-2" />
                          S'inscrire
                        </>
                      )}
                    </Button>
                  </Form>

                  <div className="text-center mt-4 pt-3 border-top">
                    <p className="text-muted mb-2">
                      Vous avez déjà un compte ?
                    </p>
                    <Button 
                      variant="outline-secondary" 
                      className="w-100"
                      onClick={onShowLogin}
                    >
                      <Icon name="box-arrow-in-right" className="me-2" />
                      Se connecter
                    </Button>
                  </div>
                  
                  <div className="text-center mt-4 pt-3 border-top">
                    <small className="text-muted">
                      <Icon name="shield-check" className="me-1" />
                      Vos données sont sécurisées et confidentielles
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Register