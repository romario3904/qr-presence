import { useState, useEffect } from 'react'
import { Form, Button, Card, Alert, Container, Row, Col, Spinner } from 'react-bootstrap'
import api from '../apis'

const MENTION_HINTS = {
  Informatique: 'Parcours disponibles : GB, IG, ASR',
  'Intelligence Artificielle': 'Parcours disponibles : GID, OCC',
  'Expertise Digitale': 'Parcours disponibles : MDI, ASI'
}

function Register({ onLogin, onShowLogin }) {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    matricule: '',
    mot_de_passe: '',
    confirm_password: '',
    role: 'etudiant',
    niveau: 'L1',
    mention: 'Informatique',
    parcours: 'GB',
    niveaux_enseignes: ['L1'],
    mention_enseignee: 'Informatique',
    parcours_enseignes: ['GB']
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validated, setValidated] = useState(false)

  const niveauxOptions = ['L1', 'L2', 'L3', 'M1', 'M2']
  const mentionsOptions = ['Informatique', 'Intelligence Artificielle', 'Expertise Digitale']

  const parcoursParMention = {
    Informatique: ['GB', 'IG', 'ASR'],
    'Intelligence Artificielle': ['GID', 'OCC'],
    'Expertise Digitale': ['MDI', 'ASI']
  }

  const [parcoursOptions, setParcoursOptions] = useState(parcoursParMention.Informatique)

  useEffect(() => {
    if (formData.role === 'etudiant') {
      setParcoursOptions(parcoursParMention[formData.mention] || [])

      if (!parcoursParMention[formData.mention]?.includes(formData.parcours)) {
        setFormData((prev) => ({
          ...prev,
          parcours: parcoursParMention[formData.mention]?.[0] || 'GB'
        }))
      }
    } else {
      const parcoursDisponibles = parcoursParMention[formData.mention_enseignee] || ['GB']
      setParcoursOptions(parcoursDisponibles)

      const parcoursFiltres = formData.parcours_enseignes.filter((p) =>
        parcoursDisponibles.includes(p)
      )
      if (parcoursFiltres.length === 0 && parcoursDisponibles.length > 0) {
        setFormData((prev) => ({
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
        setFormData((prev) => {
          const newNiveaux = checked
            ? [...prev.niveaux_enseignes, value]
            : prev.niveaux_enseignes.filter((n) => n !== value)
          return { ...prev, niveaux_enseignes: newNiveaux }
        })
      } else if (name === 'parcours_enseignes') {
        setFormData((prev) => {
          const newParcours = checked
            ? [...prev.parcours_enseignes, value]
            : prev.parcours_enseignes.filter((p) => p !== value)
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

  const setRole = (role) => {
    setFormData((prev) => ({ ...prev, role }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    const form = e.currentTarget
    e.preventDefault()

    if (!navigator.onLine) {
      setError('Pas de connexion Internet. Vérifiez votre WiFi ou vos données mobiles.')
      return
    }

    if (form.checkValidity() === false) {
      e.stopPropagation()
      setValidated(true)
      return
    }

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
      let submitData = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim().toLowerCase(),
        matricule: formData.matricule.trim(),
        mot_de_passe: formData.mot_de_passe,
        role: formData.role
      }

      if (formData.role === 'etudiant') {
        submitData.niveau = formData.niveau
        submitData.mention = formData.mention
        submitData.parcours = formData.parcours
      } else if (formData.role === 'enseignant') {
        submitData.niveaux_enseignes = formData.niveaux_enseignes
        submitData.mention_enseignee = formData.mention_enseignee
        submitData.parcours_enseignes = formData.parcours_enseignes
      }

      const response = await api.post('/auth/register', submitData)
      onLogin(response.data.user, response.data.token)
    } catch (err) {
      console.error("Erreur d'inscription:", err)

      if (err.response?.status === 500) {
        setError(
          "Erreur serveur. Veuillez réessayer plus tard ou contacter l'administrateur."
        )
      } else if (err.response?.status === 400) {
        setError('Données invalides. Vérifiez que tous les champs sont correctement remplis.')
      } else if (err.code === 'ERR_NETWORK') {
        setError('Impossible de joindre le serveur. Vérifiez votre connexion Internet.')
      } else if (err.isServerError) {
        setError('Problème serveur. Le backend ne fonctionne pas correctement.')
      } else {
        setError(err.response?.data?.message || "Erreur lors de l'inscription. Veuillez réessayer.")
      }
    } finally {
      setLoading(false)
    }
  }

  const testBackendConnection = async () => {
    try {
      const response = await fetch('https://qr-presence-api.onrender.com/api/health')
      const data = await response.json()
      alert(`Backend status: ${response.ok ? 'OK' : 'ERROR'}\nMessage: ${data.message || 'No message'}`)
    } catch {
      alert('Backend inaccessible. Vérifiez que le serveur est démarré.')
    }
  }

  return (
    <div className="register-page">
      <Container>
        <Row className="align-items-start align-items-lg-center g-4">
          <Col lg={5} className="d-none d-lg-block">
            <div className="register-brand-panel">
              <div className="login-logo-pro mb-4" style={{ margin: '0 0 1.5rem' }}>
                <i className="bi bi-person-plus-fill" />
              </div>
              <h1>Rejoignez QR Présence</h1>
              <p>
                Créez votre compte pour pointer votre présence en un scan et suivre votre
                assiduité en temps réel.
              </p>
              <div className="register-feature">
                <i className="bi bi-check-circle-fill" />
                <span>Inscription en quelques minutes</span>
              </div>
              <div className="register-feature">
                <i className="bi bi-check-circle-fill" />
                <span>Étudiant ou enseignant</span>
              </div>
              <div className="register-feature">
                <i className="bi bi-check-circle-fill" />
                <span>Données sécurisées</span>
              </div>
              {import.meta.env.DEV && (
                <Button
                  variant="outline-light"
                  size="sm"
                  className="mt-4 btn-pill"
                  onClick={testBackendConnection}
                >
                  <i className="bi bi-wifi me-2" />
                  Tester le backend
                </Button>
              )}
            </div>
          </Col>

          <Col xs={12} lg={7}>
            <Card className="login-card-pro register-card border-0">
              <Card.Body>
                <div className="text-center mb-4 d-lg-none">
                  <div className="login-logo-pro">
                    <i className="bi bi-person-plus-fill" />
                  </div>
                </div>

                <div className="text-center mb-4">
                  <h2 className="fw-bold mb-1 text-primary">Créer un compte</h2>
                  <p className="text-muted mb-0">Remplissez le formulaire ci-dessous</p>
                </div>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    {error}
                  </Alert>
                )}

                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                  <div className="register-section-title">
                    <i className="bi bi-person" />
                    Identité
                  </div>

                  <Row className="g-3">
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label>Nom</Form.Label>
                        <Form.Control
                          type="text"
                          name="nom"
                          value={formData.nom}
                          onChange={handleChange}
                          required
                          placeholder="Votre nom"
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          Veuillez saisir votre nom.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label>Prénom</Form.Label>
                        <Form.Control
                          type="text"
                          name="prenom"
                          value={formData.prenom}
                          onChange={handleChange}
                          required
                          placeholder="Votre prénom"
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          Veuillez saisir votre prénom.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-3 mt-1">
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="votre@email.com"
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          Veuillez saisir un email valide.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label>Matricule</Form.Label>
                        <Form.Control
                          type="text"
                          name="matricule"
                          value={formData.matricule}
                          onChange={handleChange}
                          required
                          placeholder="Votre matricule"
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          Veuillez saisir votre matricule.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="register-section-title">
                    <i className="bi bi-mortarboard" />
                    Profil
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label>Type de compte</Form.Label>
                    <div className="role-toggle">
                      <button
                        type="button"
                        className={`role-toggle-btn ${formData.role === 'etudiant' ? 'active' : ''}`}
                        onClick={() => setRole('etudiant')}
                        disabled={loading}
                      >
                        <i className="bi bi-person" />
                        Étudiant
                      </button>
                      <button
                        type="button"
                        className={`role-toggle-btn ${formData.role === 'enseignant' ? 'active' : ''}`}
                        onClick={() => setRole('enseignant')}
                        disabled={loading}
                      >
                        <i className="bi bi-person-workspace" />
                        Enseignant
                      </button>
                    </div>
                    <input type="hidden" name="role" value={formData.role} />
                  </Form.Group>

                  {formData.role === 'etudiant' ? (
                    <Row className="g-3">
                      <Col xs={12} sm={4}>
                        <Form.Group>
                          <Form.Label>Niveau</Form.Label>
                          <Form.Select
                            name="niveau"
                            value={formData.niveau}
                            onChange={handleChange}
                            disabled={loading}
                          >
                            {niveauxOptions.map((niveau) => (
                              <option key={niveau} value={niveau}>
                                {niveau}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={4}>
                        <Form.Group>
                          <Form.Label>Mention</Form.Label>
                          <Form.Select
                            name="mention"
                            value={formData.mention}
                            onChange={handleChange}
                            disabled={loading}
                          >
                            {mentionsOptions.map((mention) => (
                              <option key={mention} value={mention}>
                                {mention}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col xs={12} sm={4}>
                        <Form.Group>
                          <Form.Label>Parcours</Form.Label>
                          <Form.Select
                            name="parcours"
                            value={formData.parcours}
                            onChange={handleChange}
                            disabled={loading}
                          >
                            {parcoursOptions.map((parcours) => (
                              <option key={parcours} value={parcours}>
                                {parcours}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Text className="text-muted">
                            {MENTION_HINTS[formData.mention]}
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  ) : (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label>Niveaux enseignés</Form.Label>
                        <div className="register-check-group">
                          {niveauxOptions.map((niveau) => (
                            <Form.Check
                              key={niveau}
                              type="checkbox"
                              id={`niveau-${niveau}`}
                              name="niveaux_enseignes"
                              value={niveau}
                              label={niveau}
                              checked={formData.niveaux_enseignes.includes(niveau)}
                              onChange={handleChange}
                              disabled={loading}
                            />
                          ))}
                        </div>
                        <Form.Text className="text-muted">
                          Sélectionnez tous les niveaux que vous enseignez
                        </Form.Text>
                      </Form.Group>

                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Mention enseignée</Form.Label>
                            <Form.Select
                              name="mention_enseignee"
                              value={formData.mention_enseignee}
                              onChange={handleChange}
                              disabled={loading}
                            >
                              {mentionsOptions.map((mention) => (
                                <option key={mention} value={mention}>
                                  {mention}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Parcours enseignés</Form.Label>
                            <div className="register-check-group">
                              {parcoursOptions.map((parcours) => (
                                <Form.Check
                                  key={parcours}
                                  type="checkbox"
                                  id={`parcours-${parcours}`}
                                  name="parcours_enseignes"
                                  value={parcours}
                                  label={parcours}
                                  checked={formData.parcours_enseignes.includes(parcours)}
                                  onChange={handleChange}
                                  disabled={loading}
                                />
                              ))}
                            </div>
                            <Form.Text className="text-muted">
                              {MENTION_HINTS[formData.mention_enseignee]}
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  <div className="register-section-title">
                    <i className="bi bi-shield-lock" />
                    Sécurité
                  </div>

                  <Row className="g-3">
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label>Mot de passe</Form.Label>
                        <Form.Control
                          type="password"
                          name="mot_de_passe"
                          value={formData.mot_de_passe}
                          onChange={handleChange}
                          required
                          placeholder="Min. 6 caractères"
                          disabled={loading}
                          minLength={6}
                        />
                        <Form.Control.Feedback type="invalid">
                          Le mot de passe doit contenir au moins 6 caractères.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label>Confirmation</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleChange}
                          required
                          placeholder="Confirmer le mot de passe"
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
                    className="w-100 btn-lg mt-4"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Inscription en cours...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-2" />
                        Créer mon compte
                      </>
                    )}
                  </Button>
                </Form>

                <div className="register-footer-link text-center">
                  <p className="text-muted mb-2 small">Vous avez déjà un compte ?</p>
                  <Button variant="outline-primary" className="w-100" onClick={onShowLogin}>
                    <i className="bi bi-box-arrow-in-right me-2" />
                    Se connecter
                  </Button>
                  <p className="text-muted small mt-3 mb-0">
                    <i className="bi bi-shield-check me-1" />
                    Vos données sont sécurisées et confidentielles
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Register
