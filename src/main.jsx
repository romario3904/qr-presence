import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Import CSS
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

// Gestion des erreurs de ressources (fonts, images, etc.)
window.addEventListener('error', (event) => {
  if (event.target && (event.target.tagName === 'LINK' || event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT')) {
    const src = event.target.href || event.target.src
    // Ignorer les erreurs de ressources non critiques
    if (src && (src.includes('.woff') || src.includes('.woff2') || src.includes('favicon'))) {
      event.preventDefault()
      console.warn('Resource not found (non-critical):', src)
      return false
    }
  }
}, true)

// Rendu de l'application
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a <div id="root"></div> in your HTML.')
}

const root = ReactDOM.createRoot(rootElement)

root.render(
  <React.StrictMode>
    {/* PAS de Router ici - Il est déjà dans App.jsx */}
    <App />
  </React.StrictMode>
)