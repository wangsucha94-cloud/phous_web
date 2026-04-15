import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const BODY_TEXT =
  "PHOUS is a contemporary fragrance house that merges the flowing curves of the 'Spider Lily'\u2014which blooms at the most dramatic moments\u2014with the cold, sleek texture of metal. We do not simply create scents; we visualize the invisible through sculptural aesthetics."

function useVideo(src) {
  const videoRef = useRef(null)
  const [ready, setReady] = useState(false)

  if (!videoRef.current) {
    const v = document.createElement('video')
    v.src = src
    v.crossOrigin = 'anonymous'
    v.loop = true
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    videoRef.current = v
  }

  useEffect(() => {
    const v = videoRef.current
    const onPlay = () => setReady(true)
    v.addEventListener('playing', onPlay)
    v.play().catch(() => {})
    const tryPlay = () => v.play().catch(() => {})
    window.addEventListener('click', tryPlay, { once: true })
    window.addEventListener('touchstart', tryPlay, { once: true })
    window.addEventListener('mousemove', tryPlay, { once: true })
    return () => {
      v.removeEventListener('playing', onPlay)
      window.removeEventListener('click', tryPlay)
      window.removeEventListener('touchstart', tryPlay)
      window.removeEventListener('mousemove', tryPlay)
    }
  }, [])

  return { video: videoRef.current, ready }
}

function VideoBg() {
  const { video, ready } = useVideo('/page1/water.mp4')
  const { viewport } = useThree()

  const texture = useMemo(() => {
    const t = new THREE.VideoTexture(video)
    t.minFilter = THREE.LinearFilter
    t.magFilter = THREE.LinearFilter
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [video])

  return (
    <mesh position={[0, 0, -6]}>
      <planeGeometry args={[viewport.width * 2.5, viewport.height * 2.5]} />
      <meshBasicMaterial
        map={ready ? texture : null}
        color={ready ? '#ffffff' : '#111'}
        toneMapped={false}
        opacity={ready ? 0.15 : 0.3}
        transparent
      />
    </mesh>
  )
}

function Sphere() {
  const { video, ready } = useVideo('/page1/water.mp4')
  const meshRef = useRef()

  const videoTexture = useMemo(() => {
    const t = new THREE.VideoTexture(video)
    t.minFilter = THREE.LinearFilter
    t.magFilter = THREE.LinearFilter
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [video])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.08
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.1
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 64, 64]} />
      {ready ? (
        <meshStandardMaterial
          map={videoTexture}
          toneMapped={false}
          roughness={0.15}
          metalness={0.3}
          emissive="#333"
          emissiveIntensity={0.4}
        />
      ) : (
        <meshPhysicalMaterial
          color="#2a2a4e"
          roughness={0.1}
          metalness={0.9}
          emissive="#3344aa"
          emissiveIntensity={0.15}
          clearcoat={1}
          clearcoatRoughness={0.1}
          reflectivity={1}
        />
      )}
    </mesh>
  )
}

function TextCylinder({ text }) {
  const meshRef = useRef()
  const isDragging = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })
  const rotation = useRef({ x: 0, y: Math.PI })
  const velocity = useRef({ x: 0, y: 0 })
  const [fontLoaded, setFontLoaded] = useState(false)

  useEffect(() => {
    document.fonts.ready.then(() => setFontLoaded(true))
    // Fallback
    const timer = setTimeout(() => setFontLoaded(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const texture = useMemo(() => {
    const canvasWidth = 2048
    const canvasHeight = 1024
    const c = document.createElement('canvas')
    c.width = canvasWidth
    c.height = canvasHeight
    const ctx = c.getContext('2d')

    // Black background
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const fontFamily = fontLoaded
      ? '"Cormorant Garamond", Georgia, serif'
      : 'Georgia, "Times New Roman", serif'

    ctx.font = `300 42px ${fontFamily}`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const words = text.split(' ')
    const maxWidth = 1000
    const lines = []
    let currentLine = ''

    for (const word of words) {
      const test = currentLine ? currentLine + ' ' + word : word
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = test
      }
    }
    if (currentLine) lines.push(currentLine)

    const lineHeight = 58
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2

    lines.forEach((line, i) => {
      ctx.fillText(line, centerX, startY + i * lineHeight)
    })

    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [text, fontLoaded])

  useEffect(() => {
    const handleMouseDown = (e) => {
      isDragging.current = true
      prevMouse.current = { x: e.clientX, y: e.clientY }
      velocity.current = { x: 0, y: 0 }
    }
    const handleMouseMove = (e) => {
      if (!isDragging.current) return
      const dx = e.clientX - prevMouse.current.x
      const dy = e.clientY - prevMouse.current.y
      velocity.current = { x: dy * 0.002, y: dx * 0.003 }
      rotation.current.x += dy * 0.002
      rotation.current.y += dx * 0.003
      prevMouse.current = { x: e.clientX, y: e.clientY }
    }
    const handleMouseUp = () => { isDragging.current = false }
    const handleTouchStart = (e) => {
      isDragging.current = true
      prevMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      velocity.current = { x: 0, y: 0 }
    }
    const handleTouchMove = (e) => {
      if (!isDragging.current) return
      const t = e.touches[0]
      const dx = t.clientX - prevMouse.current.x
      const dy = t.clientY - prevMouse.current.y
      velocity.current = { x: dy * 0.002, y: dx * 0.003 }
      rotation.current.x += dy * 0.002
      rotation.current.y += dx * 0.003
      prevMouse.current = { x: t.clientX, y: t.clientY }
    }
    const handleTouchEnd = () => { isDragging.current = false }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  useFrame(() => {
    if (!meshRef.current) return
    if (!isDragging.current) {
      velocity.current.x *= 0.96
      velocity.current.y *= 0.96
      rotation.current.x += velocity.current.x
      rotation.current.y += velocity.current.y
      rotation.current.y += 0.0015
    }
    meshRef.current.rotation.x = rotation.current.x
    meshRef.current.rotation.y = rotation.current.y
  })

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[2.5, 2.5, 3, 64, 1, true]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={3} />
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <pointLight position={[-3, -3, 5]} intensity={1.5} color="#6688cc" />
      <pointLight position={[0, 3, 3]} intensity={1} color="#ffffff" />
      <VideoBg />
      <Sphere />
      <TextCylinder text={BODY_TEXT} />
    </>
  )
}

export default function VideoSphere() {
  return (
    <div style={{ width: '100%', height: '100%', cursor: 'grab' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
        style={{ background: '#000' }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
