import { useState } from 'react'
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap'
import axios from 'axios'
import './Login.css'

function Login({ onLogin, onShowRegister }) {
  const [formData, setFormData] = useState({
    matricule: '',
    mot_de_passe: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post('http://localhost:3002/api/auth/login', formData)
      
      if (response.data.success && response.data.user && response.data.token) {
        onLogin(response.data.user, response.data.token)
      } else {
        setError('Erreur lors de la connexion. Veuillez réessayer.')
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      if (error.response?.status === 401) {
        setError('Matricule ou mot de passe incorrect.')
      } else if (error.response?.status === 500) {
        setError('Service temporairement indisponible')
      } else {
        setError(error.response?.data?.message || 'Erreur lors de la connexion. Vérifiez que le serveur est démarré.')
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
                  <span className="text-white">Connexion sécurisée</span>
                </div>
                <div className="feature-item">
                  <Icon name="check-circle-fill" className="text-success me-3" />
                  <span className="text-white">Gestion QR Code</span>
                </div>
                <div className="feature-item">
                  <Icon name="check-circle-fill" className="text-success me-3" />
                  <span className="text-white">Suivi en temps réel</span>
                </div>
              </div>
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
                    <h2 className="text-primary fw-bold mb-2">Connexion ENI</h2>
                    <p className="text-muted mb-0">Accédez à votre espace personnel</p>
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
                  
                  <Form onSubmit={handleSubmit}>
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
                    </Form.Group>

                    <Form.Group className="mb-4">
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
                        placeholder="Votre mot de passe"
                        className="py-3 px-3 border-0 bg-light"
                        disabled={loading}
                      />
                    </Form.Group>
                    
                    <Button 
                      variant="primary" 
                      type="submit" 
                      className="w-100 py-3 login-btn fw-semibold border-0" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          <Icon name="box-arrow-in-right" className="me-2" />
                          Se connecter
                        </>
                      )}
                    </Button>
                  </Form>

                  <div className="text-center mt-4 pt-3 border-top">
                    <p className="text-muted mb-2">
                      Vous n'avez pas de compte ?
                    </p>
                    <Button 
                      variant="outline-secondary" 
                      className="w-100"
                      onClick={onShowRegister}
                    >
                      <Icon name="person-plus" className="me-2" />
                      S'inscrire
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

export default Login
