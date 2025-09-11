import React, { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    MODEL_URL?: string
    AFRAME: any
  }
}

const App: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const progressTextRef = useRef<HTMLSpanElement | null>(null)
  const progressFillRef = useRef<HTMLDivElement | null>(null)
  const [token, setToken] = useState<string | null>(() => (typeof window !== 'undefined' ? (window as any).M_T ?? null : null))

  // 1) 初回にトークンだけ取り込んで state に反映（描画トリガ）
  useEffect(() => {
    const t = (window as any).M_T
    if (t) setToken(t)
  }, [])

  // 2) token が用意できてからアセット進捗のリスナーを登録
  useEffect(() => {
    if (!token) return
    const modelEl = document.getElementById('modelGLB') as HTMLElement | null
    if (!modelEl) return

    function showOverlay() {
      const el = overlayRef.current
      if (!el) return
      el.style.opacity = '1'
      el.style.pointerEvents = 'auto'
      el.style.display = 'flex'
    }

    function hideOverlay() {
      const el = overlayRef.current
      if (!el) return
      el.style.opacity = '0'
      el.style.pointerEvents = 'none'
      setTimeout(() => { if (el) el.style.display = 'none' }, 300)
    }

    const onProgress = (e: Event & { detail?: any }) => {
      showOverlay()
      const detail = e.detail || {}
      const loaded = Number(detail.loaded ?? 0)
      const total = Number(detail.total ?? 0)
      const percent = total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 0
      if (progressTextRef.current) progressTextRef.current.textContent = `${percent}%`
      if (progressFillRef.current) progressFillRef.current.style.width = `${percent}%`
    }

    const onLoaded = () => {
      if (progressTextRef.current) progressTextRef.current.textContent = '100%'
      if (progressFillRef.current) progressFillRef.current.style.width = '100%'
      hideOverlay()
    }

    modelEl.addEventListener('progress', onProgress as EventListener)
    modelEl.addEventListener('loaded', onLoaded as EventListener)

    return () => {
      modelEl.removeEventListener('progress', onProgress as EventListener)
      modelEl.removeEventListener('loaded', onLoaded as EventListener)
    }
  }, [token])

  return (
    <>
      <div id="loadingOverlay" ref={overlayRef} aria-hidden="true">
        <div className="loading-box">
          <div className="loading-label">Loading model… <span ref={progressTextRef}>0%</span></div>
          <div className="loading-bar">
            <div className="loading-fill" ref={progressFillRef} style={{ width: '0%' }} />
          </div>
        </div>
      </div>
      <a-scene renderer="antialias: true; colorManagement: true; physicallyCorrectLights: true; toneMapping: ACESFilmic; exposure: 1.25" shadow="type: pcfsoft" background="color: #ECECEC" loading-screen="enabled: false">
        <a-assets timeout="0">
          <a-asset-item
            id="modelGLB"
            src={token ? `/model.glb?t=${token}` : '/model.glb'}
            crossorigin="anonymous"
          ></a-asset-item>
        </a-assets>

        <a-plane rotation="-90 0 0" width="20" height="20" color="#CCC" position="0 0 0" shadow="receive: true"></a-plane>

        {/** 壁（見えやすいように少し背を高く、内寸は床20x20に合致） */}
        <a-box position="0 1 -10" depth="0.2" width="20" height="2" color="#9ca3af" shadow="cast: true"></a-box>
        <a-box position="0 1 10" depth="0.2" width="20" height="2" color="#9ca3af" shadow="cast: true"></a-box>
        <a-box position="-10 1 0" depth="20" width="0.2" height="2" color="#9ca3af" shadow="cast: true"></a-box>
        <a-box position="10 1 0" depth="20" width="0.2" height="2" color="#9ca3af" shadow="cast: true"></a-box>

        <a-entity light="type: ambient; color: #ffffff; intensity: 0.6"></a-entity>
        <a-entity light="type: hemisphere; color: #ffffff; groundColor: #b9b9b9; intensity: 0.8"></a-entity>
        <a-entity light="type: directional; intensity: 1.4" position="2 6 3" target="#spawnRoot" shadow="cast: true"></a-entity>

        <a-entity id="rig" position="0 1.6 4" wasd-controls="acceleration: 35" look-controls="pointerLockEnabled: false">
          <a-camera position="0 0 0" wasd-controls-enabled="false"></a-camera>
        </a-entity>

        <a-entity id="spawnRoot" position="0 0 0"></a-entity>

        <a-entity id="summonButton3D" class="clickable"
                  position="0 1 3"
                  geometry="primitive: box; width: 0.6; height: 0.25; depth: 0.06"
                  material="color: #ff6b6b; metalness: 0.4; roughness: 0.6"
                  shadow="cast: true"
                  animation__down="property: position; startEvents: mousedown; to: 0 0.99 3; dur: 80; easing: easeOutQuad"
                  animation__up="property: position; startEvents: mouseup; to: 0 1 3; dur: 80; easing: easeOutQuad">
          <a-entity position="0 -0.01 -0.035"
                    geometry="primitive: box; width: 0.64; height: 0.28; depth: 0.02"
                    material="color: #d94c4c; metalness: 0.1; roughness: 0.7">
          </a-entity>
          <a-entity position="0 0 0.031"
                    geometry="primitive: box; width: 0.58; height: 0.22; depth: 0.005"
                    material="color: #ff8b8b; metalness: 0.3; roughness: 0.4">
          </a-entity>
          <a-entity position="0 0 0.035"
                    text="value: SUMMON!; align: center; color: #fff; width: 2">
          </a-entity>
        </a-entity>

        <a-entity id="stopRotateButton3D" class="clickable"
                  position="0 1.35 3"
                  geometry="primitive: box; width: 0.6; height: 0.25; depth: 0.06"
                  material="color: #ef4444; metalness: 0.2; roughness: 0.7"
                  shadow="cast: true"
                  animation__down="property: position; startEvents: mousedown; to: 0 1.34 3; dur: 80; easing: easeOutQuad"
                  animation__up="property: position; startEvents: mouseup; to: 0 1.35 3; dur: 80; easing: easeOutQuad">
          <a-entity position="0 -0.01 -0.035"
                    geometry="primitive: box; width: 0.64; height: 0.28; depth: 0.02"
                    material="color: #b91c1c; metalness: 0.1; roughness: 0.7">
          </a-entity>
          <a-entity position="0 0 0.031"
                    geometry="primitive: box; width: 0.58; height: 0.22; depth: 0.005"
                    material="color: #f87171; metalness: 0.2; roughness: 0.5">
          </a-entity>
          <a-entity position="0 0 0.035" text="value: STOP; align: center; color: #fff; width: 2"></a-entity>
        </a-entity>

        <a-entity id="rotateButton3D" class="clickable"
                  position="-0.9 1 3"
                  geometry="primitive: box; width: 0.6; height: 0.25; depth: 0.06"
                  material="color: #3b82f6; metalness: 0.4; roughness: 0.6"
                  shadow="cast: true"
                  animation__down="property: position; startEvents: mousedown; to: -0.9 0.99 3; dur: 80; easing: easeOutQuad"
                  animation__up="property: position; startEvents: mouseup; to: -0.9 1 3; dur: 80; easing: easeOutQuad">
          <a-entity position="0 -0.01 -0.035"
                    geometry="primitive: box; width: 0.64; height: 0.28; depth: 0.02"
                    material="color: #2266dd; metalness: 0.1; roughness: 0.7">
          </a-entity>
          <a-entity position="0 0 0.031"
                    geometry="primitive: box; width: 0.58; height: 0.22; depth: 0.005"
                    material="color: #6ea8ff; metalness: 0.3; roughness: 0.4">
          </a-entity>
          <a-entity position="0 0 0.035" text="value: ROTATE; align: center; color: #fff; width: 2"></a-entity>
        </a-entity>

        <a-entity id="speedUpButton3D" class="clickable"
                  position="-0.9 1.35 3"
                  geometry="primitive: box; width: 0.6; height: 0.25; depth: 0.06"
                  material="color: #fbbf24; metalness: 0.4; roughness: 0.5"
                  shadow="cast: true"
                  animation__down="property: position; startEvents: mousedown; to: -0.9 1.34 3; dur: 80; easing: easeOutQuad"
                  animation__up="property: position; startEvents: mouseup; to: -0.9 1.35 3; dur: 80; easing: easeOutQuad">
          <a-entity position="0 -0.01 -0.035"
                    geometry="primitive: box; width: 0.64; height: 0.28; depth: 0.02"
                    material="color: #d6a514; metalness: 0.1; roughness: 0.7">
          </a-entity>
          <a-entity position="0 0 0.031"
                    geometry="primitive: box; width: 0.58; height: 0.22; depth: 0.005"
                    material="color: #fde68a; metalness: 0.3; roughness: 0.4">
          </a-entity>
          <a-entity position="0 0 0.035" text="value: 速度UP; align: center; color: #7c5f00; width: 2"></a-entity>
        </a-entity>

        <a-entity id="vanishButton3D" class="clickable"
                  position="0.9 1 3"
                  geometry="primitive: box; width: 0.6; height: 0.25; depth: 0.06"
                  material="color: #22c55e; metalness: 0.4; roughness: 0.6"
                  shadow="cast: true"
                  animation__down="property: position; startEvents: mousedown; to: 0.9 0.99 3; dur: 80; easing: easeOutQuad"
                  animation__up="property: position; startEvents: mouseup; to: 0.9 1 3; dur: 80; easing: easeOutQuad">
          <a-entity position="0 -0.01 -0.035"
                    geometry="primitive: box; width: 0.64; height: 0.28; depth: 0.02"
                    material="color: #159944; metalness: 0.1; roughness: 0.7">
          </a-entity>
          <a-entity position="0 0 0.031"
                    geometry="primitive: box; width: 0.58; height: 0.22; depth: 0.005"
                    material="color: #5de18f; metalness: 0.3; roughness: 0.4">
          </a-entity>
          <a-entity position="0 0 0.035" text="value: VANISH; align: center; color: #fff; width: 2"></a-entity>
        </a-entity>

        <a-entity id="mouseCursor" cursor="rayOrigin: mouse" raycaster="objects: .clickable"></a-entity>

        <a-sky color="#ECECEC"></a-sky>
      </a-scene>
    </>
  )
}

export default App


