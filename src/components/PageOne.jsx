import { useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import PageOneScene from './PageOneScene'

export default function PageOne({ isActive, onScrollDown }) {
  const containerRef = useRef(null)

  const handleWheel = useCallback((e) => {
    if (e.deltaY > 30 && isActive) onScrollDown()
  }, [isActive, onScrollDown])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: true })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  return (
    <motion.div
      ref={containerRef}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: isActive ? 'auto' : 'none', background: '#000' }}
    >
      {/* Water droplet video — fixed position, motion inside */}
      <video
        src="/page1/water.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scale(1.25)',
          zIndex: 0,
          pointerEvents: 'none',
          filter: 'brightness(1.5) contrast(1.1)',
          animation: 'droplet-glow 2s ease-in-out infinite',
        }}
      />

      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.05)', zIndex: 1 }} />

      {/* Sphere text */}
      <PageOneScene assembled={true} isActive={isActive} />

    </motion.div>
  )
}
