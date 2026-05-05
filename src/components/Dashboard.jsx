// components/Dashboard.jsx
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap'
import { Link } from 'react-router-dom'

function Dashboard({ user }) {
  const getUserName = () => {
    if (!user) return 'Utilisateur'
    return `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur'
  }

  const getUserRole = () => {
    if (!user) return ''
    const roles = { etudiant: 'Étudiant', enseignant: 'Enseignant', admin: 'Administrateur' }
    return roles[user.type_utilisateur] || ''
  }

  if (!user) {
    return (
      <Container className="my-5">
        <Card className="text-center shadow-lg border-0">
          <Card.Body className="p-5">
            <i className="bi bi-shield-exclamation display-1 text-warning"></i>
            <h3 className="mt-3">Session expirée</h3>
            <p className="text-muted">Veuillez vous reconnecter</p>
            <Link to="/login">
              <Button variant="primary">Se connecter</Button>
            </Link>
          </Card.Body>
        </Card>
      </Container>
    )
  }

  const isAdmin = user.type_utilisateur === 'admin'
  const isTeacher = user.type_utilisateur === 'enseignant'
  const isStudent = user.type_utilisateur === 'etudiant'

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <Container className="py-5">
        {/* Header */}
        <Row className="mb-5">
          <Col>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h1 className="display-5 fw-bold mb-2" style={{ color: '#1e3c72' }}>
                  ENI Presence
                </h1>
                <p className="text-muted lead">
                  Welcome back, <strong>{getUserName()}</strong>
                  <Badge bg="primary" className="ms-2">{getUserRole()}</Badge>
                </p>
                <p className="text-muted">Voici un aperçu des métriques d'assiduité d'aujourd'hui.</p>
              </div>
            </div>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Row className="mb-5">
          <Col>
            <Card className="border-0 shadow-lg" style={{ borderRadius: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Card.Body className="p-4">
                <Row className="align-items-center">
                  <Col lg={8}>
                    <h4 className="text-white mb-2">Marquer votre présence</h4>
                    <p className="text-white-50 mb-0">
                      Générez votre QR code de présence unique ou scannez un code de salle de classe
                    </p>
                  </Col>
                  <Col lg={4} className="text-end">
                    <div className="d-flex gap-3 justify-content-lg-end mt-3 mt-lg-0">
                      <Button variant="light" className="rounded-pill px-4 py-2">
                        <i className="bi bi-qr-code me-2"></i>
                        Générer QR
                      </Button>
                      <Link to="/scan">
                        <Button variant="outline-light" className="rounded-pill px-4 py-2">
                          <i className="bi bi-camera me-2"></i>
                          Scanner QR
                        </Button>
                      </Link>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Admin Dashboard */}
        {isAdmin && (
          <>
            <Row className="g-4 mb-5">
              <Col lg={3} md={6}>
                <div className="stat-card">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="stat-value">1,240</div>
                      <div className="stat-label">Total Étudiants</div>
                    </div>
                    <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                      <i className="bi bi-people fs-4 text-primary"></i>
                    </div>
                  </div>
                  <div className="small text-success">
                    <i className="bi bi-arrow-up"></i> +12% ce mois
                  </div>
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="stat-card">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="stat-value">42</div>
                      <div className="stat-label">Classes Actives</div>
                    </div>
                    <div className="bg-success bg-opacity-10 rounded-circle p-3">
                      <i className="bi bi-book fs-4 text-success"></i>
                    </div>
                  </div>
                  <div className="small text-success">
                    <i className="bi bi-arrow-up"></i> +5 nouvelles
                  </div>
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="stat-card">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="stat-value">892</div>
                      <div className="stat-label">Enregistrements Aujourd'hui</div>
                    </div>
                    <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                      <i className="bi bi-calendar-check fs-4 text-warning"></i>
                    </div>
                  </div>
                  <div className="small text-success">
                    <i className="bi bi-arrow-up"></i> +24 vs hier
                  </div>
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="stat-card">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="stat-value">85%</div>
                      <div className="stat-label">Taux de Présence</div>
                    </div>
                    <div className="bg-info bg-opacity-10 rounded-circle p-3">
                      <i className="bi bi-graph-up fs-4 text-info"></i>
                    </div>
                  </div>
                  <div className="small text-success">
                    <i className="bi bi-arrow-up"></i> +2% ce mois
                  </div>
                </div>
              </Col>
            </Row>

            <Row className="g-4">
              <Col lg={7}>
                <Card className="border-0 shadow-lg h-100">
                  <Card.Header className="bg-white border-0 pt-4 pb-0">
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-activity me-2 text-primary"></i>
                      Activités Récentes
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="table-responsive">
                      <table className="table eni-table">
                        <thead>
                          <tr>
                            <th>ÉVÉNEMENT / SUJET</th>
                            <th>HORODATAGE</th>
                            <th>STATUT</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="fw-semibold">Jean Dupont</div>
                              <small className="text-muted">Algorithmique Avancée</small>
                            </td>
                            <td>Aujourd'hui, 08:15 AM</td>
                            <td><span className="badge-eni badge-present">Present</span></td>
                            <td><i className="bi bi-three-dots text-muted"></i></td>
                          </tr>
                          <tr>
                            <td>
                              <div className="fw-semibold">Marie Lefèvre</div>
                              <small className="text-muted">Bases de Données</small>
                            </td>
                            <td>Aujourd'hui, 09:12 AM</td>
                            <td><span className="badge-eni badge-late">Late</span></td>
                            <td><i className="bi bi-three-dots text-muted"></i></td>
                          </tr>
                          <tr>
                            <td>
                              <div className="fw-semibold">Robert Bertrand</div>
                              <small className="text-muted">Architecture Ordinateurs</small>
                            </td>
                            <td>Aujourd'hui, 08:30 AM</td>
                            <td><span className="badge-eni badge-present">Present</span></td>
                            <td><i className="bi bi-three-dots text-muted"></i></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={5}>
                <Card className="border-0 shadow-lg">
                  <Card.Body className="p-4">
                    <div className="text-center mb-4">
                      <div className="position-relative d-inline-block">
                        <div className="rounded-circle bg-primary bg-opacity-10 p-4">
                          <i className="bi bi-calendar-heart fs-1 text-primary"></i>
                        </div>
                      </div>
                      <h2 className="fw-bold mt-3 mb-1">85%</h2>
                      <p className="text-muted">Taux de présence MATCHED</p>
                      <div className="eni-progress mb-3">
                        <div className="eni-progress-bar" style={{ width: '85%' }}></div>
                      </div>
                      <div className="row mt-4">
                        <div className="col-6">
                          <div className="fw-bold fs-3 text-success">242</div>
                          <small className="text-muted">Présents</small>
                        </div>
                        <div className="col-6">
                          <div className="fw-bold fs-3 text-warning">12</div>
                          <small className="text-muted">Absents/Retards</small>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="mt-4">
              <Col lg={12}>
                <Card className="border-0 shadow-lg">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="fw-bold mb-1">Dernière Session</h5>
                        <p className="text-muted mb-0">Algorithmes 201 - Salle 104 - Dr. Artibane</p>
                      </div>
                      <Badge bg="secondary" className="rounded-pill px-3 py-2">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        Terminé à 11:20 (Aujourd'hui)
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* Enseignant Dashboard */}
        {isTeacher && (
          <>
            <Row className="g-4 mb-5">
              <Col lg={4} md={6}>
                <div className="stat-card text-center">
                  <div className="stat-value">8</div>
                  <div className="stat-label">MATIÈRES ENSEIGNÉES</div>
                  <small className="text-muted">Ce semestre</small>
                </div>
              </Col>
              <Col lg={4} md={6}>
                <div className="stat-card text-center">
                  <div className="stat-value">156</div>
                  <div className="stat-label">ÉTUDIANTS</div>
                  <small className="text-muted">Au total</small>
                </div>
              </Col>
              <Col lg={4} md={6}>
                <div className="stat-card text-center">
                  <div className="stat-value">92%</div>
                  <div className="stat-label">TAUX DE PRÉSENCE MOYEN</div>
                  <small className="text-success">
                    <i className="bi bi-arrow-up"></i> +5% ce mois
                  </small>
                </div>
              </Col>
            </Row>

            <Row>
              <Col lg={12}>
                <Card className="border-0 shadow-lg">
                  <Card.Header className="bg-white border-0 pt-4 pb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-calendar-check me-2 text-primary"></i>
                        Sessions Actives Aujourd'hui
                      </h5>
                      <Link to="/teacher">
                        <Button variant="primary" className="rounded-pill px-4">
                          <i className="bi bi-plus-circle me-2"></i>
                          Nouvelle Session
                        </Button>
                      </Link>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="table-responsive">
                      <table className="table eni-table">
                        <thead>
                          <tr>
                            <th>MATIÈRE</th>
                            <th>HORAIRE</th>
                            <th>SALLE</th>
                            <th>STATUT</th>
                            <th>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="fw-semibold">Algorithmique Avancée</td>
                            <td>08:30 - 11:30</td>
                            <td>Salle 102</td>
                            <td><span className="badge-eni badge-present">Actif</span></td>
                            <td>
                              <Button size="sm" variant="outline-primary" className="rounded-pill">
                                <i className="bi bi-eye me-1"></i>
                                Voir QR
                              </Button>
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-semibold">Bases de Données</td>
                            <td>14:00 - 17:00</td>
                            <td>Labo 3</td>
                            <td><span className="badge-eni badge-present">Actif</span></td>
                            <td>
                              <Button size="sm" variant="outline-primary" className="rounded-pill">
                                <i className="bi bi-eye me-1"></i>
                                Voir QR
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* Student Dashboard */}
        {isStudent && (
          <>
            <Row className="g-4 mb-5">
              <Col lg={4} md={6}>
                <div className="stat-card text-center">
                  <div className="stat-value">94.5%</div>
                  <div className="stat-label">TAUX DE PRÉSENCE</div>
                  <small className="text-success">
                    <i className="bi bi-arrow-up"></i> +2% ce mois
                  </small>
                </div>
              </Col>
              <Col lg={4} md={6}>
                <div className="stat-card text-center">
                  <div className="stat-value">156</div>
                  <div className="stat-label">SÉANCES PRÉSENTES</div>
                  <small className="text-muted">Total accumulé ce semestre</small>
                </div>
              </Col>
              <Col lg={4} md={6}>
                <div className="stat-card text-center">
                  <div className="stat-value">8</div>
                  <div className="stat-label">ABSENCES / RETARDS</div>
                  <small className="text-warning">3 absences non justifiées</small>
                </div>
              </Col>
            </Row>

            <Row>
              <Col lg={12}>
                <Card className="border-0 shadow-lg">
                  <Card.Header className="bg-white border-0 pt-4 pb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="fw-bold mb-0">
                        <i className="bi bi-clock-history me-2 text-primary"></i>
                        Historique Détaillé
                      </h5>
                      <Link to="/student">
                        <Button variant="link" className="text-decoration-none">
                          Voir tout <i className="bi bi-arrow-right"></i>
                        </Button>
                      </Link>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div className="table-responsive">
                      <table className="table eni-table">
                        <thead>
                          <tr>
                            <th>DATE & HEURE</th>
                            <th>MATIÈRE</th>
                            <th>ENSEIGNANT</th>
                            <th>SALLE</th>
                            <th>STATUT</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>15 Octobre 2023 <br/><small>08:30 - 12:00</small></td>
                            <td className="fw-semibold">Algorithmique Avancée</td>
                            <td>M. RAZAFINDRABE</td>
                            <td>Salle 102</td>
                            <td><span className="badge-eni badge-present">PRESENT</span></td>
                          </tr>
                          <tr>
                            <td>14 Octobre 2023 <br/><small>14:00 - 17:30</small></td>
                            <td className="fw-semibold">Architecture des Ordinateurs</td>
                            <td>Mme. ANDRIANINA</td>
                            <td>Labo Réseau</td>
                            <td><span className="badge-eni badge-late">RETARD (15min)</span></td>
                          </tr>
                          <tr>
                            <td>13 Octobre 2023 <br/><small>08:30 - 12:00</small></td>
                            <td className="fw-semibold">Base de Données SQL</td>
                            <td>M. TOVO</td>
                            <td>Salle 204</td>
                            <td><span className="badge-eni badge-absent">ABSENT</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-white border-0 pt-2 pb-4">
                    <small className="text-muted">
                      Affichage de 3 sur 156 sessions
                    </small>
                  </Card.Footer>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>

      <style>
        {`
          .stat-card {
            background: white;
            border-radius: 1rem;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          }
          .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1e3c72;
          }
          .stat-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
          }
          .badge-eni {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.75rem;
            border-radius: 2rem;
            font-size: 0.75rem;
            font-weight: 500;
          }
          .badge-present {
            background: #d1fae5;
            color: #065f46;
          }
          .badge-late {
            background: #fed7aa;
            color: #92400e;
          }
          .badge-absent {
            background: #fee2e2;
            color: #991b1b;
          }
          .eni-progress {
            background: #e5e7eb;
            border-radius: 1rem;
            height: 0.75rem;
          }
          .eni-progress-bar {
            background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%);
            border-radius: 1rem;
          }
          .table.eniable th {
            background: #f9fafb;
            padding: 1rem;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
          }
          .table.eniable td {
            padding: 1rem;
            border-bottom: 1px solid #f3f4f6;
          }
          .table.eniable tr:hover td {
            background: #f9fafb;
          }
        `}
      </style>
    </div>
  )
}

export default Dashboard