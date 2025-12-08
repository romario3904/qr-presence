
import { useState, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Container, Row, Col, Card, Alert, Button, Spinner, Badge } from 'react-bootstrap'
import api from '../apis'
import { Link } from 'react-router-dom'

function QrScanner({ user }) {
  const [scanResult, setScanResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanner, setScanner] = useState(null)
  const [studentStats, setStudentStats] = useState(null)

  useEffect(() => {
    if (!scanner) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: []
        },
        false
      )

      html5QrcodeScanner.render(onScanSuccess, onScanFailure)
      setScanner(html5QrcodeScanner)
    }

    return () => {
      if (scanner) {
        scanner.clear()
      }
    }
  }, [scanner])


  const onScanSuccess = async (decodedText) => {
    if (scanner) {
      scanner.clear()
    }
    
    setLoading(true)
    setError('')
    setScanResult(null)
    
    try {
      console.log('🔍 QR code scanné:', decodedText);
      
      // Analyser les données scannées et extraire le token QR
      let qrToken = null;
      let idSeance = null;
      
      // Analyser les différents formats possibles
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        // Format JSON - extraire le token si présent
        try {
          const parsedData = JSON.parse(decodedText);
          // Chercher le token dans différentes propriétés possibles
          qrToken = parsedData.token || parsedData.qr_token || parsedData.qrToken || parsedData.qr_code;
          idSeance = parsedData.id_seance || parsedData.seance_id;
          
          // Si pas de token mais qu'on a un id_seance, on utilisera /qr/scan
          if (!qrToken && idSeance) {
            // On garde le JSON original comme fallback
            qrToken = decodedText;
          } else if (!qrToken) {
            // Sinon utiliser le JSON complet comme token
            qrToken = decodedText;
          }
        } catch (parseError) {
          // Si le JSON est invalide, utiliser le texte brut comme token
          qrToken = decodedText;
        }
      } else if (decodedText.includes('SEANCE_')) {
        // Format simple : SEANCE_123
        idSeance = decodedText.replace('SEANCE_', '');
        // Pour SEANCE_ format, on peut essayer /qr/scan avec l'ID
      } else {
        // Format par défaut - texte brut (probablement un token QR)
        qrToken = decodedText;
      }
      
      console.log('📤 Données extraites:', { qrToken, idSeance, originalText: decodedText });
      
      // Utiliser la route /qr/verify en priorité (c'est la route standard)
      let response;
      
      // Récupérer l'ID étudiant (plusieurs emplacements possibles)
      const idEtudiant = user?.profil?.id_etudiant || user?.id_etudiant || 
                         (user?.id && user?.type_utilisateur === 'etudiant' ? user.id : null);
      
      // Si on a un token QR, utiliser /qr/verify (route principale)
      if (qrToken) {
        try {
          console.log('🔄 Utilisation de /qr/verify avec token...');
          response = await api.post('/qr/verify', {
            qr_token: qrToken,
            qr_data: qrToken // Les deux formats sont acceptés
          });
        } catch (verifyError) {
          console.log('⚠️  /qr/verify échoué:', verifyError.response?.status);
          
          // Si on a un id_seance et un id_etudiant, essayer /qr/scan comme fallback
          if (idSeance && idEtudiant) {
            try {
              console.log('🔄 Tentative avec /qr/scan (fallback)...');
              response = await api.post('/qr/scan', {
                id_seance: parseInt(idSeance),
                id_etudiant: idEtudiant
              });
            } catch (scanError) {
              console.log('⚠️  /qr/scan échoué:', scanError.response?.status);
              throw verifyError; // Lancer l'erreur originale de verify
            }
          } else {
            throw verifyError;
          }
        }
      } else if (idSeance && idEtudiant) {
        // Si on a seulement un id_seance, utiliser /qr/scan
        try {
          console.log('🔄 Utilisation de /qr/scan avec id_seance...');
          response = await api.post('/qr/scan', {
            id_seance: parseInt(idSeance),
            id_etudiant: idEtudiant
          });
        } catch (scanError) {
          console.log('⚠️  /qr/scan échoué:', scanError.response?.status);
          throw scanError;
        }
      } else {
        throw new Error('Format de QR code non reconnu ou données manquantes. Assurez-vous d\'être connecté en tant qu\'étudiant.');
      }
      
      console.log('✅ Réponse du serveur:', response.data);
      
      if (response.data.success) {
        setScanResult(response.data);
      
      } else {
        throw new Error(response.data.message || 'Erreur lors de la vérification');
      }
      
    } catch (error) {
      console.error('❌ Erreur détaillée scan QR:', error);
      
      // Logs détaillés pour le débogage
      if (error.response) {
        console.log('📊 Statut HTTP:', error.response.status);
        console.log('📊 Données erreur:', error.response.data);
        console.log('📊 URL:', error.response.config?.url);
      }
      
      if (error.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
      } else if (error.response?.status === 403) {
        setError('Accès refusé. Vous devez être étudiant pour scanner des QR codes.');
      } else if (error.response?.status === 400) {
        setError(error.response.data?.message || 'Données de scan invalides');
      } else if (error.response?.status === 404) {
        setError('Service de scan temporairement indisponible. Contactez l\'administrateur.');
      } else if (error.response?.status === 409) {
        setError('Vous avez déjà pointé votre présence pour cette séance');
      } else if (error.response?.status === 422) {
        setError(error.response.data?.message || 'QR code invalide ou données incorrectes');
      } else if (error.response?.status === 500) {
        setError('Service temporairement indisponible');
      } else if (error.code === 'ECONNABORTED') {
        setError('La requête a expiré. Veuillez réessayer.');
      } else if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
        setError('Erreur de connexion au serveur. Vérifiez votre connexion internet.');
      } else {
        setError(error.message || 'Erreur lors de la vérification du QR code');
      }
    } finally {
      setLoading(false);
    }
  }

  const onScanFailure = (error) => {
    // Les erreurs de scan sont normales, on ne les affiche pas
    console.log('📱 Erreur de scan (normale):', error);
  }

  const resetScanner = () => {
    setScanResult(null)
    setError('')
    if (scanner) {
      scanner.clear()
      const newScanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: []
        },
        false
      )
      newScanner.render(onScanSuccess, onScanFailure)
      setScanner(newScanner)
    }
  }

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Fonction pour formater l'heure
  const formatTime = (timeString) => {
    if (!timeString) return 'Heure inconnue';
    try {
      // Si c'est une heure au format HH:MM
      if (timeString.includes(':')) {
        return timeString;
      }
      // Si c'est une date/heure complète
      const date = new Date(timeString);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  return (
    <Container className="my-5">
      <Row className="mb-5">
        <Col>
          <div className="text-center">
            <div className="mb-3">
              <div className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow"
                   style={{ width: '80px', height: '80px' }}>
                <i className="bi bi-qr-code-scan" style={{ fontSize: '3rem' }}></i>
              </div>
            </div>
            <h1 className="display-5 fw-bold text-primary mb-3">
              Scanner QR Code
            </h1>
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
                  <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                  <p className="mt-3 text-muted">Traitement en cours...</p>
                </div>
              ) : scanResult ? (
                <div className="py-4">
                  <div className="mb-4">
                    <div className="bg-success bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center text-white shadow"
                         style={{ width: '100px', height: '100px' }}>
                      <i className="bi bi-check-circle-fill" style={{ fontSize: '3.5rem' }}></i>
                    </div>
                  </div>
                  <h3 className="text-success fw-bold mb-4">{scanResult.message || 'Présence enregistrée avec succès!'}</h3>
                  
                  
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
                                <strong>{scanResult.seance?.nom_matiere || scanResult.seance?.matiere || 'Non spécifié'}</strong>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-hash text-primary me-3 fs-5"></i>
                              <div>
                                <small className="text-muted d-block">Code</small>
                                <strong>{scanResult.seance?.code_matiere || scanResult.seance?.code || 'N/A'}</strong>
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
                                  {scanResult.seance?.heure_fin ? ` - ${formatTime(scanResult.seance.heure_fin)}` : ''}
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
                                <Badge bg={scanResult.statut === 'present' ? 'success' : 
                                         scanResult.statut === 'late' ? 'warning' : 
                                         scanResult.statut === 'absent' ? 'danger' : 'info'} 
                                       className="fs-6 px-3 py-2">
                                  {scanResult.statut === 'present' ? 'Présent' : 
                                   scanResult.statut === 'late' ? 'En retard' : 
                                   scanResult.statut === 'absent' ? 'Absent' : 
                                   scanResult.statut || 'Pointé'}
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
                          <div className="d-flex gap-2 mt-2">
                            <Button variant="outline-danger" size="sm" onClick={resetScanner}>
                              <i className="bi bi-arrow-clockwise me-2"></i>
                              Réessayer
                            </Button>
                            <Button variant="outline-secondary" size="sm" onClick={() => window.location.reload()}>
                              <i className="bi bi-arrow-clockwise me-2"></i>
                              Recharger la page
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  )}
                  
                  <div className="mb-4">
                    <div id="reader" className="mb-3"></div>
                    <p className="text-muted">
                      <i className="bi bi-info-circle me-2"></i>
                      Placez le QR code dans le cadre de scan
                    </p>
                    <div className="alert alert-info border-0 mt-3">
                      <small>
                        <i className="bi bi-lightbulb me-2"></i>
                        <strong>Astuce :</strong> Assurez-vous que le QR code est bien éclairé et que votre caméra est autorisée.
                      </small>
                    </div>
                    
                    <div className="alert alert-warning border-0 mt-2">
                      <small>
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        <strong>Note :</strong> Vous devez être connecté en tant qu'étudiant pour scanner les QR codes de présence.
                      </small>
                    </div>
                    
                    {user && (
                      <div className="alert alert-light border mt-2">
                        <small>
                          <i className="bi bi-person-circle me-2"></i>
                          <strong>Connecté en tant que :</strong> {user.nom} {user.prenom} 
                          {user.profil?.id_etudiant && ` (Étudiant ID: ${user.profil.id_etudiant})`}
                          {user.type_utilisateur === 'etudiant' && studentStats?.summary && (
                            <>
                              {' • '}
                              <span className="text-primary">
                                Taux présence: {studentStats.summary.presenceRate || 0}%
                              </span>
                            </>
                          )}
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
