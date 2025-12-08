import { useState, useEffect, useRef } from 'react'
import { Container } from 'react-bootstrap'
import api from '../apis'
import './teacher.css'
import { getApiErrorMessage } from '../App'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'

function TeacherManagementPage({ user }) {
  const [matieres, setMatieres] = useState([])
  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [qrFormData, setQrFormData] = useState({
    id_matiere: '',
    date_seance: new Date().toISOString().split('T')[0],
    heure_debut: '',
    heure_fin: '',
    salle: ''
  })
  const [generatedQR, setGeneratedQR] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  // Références pour éviter les appels dupliqués
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        
        console.log('🔄 Début du chargement des données depuis la base de données...')
        
        // Vérifier que l'utilisateur est un enseignant
        if (!user || user.type_utilisateur !== 'enseignant') {
          setError('Accès réservé aux enseignants')
          setLoading(false)
          return
        }
        
        // Vérifier que l'ID utilisateur existe
        if (!user.id) {
          setError('Votre session n\'est pas valide. Veuillez vous reconnecter.')
          setLoading(false)
          return
        }
        
        console.log('👨‍🏫 Utilisateur ID:', user.id)
        
        // Récupérer les données directement depuis l'API
        // L'API /matiere retourne maintenant les matières filtrées par enseignant
        const [matieresRes, seancesRes] = await Promise.all([
          api.get('/matiere'),
          api.get('/qr/seances')
        ])
        
        // Extraire les matières de la réponse structurée
        let matieresData = extractMatieresFromResponse(matieresRes?.data)
        let seancesData = extractSeancesFromResponse(seancesRes?.data)
        
        console.log('✅ Données matières réelles (filtrées par enseignant):', matieresData)
        console.log('✅ Données séances réelles:', seancesData)
        
        setMatieres(matieresData)
        setSeances(seancesData)
        
        if (matieresData.length === 0) {
          console.log('ℹ️ Aucune matière trouvée pour cet enseignant')
        }
        
      } catch (error) {
        console.error('❌ Erreur récupération données réelles:', error)
        
        // Messages d'erreur spécifiques
        if (error.response?.status === 403) {
          if (error.response.data?.message?.includes('Profil enseignant')) {
            setError('Votre profil enseignant n\'est pas trouvé dans la base de données. Veuillez contacter l\'administrateur pour créer votre profil.')
          } else {
            setError('Accès refusé. Vous n\'avez pas les permissions nécessaires.')
          }
        } else if (error.response?.status === 404) {
          setError('Les endpoints API ne sont pas disponibles. Vérifiez la configuration du serveur.')
        } else if (error.isNetworkError) {
          setError('Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré.')
        } else {
          setError(getApiErrorMessage(error, 'Erreur lors de la récupération des données'))
        }
        
        // Vider les données en cas d'erreur
        setMatieres([])
        setSeances([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      console.log('🧹 Cleanup TeacherManagementPage')
    }
  }, [user])

  // Fonction pour extraire les matières de la réponse
  const extractMatieresFromResponse = (data) => {
    if (!data) {
      console.warn('❌ Données matières nulles')
      return []
    }
    
    console.log('🔄 Extraction données matières:', data)
    
    // Si l'API retourne un objet avec propriété "matieres"
    if (data.matieres && Array.isArray(data.matieres)) {
      console.log('✅ Données matières extraites de data.matieres,', data.matieres.length, 'éléments')
      return data.matieres
    }
    
    // Si l'API retourne un tableau direct
    if (Array.isArray(data)) {
      console.log('✅ Données matières déjà tableau,', data.length, 'éléments')
      return data
    }
    
    // Si l'API retourne un objet avec propriété "data"
    if (data.data && Array.isArray(data.data)) {
      return data.data
    }
    
    console.warn('❌ Format de données matières non reconnu:', data)
    return []
  }

  // Fonction pour extraire les séances de la réponse
  const extractSeancesFromResponse = (data) => {
    if (!data) {
      console.warn('❌ Données séances nulles')
      return []
    }
    
    console.log('🔄 Extraction données séances:', data)
    
    // Si l'API retourne un objet avec propriété "seances"
    if (data.seances && Array.isArray(data.seances)) {
      return data.seances
    }
    
    // Si l'API retourne un objet avec propriété "data"
    if (data.data && Array.isArray(data.data)) {
      return data.data
    }
    
    // Si l'API retourne directement un tableau
    if (Array.isArray(data)) {
      return data
    }
    
    // Si c'est un objet simple, extraire les valeurs
    if (typeof data === 'object') {
      const values = Object.values(data)
      // Filtrer pour ne garder que les tableaux
      const arrayValues = values.filter(v => Array.isArray(v)).flat()
      if (arrayValues.length > 0) {
        return arrayValues
      }
      return values
    }
    
    console.warn('❌ Format de données séances non reconnu:', data)
    return []
  }

  const handleGenerateQR = async (e) => {
    e.preventDefault()
    
    if (generating) return
    
    try {
      setGenerating(true)
      setError('')
      
      console.log('📤 Génération de QR code avec données:', qrFormData)
      
      // Validation
      if (!user || user.type_utilisateur !== 'enseignant') {
        setError('Seuls les enseignants peuvent générer des QR codes')
        return
      }

      if (!qrFormData.id_matiere || !qrFormData.heure_debut || !qrFormData.heure_fin || !qrFormData.salle) {
        setError('Veuillez remplir tous les champs obligatoires')
        return
      }

      if (qrFormData.heure_debut >= qrFormData.heure_fin) {
        setError('L\'heure de fin doit être après l\'heure de début')
        return
      }

      // Vérification que la matière sélectionnée appartient bien à l'enseignant
      const matiereSelectionnee = matieres.find(m => 
        (m.id_matiere || m.id || m._id) == qrFormData.id_matiere
      )
      
      if (!matiereSelectionnee) {
        setError('La matière sélectionnée n\'est pas valide ou ne vous appartient pas')
        return
      }

      const formDataWithTeacher = {
        ...qrFormData,
        id_enseignant: user.profil?.id_enseignant || null
      }

      console.log('📦 Données envoyées à l\'API:', formDataWithTeacher)
      
      // Appel API pour générer le QR code
      const response = await api.post('/qr/generate', formDataWithTeacher)
      
      console.log('✅ QR code généré avec succès:', response.data)
      
      let qrDataToDisplay = { ...response.data }
      
      // Générer l'image QR code côté client
      let qrImage = null
      let qrDataForGeneration = null
      
      // Déterminer les données à encoder
      if (response.data.qrToken) {
        // Utiliser le token QR directement (chaîne de caractères)
        qrDataForGeneration = response.data.qrToken
      } else if (response.data.qrData) {
        // Si qrData est un objet, le convertir en JSON string
        if (typeof response.data.qrData === 'object') {
          qrDataForGeneration = JSON.stringify(response.data.qrData)
        } else {
          qrDataForGeneration = String(response.data.qrData)
        }
      } else if (response.data.seance && response.data.seance.id_seance) {
        qrDataForGeneration = `SEANCE_${response.data.seance.id_seance}`
      } else {
        // Fallback si l'API ne retourne pas de données QR
        const nomMatiere = matiereSelectionnee.nom_matiere || matiereSelectionnee.nom || matiereSelectionnee.name
        
        qrDataForGeneration = JSON.stringify({
          matiere_id: qrFormData.id_matiere,
          matiere_nom: nomMatiere,
          date: qrFormData.date_seance,
          heure_debut: qrFormData.heure_debut,
          salle: qrFormData.salle,
          timestamp: Date.now()
        })
      }
      
      // Validation finale : s'assurer que qrDataForGeneration est une chaîne valide
      if (!qrDataForGeneration || typeof qrDataForGeneration !== 'string') {
        console.error('❌ Données QR invalides:', qrDataForGeneration)
        setError('Erreur: données QR invalides pour la génération')
        return
      }
      
      // Générer l'image du QR code
      try {
        qrImage = await QRCode.toDataURL(qrDataForGeneration, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        
        qrDataToDisplay.qrCode = qrImage
        qrDataToDisplay.qrData = qrDataForGeneration
        
      } catch (qrError) {
        console.error('❌ Erreur génération QR image:', qrError)
        setError('Erreur lors de la génération de l\'image QR code')
        return
      }
      
      // Compléter les données de la séance si nécessaire
      if (!qrDataToDisplay.seance) {
        const nomMatiere = matiereSelectionnee.nom_matiere || matiereSelectionnee.nom || matiereSelectionnee.name
        
        qrDataToDisplay.seance = {
          nom_matiere: nomMatiere,
          date_seance: qrFormData.date_seance,
          heure_debut: qrFormData.heure_debut,
          heure_fin: qrFormData.heure_fin,
          salle: qrFormData.salle,
          qr_expire: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        }
      }
      
      setGeneratedQR(qrDataToDisplay)
      setShowQRGenerator(false)
      
      // Réinitialiser le formulaire
      setQrFormData({
        id_matiere: '',
        date_seance: new Date().toISOString().split('T')[0],
        heure_debut: '',
        heure_fin: '',
        salle: ''
      })
      
      // Rafraîchir la liste des séances
      await refreshSeances()
      
    } catch (error) {
      console.error('❌ Erreur génération QR code:', error)
      
      if (error.response?.status === 403) {
        const errorMessage = error.response.data?.message || 'Vous n\'êtes pas responsable de cette matière'
        
        if (errorMessage.includes('Profil enseignant')) {
          setError('Votre profil enseignant n\'est pas trouvé dans la base de données. Contactez l\'administrateur.')
        } else {
          setError(`Accès refusé: ${errorMessage}`)
        }
        
        await refreshMatieres();
      } else if (error.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.')
      } else if (error.response?.status === 400) {
        setError(error.response.data?.message || 'Données invalides')
      } else if (error.isNetworkError) {
        setError('Impossible de se connecter au serveur pour générer le QR code.')
      } else {
        setError(getApiErrorMessage(error, 'Erreur lors de la génération du QR code'))
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleViewQRCode = async (seance) => {
    try {
      setGenerating(true)
      setError('')
      
      console.log('🔍 Affichage du QR code pour la séance:', seance)
      
      // Vérifier si la séance est encore active
      if (seance.qr_expire && new Date(seance.qr_expire) <= new Date()) {
        setError('Ce QR code a expiré et ne peut plus être affiché')
        return
      }

      let qrDataForGeneration = null
      
      // Déterminer les données à encoder dans le QR code
      if (seance.qr_code) {
        // Utiliser qr_code (token) directement
        qrDataForGeneration = String(seance.qr_code)
      } else if (seance.qr_data) {
        // Si qr_data est un objet, le convertir en JSON string
        if (typeof seance.qr_data === 'object') {
          qrDataForGeneration = JSON.stringify(seance.qr_data)
        } else {
          qrDataForGeneration = String(seance.qr_data)
        }
      } else if (seance.id_seance) {
        qrDataForGeneration = `SEANCE_${seance.id_seance}`
      } else {
        // Créer des données par défaut
        qrDataForGeneration = JSON.stringify({
          matiere: seance.nom_matiere || seance.matiere_nom || 'Matière inconnue',
          date: seance.date_seance,
          heure_debut: seance.heure_debut,
          salle: seance.salle,
          timestamp: Date.now()
        })
      }
      
      // Validation : s'assurer que qrDataForGeneration est une chaîne valide
      if (!qrDataForGeneration || typeof qrDataForGeneration !== 'string') {
        console.error('❌ Données QR invalides pour affichage:', qrDataForGeneration)
        setError('Erreur: données QR invalides pour la génération')
        return
      }
      
      // Générer le QR code côté client
      let qrImage = null
      try {
        qrImage = await QRCode.toDataURL(qrDataForGeneration, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
      } catch (qrError) {
        console.error('❌ Erreur génération QR côté client:', qrError)
        setError('Erreur lors de la génération du QR code. Veuillez réessayer.')
        return
      }
      
      // Préparer les données pour l'affichage
      const qrDataToDisplay = {
        qrCode: qrImage,
        qrData: qrDataForGeneration,
        seance: {
          nom_matiere: seance.nom_matiere || seance.matiere_nom || 'Matière inconnue',
          date_seance: seance.date_seance,
          heure_debut: seance.heure_debut,
          heure_fin: seance.heure_fin,
          salle: seance.salle,
          qr_expire: seance.qr_expire
        }
      }
      
      setGeneratedQR(qrDataToDisplay)
      
    } catch (error) {
      console.error('❌ Erreur affichage QR code:', error)
      setError('Erreur lors de l\'affichage du QR code. Veuillez réessayer.')
    } finally {
      setGenerating(false)
    }
  }

  const handleGeneratePDF = () => {
    if (!generatedQR) return;

    const doc = new jsPDF();
    
    // Titre principal
    doc.setFontSize(20);
    doc.setTextColor(0, 100, 0);
    doc.text('QR Code - Fiche de Présence', 105, 20, { align: 'center' });
    
    // Ligne séparatrice
    doc.setDrawColor(0, 100, 0);
    doc.line(20, 25, 190, 25);
    
    // Informations de la séance
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    let yPosition = 40;
    
    // Matière
    doc.setFont(undefined, 'bold');
    doc.text('Matière:', 20, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(generatedQR.seance?.nom_matiere || 'Non spécifié', 60, yPosition);
    yPosition += 10;
    
    // Date
    doc.setFont(undefined, 'bold');
    doc.text('Date:', 20, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(
      generatedQR.seance?.date_seance ? 
        new Date(generatedQR.seance.date_seance).toLocaleDateString('fr-FR') : 
        'Non spécifié', 
      60, yPosition
    );
    yPosition += 10;
    
    // Heure
    doc.setFont(undefined, 'bold');
    doc.text('Heure:', 20, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(
      `${generatedQR.seance?.heure_debut || 'Non spécifié'} - ${generatedQR.seance?.heure_fin || 'Non spécifié'}`,
      60, yPosition
    );
    yPosition += 10;
    
    // Salle
    doc.setFont(undefined, 'bold');
    doc.text('Salle:', 20, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(generatedQR.seance?.salle || 'Non spécifié', 60, yPosition);
    yPosition += 10;
    
    // Date d'expiration si disponible
    if (generatedQR.seance?.qr_expire) {
      doc.setFont(undefined, 'bold');
      doc.text('Expire à:', 20, yPosition);
      doc.setFont(undefined, 'normal');
      doc.text(new Date(generatedQR.seance.qr_expire).toLocaleString('fr-FR'), 60, yPosition);
      yPosition += 10;
    }
    
    // QR Code (si disponible)
    if (generatedQR.qrCode) {
      yPosition += 10;
      
      // Ajouter le QR code au PDF
      try {
        const qrImageData = generatedQR.qrCode.split(',')[1];
        doc.addImage(qrImageData, 'PNG', 70, yPosition, 70, 70);
        
        // Légende sous le QR code
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Scannez ce QR code pour pointer votre présence', 105, yPosition + 85, { align: 'center' });
        
      } catch (error) {
        console.error('Erreur lors de l\'ajout du QR code au PDF:', error);
        doc.setTextColor(255, 0, 0);
        doc.text('Erreur lors de la génération du QR code dans le PDF', 20, yPosition + 40);
      }
    }
    
    // Pied de page
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 105, pageHeight - 10, { align: 'center' });
    
    // Sauvegarder le PDF
    const fileName = `qr-code-presence-${generatedQR.seance?.nom_matiere || 'seance'}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  const refreshSeances = async () => {
    try {
      console.log('🔄 Rafraîchissement des séances...')
      const seancesRes = await api.get('/qr/seances')
      let seancesData = extractSeancesFromResponse(seancesRes.data)
      setSeances(seancesData)
      console.log('✅ Liste des séances rafraîchie')
    } catch (refreshError) {
      console.error('❌ Erreur rafraîchissement séances:', refreshError)
      setError('Impossible de rafraîchir la liste des séances')
    }
  }

  const refreshMatieres = async () => {
    try {
      console.log('🔄 Rafraîchissement des matières...')
      const matieresRes = await api.get('/matiere')
      let matieresData = extractMatieresFromResponse(matieresRes.data)
      setMatieres(matieresData)
      console.log('✅ Liste des matières rafraîchie')
    } catch (refreshError) {
      console.error('❌ Erreur rafraîchissement matières:', refreshError)
      setError('Impossible de rafraîchir la liste des matières')
    }
  }

  const getMatieresOptions = () => {
    const matieresList = Array.isArray(matieres) ? matieres : []
    
    if (matieresList.length === 0) {
      return (
        <>
          <option value="">Aucune matière disponible</option>
          <option value="" disabled className="text-muted">
            Vous n'avez pas encore de matières attribuées
          </option>
        </>
      )
    }
    
    return [
      <option key="placeholder" value="" disabled>
        Sélectionner une matière ({matieresList.length} disponible(s))
      </option>,
      ...matieresList.map((matiere) => {
        const id = matiere.id_matiere || matiere.id || matiere._id
        const nom = matiere.nom_matiere || matiere.nom || matiere.name
        const code = matiere.code_matiere || matiere.code
        
        if (!id || !nom) {
          console.warn('Matière invalide:', matiere)
          return null
        }
        
        return (
          <option key={id} value={id}>
            {code ? `${code} - ` : ''}{nom}
          </option>
        )
      }).filter(Boolean)
    ]
  }

  const canGenerateQR = () => {
    return user && user.type_utilisateur === 'enseignant' && Array.isArray(matieres) && matieres.length > 0
  }

  const formatSeanceDate = (dateString) => {
    if (!dateString) return 'Date inconnue'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR')
    } catch {
      return 'Date invalide'
    }
  }

  const isSeanceActive = (seance) => {
    return seance.qr_expire && new Date(seance.qr_expire) > new Date()
  }

  return (
    <Container className="my-5">
      <div className="text-center mb-5">
        <div className="mb-3">
          <i className="bi bi-journal-text text-success" style={{ fontSize: '4rem' }}></i>
        </div>
        <h1 className="display-5 fw-bold text-success mb-3">Gestion des Cours</h1>
        <p className="lead text-muted">Gérez vos séances de cours et générez des QR codes pour vos étudiants</p>
      </div>

      {error && (
        <div className="alert alert-warning alert-dismissible fade show">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {generatedQR && (
        <div className="alert alert-success alert-dismissible fade show">
          <i className="bi bi-check-circle me-2"></i>
          QR code généré avec succès!
          <button type="button" className="btn-close" onClick={() => setGeneratedQR(null)}></button>
        </div>
      )}

      {/* Section d'affichage du QR Code généré */}
      {generatedQR && (
        <div className="row justify-content-center mt-4">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-lg border-0 print-card">
              <div className="card-header bg-success text-white text-center">
                <h5 className="mb-0">
                  <i className="bi bi-qr-code me-2"></i>
                  QR Code Généré - Présence
                </h5>
              </div>
              <div className="card-body text-center p-4">
                
                {generatedQR.qrCode ? (
                  <>
                    <div className="mb-3">
                      <img 
                        src={generatedQR.qrCode} 
                        alt="QR Code pour la présence"
                        className="img-fluid border rounded shadow-sm qr-code-image"
                        style={{ maxWidth: '300px', height: 'auto' }}
                      />
                    </div>
                    <p className="text-success mb-3">
                      <i className="bi bi-check-circle me-2"></i>
                      QR code généré avec succès
                    </p>
                  </>
                ) : (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Le QR code a été généré avec succès mais les données de visualisation ne sont pas disponibles.
                  </div>
                )}
                
                <div className="bg-light p-3 rounded mb-3 text-start">
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-calendar-event me-2"></i>
                    Détails de la séance :
                  </h6>
                  
                  <table className="table table-borderless table-sm mb-0">
                    <tbody>
                      <tr>
                        <td width="40%"><strong>Matière :</strong></td>
                        <td>{generatedQR.seance?.nom_matiere || 'Non spécifié'}</td>
                      </tr>
                      <tr>
                        <td><strong>Date :</strong></td>
                        <td>
                          {generatedQR.seance?.date_seance ? 
                            new Date(generatedQR.seance.date_seance).toLocaleDateString('fr-FR') : 
                            'Non spécifié'
                          }
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Heure :</strong></td>
                        <td>
                          {generatedQR.seance?.heure_debut || 'Non spécifié'} - 
                          {generatedQR.seance?.heure_fin || 'Non spécifié'}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Salle :</strong></td>
                        <td>{generatedQR.seance?.salle || 'Non spécifié'}</td>
                      </tr>
                      {generatedQR.seance?.qr_expire && (
                        <tr>
                          <td><strong>Expire à :</strong></td>
                          <td>{new Date(generatedQR.seance.qr_expire).toLocaleString('fr-FR')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="d-grid gap-2 d-md-flex justify-content-center no-print">
                  <button 
                    className="btn btn-primary"
                    onClick={handleGeneratePDF}
                  >
                    <i className="bi bi-file-pdf me-2"></i>
                    Générer PDF
                  </button>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => setGeneratedQR(null)}
                  >
                    <i className="bi bi-x me-2"></i>
                    Fermer
                  </button>
                </div>

                <div className="alert alert-info no-print mt-3">
                  <small>
                    <i className="bi bi-lightbulb me-2"></i>
                    <strong>Conseil :</strong> Téléchargez le PDF et affichez-le en classe pour que les étudiants puissent scanner le QR code.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card shadow-lg border-0 h-100">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">
                <i className="bi bi-qr-code me-2"></i>
                Générer un QR Code
              </h5>
            </div>
            <div className="card-body">
              {showQRGenerator ? (
                <form onSubmit={handleGenerateQR}>
                  <div className="mb-3">
                    <label className="form-label">Matière <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={qrFormData.id_matiere}
                      onChange={(e) => setQrFormData({ ...qrFormData, id_matiere: e.target.value })}
                      required
                      disabled={matieres.length === 0}
                    >
                      {getMatieresOptions()}
                    </select>
                    <div className="form-text text-muted">
                      {loading ? (
                        <span className="text-info">
                          <i className="bi bi-hourglass-split me-1"></i>
                          Chargement des matières...
                        </span>
                      ) : matieres.length > 0 ? (
                        <span className="text-success">
                          <i className="bi bi-check-circle me-1"></i>
                          {matieres.length} matière(s) disponible(s)
                        </span>
                      ) : (
                        <span className="text-warning">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          Aucune matière disponible. Contactez l'administrateur.
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={qrFormData.date_seance}
                      onChange={(e) => setQrFormData({ ...qrFormData, date_seance: e.target.value })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <div className="mb-3">
                        <label className="form-label">Heure début <span className="text-danger">*</span></label>
                        <input
                          type="time"
                          className="form-control"
                          value={qrFormData.heure_debut}
                          onChange={(e) => setQrFormData({ ...qrFormData, heure_debut: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="mb-3">
                        <label className="form-label">Heure fin <span className="text-danger">*</span></label>
                        <input
                          type="time"
                          className="form-control"
                          value={qrFormData.heure_fin}
                          onChange={(e) => setQrFormData({ ...qrFormData, heure_fin: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Salle <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={qrFormData.salle}
                      onChange={(e) => setQrFormData({ ...qrFormData, salle: e.target.value })}
                      placeholder="Ex: A101"
                      required
                    />
                  </div>
                  <div className="d-grid gap-2">
                    <button 
                      type="submit" 
                      className="btn btn-success" 
                      disabled={generating || !canGenerateQR()}
                    >
                      {generating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Génération...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-qr-code me-2"></i>
                          Générer QR Code
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowQRGenerator(false)}
                      disabled={generating}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center">
                  <p className="text-muted mb-3">Créez un QR code pour une nouvelle séance de cours</p>
                  <button
                    className="btn btn-success w-100"
                    onClick={() => setShowQRGenerator(true)}
                    disabled={!canGenerateQR()}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Nouveau QR Code
                    {!canGenerateQR() && (
                      <small className="d-block mt-1">
                        {!user || user.type_utilisateur !== 'enseignant' 
                          ? '(Réservé aux enseignants)' 
                          : ' (Aucune matière disponible)'
                        }
                      </small>
                    )}
                  </button>
                  <div className="mt-3">
                    {loading ? (
                      <div className="text-info small">
                        <i className="bi bi-hourglass-split me-1"></i>
                        Chargement des matières...
                      </div>
                    ) : matieres.length > 0 ? (
                      <div className="text-success small">
                        <i className="bi bi-check-circle me-1"></i>
                        Vous enseignez {matieres.length} matière(s)
                      </div>
                    ) : (
                      <div className="text-warning small">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Aucune matière attribuée à votre profil
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-lg border-0 h-100">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Mes Séances ({Array.isArray(seances) ? seances.length : 0})
              </h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="text-muted mt-2">Chargement des données depuis la base de données...</p>
                </div>
              ) : !Array.isArray(seances) || seances.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-calendar-x text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted mt-2">Aucune séance créée</p>
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setShowQRGenerator(true)}
                    disabled={!canGenerateQR()}
                  >
                    Créer une première séance
                  </button>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {seances.map((seance) => {
                    const nomMatiere = seance.nom_matiere || seance.matiere_nom || 'Matière inconnue'
                    const dateSeance = seance.date_seance
                    const heureDebut = seance.heure_debut
                    const salle = seance.salle || 'N/A'
                    const nombrePresents = seance.nombre_presents || 0
                    const isActive = isSeanceActive(seance)
                    
                    return (
                      <div key={seance.id_seance || seance.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1 text-primary">{nomMatiere}</h6>
                            <small className="text-muted">
                              <i className="bi bi-calendar me-1"></i>
                              {formatSeanceDate(dateSeance)} 
                              <i className="bi bi-clock ms-2 me-1"></i>
                              {heureDebut || 'Heure inconnue'}
                              <br />
                              <i className="bi bi-geo-alt me-1"></i>
                              Salle: {salle} 
                              <i className="bi bi-people ms-2 me-1"></i>
                              Présents: {nombrePresents}
                            </small>
                          </div>
                          <div className="d-flex flex-column align-items-end gap-1">
                            <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`}>
                              {isActive ? 'Actif' : 'Expiré'}
                            </span>
                            {isActive && (
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleViewQRCode(seance)}
                                title="Voir le QR Code"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card shadow-lg border-0">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-book me-2"></i>
                Gestion des Matières
              </h5>
            </div>
            <div className="card-body text-center">
              <p className="text-muted mb-3">Gérez vos matières : ajoutez, modifiez ou supprimez des matières</p>
              <a href="#/matieres" className="btn btn-info">
                <i className="bi bi-book me-2"></i>
                Gérer les matières
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <a href="#/dashboard" className="btn btn-outline-success">
          <i className="bi bi-arrow-left me-2"></i>
          Retour au tableau de bord
        </a>
      </div>
    </Container>
  )
}

export default TeacherManagementPage