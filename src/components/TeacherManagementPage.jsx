// components/TeacherManagementPage.jsx
import { useState, useEffect, useRef } from 'react'
import { Container, Row, Col, Card, Button, Form, Alert, Table, Badge, Modal } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import api, { apiHelper } from '../apis'

function TeacherManagementPage({ user }) {
  const [matieres, setMatieres] = useState([])
  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)
  const [generatedQR, setGeneratedQR] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  // Formulaire QR Code
  const [qrFormData, setQrFormData] = useState({
    id_matiere: '',
    date_seance: new Date().toISOString().split('T')[0],
    heure_debut: '',
    heure_fin: '',
    salle: ''
  })

  // Référence pour éviter les appels dupliqués
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const loadTeacherData = async () => {
      try {
        setLoading(true)
        setError('')

        const [matieresRes, seancesRes] = await Promise.all([
          apiHelper.getTeacherMatieres().catch((err) => {
            console.warn('Matières indisponibles:', err.message)
            return { matieres: [] }
          }),
          apiHelper.getTeacherSeances().catch((err) => {
            console.warn('Séances indisponibles:', err.message)
            return { seances: [] }
          })
        ])

        setMatieres(matieresRes?.matieres || [])
        setSeances(
          (seancesRes?.seances || []).map((seance) => ({
            ...seance,
            nb_presents: seance.nombre_presents || 0,
            statut: seance.qr_expire && new Date(seance.qr_expire) < new Date() ? 'expire' : 'actif'
          }))
        )
      } catch (err) {
        setError(err.message || 'Impossible de charger les données enseignant')
      } finally {
        setLoading(false)
      }
    }

    loadTeacherData()
  }, [])

  const handleGenerateQR = async (e) => {
    e.preventDefault()
    
    if (generating) return
    
    try {
      setGenerating(true)
      setError('')
      
      // Validation
      if (!qrFormData.id_matiere || !qrFormData.heure_debut || !qrFormData.heure_fin || !qrFormData.salle) {
        setError('Veuillez remplir tous les champs obligatoires')
        setGenerating(false)
        return
      }

      if (qrFormData.heure_debut >= qrFormData.heure_fin) {
        setError('L\'heure de fin doit être après l\'heure de début')
        setGenerating(false)
        return
      }

      const matiereSelectionnee = matieres.find(m => m.id_matiere == qrFormData.id_matiere)

      const response = await api.post('/qr/generate', {
        id_matiere: Number(qrFormData.id_matiere),
        date_seance: qrFormData.date_seance,
        heure_debut: qrFormData.heure_debut,
        heure_fin: qrFormData.heure_fin,
        salle: qrFormData.salle
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Échec de la génération du QR code')
      }

      const seance = response.data.seance
      const qrToken = response.data.qrToken

      const qrData = JSON.stringify({
        id_seance: seance.id_seance,
        token: qrToken,
        matiere_id: qrFormData.id_matiere,
        matiere_nom: matiereSelectionnee?.nom_matiere,
        date: qrFormData.date_seance,
        heure_debut: qrFormData.heure_debut,
        heure_fin: qrFormData.heure_fin,
        salle: qrFormData.salle,
        expires: response.data.qrExpire
      })

      const qrImage = await QRCode.toDataURL(qrToken || qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      })

      const newSeance = {
        ...seance,
        nom_matiere: seance.nom_matiere || matiereSelectionnee?.nom_matiere,
        code_matiere: seance.code_matiere || matiereSelectionnee?.code_matiere,
        nb_presents: 0,
        nb_total: 0,
        statut: 'actif'
      }

      setSeances([newSeance, ...seances])

      setGeneratedQR({
        qrCode: qrImage,
        qrData: qrData,
        seance: {
          nom_matiere: newSeance.nom_matiere,
          date_seance: qrFormData.date_seance,
          heure_debut: qrFormData.heure_debut,
          heure_fin: qrFormData.heure_fin,
          salle: qrFormData.salle,
          qr_expire: response.data.qrExpire
        }
      })
      
      setShowQRModal(true)
      setSuccess('QR Code généré avec succès !')
      
      // Réinitialiser le formulaire
      setQrFormData({
        id_matiere: '',
        date_seance: new Date().toISOString().split('T')[0],
        heure_debut: '',
        heure_fin: '',
        salle: ''
      })
      
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (error) {
      console.error('Erreur génération QR:', error)
      setError('Erreur lors de la génération du QR code')
    } finally {
      setGenerating(false)
    }
  }

  const handleViewQR = (seance) => {
    const qrData = JSON.stringify({
      id_seance: seance.id_seance,
      matiere_nom: seance.nom_matiere,
      date: seance.date_seance,
      heure_debut: seance.heure_debut,
      heure_fin: seance.heure_fin,
      salle: seance.salle
    })
    
    QRCode.toDataURL(qrData, { width: 300, margin: 2 })
      .then(qrImage => {
        setGeneratedQR({
          qrCode: qrImage,
          qrData: qrData,
          seance: seance
        })
        setShowQRModal(true)
      })
      .catch(err => {
        console.error('Erreur génération QR:', err)
        setError('Erreur lors de la génération du QR code')
      })
  }

  const handleGeneratePDF = () => {
    if (!generatedQR) return

    const doc = new jsPDF()
    
    // Titre principal
    doc.setFontSize(20)
    doc.setTextColor(30, 60, 114)
    doc.text('ENI INFORMATIQUE', 105, 20, { align: 'center' })
    
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text('QR Code de Présence', 105, 35, { align: 'center' })
    
    // Ligne séparatrice
    doc.setDrawColor(30, 60, 114)
    doc.line(20, 42, 190, 42)
    
    // Informations
    doc.setFontSize(11)
    let yPosition = 55
    
    doc.setFont(undefined, 'bold')
    doc.text('Matière:', 20, yPosition)
    doc.setFont(undefined, 'normal')
    doc.text(generatedQR.seance?.nom_matiere || 'Non spécifié', 70, yPosition)
    yPosition += 10
    
    doc.setFont(undefined, 'bold')
    doc.text('Date:', 20, yPosition)
    doc.setFont(undefined, 'normal')
    doc.text(generatedQR.seance?.date_seance ? 
      new Date(generatedQR.seance.date_seance).toLocaleDateString('fr-FR') : 
      'Non spécifié', 70, yPosition)
    yPosition += 10
    
    doc.setFont(undefined, 'bold')
    doc.text('Heure:', 20, yPosition)
    doc.setFont(undefined, 'normal')
    doc.text(`${generatedQR.seance?.heure_debut || 'N/A'} - ${generatedQR.seance?.heure_fin || 'N/A'}`, 70, yPosition)
    yPosition += 10
    
    doc.setFont(undefined, 'bold')
    doc.text('Salle:', 20, yPosition)
    doc.setFont(undefined, 'normal')
    doc.text(generatedQR.seance?.salle || 'Non spécifié', 70, yPosition)
    yPosition += 15
    
    // QR Code
    if (generatedQR.qrCode) {
      const qrImageData = generatedQR.qrCode.split(',')[1]
      doc.addImage(qrImageData, 'PNG', 65, yPosition, 80, 80)
      yPosition += 90
      
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text('Scannez ce QR code pour valider votre présence', 105, yPosition, { align: 'center' })
    }
    
    // Pied de page
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 105, pageHeight - 10, { align: 'center' })
    
    // Sauvegarder
    const fileName = `qr-code-${generatedQR.seance?.nom_matiere?.replace(/\s/g, '-') || 'seance'}-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue'
    try {
      const date = new Date(dateString)
      const today = new Date()
      const isToday = date.toDateString() === today.toDateString()
      
      if (isToday) {
        return `Aujourd'hui\n${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      }
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  const isSeanceActive = (seance) => {
    if (seance.statut === 'actif') return true
    if (seance.qr_expire) {
      return new Date(seance.qr_expire) > new Date()
    }
    return false
  }

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <Container className="py-5">
        {/* Header */}
        <Row className="mb-5 fade-in-up">
          <Col>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h1 className="display-5 fw-bold mb-2" style={{ color: '#1e3c72' }}>
                  Gestion des Cours
                </h1>
                <p className="text-muted lead mb-0">
                  Gérez vos séances de cours et générez des QR codes pour vos étudiants
                </p>
              </div>
              <div className="d-flex gap-2">
                <Button 
                  variant="primary" 
                  className="rounded-pill px-4"
                  style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', border: 'none' }}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Nouvelle Session
                </Button>
                <Link to="/dashboard">
                  <Button variant="outline-secondary" className="rounded-pill px-4">
                    <i className="bi bi-arrow-left me-2"></i>
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </Col>
        </Row>

        {/* Alertes */}
        {error && (
          <Alert variant="danger" className="rounded-3 mb-4 fade-in-up" dismissible onClose={() => setError('')}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="rounded-3 mb-4 fade-in-up" dismissible onClose={() => setSuccess('')}>
            <i className="bi bi-check-circle-fill me-2"></i>
            {success}
          </Alert>
        )}

        {/* Quick Action Card */}
        <Row className="mb-5 fade-in-up" style={{ animationDelay: '0.05s' }}>
          <Col>
            <Card className="border-0 shadow-lg overflow-hidden" style={{ borderRadius: '1.5rem' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '2rem'
              }}>
                <Row className="align-items-center">
                  <Col lg={8}>
                    <h3 className="text-white mb-2">
                      <i className="bi bi-qr-code-scan me-2"></i>
                      Génération rapide de QR Code
                    </h3>
                    <p className="text-white-50 mb-0">
                      Créez instantanément un QR code pour votre prochaine session de cours
                    </p>
                  </Col>
                  <Col lg={4} className="text-lg-end mt-3 mt-lg-0">
                    <Button 
                      variant="light" 
                      className="rounded-pill px-4 py-2 fw-semibold"
                      onClick={() => document.getElementById('qr-form-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <i className="bi bi-qr-code me-2"></i>
                      Générer maintenant
                    </Button>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          {/* Formulaire de génération QR Code */}
          <Col lg={5}>
            <Card className="border-0 shadow-lg h-100 fade-in-up" id="qr-form-section" style={{ animationDelay: '0.1s', borderRadius: '1rem' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-0">
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-qr-code me-2 text-primary"></i>
                  Nouvelle Session de Cours
                </h5>
                <p className="text-muted small mt-1 mb-3">Configurez les détails pour générer votre QR code de présence</p>
              </Card.Header>
              <Card.Body className="p-4">
                <Form onSubmit={handleGenerateQR}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      <i className="bi bi-book me-2 text-primary"></i>
                      MATIÈRE
                    </Form.Label>
                    <Form.Select
                      className="py-2 rounded-3 border-0 bg-light"
                      value={qrFormData.id_matiere}
                      onChange={(e) => setQrFormData({ ...qrFormData, id_matiere: e.target.value })}
                      required
                    >
                      <option value="">Sélectionner une matière</option>
                      {matieres.map(matiere => (
                        <option key={matiere.id_matiere} value={matiere.id_matiere}>
                          {matiere.code_matiere} - {matiere.nom_matiere}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">
                          <i className="bi bi-calendar3 me-2 text-primary"></i>
                          DATE
                        </Form.Label>
                        <Form.Control
                          type="date"
                          className="py-2 rounded-3 border-0 bg-light"
                          value={qrFormData.date_seance}
                          onChange={(e) => setQrFormData({ ...qrFormData, date_seance: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">
                          <i className="bi bi-building me-2 text-primary"></i>
                          SALLE
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Ex: Amphi A, Salle 102..."
                          className="py-2 rounded-3 border-0 bg-light"
                          value={qrFormData.salle}
                          onChange={(e) => setQrFormData({ ...qrFormData, salle: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          <i className="bi bi-clock me-2 text-primary"></i>
                          HEURE DÉBUT
                        </Form.Label>
                        <Form.Control
                          type="time"
                          className="py-2 rounded-3 border-0 bg-light"
                          value={qrFormData.heure_debut}
                          onChange={(e) => setQrFormData({ ...qrFormData, heure_debut: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">
                          <i className="bi bi-clock-fill me-2 text-primary"></i>
                          HEURE FIN
                        </Form.Label>
                        <Form.Control
                          type="time"
                          className="py-2 rounded-3 border-0 bg-light"
                          value={qrFormData.heure_fin}
                          onChange={(e) => setQrFormData({ ...qrFormData, heure_fin: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button
                    type="submit"
                    className="w-100 py-3 rounded-3 fw-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                      border: 'none'
                    }}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Génération...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-qr-code-scan me-2"></i>
                        Générer le QR Code de présence
                      </>
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Liste des sessions existantes */}
          <Col lg={7}>
            <Card className="border-0 shadow-lg fade-in-up" style={{ animationDelay: '0.2s', borderRadius: '1rem' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-0">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <h5 className="fw-bold mb-0">
                      <i className="bi bi-list-ul me-2 text-primary"></i>
                      Sessions de cours existantes
                    </h5>
                    <p className="text-muted small mt-1">Historique des 30 derniers jours</p>
                  </div>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      placeholder="Rechercher..."
                      className="rounded-pill border-0 bg-light"
                      style={{ width: '200px' }}
                    />
                    <Button variant="outline-secondary" size="sm" className="rounded-pill">
                      <i className="bi bi-funnel"></i>
                    </Button>
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                    <p className="text-muted mt-2">Chargement des sessions...</p>
                  </div>
                ) : seances.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-calendar-x display-1 text-muted"></i>
                    <p className="text-muted mt-2">Aucune session de cours</p>
                    <Button variant="primary" className="rounded-pill mt-2">
                      Créer une première session
                    </Button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="eni-table mb-0">
                      <thead>
                        <tr>
                          <th>MATIÈRE & DÉTAILS</th>
                          <th>DATE & HEURE</th>
                          <th>PRÉSENTS</th>
                          <th>STATUT</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seances.map((seance, index) => {
                          const isActive = isSeanceActive(seance)
                          const dateFormatted = formatDate(seance.date_seance)
                          return (
                            <tr key={seance.id_seance}>
                              <td className="align-middle">
                                <div className="fw-semibold mb-1">{seance.nom_matiere}</div>
                                <div className="d-flex flex-wrap gap-2">
                                  <small className="text-muted">
                                    <i className="bi bi-hash me-1"></i>
                                    {seance.code_matiere || 'N/A'}
                                  </small>
                                  <small className="text-muted">
                                    <i className="bi bi-geo-alt me-1"></i>
                                    {seance.salle}
                                  </small>
                                </div>
                              </td>
                              <td className="align-middle">
                                <div className="fw-medium">{dateFormatted.split('\n')[0]}</div>
                                {dateFormatted.split('\n')[1] && (
                                  <small className="text-muted">
                                    <i className="bi bi-clock me-1"></i>
                                    {dateFormatted.split('\n')[1]}
                                  </small>
                                )}
                                <div>
                                  <small className="text-muted">
                                    {seance.heure_debut} - {seance.heure_fin}
                                  </small>
                                </div>
                              </td>
                              <td className="align-middle">
                                <span className="fw-bold">{seance.nb_presents || 0}</span>
                                <span className="text-muted"> / {seance.nb_total || '?'}</span>
                                {seance.nb_total && seance.nb_total > 0 && (
                                  <div className="eni-progress small mt-1" style={{ width: '60px', height: '4px' }}>
                                    <div 
                                      className="eni-progress-bar" 
                                      style={{ width: `${(seance.nb_presents / seance.nb_total) * 100}%`, height: '4px' }}
                                    ></div>
                                  </div>
                                )}
                              </td>
                              <td className="align-middle">
                                {isActive ? (
                                  <span className="badge-eni badge-present">
                                    <i className="bi bi-check-circle-fill me-1 fs-9"></i>
                                    ACTIF
                                  </span>
                                ) : (
                                  <span className="badge-eni badge-expired">
                                    <i className="bi bi-clock-history me-1"></i>
                                    EXPIRÉ
                                  </span>
                                )}
                              </td>
                              <td className="align-middle">
                                <div className="d-flex gap-2">
                                  {isActive && (
                                    <Button 
                                      variant="outline-primary" 
                                      size="sm" 
                                      className="rounded-pill px-3"
                                      onClick={() => handleViewQR(seance)}
                                    >
                                      <i className="bi bi-eye me-1"></i>
                                      Voir QR
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline-secondary" 
                                    size="sm" 
                                    className="rounded-pill px-3"
                                    onClick={() => handleViewQR(seance)}
                                  >
                                    <i className="bi bi-download me-1"></i>
                                    PDF
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
              <Card.Footer className="bg-white border-0 pt-3 pb-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="bg-light rounded-3 p-2 px-3">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      {seances.length} session(s) au total
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <Button variant="outline-secondary" size="sm" className="rounded-pill">
                      <i className="bi bi-chevron-left"></i>
                    </Button>
                    <span className="px-2 py-1">1/{Math.ceil(seances.length / 5) || 1}</span>
                    <Button variant="outline-secondary" size="sm" className="rounded-pill">
                      <i className="bi bi-chevron-right"></i>
                    </Button>
                  </div>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        </Row>

        {/* Modal QR Code */}
        <Modal show={showQRModal} onHide={() => setShowQRModal(false)} centered size="lg" className="qr-modal">
          <Modal.Header closeButton className="border-0 pt-4 px-4">
            <Modal.Title className="fw-bold">
              <i className="bi bi-qr-code text-primary me-2"></i>
              QR Code de Présence
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            {generatedQR && (
              <div className="text-center">
                <div className="qr-container mb-4">
                  {generatedQR.qrCode && (
                    <img 
                      src={generatedQR.qrCode} 
                      alt="QR Code" 
                      className="qr-code-image"
                      style={{ 
                        maxWidth: '250px', 
                        height: 'auto',
                        border: '2px solid #e5e7eb',
                        borderRadius: '1rem',
                        padding: '1rem'
                      }}
                    />
                  )}
                </div>

                <div className="info-section bg-light rounded-3 p-4 mb-4 text-start">
                  <h6 className="fw-bold mb-3">
                    <i className="bi bi-info-circle me-2 text-primary"></i>
                    Détails de la séance
                  </h6>
                  <Row className="g-3">
                    <Col sm={6}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-book me-3 text-primary"></i>
                        <div>
                          <div className="small text-muted">Matière</div>
                          <div className="fw-semibold">{generatedQR.seance?.nom_matiere || 'Non spécifié'}</div>
                        </div>
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-calendar3 me-3 text-primary"></i>
                        <div>
                          <div className="small text-muted">Date</div>
                          <div className="fw-semibold">
                            {generatedQR.seance?.date_seance && 
                              new Date(generatedQR.seance.date_seance).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-clock me-3 text-primary"></i>
                        <div>
                          <div className="small text-muted">Horaire</div>
                          <div className="fw-semibold">
                            {generatedQR.seance?.heure_debut} - {generatedQR.seance?.heure_fin}
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-building me-3 text-primary"></i>
                        <div>
                          <div className="small text-muted">Salle</div>
                          <div className="fw-semibold">{generatedQR.seance?.salle || 'Non spécifié'}</div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                  
                  {generatedQR.seance?.qr_expire && (
                    <div className="mt-3 pt-2 border-top">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-hourglass-split me-3 text-warning"></i>
                        <div>
                          <div className="small text-muted">Expiration</div>
                          <div className="fw-semibold text-warning">
                            {new Date(generatedQR.seance.qr_expire).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <Button 
                    variant="primary" 
                    className="rounded-pill px-4"
                    onClick={handleGeneratePDF}
                  >
                    <i className="bi bi-file-pdf me-2"></i>
                    Télécharger PDF
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    className="rounded-pill px-4"
                    onClick={() => setShowQRModal(false)}
                  >
                    <i className="bi bi-x-lg me-2"></i>
                    Fermer
                  </Button>
                </div>

                <div className="alert alert-info mt-4 mb-0 rounded-3">
                  <i className="bi bi-lightbulb me-2"></i>
                  <strong>Conseil :</strong> Imprimez ce QR code ou affichez-le sur votre écran pour que les étudiants puissent scanner leur présence.
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      </Container>

      {/* Styles CSS personnalisés */}
      <style jsx="true">{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .fade-in-up:nth-child(1) { animation-delay: 0s; }
        .fade-in-up:nth-child(2) { animation-delay: 0.1s; }
        .fade-in-up:nth-child(3) { animation-delay: 0.2s; }
        
        .badge-eni {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 2rem;
          font-size: 0.7rem;
          font-weight: 500;
        }
        
        .badge-present {
          background: #d1fae5;
          color: #065f46;
        }
        
        .badge-expired {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        .eni-progress {
          background: #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .eni-progress-bar {
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          border-radius: 0.5rem;
        }
        
        .eni-table {
          width: 100%;
        }
        
        .eni-table th {
          background: #f9fafb;
          padding: 1rem;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .eni-table td {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .eni-table tr:hover td {
          background: #f9fafb;
        }
        
        .fs-9 {
          font-size: 0.65rem;
        }
        
        .qr-container {
          background: white;
          display: inline-block;
          padding: 1rem;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        
        .qr-code-image {
          transition: transform 0.3s ease;
        }
        
        .qr-code-image:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  )
}

export default TeacherManagementPage