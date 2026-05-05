// components/Login.jsx
import { useState } from 'react'
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap'

function Login({ onLogin, onShowRegister }) {
  const [formData, setFormData] = useState({
    matricule: '',
    mot_de_passe: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Simulation de connexion pour la démo
    setTimeout(() => {
      if (formData.matricule === 'LXC2450H-F' && formData.mot_de_passe === 'admin') {
        onLogin({ 
          id: 1, 
          matricule: formData.matricule, 
          prenom: 'Admin', 
          nom: 'ENI',
          type_utilisateur: 'admin',
          email: 'admin@eni.edu'
        }, 'fake-token-123')
      } else if (formData.matricule === 'ETU001' && formData.mot_de_passe === 'etu') {
        onLogin({ 
          id: 2, 
          matricule: formData.matricule, 
          prenom: 'Jean', 
          nom: 'Dupont',
          type_utilisateur: 'etudiant',
          email: 'jean.dupont@eni.edu'
        }, 'fake-token-123')
      } else if (formData.matricule === 'PROF001' && formData.mot_de_passe === 'prof') {
        onLogin({ 
          id: 3, 
          matricule: formData.matricule, 
          prenom: 'Dr', 
          nom: 'Artibane',
          type_utilisateur: 'enseignant',
          email: 'artibane@eni.edu'
        }, 'fake-token-123')
      } else {
        setError('Matricule ou mot de passe incorrect')
      }
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="login-fullscreen">
      {/* Background avec dégradé et formes */}
      <div className="login-background">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
      </div>

      {/* Contenu principal */}
      <Container fluid className="login-container h-100">
        <Row className="g-0 h-100">
          {/* Partie gauche - Branding ENI */}
          <Col lg={6} className="login-brand-col">
            <div className="login-brand-content">
              <div className="brand-header mb-5">
                <div className="brand-logo mb-4">
                  <i className="bi bi-qr-code-scan"></i>
                </div>
                <h1 className="brand-title">ENI INFORMATIQUE</h1>
                <p className="brand-subtitle">Contrôle de Présence ENI</p>
              </div>

              <div className="brand-description mb-5">
                <p className="description-text">
                  Le portail académique sécurisé pour la gestion et le suivi en temps réel 
                  de l'assiduité des étudiants. Une solution numérique moderne conçue pour 
                  l'excellence pédagogique.
                </p>
                <div className="stats-badge">
                  <i className="bi bi-people-fill me-2"></i>
                  + de 500 étudiants connectés
                </div>
              </div>

              <div className="brand-features">
                <div className="feature-item">
                  <div className="feature-icon">
                    <i className="bi bi-shield-check"></i>
                  </div>
                  <div className="feature-text">
                    <h6>Authentification sécurisée</h6>
                    <p>Protection avancée de vos données</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <i className="bi bi-clock-history"></i>
                  </div>
                  <div className="feature-text">
                    <h6>Suivi en temps réel</h6>
                    <p>Présences instantanées</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">
                    <i className="bi bi-qr-code"></i>
                  </div>
                  <div className="feature-text">
                    <h6>Scan QR Code</h6>
                    <p>Pointage simple et rapide</p>
                  </div>
                </div>
              </div>

              <div className="brand-footer mt-auto pt-5">
                <small>
                  <i className="bi bi-shield-lock me-1"></i>
                  Vos données sont sécurisées et confidentielles
                </small>
              </div>
            </div>
          </Col>

          {/* Partie droite - Formulaire de connexion */}
          <Col lg={6} className="login-form-col">
            <div className="login-form-wrapper">
              <Card className="login-card">
                <Card.Body className="p-5">
                  <div className="text-center mb-4">
                    <div className="form-logo d-lg-none mb-4">
                      <i className="bi bi-qr-code-scan"></i>
                    </div>
                    <h2 className="form-title">Se connecter</h2>
                    <p className="form-subtitle">
                      Veuillez entrer vos identifiants pour accéder au portail
                    </p>
                  </div>

                  {error && (
                    <Alert 
                      variant="danger" 
                      className="rounded-3 mb-4"
                      dismissible 
                      onClose={() => setError('')}
                    >
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {error}
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-4">
                      <Form.Label className="form-label">
                        <i className="bi bi-person-badge me-2"></i>
                        MATRICULE
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="matricule"
                        value={formData.matricule}
                        onChange={handleChange}
                        required
                        placeholder="Votre matricule ENI"
                        className="form-control-lg"
                        disabled={loading}
                      />
                      <Form.Text className="text-muted">
                        Ex: LXC2450H-F
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <Form.Label className="form-label">
                          <i className="bi bi-lock-fill me-2"></i>
                          MOT DE PASSE
                        </Form.Label>
                        <a href="#" className="forgot-link">Oublié ?</a>
                      </div>
                      <Form.Control
                        type="password"
                        name="mot_de_passe"
                        value={formData.mot_de_passe}
                        onChange={handleChange}
                        required
                        placeholder="Votre mot de passe"
                        className="form-control-lg"
                        disabled={loading}
                      />
                    </Form.Group>

                    <Button
                      type="submit"
                      className="login-btn w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          Se connecter
                          <i className="bi bi-arrow-right ms-2"></i>
                        </>
                      )}
                    </Button>

                    <div className="text-center mt-4">
                      <p className="register-link">
                        Pas encore de compte ?{' '}
                        <Button variant="link" onClick={onShowRegister} className="p-0">
                          S'inscrire
                        </Button>
                      </p>
                    </div>
                  </Form>

                  <hr className="my-4" />

                  <div className="d-flex justify-content-between align-items-center">
                    <div className="footer-links">
                      <a href="#" className="me-3">
                        <i className="bi bi-headset me-1"></i>
                        Assistance
                      </a>
                      <a href="#">
                        <i className="bi bi-globe me-1"></i>
                        Français (FR)
                      </a>
                    </div>
                    <div className="version">
                      <small>Version 2.4.0</small>
                    </div>
                  </div>

                  <div className="text-center mt-4 pt-3 border-top">
                    <small className="copyright">
                      © 2024 ENI Filamentum
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Styles CSS */}
      <style>
        {`
          /* Fullscreen styles */
          .login-fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background: linear-gradient(135deg, #0f172a 0%, #1e3c72 50%, #2a5298 100%);
          }

          /* Background shapes */
          .login-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 0;
          }

          .shape {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
            animation: float 20s infinite ease-in-out;
          }

          .shape-1 {
            width: 500px;
            height: 500px;
            top: -150px;
            right: -150px;
            animation-delay: 0s;
          }

          .shape-2 {
            width: 300px;
            height: 300px;
            bottom: -100px;
            left: -100px;
            animation-delay: 5s;
          }

          .shape-3 {
            width: 200px;
            height: 200px;
            top: 30%;
            left: 20%;
            animation-delay: 10s;
          }

          .shape-4 {
            width: 150px;
            height: 150px;
            bottom: 20%;
            right: 10%;
            animation-delay: 15s;
          }

          .shape-5 {
            width: 100px;
            height: 100px;
            top: 60%;
            right: 25%;
            animation-delay: 7s;
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0) translateX(0) rotate(0deg);
            }
            25% {
              transform: translateY(-20px) translateX(10px) rotate(5deg);
            }
            50% {
              transform: translateY(10px) translateX(-15px) rotate(-5deg);
            }
            75% {
              transform: translateY(-10px) translateX(15px) rotate(3deg);
            }
          }

          /* Container */
          .login-container {
            position: relative;
            z-index: 1;
            height: 100%;
            padding: 0 !important;
          }

          /* Branding column */
          .login-brand-col {
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow-y: auto;
          }

          .login-brand-content {
            max-width: 500px;
            padding: 3rem;
            color: white;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }

          .brand-logo {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
          }

          .brand-title {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
          }

          .brand-subtitle {
            font-size: 1rem;
            opacity: 0.8;
            margin-bottom: 0;
          }

          .description-text {
            font-size: 1.1rem;
            line-height: 1.6;
            opacity: 0.9;
            margin-bottom: 1.5rem;
          }

          .stats-badge {
            display: inline-flex;
            align-items: center;
            background: rgba(255,255,255,0.15);
            padding: 0.5rem 1rem;
            border-radius: 2rem;
            font-size: 0.875rem;
            backdrop-filter: blur(10px);
          }

          .brand-features {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          .feature-item {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .feature-icon {
            width: 45px;
            height: 45px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
          }

          .feature-text h6 {
            margin-bottom: 0.25rem;
            font-weight: 600;
          }

          .feature-text p {
            margin-bottom: 0;
            font-size: 0.8rem;
            opacity: 0.7;
          }

          .brand-footer {
            font-size: 0.75rem;
            opacity: 0.6;
          }

          /* Form column */
          .login-form-col {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            overflow-y: auto;
          }

          .login-form-wrapper {
            width: 100%;
            max-width: 480px;
            padding: 2rem;
          }

          .login-card {
            background: transparent;
            border: none;
            box-shadow: none;
          }

          .form-logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border-radius: 15px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: white;
          }

          .form-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1e3c72;
            margin-bottom: 0.5rem;
          }

          .form-subtitle {
            color: #6c757d;
            margin-bottom: 0;
          }

          .form-label {
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #4a5568;
            margin-bottom: 0.5rem;
          }

          .form-control-lg {
            padding: 0.875rem 1rem;
            font-size: 1rem;
            border-radius: 0.75rem;
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
          }

          .form-control-lg:focus {
            border-color: #2a5298;
            box-shadow: 0 0 0 3px rgba(42, 82, 152, 0.1);
          }

          .forgot-link {
            font-size: 0.8rem;
            color: #2a5298;
            text-decoration: none;
          }

          .forgot-link:hover {
            text-decoration: underline;
          }

          .login-btn {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border: none;
            padding: 0.875rem;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 0.75rem;
            transition: all 0.3s ease;
          }

          .login-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(30, 60, 114, 0.3);
          }

          .login-btn:active:not(:disabled) {
            transform: translateY(0);
          }

          .register-link {
            color: #6c757d;
          }

          .register-link button {
            color: #2a5298;
            font-weight: 600;
            text-decoration: none;
          }

          .register-link button:hover {
            text-decoration: underline;
          }

          .footer-links a {
            color: #6c757d;
            text-decoration: none;
            font-size: 0.8rem;
            transition: color 0.3s ease;
          }

          .footer-links a:hover {
            color: #2a5298;
          }

          .version small {
            color: #6c757d;
            font-size: 0.75rem;
          }

          .copyright {
            color: #a0aec0;
            font-size: 0.7rem;
          }

          hr {
            border-color: #e2e8f0;
          }

          /* Responsive */
          @media (max-width: 991.98px) {
            .login-brand-col {
              display: none;
            }
            
            .login-form-col {
              background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
            }
            
            .login-form-wrapper {
              padding: 1rem;
            }
            
            .login-card .card-body {
              padding: 2rem !important;
            }
          }

          @media (max-width: 576px) {
            .login-form-wrapper {
              padding: 0.5rem;
            }
            
            .login-card .card-body {
              padding: 1.5rem !important;
            }
            
            .form-title {
              font-size: 1.5rem;
            }
          }

          /* Animation entrance */
          .login-brand-content, .login-card {
            animation: fadeInUp 0.6s ease-out;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Scrollbar */
          .login-brand-col::-webkit-scrollbar,
          .login-form-col::-webkit-scrollbar {
            width: 6px;
          }

          .login-brand-col::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.1);
          }

          .login-brand-col::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.3);
            border-radius: 3px;
          }

          .login-form-col::-webkit-scrollbar-track {
            background: #f1f1f1;
          }

          .login-form-col::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }
        `}
      </style>
    </div>
  )
}

export default Login