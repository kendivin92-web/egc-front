import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

import './App.css'
import App from './App.jsx'
import BackButtonHandler from "./components/BackButtonHandler.jsx";
import { initializeOfflineStorage } from "./services/offlineStorage.js";
import { NetworkStatusProvider } from "./services/NetworkStatus.jsx";
import { API_URL } from "./services/apiConfig.js";


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
const root = createRoot(document.getElementById('root'));

if ("serviceWorker" in navigator) {
  const serviceWorkerUrl = `/service-worker.js?apiOrigin=${encodeURIComponent(API_URL)}`;
  navigator.serviceWorker.register(serviceWorkerUrl)
    .catch((error) => {
      console.error("Impossible d’activer le cache hors ligne des images :", error);
    });
}

initializeOfflineStorage()
  .catch((error) => {
    console.error("Le cache IndexedDB n’a pas pu être initialisé :", error);
  })
  .finally(() => {
    root.render(
      <StrictMode>
        <NetworkStatusProvider>
          <BrowserRouter>
            <BackButtonHandler />
            <App />
          </BrowserRouter>
        </NetworkStatusProvider>
      </StrictMode>,
    );
  });