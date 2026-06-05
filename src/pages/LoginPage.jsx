import { useState } from 'react'
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import { apiHelper } from '../apis.js'

export default function LoginPage({ onLoggedIn }) {
  const [form, setForm] = useState({ matricule: '', mot_de_passe: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiHelper.post('/auth/login', {
        matricule: form.matricule.trim(),
        mot_de_passe: form.mot_de_passe
      })

      if (!res?.success || !res?.token || !res?.user) {
        setError(res?.message || 'Connexion impossible. Réessayez.')
        return
      }

      onLoggedIn?.({ user: res.user, token: res.token })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Erreur réseau/serveur. Vérifiez la connexion et réessayez.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-fullscreen bg-light" style={{ minHeight: '100vh' }}>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={7} lg={5}>
            <Card className="shadow border-0">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="bi bi-qr-code-scan text-primary" style={{ fontSize: '3rem' }} />
                  </div>
                  <h2 className="mb-1">Se connecter</h2>
                  <div className="text-muted">Entrez votre matricule et votre mot de passe</div>
                </div>

                {error && (
                  <Alert variant="danger" className="rounded-3" dismissible onClose={() => setError('')}>
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    {error}
                  </Alert>
                )}

                <Form onSubmit={onSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Matricule</Form.Label>
                    <Form.Control
                      name="matricule"
                      value={form.matricule}
                      onChange={onChange}
                      placeholder="Votre matricule"
                      autoComplete="username"
                      required
                      disabled={loading}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Mot de passe</Form.Label>
                    <Form.Control
                      type="password"
                      name="mot_de_passe"
                      value={form.mot_de_passe}
                      onChange={onChange}
                      placeholder="Votre mot de passe"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                    />
                  </Form.Group>

                  <Button type="submit" className="w-100" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Connexion...
                      </>
                    ) : (
                      'Connexion'
                    )}
                  </Button>

                  <div className="text-center mt-3">
                    <a href="#/register" className="text-decoration-none">
                      Créer un compte
                    </a>
                  </div>
                </Form>
              </Card.Body>
            </Card>

            <div className="text-center text-muted small mt-3">
              API: {import.meta.env.VITE_API_URL || 'https://qr-presence-api.onrender.com'}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

