import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import PageOne from './components/PageOne'
import PageTwo from './components/PageTwo'
import SideLogo from './components/SideLogo'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const goToPageTwo = useCallback(() => {
    if (currentPage === 1 && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentPage(2)
    }
  }, [currentPage, isTransitioning])

  const goToPageOne = useCallback(() => {
    if (currentPage === 2 && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentPage(1)
    }
  }, [currentPage, isTransitioning])

  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false)
  }, [])

  const cursorRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const ring = ringRef.current
    if (!cursor || !ring) return

    const onMove = (e) => {
      cursor.style.left = e.clientX + 'px'
      cursor.style.top = e.clientY + 'px'
      ring.style.left = e.clientX + 'px'
      ring.style.top = e.clientY + 'px'
    }
    const onDown = () => {
      cursor.classList.add('clicking')
      ring.classList.add('clicking')
    }
    const onUp = () => {
      cursor.classList.remove('clicking')
      ring.classList.remove('clicking')
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div className="app">
      <div id="custom-cursor" ref={cursorRef} />
      <div id="cursor-ring" ref={ringRef} />
      <SideLogo />
      <PageOne
        isActive={currentPage === 1}
        onScrollDown={goToPageTwo}
      />
      <AnimatePresence onExitComplete={handleTransitionComplete}>
        {currentPage === 2 && (
          <PageTwo
            onClose={goToPageOne}
            onTransitionComplete={handleTransitionComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
