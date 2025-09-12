import React, { useEffect, useRef, useState, useCallback } from 'react'

declare global {
  interface Window {
    MODEL_URL?: string
    AFRAME: any
  }
}

const App: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [token, setToken] = useState<string | null>(() => (typeof window !== 'undefined' ? (window as any).M_T ?? null : null))
  const [showMotionBtn, setShowMotionBtn] = useState<boolean>(false)

  // 1) 初回にトークンだけ取り込んで state に反映（描画トリガ）
  useEffect(() => {
    const t = (window as any).M_T
    if (t) setToken(t)
  }, [])

  // ページロード時: モデルGLBの完全読み込み（#modelGLB.loaded）までオーバーレイを表示
  useEffect(() => {
    const el = overlayRef.current
    if (el) {
      el.style.display = 'flex'
      el.style.opacity = '1'
      el.style.pointerEvents = 'auto'
    }
    const hide = () => {
      const ov = overlayRef.current
      if (!ov) return
      ov.style.opacity = '0'
      ov.style.pointerEvents = 'none'
      setTimeout(() => { if (ov) ov.style.display = 'none' }, 300)
    }

    const modelEl = document.getElementById('modelGLB') as any
    if (!modelEl) return

    // 既に読み込み済みなら即閉じる
    // a-asset-item は hasLoaded を持つ
    if (modelEl.hasLoaded) {
      hide()
      return
    }

    const onModelLoaded = () => hide()
    const onError = () => hide()

    modelEl.addEventListener('loaded', onModelLoaded, { once: true })
    modelEl.addEventListener('error', onError, { once: true })

    return () => {
      modelEl.removeEventListener('loaded', onModelLoaded)
      modelEl.removeEventListener('error', onError)
    }
  }, [])

  // iOS 13+ のモーションセンサー許可ボタン表示制御
  useEffect(() => {
    try {
      const DM: any = (window as any).DeviceMotionEvent
      const DO: any = (window as any).DeviceOrientationEvent
      const needPermission = (DM && typeof DM.requestPermission === 'function') || (DO && typeof DO.requestPermission === 'function')
      if (needPermission) setShowMotionBtn(true)
    } catch (_) {}
  }, [])

  const handleEnableMotion = useCallback(async () => {
    try {
      const DM: any = (window as any).DeviceMotionEvent
      const DO: any = (window as any).DeviceOrientationEvent
      if (DM && typeof DM.requestPermission === 'function') {
        try { await DM.requestPermission() } catch (_) {}
      }
      if (DO && typeof DO.requestPermission === 'function') {
        try { await DO.requestPermission() } catch (_) {}
      }
    } finally {
      setShowMotionBtn(false)
    }
  }, [])

  return (
    <>
      {showMotionBtn && (
        <button
          onClick={handleEnableMotion}
          style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 10, padding: '10px 14px', borderRadius: 9999, border: 'none', background: '#111827', color: '#fff' }}
        >
          センサー許可
        </button>
      )}
      <div id="loadingOverlay" ref={overlayRef} aria-hidden="true" style={{display:'flex'}}>
        <div className="loading-box">
          <div className="loading-label">Loading model…</div>
          <div className="loading-bar"><div className="loading-fill" style={{width:'35%'}}/></div>
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
          <a-camera position="0 0 0" wasd-controls-enabled="false">
            {/** 視線＋フューズカーソル（中央リング）。クリック対象は .clickable に限定 */}
            <a-entity
              cursor="fuse: true; fuseTimeout: 400"
              raycaster="objects: .clickable"
              position="0 0 -1"
              geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.015"
              material="color: white; shader: flat"
              animation__fusing="property: material.color; to: #3b82f6; startEvents: fusing; dur: 120; easing: easeOutQuad"
              animation__fuseend="property: material.color; to: white; startEvents: fuseend; dur: 160; easing: easeOutQuad"
              animation__click="property: material.color; to: white; startEvents: click; dur: 160; easing: easeOutQuad">
            </a-entity>
          </a-camera>
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

        {/** スマホ最適化のためマウスレイカーソルは削除 */}

        <a-sky color="#ECECEC"></a-sky>
      </a-scene>
    </>
  )
}

export default App


