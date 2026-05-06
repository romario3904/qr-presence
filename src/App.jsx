import { useEffect, useMemo, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Container, Nav, Navbar } from 'react-bootstrap'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import StudentPresencePage from './components/StudentPresencePage.jsx'
import { apiHelper } from './apis.js'

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getStoredToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || ''
}

function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(() => readStoredUser())
  const [token, setToken] = useState(() => getStoredToken())

  const isAuthed = !!token
  const isOnLogin = location.pathname.startsWith('/login')

  useEffect(() => {
    const onStorage = () => {
      setUser(readStoredUser())
      setToken(getStoredToken())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!isAuthed && !isOnLogin) {
      navigate('/login', { replace: true })
    }
  }, [isAuthed, isOnLogin, navigate])

  const userLabel = useMemo(() => {
    if (!user) return ''
    const prenom = user.prenom || ''
    const nom = user.nom || ''
    const role = user.type_utilisateur || user.role || ''
    return [prenom, nom].filter(Boolean).join(' ') + (role ? ` (${role})` : '')
  }, [user])

  const handleLogout = async () => {
    try {
      await apiHelper.post('/auth/logout', {})
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setToken('')
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      {!isOnLogin && (
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand href="#/dashboard">QR Présence</Navbar.Brand>
            <Navbar.Toggle aria-controls="main-nav" />
            <Navbar.Collapse id="main-nav">
              <Nav className="me-auto">
                <Nav.Link href="#/dashboard">Dashboard</Nav.Link>
                <Nav.Link href="#/student/presences">Mes présences</Nav.Link>
              </Nav>
              <Nav className="ms-auto">
                {userLabel && <Navbar.Text className="me-3">{userLabel}</Navbar.Text>}
                <Nav.Link onClick={handleLogout}>Déconnexion</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}

      <Routes>
        <Route
          path="/login"
          element={
            isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage
                onLoggedIn={({ user: u, token: t }) => {
                  localStorage.setItem('authToken', t)
                  localStorage.setItem('token', t)
                  localStorage.setItem('user', JSON.stringify(u))
                  setUser(u)
                  setToken(t)
                  navigate('/dashboard', { replace: true })
                }}
              />
            )
          }
        />

        <Route path="/dashboard" element={isAuthed ? <DashboardPage user={user} /> : <Navigate to="/login" replace />} />
        <Route
          path="/student/presences"
          element={isAuthed ? <StudentPresencePage user={user} /> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}

