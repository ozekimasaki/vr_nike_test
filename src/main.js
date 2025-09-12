// Three.jsのアセットキャッシュを有効化（初回以降のクローンや素材取得を高速化）
try {
  if (window.AFRAME && window.AFRAME.THREE && window.AFRAME.THREE.Cache) {
    window.AFRAME.THREE.Cache.enabled = true
  }
} catch (_) {}

// プレイヤー移動のX/Z範囲を制限するコンポーネント
try {
  if (window.AFRAME) {
    window.AFRAME.registerComponent('clamp-position', {
      schema: {
        minX: { type: 'number', default: -9 },
        maxX: { type: 'number', default: 9 },
        minZ: { type: 'number', default: -9 },
        maxZ: { type: 'number', default: 9 }
      },
      tick: function () {
        const p = this.el.object3D.position
        let nx = p.x
        let nz = p.z
        if (p.x < this.data.minX) nx = this.data.minX
        else if (p.x > this.data.maxX) nx = this.data.maxX
        if (p.z < this.data.minZ) nz = this.data.minZ
        else if (p.z > this.data.maxZ) nz = this.data.maxZ
        if (nx !== p.x || nz !== p.z) {
          p.x = nx
          p.z = nz
        }
      }
    })
  }
} catch (_) {}

const spawnRoot = document.getElementById('spawnRoot')
const button3D = document.getElementById('summonButton3D')
const rotateButton3D = document.getElementById('rotateButton3D')
const speedUpButton3D = document.getElementById('speedUpButton3D')
const vanishButton3D = document.getElementById('vanishButton3D')
const stopRotateButton3D = document.getElementById('stopRotateButton3D')
const rig = document.getElementById('rig')
const floorEl = document.getElementById('floor')
let gazeCursorEl = null
try {
  const scene = document.querySelector('a-scene')
  gazeCursorEl = scene && scene.querySelector('a-camera a-entity[cursor]')
} catch (_) {}

let spawnedModel = null
let rotateAnimationId = null
let currentRotateSpeedDegPerSec = 90

function enableShadowsForObject3D(object3D) {
  if (!object3D) return
  object3D.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true
      node.receiveShadow = false
    }
  })
}

function collectMeshMaterials(object3D) {
  const materialSet = new Set()
  if (!object3D) return []
  object3D.traverse((node) => {
    if (node.isMesh && node.material) {
      if (Array.isArray(node.material)) {
        node.material.forEach((m) => materialSet.add(m))
      } else {
        materialSet.add(node.material)
      }
    }
  })
  return Array.from(materialSet)
}

function fadeInMaterials(materials, durationMs) {
  if (!materials || materials.length === 0) return
  materials.forEach((m) => { m.transparent = true; m.opacity = 0 })

  const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
  const start = performance.now()
  function step(now) {
    const t = Math.min(1, (now - start) / durationMs)
    const e = easeInOutCubic(t)
    materials.forEach((m) => { m.opacity = e })
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

let isLoadingModel = false

function summon() {
  isLoadingModel = true
  try { window.dispatchEvent(new CustomEvent('glb-load-start')) } catch (_) {}
  if (spawnedModel && spawnedModel.parentNode) {
    spawnedModel.parentNode.removeChild(spawnedModel)
    spawnedModel = null
  }

  const entity = document.createElement('a-entity')
  entity.setAttribute('gltf-model', '#modelGLB')
  entity.setAttribute('position', { x: 0, y: 0, z: 0 })
  entity.setAttribute('rotation', { x: 0, y: 0, z: 0 })
  entity.setAttribute('scale', '4 4 4')
  entity.setAttribute('shadow', 'cast: true; receive: false')

  entity.setAttribute('animation__drop', 'property: position; from: 0 6 -1.2; to: 0 0 -1.2; dur: 4000; easing: easeInOutCubic; autoplay: false; startEvents: startDrop')
  entity.setAttribute('animation__bounce', 'property: position; dir: alternate; loop: 0; startEvents: dropDone; to: 0 0.06 -1.2; dur: 280; easing: easeOutCubic')

  entity.addEventListener('animationcomplete__drop', () => {
    entity.emit('dropDone')
  })

  entity.addEventListener('model-loaded', () => {
    const mesh = entity.getObject3D('mesh')
    enableShadowsForObject3D(mesh)
    const materials = collectMeshMaterials(mesh)
    fadeInMaterials(materials, 1200)
    // 次フレーム以降に落下開始（シェーダの初回コンパイル後に開始してカクつきを軽減）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        entity.emit('startDrop')
        if (isLoadingModel) {
          isLoadingModel = false
          try { window.dispatchEvent(new CustomEvent('glb-load-complete')) } catch (_) {}
        }
      })
    })
  })

  entity.addEventListener('model-error', () => {
    if (isLoadingModel) {
      isLoadingModel = false
      try { window.dispatchEvent(new CustomEvent('glb-load-error')) } catch (_) {}
    }
  })

  spawnRoot.appendChild(entity)
  spawnedModel = entity

  // 3Dボタンのフィードバック（PBR材質想定）
  button3D.classList.add('busy')
  button3D.setAttribute('material', 'color: #ff8b8b; metalness: 0.5; roughness: 0.5')
  setTimeout(() => {
    button3D.classList.remove('busy')
    button3D.setAttribute('material', 'color: #ff6b6b; metalness: 0.4; roughness: 0.6')
  }, 4200)
}

// A-Frameのクリックイベントで召喚
button3D?.addEventListener('click', summon)

// モデルを回転させる（無限）
function startRotate() {
  if (!spawnedModel) return
  stopRotate()
  const start = performance.now()
  function tick(now) {
    const t = (now - start) / 1000
    const y = (t * currentRotateSpeedDegPerSec) % 360
    spawnedModel.setAttribute('rotation', { x: 0, y, z: 0 })
    rotateAnimationId = requestAnimationFrame(tick)
  }
  rotateAnimationId = requestAnimationFrame(tick)
}

function stopRotate() {
  if (rotateAnimationId) {
    cancelAnimationFrame(rotateAnimationId)
    rotateAnimationId = null
  }
}

// 青ボタン: 回転開始（速度を基準値にリセット）
rotateButton3D?.addEventListener('click', () => {
  currentRotateSpeedDegPerSec = 90
  startRotate()
})

// 黄ボタン: 回転速度を段階的に上げる（押すたび増加）
speedUpButton3D?.addEventListener('click', () => {
  if (!spawnedModel) return
  // 上限を適当に設定（例: 720deg/sec）
  currentRotateSpeedDegPerSec = Math.min(currentRotateSpeedDegPerSec * 1.5, 2880)
  // 既に回転中なら即反映（tickが参照している速度が変わる）
  if (!rotateAnimationId) startRotate()
})

// 緑ボタン: 上方向へフェードアウトしながら退場（回転停止）
function vanishUp() {
  if (!spawnedModel) return
  stopRotate()
  const mesh = spawnedModel.getObject3D('mesh')
  const materials = collectMeshMaterials(mesh)
  // フェードアウト準備
  materials.forEach((m) => { m.transparent = true })

  const startPos = spawnedModel.object3D.position.clone()
  const dur = 1200
  const start = performance.now()
  function step(now) {
    const t = Math.min(1, (now - start) / dur)
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // easeInOutQuad
    spawnedModel.object3D.position.y = startPos.y + e * 2.0
    const o = 1 - e
    materials.forEach((m) => { m.opacity = o })
    if (t < 1) requestAnimationFrame(step)
    else {
      spawnedModel.parentNode?.removeChild(spawnedModel)
      spawnedModel = null
    }
  }
  requestAnimationFrame(step)
}

vanishButton3D?.addEventListener('click', vanishUp)

// 赤上ボタン: 回転停止
stopRotateButton3D?.addEventListener('click', () => {
  stopRotate()
  if (spawnedModel) {
    spawnedModel.setAttribute('rotation', { x: 0, y: 0, z: 0 })
  }
  currentRotateSpeedDegPerSec = 90
})

// スペースキーでジャンプ（簡易実装）
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return
  const rigEl = rig
  if (!rigEl || rigEl.__jumping) return

  rigEl.__jumping = true
  const startY = rigEl.object3D.position.y
  const jumpHeight = 2
  const upDur = 220
  const downDur = 260
  const easeOutQuad = (t) => 1 - (1 - t) * (1 - t)
  const easeInQuad = (t) => t * t

  const t0 = performance.now()
  function goUp(now) {
    const t = Math.min(1, (now - t0) / upDur)
    const y = startY + easeOutQuad(t) * jumpHeight
    rigEl.object3D.position.y = y
    if (t < 1) requestAnimationFrame(goUp)
    else {
      const t1 = performance.now()
      function goDown(now2) {
        const tD = Math.min(1, (now2 - t1) / downDur)
        const y2 = startY + (1 - easeInQuad(tD)) * jumpHeight
        rigEl.object3D.position.y = y2
        if (tD < 1) requestAnimationFrame(goDown)
        else {
          rigEl.object3D.position.y = startY
          rigEl.__jumping = false
        }
      }
      requestAnimationFrame(goDown)
    }
  }
  requestAnimationFrame(goUp)
})

// 視線テレポート（床直ヒット時のみワープ＋黒フェード）
try {
  if (gazeCursorEl && rig && floorEl) {
    const fade = {
      el: document.getElementById('fadeOverlay'),
      show(dur = 160) {
        if (!this.el) return
        this.el.style.display = 'block'
        this.el.style.opacity = '1'
      },
      hide(dur = 200) {
        if (!this.el) return
        this.el.style.opacity = '0'
        setTimeout(() => { if (this.el) this.el.style.display = 'none' }, dur)
      }
    }

    gazeCursorEl.addEventListener('click', (ev) => {
      try {
        const d = ev.detail || {}
        const target = d?.el
        // ボタンなどは貫通させない: 床そのものにヒットした時のみ
        if (!target || target !== floorEl) return
        const intersection = d.intersection || d.intersections?.[0]
        if (!intersection || !intersection.point) return
        const p = intersection.point
        // 黒フェード→瞬間移動→フェード解除
        fade.show()
        setTimeout(() => {
          try {
            const pos = rig.object3D.position
            pos.x = p.x
            pos.z = p.z
          } catch (_) {}
          fade.hide()
        }, 140)
      } catch (_) {}
    })
  }
} catch (_) {}

