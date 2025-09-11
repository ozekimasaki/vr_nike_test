// Load A-Frame from npm first
import 'aframe'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
// Load cannon-es and physics system before app mounts
// Load cannon-es from npm and register physics system
import * as CANNON from 'cannon-es'
;(window as any).CANNON = CANNON
// Fallback: CDN physics plugin (avoid npm postinstall patches in CI)
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(s)
  })
}
await loadScript('https://cdn.jsdelivr.net/gh/c-frame/aframe-physics-system@v4.2.3/dist/aframe-physics-system.min.js')

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// A-Frame DOMがマウントされた後に既存制御を読み込む
requestAnimationFrame(() => import('./main.js'))


