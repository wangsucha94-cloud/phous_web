import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'

const IMAGES = Array.from({ length: 10 }, (_, i) => `/page2/img${i + 1}.jpg`)

const IMAGE_LAYOUT = [
  { x: -20, y: -30, w: 16, h: 22, depth: 0.2 },
  { x: 2,   y: -32, w: 22, h: 13, depth: 0.7 },
  { x: -22, y: -8,  w: 20, h: 11, depth: 0.5 },
  { x: -4,  y: -10, w: 13, h: 18, depth: 0.85 },
  { x: 10,  y: -10, w: 18, h: 10, depth: 0.15 },
  { x: -18, y: 8,   w: 18, h: 10, depth: 0.6 },
  { x: -6,  y: 7,   w: 16, h: 9,  depth: 0.4 },
  { x: 6,   y: 6,   w: 12, h: 17, depth: 0.9 },
  { x: -12, y: 20,  w: 11, h: 14, depth: 0.3 },
  { x: 0,   y: 19,  w: 20, h: 11, depth: 0.75 },
]

// Generate random particles
const NUM_PARTICLES = 15000
const PARTICLES = Array.from({ length: NUM_PARTICLES }, () => {
  // Bias toward center: use sqrt for uniform disk distribution, then skew inward
  const raw = Math.random()
  const maxRadius = Math.pow(raw, 0.7) // more particles near center
  return {
    angle: Math.random() * Math.PI * 2,
    maxRadius,
    size: 0.5 + Math.random() * 2.5,
    opacity: 0.2 + Math.random() * 0.8,
    speed: 0.5 + Math.random() * 1.5,
  }
})

function FloatingImage({ src, layout, dragX, dragY, zoom, index, onImageClick }) {
  const { x, y, w, h, depth } = layout

  const springConfig = {
    stiffness: 80 + depth * 60,
    damping: 15 + (1 - depth) * 10,
    mass: 0.4 + (1 - depth) * 0.8,
  }
  const moveScale = 20 + depth * 60
  const sx = useSpring(useTransform(dragX, v => v * moveScale), springConfig)
  const sy = useSpring(useTransform(dragY, v => v * moveScale), springConfig)

  // Zoom: images spread out + scale up when zooming in, gather + shrink when zooming out
  const spread = 1 + depth * 0.5
  const imgScale = useSpring(
    useTransform(zoom, v => v >= 0 ? 1 + v * 0.15 * spread : 1 + v * 0.2),
    { stiffness: 60, damping: 18 }
  )
  // zoom>0: spread far apart, zoom<0: collapse tightly
  const offsetX = useSpring(
    useTransform(zoom, v => {
      if (v >= 0) return x * v * 1.5 * spread  // spread wide
      return x * v * 12.0 + x * v * v * 5.0  // collapse hard
    }),
    { stiffness: 60, damping: 18 }
  )
  const offsetY = useSpring(
    useTransform(zoom, v => {
      if (v >= 0) return y * v * 1.2 * spread  // spread wide
      return y * v * 10.0 + y * v * v * 4.0  // collapse hard
    }),
    { stiffness: 60, damping: 18 }
  )

  // Flicker on: wait for particles, then blink on
  const flickerDelay = 1.2 + index * 0.08
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0, 0.8, 0, 1, 0.3, 1] }}
      transition={{ duration: 0.6, delay: flickerDelay, ease: 'easeOut', times: [0, 0.1, 0.2, 0.35, 0.5, 0.7, 1] }}
      style={{
        position: 'absolute',
        left: `${50 + x}%`,
        top: `${50 + y}%`,
        width: `${w}vmin`,
        height: `${h}vmin`,
        transform: 'translate(-50%, -50%)',
        x: useTransform([sx, offsetX], ([s, o]) => s + o),
        y: useTransform([sy, offsetY], ([s, o]) => s + o),
        scale: imgScale,
        zIndex: Math.round(depth * 10),
        willChange: 'transform',
      }}
    >
      <div style={{
        width: '100%', height: '100%',
        animation: `float-img-${index} ${5 + depth * 3}s ease-in-out infinite`,
      }}>
        <img
          src={src}
          alt=""
          draggable={false}
          onClick={(e) => { e.stopPropagation(); onImageClick(src); }}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: 'block', userSelect: 'none',
            cursor: 'pointer',
            animation: `pulse-${index} ${1.5 + depth * 1.5}s ease-in-out infinite`,
            animationDelay: `${index * 0.2 + depth * 0.5}s`,
          }}
        />
      </div>
    </motion.div>
  )
}

function ParticleField({ zoom }) {
  const canvasRef = useRef(null)
  const zoomVal = useRef(0)

  useEffect(() => {
    const unsub = zoom.on('change', v => { zoomVal.current = v })
    return unsub
  }, [zoom])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    function resize() {
      canvas.width = window.innerWidth * 2
      canvas.height = window.innerHeight * 2
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }
    resize()
    window.addEventListener('resize', resize)

    // Each particle tracks its own animated position
    const particlePos = PARTICLES.map(p => ({
      x: canvas.width / 2, y: canvas.height / 2, // start at center point
      targetX: 0, targetY: 0,
      vx: 0, vy: 0,
    }))
    let smoothZoom = -2
    let prevT = 0

    function draw() {
      const W = canvas.width, H = canvas.height
      const cx = W / 2, cy = H / 2
      const z = zoomVal.current

      smoothZoom += (z - smoothZoom) * 0.06
      ctx.clearRect(0, 0, W, H)

      // t: 0=gathered at center, 1=fully spread
      const t = Math.max(0, Math.min(1, (smoothZoom + 2) / 4))
      const maxSpread = Math.max(W, H) * 1.0

      for (let i = 0; i < NUM_PARTICLES; i++) {
        const p = PARTICLES[i]
        const pp = particlePos[i]

        // Target position based on zoom + idle float
        const time = Date.now() * 0.001
        const targetR = maxSpread * p.maxRadius * (0.3 + t * 0.7)
        const floatX = Math.sin(time * (0.2 + p.speed * 0.15) + i * 1.3) * (8 + p.maxRadius * 15)
        const floatY = Math.cos(time * (0.15 + p.speed * 0.12) + i * 0.9) * (6 + p.maxRadius * 12)
        const angleDrift = Math.sin(time * 0.1 + i * 0.05) * 0.15
        pp.targetX = cx + Math.cos(p.angle + angleDrift) * targetR + floatX
        pp.targetY = cy + Math.sin(p.angle + angleDrift) * targetR + floatY

        // Physics: each particle chases its target with individual speed
        const chase = 0.02 + p.speed * 0.04
        pp.vx += (pp.targetX - pp.x) * chase
        pp.vy += (pp.targetY - pp.y) * chase
        pp.vx *= 0.85 // damping
        pp.vy *= 0.85
        pp.x += pp.vx
        pp.y += pp.vy

        const dotSize = p.size * (0.4 + t * 0.6)
        ctx.beginPath()
        ctx.arc(pp.x, pp.y, dotSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity * (0.3 + t * 0.7)})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [zoom])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}

// Shimmer keyframes for each image
const floatImgStyle = document.createElement('style')
floatImgStyle.textContent = IMAGE_LAYOUT.map((l, i) => {
  const ax = 3 + l.depth * 5
  const ay = 2 + l.depth * 4
  return `@keyframes float-img-${i} {
    0%, 100% { transform: translate(0px, 0px); }
    25% { transform: translate(${ax}px, ${-ay}px); }
    50% { transform: translate(${-ax * 0.6}px, ${ay}px); }
    75% { transform: translate(${-ax}px, ${-ay * 0.5}px); }
  }`
}).join('\n')
if (!document.head.querySelector('[data-float-img]')) {
  floatImgStyle.setAttribute('data-float-img', '')
  document.head.appendChild(floatImgStyle)
}

const pulseStyle = document.createElement('style')
pulseStyle.textContent = IMAGE_LAYOUT.map((_, i) =>
  `@keyframes pulse-${i} {
    0%, 100% { filter: brightness(1); }
    45% { filter: brightness(1); }
    50% { filter: brightness(1.6); }
    55% { filter: brightness(1); }
  }`
).join('\n')
if (!document.head.querySelector('[data-pulse]')) {
  pulseStyle.setAttribute('data-pulse', '')
  document.head.appendChild(pulseStyle)
}

export default function PageTwo({ onClose, onTransitionComplete }) {
  const containerRef = useRef(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const zoom = useMotionValue(-2) // start very gathered, will explode out
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  // Intro: wait for page transition, then particles burst from gathered to spread
  useEffect(() => {
    let frame
    const delayMs = 800 // wait for slide-up transition
    const timeout = setTimeout(() => {
      const start = Date.now()
      const duration = 1800
      function animate() {
        const t = Math.min(1, (Date.now() - start) / duration)
        const ease = 1 - Math.pow(1 - t, 3)
        zoom.set(-2 + ease * 2)
        if (t < 1) frame = requestAnimationFrame(animate)
      }
      frame = requestAnimationFrame(animate)
    }, delayMs)
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame) }
  }, [zoom])

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    dragX.set(dragX.get() + dx * 0.025)
    dragY.set(dragY.get() + dy * 0.025)
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [dragX, dragY])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      isDragging.current = true
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])
  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - lastPos.current.x
    const dy = e.touches[0].clientY - lastPos.current.y
    dragX.set(dragX.get() + dx * 0.025)
    dragY.set(dragY.get() + dy * 0.025)
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [dragX, dragY])
  const handleTouchEnd = useCallback(() => { isDragging.current = false }, [])

  // Wheel → zoom (positive = zoom in/spread, negative = zoom out/gather)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      zoom.set(Math.max(-1, Math.min(2, zoom.get() + e.deltaY * 0.002)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onClose, zoom])

  return (
    <motion.div
      ref={containerRef}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={onTransitionComplete}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: '#000', overflow: 'hidden', cursor: 'grab',
      }}
    >
      {/* Particle field background */}
      <ParticleField zoom={zoom} />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: '32px', right: '32px', zIndex: 100,
          background: 'none', border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.6)', padding: '8px 20px',
          fontFamily: "'Cormorant Garamond', serif", fontSize: '12px',
          letterSpacing: '3px', textTransform: 'uppercase', cursor: 'pointer',
          backdropFilter: 'blur(10px)', transition: 'all 0.3s',
        }}
        onMouseEnter={(e) => { e.target.style.color = '#fff'; e.target.style.borderColor = 'rgba(255,255,255,0.5)' }}
        onMouseLeave={(e) => { e.target.style.color = 'rgba(255,255,255,0.6)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)' }}
      >
        Back
      </motion.button>

      {/* Images */}
      {IMAGES.map((src, i) => (
        <FloatingImage
          key={i}
          src={src}
          layout={IMAGE_LAYOUT[i]}
          dragX={dragX}
          dragY={dragY}
          zoom={zoom}
          index={i}
          onImageClick={setLightboxSrc}
        />
      ))}

      {/* Lightbox modal */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLightboxSrc(null)}
            style={{
              position: 'absolute', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.img
              src={lightboxSrc}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '85vw', maxHeight: '85vh',
                objectFit: 'contain',
                boxShadow: '0 0 40px 10px rgba(255,255,255,0.1)',
                cursor: 'default',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
