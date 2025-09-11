import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
import { setupModelUrlForDev } from './env'

const container = document.getElementById('root')!
const root = createRoot(container)
setupModelUrlForDev()
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// A-Frame DOMがマウントされた後に既存制御を読み込む
requestAnimationFrame(() => import('./main.js'))


