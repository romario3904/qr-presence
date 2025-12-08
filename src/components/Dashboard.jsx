import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import './Dashboard.css'

function Dashboard({ user }) {
  // Fonction utilitaire pour accéder aux propriétés de manière sécurisée
  const getUserProperty = (propertyPath) => {
    if (!user) return ''
    
    const properties = propertyPath.split('.')
    let value = user
    
    for (const prop of properties) {
      if (value && typeof value === 'object' && prop in value) {
        value = value[prop]
      } else {
        return ''
      }
    }
    
    return value || ''
  }

  const getWelcomeMessage = () => {
    if (!user) {
      return 'Bienvenue'
    }

    const prenom = getUserProperty('prenom') || getUserProperty('profil.prenom') || ''
    const nom = getUserProperty('nom') || getUserProperty('profil.nom') || ''
    const type = getUserProperty('type_utilisateur') || ''

    const fullName = `${prenom} ${nom}`.trim()

    switch (type) {
      case 'etudiant':
        return `Bienvenue ${fullName || 'Étudiant'}`
      case 'enseignant':
        return `Bienvenue Professeur ${fullName || 'Enseignant'}`
      case 'admin':
        return 'Bienvenue Administrateur'
      default:
        return `Bienvenue ${fullName || 'Utilisateur'}`
    }
  }

  const getDashboardCards = () => {
    if (!user) {
      return (
        <Col md={8} className="mx-auto mb-4">
          <Alert variant="warning" className="text-center">
            <Alert.Heading>Utilisateur non connecté</Alert.Heading>
            <p>Veuillez vous connecter pour accéder au tableau de bord.</p>
            <Link to="/login">
              <Button variant="primary">Se connecter</Button>
            </Link>
          </Alert>
        </Col>
      )
    }

    const userType = getUserProperty('type_utilisateur')

    if (userType === 'etudiant') {
      return (
        <Col lg={8} className="mb-4 mx-auto">
          <Row>
            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-lg border-0 hover-card">
                <Card.Body className="text-center p-4 p-md-5">
                  <div className="mb-4">
                    <div className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow dashboard-icon">
                      <i className="bi bi-qr-code-scan" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                  </div>
                  <Card.Title className="h4 mb-3 fw-bold">Scanner QR Code</Card.Title>
                  <Card.Text className="text-muted mb-4">
                    Scannez le QR code de votre professeur pour pointer votre présence
                  </Card.Text>
                  <Link to="/scan">
                    <Button variant="primary" size="lg" className="px-4">
                      <i className="bi bi-qr-code-scan me-2"></i>
                      Scanner maintenant
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-lg border-0 hover-card">
                <Card.Body className="text-center p-4 p-md-5">
                  <div className="mb-4">
                    <div className="bg-success bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow dashboard-icon">
                      <i className="bi bi-calendar-check" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                  </div>
                  <Card.Title className="h4 mb-3 fw-bold">Mes Présences</Card.Title>
                  <Card.Text className="text-muted mb-4">
                    Consultez l'historique de vos présences
                  </Card.Text>
                 <Link to="/student">
                  <Button variant="success" size="lg" className="px-4">
                    <i className="bi bi-calendar-check me-2"></i>
                    Voir mes présences
                  </Button>
                </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      )
    } else if (userType === 'enseignant') {
      return (
        <Col lg={8} className="mb-4 mx-auto">
          <Row>
            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-lg border-0 hover-card">
                <Card.Body className="text-center p-4 p-md-5">
                  <div className="mb-4">
                    <div className="bg-info bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow dashboard-icon">
                      <i className="bi bi-journal-text" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                  </div>
                  <Card.Title className="h4 mb-3 fw-bold">Gestion des Cours</Card.Title>
                  <Card.Text className="text-muted mb-4">
                    Gérez vos cours et créez des séances
                  </Card.Text>
                  <Link to="/teacher">
                    <Button variant="info" size="lg" className="px-4">
                      <i className="bi bi-journal-text me-2"></i>
                      Gérer les cours
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6} className="mb-4">
              <Card className="h-100 shadow-lg border-0 hover-card">
                <Card.Body className="text-center p-4 p-md-5">
                  <div className="mb-4">
                    <div className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow dashboard-icon">
                      <i className="bi bi-qr-code" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                  </div>
                  <Card.Title className="h4 mb-3 fw-bold">Générer QR Code</Card.Title>
                  <Card.Text className="text-muted mb-4">
                    Générez des QR codes pour vos séances de cours
                  </Card.Text>
                  <Link to="/teacher">
                    <Button variant="primary" size="lg" className="px-4">
                      <i className="bi bi-qr-code me-2"></i>
                      Générer QR
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      )
    } else {
      return (
        <Col md={8} className="mx-auto mb-4">
          <Card className="shadow-lg border-0 hover-card">
            <Card.Body className="text-center p-5">
              <div className="mb-4">
                <div className="bg-warning bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow admin-icon">
                  <i className="bi bi-gear" style={{ fontSize: '4rem' }}></i>
                </div>
              </div>
              <Card.Title className="h2 mb-3 fw-bold">Administration</Card.Title>
              <Card.Text className="text-muted mb-4 lead">
                Gérez les utilisateurs et les matières
              </Card.Text>
              <Link to="/admin">
                <Button variant="warning" size="lg" className="px-5">
                  <i className="bi bi-gear me-2"></i>
                  Accéder à l'administration
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      )
    }
  }

  if (!user) {
    return (
      <Container className="my-5">
        <Row className="justify-content-center">
          <Col md={8} className="text-center">
            <Alert variant="warning">
              <Alert.Heading>Session expirée</Alert.Heading>
              <p>Votre session a expiré ou vous n'êtes pas connecté.</p>
              <Link to="/login">
                <Button variant="primary">Se connecter</Button>
              </Link>
            </Alert>
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <Container className="my-5">
      <Row className="mb-5">
        <Col>
          <div className="text-center">
            <div className="mb-3">
              <div className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow welcome-icon">
                <i className="bi bi-speedometer2" style={{ fontSize: '3rem' }}></i>
              </div>
            </div>
            <h1 className="display-4 fw-bold text-primary mb-3">{getWelcomeMessage()}</h1>
            <p className="lead text-muted">
              Système intelligent de contrôle de présence par QR Code
            </p>
          </div>
        </Col>
      </Row>
      
      <Row className="justify-content-center g-4">
        {getDashboardCards()}
      </Row>
    </Container>
  )
}

export default Dashboard