import { Card, Col, Container, Row } from 'react-bootstrap'

export default function DashboardPage({ user }) {
  const role = user?.type_utilisateur || user?.role || '—'
  return (
    <Container className="py-4">
      <Row className="g-3">
        <Col md={12}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h3 className="mb-1">Tableau de bord</h3>
              <div className="text-muted">
                Connecté en tant que <strong>{role}</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h5 className="mb-2">
                <i className="bi bi-person-badge me-2" />
                Profil
              </h5>
              <div>
                <div>
                  <strong>Matricule:</strong> {user?.matricule || '—'}
                </div>
                <div>
                  <strong>Nom:</strong> {[user?.prenom, user?.nom].filter(Boolean).join(' ') || '—'}
                </div>
                <div>
                  <strong>Email:</strong> {user?.email || '—'}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body>
              <h5 className="mb-2">
                <i className="bi bi-lightning-charge me-2" />
                Accès rapide
              </h5>
              <div className="d-grid gap-2">
                <a className="btn btn-outline-primary" href="#/student/presences">
                  Mes présences (étudiant)
                </a>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

