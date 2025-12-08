import { Navbar, Nav, Container, Dropdown, Badge } from 'react-bootstrap'

function CustomNavbar({ user, onLogout }) {
  const getUserDisplayName = () => {
    if (!user) {
      return 'Utilisateur'
    }

    // Vérifier la structure de l'objet user
    const prenom = user.prenom || (user.profil && user.profil.prenom) || 'Prénom'
    const nom = user.nom || (user.profil && user.profil.nom) || 'Nom'
    
    if (user.type_utilisateur === 'etudiant') {
      return `${prenom} ${nom}`
    } else if (user.type_utilisateur === 'enseignant') {
      return `${prenom} ${nom}`
    } else if (user.type_utilisateur === 'admin') {
      return `${prenom} ${nom}`
    } else {
      return `${prenom} ${nom}`
    }
  }

  const getUserBadge = () => {
    if (!user) return null
    
    const type = user.type_utilisateur
    const badgeVariant = {
      'etudiant': 'info',
      'enseignant': 'success',
      'admin': 'danger'
    }[type] || 'secondary'
    
    const badgeText = {
      'etudiant': 'Étudiant',
      'enseignant': 'Enseignant',
      'admin': 'Admin'
    }[type] || 'Utilisateur'
    
    return (
      <Badge bg={badgeVariant} className="ms-2 fs-7">
        {badgeText}
      </Badge>
    )
  }

  const getMatricule = () => {
    if (!user) return 'N/A'
    return user.matricule || (user.profil && user.profil.matricule) || 'N/A'
  }

  const getInitials = () => {
    if (!user) return 'U'
    
    const prenom = user.prenom || (user.profil && user.profil.prenom) || ''
    const nom = user.nom || (user.profil && user.profil.nom) || ''
    
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || 'U'
  }

  // Fonction pour vérifier si le lien est actif basé sur le hash
  const isActive = (hash) => {
    return window.location.hash === hash
  }

  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="shadow-sm navbar-sticky">
      <Container fluid="lg">
        <Navbar.Brand href="#/dashboard" className="fw-bold d-flex align-items-center">
          <div className="brand-icon me-2">
            <i className="bi bi-qr-code-scan fs-4"></i>
          </div>
          <div className="d-flex flex-column">
            <span className="fs-4">Contrôle Présence</span>
            <small className="text-light opacity-75 fs-7">Système de gestion</small>
          </div>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0">
          <i className="bi bi-list"></i>
        </Navbar.Toggle>
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto">
            <Nav.Link 
              href="#/dashboard" 
              className="mx-2 px-3 py-2 rounded-pill nav-link-hover"
              active={isActive('#/dashboard')}
            >
              <i className="bi bi-house-door me-2"></i>
              Tableau de bord
            </Nav.Link>
            
            {user && user.type_utilisateur === 'etudiant' && (
              <>
                <Nav.Link 
                  href="#/scan" 
                  className="mx-2 px-3 py-2 rounded-pill nav-link-hover"
                  active={isActive('#/scan')}
                >
                  <i className="bi bi-qr-code me-2"></i>
                  Scanner QR
                  <Badge bg="warning" className="ms-2 pulse-animation">Nouveau</Badge>
                </Nav.Link>
                <Nav.Link 
                  href="#/student" 
                  className="mx-2 px-3 py-2 rounded-pill nav-link-hover"
                  active={isActive('#/student')}
                >
                  <i className="bi bi-calendar-check me-2"></i>
                  Mes présences
                </Nav.Link>
              </>
            )}
            
            {user && user.type_utilisateur === 'enseignant' && (
              <Nav.Link 
                href="#/teacher" 
                className="mx-2 px-3 py-2 rounded-pill nav-link-hover"
                active={isActive('#/teacher')}
              >
                <i className="bi bi-journal-text me-2"></i>
                Gestion Cours
              </Nav.Link>
            )}
            
            {user && user.type_utilisateur === 'admin' && (
              <Nav.Link 
                href="#/admin" 
                className="mx-2 px-3 py-2 rounded-pill nav-link-hover"
                active={isActive('#/admin')}
              >
                <i className="bi bi-gear me-2"></i>
                Administration
              </Nav.Link>
            )}
          </Nav>
          
          <Nav className="align-items-center">
            <Dropdown align="end" className="user-dropdown">
              <Dropdown.Toggle 
                variant="light" 
                id="dropdown-basic"
                className="d-flex align-items-center bg-white border-0 rounded-pill px-3 py-2 shadow-sm"
              >
                <div className="user-avatar me-2 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                     style={{ width: '32px', height: '32px' }}>
                  {getInitials()}
                </div>
                <div className="d-none d-md-flex flex-column text-start">
                  <span className="fw-semibold">{getUserDisplayName()}</span>
                  <small className="text-muted">{user?.email || ''}</small>
                </div>
                {getUserBadge()}
                <i className="bi bi-chevron-down ms-2 fs-8"></i>
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow border-0 mt-2 p-3" style={{ minWidth: '280px' }}>
                <Dropdown.Item 
                  onClick={onLogout}
                  className="d-flex align-items-center py-2 rounded text-danger"
                >
                  <i className="bi bi-box-arrow-right me-3"></i>
                  <div>
                    <div>Déconnexion</div>
                    <small className="text-muted">Quitter la session</small>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
      
      <style jsx="true">{`
        .nav-link-hover:hover {
          background-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        .user-avatar {
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .user-avatar-lg {
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .navbar-sticky {
          position: sticky;
          top: 0;
          z-index: 1020;
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            opacity: 1;
          }
        }
        
        .user-dropdown .dropdown-toggle::after {
          display: none;
        }
        
        .dropdown-item:hover {
          background-color: #f8f9fa;
        }
        
        .brand-icon {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px;
          border-radius: 10px;
        }
        
        .fs-7 {
          font-size: 0.875rem !important;
        }
        
        .fs-8 {
          font-size: 0.75rem !important;
        }
        
        /* Style pour les liens actifs */
        .nav-link.active {
          background-color: rgba(255, 255, 255, 0.2) !important;
          font-weight: 600;
        }
      `}</style>
    </Navbar>
  )
}

export default CustomNavbar