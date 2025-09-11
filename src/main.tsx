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
import '@c-frame/aframe-physics-system'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// A-Frame DOMがマウントされた後に既存制御を読み込む
requestAnimationFrame(() => import('./main.js'))


