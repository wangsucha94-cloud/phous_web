import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const BODY_TEXT =
  "phous is a contemporary fragrance house that merges the flowing curves of the 'spider lily'\u2014which blooms at the most dramatic moments\u2014with the cold, sleek texture of metal. we do not simply create scents; we visualize the invisible through sculptural aesthetics. encased in sharp yet elegant silver vessels, lycoris noir serves as a medium to awaken your deepest senses. we invite you to a world of unfamiliar enchantment, where beauty stands poised on the edge of the unknown."

function TextSphere({ visible, isActive }) {
  const meshRef = useRef()
  const occluderRef = useRef()
  const isDragging = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })
  // UV offsets — text slides ON the sphere surface
  const uvOffset = useRef({ x: 0, y: 0 })
  const uvVel = useRef({ x: 0, y: 0 })
  const [fontLoaded, setFontLoaded] = useState(false)
  const fadeRef = useRef(0)

  useEffect(() => {
    document.fonts.ready.then(() => setFontLoaded(true))
    const t = setTimeout(() => setFontLoaded(true), 2000)
    return () => clearTimeout(t)
  }, [])

  const texture = useMemo(() => {
    const W = 8192, H = 4096
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    // Step 1: Render text to temp canvas
    const tmp = document.createElement('canvas')
    tmp.width = W; tmp.height = H
    const tCtx = tmp.getContext('2d')

    const ff = '"Helvetica Neue", "Arial", "Apple SD Gothic Neo", sans-serif'
    const fs = 85
    tCtx.font = `800 ${fs}px ${ff}`
    tCtx.textBaseline = 'middle'
    tCtx.textAlign = 'left'
    tCtx.fillStyle = '#ffffff'

    const lh = fs * 1.3
    const rows = 4
    const bandH = rows * lh
    const bandTop = (H - bandH) / 2
    const sw = tCtx.measureText(BODY_TEXT + '  ').width

    for (let r = 0; r < rows; r++) {
      const y = bandTop + lh * 0.5 + r * lh
      const off = r % 2 === 0 ? 0 : sw * 0.3
      let x = -off
      while (x < W + off) {
        tCtx.fillText(BODY_TEXT + '  ', x, y)
        x += sw
      }
    }

    // Step 2: Convert to LED dot-matrix (dashes + dots) with glow
    const rowHeight = 14
    const dotR = 5
    const lineH = 7
    const imgData = tCtx.getImageData(0, 0, W, H)
    const pixels = imgData.data

    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 60
    ctx.fillStyle = '#ffffff'

    for (let gy = 0; gy < H; gy += rowHeight) {
      let runStart = -1
      for (let gx = 0; gx <= W; gx += 4) {
        const idx = (gy * W + Math.min(gx, W - 1)) * 4
        const filled = gx < W && pixels[idx + 3] > 40

        if (filled && runStart < 0) {
          runStart = gx
        } else if (!filled && runStart >= 0) {
          const runLen = gx - runStart
          if (runLen <= 6) {
            ctx.beginPath()
            ctx.arc(runStart + runLen / 2, gy, dotR, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.beginPath()
            ctx.roundRect(runStart, gy - lineH / 2, runLen, lineH, lineH / 2)
            ctx.fill()
          }
          runStart = -1
        }
      }
    }

    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    // RepeatWrapping so text loops when sliding past poles
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.needsUpdate = true
    return t
  }, [fontLoaded])

  useEffect(() => {
    if (!isActive) return // Don't register events when page 1 is not active

    const md = (e) => {
      isDragging.current = true
      const pt = e.touches ? e.touches[0] : e
      prevMouse.current = { x: pt.clientX, y: pt.clientY }
      uvVel.current = { x: 0, y: 0 }
    }
    const mm = (e) => {
      if (!isDragging.current) return
      const pt = e.touches ? e.touches[0] : e
      const dx = pt.clientX - prevMouse.current.x
      const dy = pt.clientY - prevMouse.current.y
      uvVel.current.x = -dx * 0.0008
      uvVel.current.y = dy * 0.0008
      uvOffset.current.x += uvVel.current.x
      uvOffset.current.y += uvVel.current.y
      prevMouse.current = { x: pt.clientX, y: pt.clientY }
    }
    const mu = () => { isDragging.current = false }

    window.addEventListener('mousedown', md)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)
    window.addEventListener('touchstart', md)
    window.addEventListener('touchmove', mm)
    window.addEventListener('touchend', mu)
    return () => {
      isDragging.current = false
      window.removeEventListener('mousedown', md)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', mu)
      window.removeEventListener('touchstart', md)
      window.removeEventListener('touchmove', mm)
      window.removeEventListener('touchend', mu)
    }
  }, [isActive])

  useFrame((_, dt) => {
    if (!meshRef.current) return

    // Fade in
    if (visible) fadeRef.current = Math.min(1, fadeRef.current + dt * 0.8)
    meshRef.current.material.opacity = fadeRef.current * 0.9

    // Inertia
    if (!isDragging.current) {
      uvVel.current.x *= 0.95
      uvVel.current.y *= 0.95
      uvOffset.current.x += uvVel.current.x
      uvOffset.current.y += uvVel.current.y
      // Slow auto-scroll horizontally
      uvOffset.current.x += 0.0002
    }

    // Apply UV offset to texture — text slides on sphere surface
    meshRef.current.material.map.offset.set(
      uvOffset.current.x,
      uvOffset.current.y
    )
  })

  const R = 1.17

  return (
    <group rotation={[0.25, 0, 0.08]} position={[0, -0.03, 0]}>
      {/* Occluder: blocks back-side text */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[R * 0.88, 64, 64]} />
        <meshBasicMaterial colorWrite={false} depthWrite={true} />
      </mesh>
      {/* Text sphere — fixed, only texture moves */}
      <mesh ref={meshRef} renderOrder={1}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshBasicMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          opacity={0}
        />
      </mesh>
    </group>
  )
}

export default function PageOneScene({ assembled, isActive }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 50 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'transparent' }}
    >
      <TextSphere visible={assembled} isActive={isActive} />
    </Canvas>
  )
}
