import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Configure Cesium base URL for assets
if (typeof window !== 'undefined') {
  ;(window as any).CESIUM_BASE_URL = '/cesium/'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)