import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

import './App.css'
import App from './App.jsx'
import BackButtonHandler from "./components/BackButtonHandler.jsx";


// ─────────────────────────────────────────────
// CONFIGURATION BARRE D'ÉTAT / EDGE-TO-EDGE
// ─────────────────────────────────────────────
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true }).catch((error) => {
    console.error('Unable to configure native status bar overlay:', error)
  })
  StatusBar.setStyle({ style: Style.Light }).catch((error) => {
    console.error('Unable to configure native status bar style:', error)
  })
}


// ─────────────────────────────────────────────
// APPLICATION
// ─────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BackButtonHandler />
      <App />
    </BrowserRouter>
  </StrictMode>,
)