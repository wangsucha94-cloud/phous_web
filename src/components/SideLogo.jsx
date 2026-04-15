import { motion } from 'framer-motion'

export default function SideLogo() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, delay: 0.5 }}
      style={{
        position: 'fixed',
        left: '24px',
        top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        zIndex: 1000,
        pointerEvents: 'none',
        transformOrigin: 'center center',
      }}
    >
      <span
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '18px',
          fontWeight: 600,
          letterSpacing: '10px',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 1)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        PHOUS
      </span>
    </motion.div>
  )
}
