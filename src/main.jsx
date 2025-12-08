import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

// Import CSS
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

// Gestion des erreurs de ressources (fonts, images, etc.)
window.addEventListener('error', (event) => {
  // Ignorer les erreurs 404 sur les fonts et autres assets pour éviter la pollution de la console
  if (event.target && (event.target.tagName === 'LINK' || event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT')) {
    const src = event.target.href || event.target.src
    if (src && (src.includes('.woff') || src.includes('.woff2') || src.includes('favicon'))) {
      event.preventDefault()
      console.warn('Resource not found:', src)
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
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)