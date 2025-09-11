// Load A-Frame from npm first
import 'aframe'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

async function waitForToken(timeoutMs = 800) {
  const start = performance.now()
  return new Promise<void>((resolve) => {
    if ((window as any).M_T) return resolve()
    const id = setInterval(() => {
      if ((window as any).M_T || performance.now() - start > timeoutMs) {
        clearInterval(id)
        resolve()
      }
    }, 16)
  })
}

;(async () => {
  await waitForToken()
  const container = document.getElementById('root')!
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  requestAnimationFrame(() => import('./main.js'))
})()


