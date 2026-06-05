import { useEffect, useMemo, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Container, Nav, Navbar } from 'react-bootstrap'
import LoginPage from './pages/LoginPage.jsx'
import Dashboard from './components/Dashboard.jsx'
import StudentPresencePage from './components/StudentPresencePage.jsx'
import TeacherManagementPage from './components/TeacherManagementPage.jsx'
import MatiereManagementPage from './components/MatiereManagementPage.jsx'
import QrScanner from './components/QrScanner.jsx'
import Register from './components/Register.jsx'
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
  const isOnRegister = location.pathname.startsWith('/register')
  const showNavbar = isAuthed && !isOnLogin && !isOnRegister

  const role = user?.type_utilisateur || user?.role || ''
  const isStudent = role === 'etudiant'
  const isTeacher = role === 'enseignant'

  useEffect(() => {
    const onStorage = () => {
      setUser(readStoredUser())
      setToken(getStoredToken())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!isAuthed && !isOnLogin && !isOnRegister) {
      navigate('/login', { replace: true })
    }
  }, [isAuthed, isOnLogin, isOnRegister, navigate])

  const userLabel = useMemo(() => {
    if (!user) return ''
    const prenom = user.prenom || ''
    const nom = user.nom || ''
    const userRole = user.type_utilisateur || user.role || ''
    return [prenom, nom].filter(Boolean).join(' ') + (userRole ? ` (${userRole})` : '')
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

  const handleLogin = ({ user: u, token: t }) => {
    localStorage.setItem('authToken', t)
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
    setToken(t)
    navigate('/dashboard', { replace: true })
  }

  return (
    <>
      {showNavbar && (
        <Navbar expand="lg" className="app-navbar">
          <Container>
            <Navbar.Brand href="#/dashboard">QR Présence</Navbar.Brand>
            <Navbar.Toggle aria-controls="main-nav" aria-label="Menu" />
            <Navbar.Collapse id="main-nav">
              <Nav className="me-auto">
                <Nav.Link href="#/dashboard">Tableau de bord</Nav.Link>
                {isStudent && (
                  <>
                    <Nav.Link href="#/student">Mes présences</Nav.Link>
                    <Nav.Link href="#/scan">Scanner QR</Nav.Link>
                  </>
                )}
                {isTeacher && (
                  <>
                    <Nav.Link href="#/teacher">Gestion cours</Nav.Link>
                    <Nav.Link href="#/matieres">Matières</Nav.Link>
                  </>
                )}
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
            isAuthed ? <Navigate to="/dashboard" replace /> : <LoginPage onLoggedIn={handleLogin} />
          }
        />
        <Route
          path="/register"
          element={
            isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Register
                onLogin={(u, t) => handleLogin({ user: u, token: t })}
                onShowLogin={() => navigate('/login', { replace: true })}
              />
            )
          }
        />

        <Route path="/dashboard" element={isAuthed ? <Dashboard user={user} /> : <Navigate to="/login" replace />} />
        <Route
          path="/student"
          element={isAuthed ? <StudentPresencePage user={user} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/student/presences"
          element={isAuthed ? <StudentPresencePage user={user} /> : <Navigate to="/login" replace />}
        />
        <Route path="/scan" element={isAuthed ? <QrScanner user={user} /> : <Navigate to="/login" replace />} />
        <Route
          path="/teacher"
          element={isAuthed ? <TeacherManagementPage user={user} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/matieres"
          element={isAuthed ? <MatiereManagementPage user={user} /> : <Navigate to="/login" replace />}
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
