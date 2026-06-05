import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Container, Row, Col, Card, Alert, Button, Spinner, Badge } from 'react-bootstrap'
import api from '../apis'
import { Link } from 'react-router-dom'

const READER_ID = 'qr-reader'

function QrScanner({ user }) {
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const scannerRef = useRef(null)
  const isProcessingRef = useRef(false)
  const mountedRef = useRef(true)

  const idEtudiant =
    user?.profil?.id_etudiant ||
    user?.id_etudiant ||
    (user?.id && user?.type_utilisateur === 'etudiant' ? user.id : null)

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return

    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
    } catch (err) {
      console.warn('Arrêt caméra:', err)
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) return

    setCameraError('')
    setCameraReady(false)

    try {
      const scanner = new Html5Qrcode(READER_ID)
      scannerRef.current = scanner

      const qrbox = (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
        const size = Math.floor(minEdge * 0.75)
        return { width: size, height: size }
      }

      const onScanSuccess = async (decodedText) => {
        if (isProcessingRef.current) return
        isProcessingRef.current = true

        await stopScanner()

        if (!mountedRef.current) return

        setLoading(true)
        setError('')
        setScanResult(null)

        try {
          let qrToken = null
          let idSeance = null

          if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
            try {
              const parsedData = JSON.parse(decodedText)
              qrToken = parsedData.token || parsedData.qr_token || parsedData.qrToken || parsedData.qr_code
              idSeance = parsedData.id_seance || parsedData.seance_id
              if (!qrToken) {
                qrToken = decodedText
              }
            } catch {
              qrToken = decodedText
            }
          } else if (decodedText.includes('SEANCE_')) {
            idSeance = decodedText.replace('SEANCE_', '')
          } else {
            qrToken = decodedText
          }

          let response

          if (qrToken) {
            try {
              response = await api.post('/qr/verify', {
                qr_token: qrToken,
                qr_data: qrToken
              })
            } catch (verifyError) {
              if (idSeance && idEtudiant) {
                response = await api.post('/qr/scan', {
                  id_seance: parseInt(idSeance, 10),
                  id_etudiant: idEtudiant
                })
              } else {
                throw verifyError
              }
            }
          } else if (idSeance && idEtudiant) {
            response = await api.post('/qr/scan', {
              id_seance: parseInt(idSeance, 10),
              id_etudiant: idEtudiant
            })
          } else {
            throw new Error(
              "Format de QR code non reconnu. Assurez-vous d'être connecté en tant qu'étudiant."
            )
          }

          if (response.data.success) {
            setScanResult(response.data)
          } else {
            throw new Error(response.data.message || 'Erreur lors de la vérification')
          }
        } catch (err) {
          if (err.response?.status === 409) {
            setScanResult({
              success: true,
              alreadyPresent: true,
              message: err.response.data?.message || 'Vous avez déjà pointé votre présence pour cette séance',
              statut: err.response.data?.statut || 'present',
              heure_pointage: err.response.data?.heure_pointage,
              seance: err.response.data?.seance
            })
          } else if (err.response?.status === 401) {
            setError('Session expirée. Veuillez vous reconnecter.')
          } else if (err.response?.status === 403) {
            setError('Accès refusé. Vous devez être étudiant pour scanner des QR codes.')
          } else if (err.response?.status === 400) {
            setError(err.response.data?.message || 'Données de scan invalides')
          } else if (err.response?.status === 404) {
            setError('QR code invalide ou expiré.')
          } else if (err.response?.status === 422) {
            setError(err.response.data?.message || 'QR code invalide ou données incorrectes')
          } else if (err.response?.status === 500) {
            setError('Service temporairement indisponible')
          } else if (err.code === 'ECONNABORTED') {
            setError('La requête a expiré. Veuillez réessayer.')
          } else if (err.code === 'NETWORK_ERROR' || err.code === 'ERR_NETWORK') {
            setError('Erreur de connexion au serveur. Vérifiez votre connexion internet.')
          } else {
            setError(err.message || 'Erreur lors de la vérification du QR code')
          }
        } finally {
          if (mountedRef.current) {
            setLoading(false)
          }
          isProcessingRef.current = false
        }
      }

      const config = {
        fps: 10,
        qrbox,
        aspectRatio: 1.0,
        disableFlip: false
      }

      await scanner.start({ facingMode: 'environment' }, config, onScanSuccess, () => {})

      if (mountedRef.current) {
        setCameraReady(true)
      }
    } catch (err) {
      console.error('Erreur caméra:', err)
      if (mountedRef.current) {
        setCameraError(
          "Impossible d'accéder à la caméra. Autorisez l'accès à la caméra arrière dans les paramètres de votre navigateur."
        )
      }
    }
  }, [idEtudiant, stopScanner])

  useEffect(() => {
    mountedRef.current = true
    startScanner()

    return () => {
      mountedRef.current = false
      isProcessingRef.current = false
      stopScanner().then(() => {
        scannerRef.current = null
      })
    }
  }, [startScanner, stopScanner])

  const resetScanner = async () => {
    setScanResult(null)
    setError('')
    isProcessingRef.current = false
    await stopScanner()
    scannerRef.current = null
    await startScanner()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'Heure inconnue'
    try {
      if (timeString.includes(':') && timeString.length <= 8) {
        return timeString
      }
      return new Date(timeString).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return timeString
    }
  }

  const showScanner = !loading && !scanResult

  return (
    <Container className="my-5">
      <Row className="mb-5">
        <Col>
          <div className="text-center">
            <div className="mb-3">
              <div
                className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow"
                style={{ width: '80px', height: '80px' }}
              >
                <i className="bi bi-qr-code-scan" style={{ fontSize: '3rem' }}></i>
              </div>
            </div>
            <h1 className="display-5 fw-bold text-primary mb-3">Scanner QR Code</h1>
            <p className="lead text-muted">
              Scannez le QR code affiché par votre professeur pour pointer votre présence
            </p>
          </div>
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-primary text-white text-center py-3">
              <h5 className="mb-0">
                <i className="bi bi-camera-video me-2"></i>
                Scanner de QR Code
              </h5>
            </Card.Header>
            <Card.Body className="p-4 p-md-5 text-center">
              {loading ? (
                <div className="py-5">
                  <Spinner
                    animation="border"
                    variant="primary"
                    style={{ width: '3rem', height: '3rem' }}
                  />
                  <p className="mt-3 text-muted">Traitement en cours...</p>
                </div>
              ) : scanResult ? (
                <div className="py-4">
                  <div className="mb-4">
                    <div
                      className={`${
                        scanResult.alreadyPresent ? 'bg-info' : 'bg-success'
                      } bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow`}
                      style={{ width: '100px', height: '100px' }}
                    >
                      <i
                        className={`bi ${
                          scanResult.alreadyPresent ? 'bi-info-circle-fill' : 'bi-check-circle-fill'
                        }`}
                        style={{ fontSize: '3.5rem' }}
                      ></i>
                    </div>
                  </div>
                  <h3 className={`${scanResult.alreadyPresent ? 'text-info' : 'text-success'} fw-bold mb-4`}>
                    {scanResult.message || 'Présence enregistrée avec succès!'}
                  </h3>

                  {scanResult.seance && (
                    <Card className="mt-4 border-0 bg-light shadow-sm">
                      <Card.Header className="bg-light border-bottom">
                        <h5 className="mb-0">
                          <i className="bi bi-info-circle me-2 text-primary"></i>
                          Détails de la séance
                        </h5>
                      </Card.Header>
                      <Card.Body className="p-4">
                        <Row className="g-3 text-start">
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-book text-primary me-3 fs-5"></i>
                              <div>
                                <small className="text-muted d-block">Matière</small>
                                <strong>
                                  {scanResult.seance?.nom_matiere ||
                                    scanResult.seance?.matiere ||
                                    'Non spécifié'}
                                </strong>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-hash text-primary me-3 fs-5"></i>
                              <div>
                                <small className="text-muted d-block">Code</small>
                                <strong>
                                  {scanResult.seance?.code_matiere || scanResult.seance?.code || 'N/A'}
                                </strong>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-calendar text-primary me-3 fs-5"></i>
                              <div>
                                <small className="text-muted d-block">Date</small>
                                <strong>
                                  {formatDate(scanResult.seance?.date_seance || scanResult.seance?.date)}
                                </strong>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-clock text-primary me-3 fs-5"></i>
                              <div>
                                <small className="text-muted d-block">Heure</small>
                                <strong>
                                  {formatTime(scanResult.seance?.heure_debut || scanResult.seance?.heure)}
                                  {scanResult.seance?.heure_fin
                                    ? ` - ${formatTime(scanResult.seance.heure_fin)}`
                                    : ''}
                                </strong>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-geo-alt text-primary me-3 fs-5"></i>
                              <div>
                                <small className="text-muted d-block">Salle</small>
                                <strong>{scanResult.seance?.salle || 'Non spécifié'}</strong>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-check-circle text-primary me-3 fs-5"></i>
                              <div>
                                <small className="text-muted d-block">Statut</small>
                                <Badge
                                  bg={
                                    scanResult.statut === 'present'
                                      ? 'success'
                                      : scanResult.statut === 'late'
                                        ? 'warning'
                                        : scanResult.statut === 'absent'
                                          ? 'danger'
                                          : 'info'
                                  }
                                  className="fs-6 px-3 py-2"
                                >
                                  {scanResult.statut === 'present'
                                    ? 'Présent'
                                    : scanResult.statut === 'late'
                                      ? 'En retard'
                                      : scanResult.statut === 'absent'
                                        ? 'Absent'
                                        : scanResult.statut || 'Pointé'}
                                </Badge>
                              </div>
                            </div>
                          </Col>
                          {scanResult.heure_pointage && (
                            <Col md={12}>
                              <div className="d-flex align-items-center mt-2">
                                <i className="bi bi-clock-history text-primary me-3 fs-5"></i>
                                <div>
                                  <small className="text-muted d-block">Pointé à</small>
                                  <strong>{formatTime(scanResult.heure_pointage)}</strong>
                                </div>
                              </div>
                            </Col>
                          )}
                        </Row>
                      </Card.Body>
                    </Card>
                  )}

                  <div className="mt-4 d-flex gap-3 justify-content-center flex-wrap">
                    <Button variant="primary" size="lg" onClick={resetScanner} className="px-5">
                      <i className="bi bi-qr-code-scan me-2"></i>
                      Scanner un autre QR code
                    </Button>
                    <Link to="/mes-presences" className="btn btn-success btn-lg px-4">
                      <i className="bi bi-calendar-check me-2"></i>
                      Voir mes présences
                    </Link>
                    <Link to="/dashboard" className="btn btn-outline-primary btn-lg px-4">
                      <i className="bi bi-speedometer2 me-2"></i>
                      Tableau de bord
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <Alert variant="danger" className="border-0 mb-4" dismissible onClose={() => setError('')}>
                      <div className="d-flex align-items-start">
                        <i className="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
                        <div className="flex-grow-1">
                          <strong>Erreur</strong>
                          <p className="mb-2">{error}</p>
                          <Button variant="outline-danger" size="sm" onClick={resetScanner}>
                            <i className="bi bi-arrow-clockwise me-2"></i>
                            Réessayer
                          </Button>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {cameraError && (
                    <Alert variant="warning" className="border-0 mb-4">
                      <i className="bi bi-camera-video-off me-2"></i>
                      {cameraError}
                      <div className="mt-2">
                        <Button variant="outline-warning" size="sm" onClick={resetScanner}>
                          <i className="bi bi-arrow-clockwise me-2"></i>
                          Réessayer
                        </Button>
                      </div>
                    </Alert>
                  )}

                  <div className="mb-4">
                    <div
                      id={READER_ID}
                      className="mb-3 mx-auto overflow-hidden rounded"
                      style={{
                        maxWidth: '100%',
                        display: showScanner ? 'block' : 'none'
                      }}
                    />

                    {!cameraReady && !cameraError && showScanner && (
                      <div className="py-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2 text-muted">Activation de la caméra arrière...</p>
                      </div>
                    )}

                    {cameraReady && (
                      <p className="text-muted">
                        <i className="bi bi-info-circle me-2"></i>
                        Placez le QR code dans le cadre de scan
                      </p>
                    )}

                    <div className="alert alert-info border-0 mt-3">
                      <small>
                        <i className="bi bi-phone me-2"></i>
                        <strong>Mobile :</strong> Utilisez la caméra arrière de votre téléphone. Chaque
                        étudiant doit scanner avec son propre compte.
                      </small>
                    </div>

                    {user && (
                      <div className="alert alert-light border mt-2">
                        <small>
                          <i className="bi bi-person-circle me-2"></i>
                          <strong>Connecté :</strong> {user.nom} {user.prenom}
                          {idEtudiant && ` — Identifiant étudiant : ${idEtudiant}`}
                        </small>
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default QrScanner
