import React, { useState, useRef, useEffect } from 'react'
import { exampleImages } from '@utils/imageManifest'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Button, Card, H1, H3, FormGroup, InputGroup, Intent, ButtonGroup } from '@blueprintjs/core'
import { setPlayerName } from '../store/slices/gameSlice'

const Home: React.FC = () => {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const navigate = useNavigate()
  const dispatch = useDispatch()

  // Setup for infinite-transform background scroll
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const isAutoScrollingRef = useRef(true)
  // Sync ref with state
  useEffect(() => { isAutoScrollingRef.current = isAutoScrolling }, [isAutoScrolling])
  
  // Shuffle images once on load
  const [shuffledImages] = useState(() => {
    const arr = [...exampleImages]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  })

  // Infinite-transform scroll animation (uses shuffledImages)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    // Measure height of one group
    const group = wrapper.children[0] as HTMLElement
    let groupHeight = group.clientHeight
    let offset = 0
    let lastTime = performance.now()
    const speed = 0.02 // px per ms (1px per 50ms)

    const tick = (time: number) => {
      const delta = time - lastTime
      lastTime = time
      if (isAutoScrollingRef.current && groupHeight > 0) {
        offset = (offset + speed * delta) % groupHeight
        wrapper.style.transform = `translateY(-${offset}px)`
      }
      requestAnimationFrame(tick)
    }

    // Recompute height on resize
    const onResize = () => {
      groupHeight = (wrapper.children[0] as HTMLElement).clientHeight
    }
    window.addEventListener('resize', onResize)
    wrapper.style.willChange = 'transform'

    // Pause/resume and manual scroll on user interaction
    let resumeId: number
    let lastTouchY: number | null = null
    const onWheel = (e: WheelEvent) => {
      if (isAutoScrollingRef.current) setIsAutoScrolling(false)
      // manual infinite scroll by wheel delta (wrap via modulo)
      offset = ((offset + e.deltaY) % groupHeight + groupHeight) % groupHeight
      wrapper.style.transform = `translateY(-${offset}px)`
      clearTimeout(resumeId)
      resumeId = window.setTimeout(() => setIsAutoScrolling(true), 500)
    }
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY
      if (isAutoScrollingRef.current) setIsAutoScrolling(false)
      clearTimeout(resumeId)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (lastTouchY !== null) {
        const currentY = e.touches[0].clientY
        const deltaY = lastTouchY - currentY
        lastTouchY = currentY
        // manual infinite scroll by touch delta (wrap via modulo)
        offset = ((offset + deltaY) % groupHeight + groupHeight) % groupHeight
        wrapper.style.transform = `translateY(-${offset}px)`
        clearTimeout(resumeId)
        resumeId = window.setTimeout(() => setIsAutoScrolling(true), 500)
      }
    }
    wrapper.addEventListener('wheel', onWheel, { passive: true })
    wrapper.addEventListener('touchstart', onTouchStart, { passive: true })
    wrapper.addEventListener('touchmove', onTouchMove, { passive: true })

    // Start animation
    requestAnimationFrame((t) => { lastTime = t; tick(t) })
    return () => {
      window.removeEventListener('resize', onResize)
      wrapper.removeEventListener('wheel', onWheel)
      wrapper.removeEventListener('touchstart', onTouchStart)
      wrapper.removeEventListener('touchmove', onTouchMove)
      clearTimeout(resumeId)
    }
  }, [shuffledImages])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (nameError) setNameError('')
  }

  const handleStartAdventure = () => {
    if (!name.trim()) {
      setNameError('Please enter your name to begin your adventure')
      return
    }

    // Save player name to Redux store
    dispatch(setPlayerName(name))
    
    // Navigate to game page
    navigate('/game')
  }

  return (
    <div className="home-container" style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      perspective: '1000px',
      overflow: 'hidden'
    }}>
      {/* Infinite-transform background scroll */}
      <div ref={wrapperRef} style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        zIndex: 0, willChange: 'transform'
      }}>
        {[0, 1].map((_, groupIdx) => (
          <div key={groupIdx} style={{ display: 'flex', gap: '2px' }}>
            {/* Column 1: even-index images */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {shuffledImages.filter((_, i) => i % 2 === 0).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`collage-${i}`}
                  style={{ width: '100%', objectFit: 'contain', display: 'block' }}
                />
              ))}
            </div>
            {/* Column 2: odd-index images, offset upward */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, marginTop: '-500px' }}>
              {shuffledImages.filter((_, i) => i % 2 === 1).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`collage-${i}`}
                  style={{ width: '100%', objectFit: 'contain', display: 'block' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        className="glass-btn glass-btn-primary"
        style={{
          zIndex: 1,
          position: 'absolute',
          top: '20px',
          left: '20px',
          height: '40px',
          width: '120px',
          fontSize: '1rem',
          fontWeight: 600,
          borderRadius: '8px',
          boxShadow: '0 0 10px rgba(247, 37, 133, 0.5)',
        }}
        onClick={() => navigate('/login')}
        icon="log-in"
      >
        Log In
      </Button>
      <div className="glass-panel" style={{
        zIndex: 1,
        width: '90%',
        maxWidth: '600px',
        padding: '40px',
        textAlign: 'center',
        transform: 'rotateX(2deg)',
        transformStyle: 'preserve-3d'
      }}>
        <H1 style={{ 
          color: 'var(--glass-text-primary)',
          marginBottom: '16px',
          textShadow: '0 0 10px rgba(67, 97, 238, 0.5)',
          fontSize: '2.5rem'
        }}>
          StoryGate
        </H1>
        
        <H3 style={{ 
          color: 'var(--glass-text-secondary)',
          marginBottom: '32px',
          fontWeight: 400
        }}>
          Your adventure begins here
        </H3>
        
        <div style={{ 
          marginTop: '2rem', 
          marginBottom: '2rem',
          position: 'relative'
        }}>
          <FormGroup
            label={
              <span style={{ 
                color: 'var(--glass-text-primary)',
                fontWeight: 500,
                fontSize: '1.1rem',
                marginBottom: '12px',
                display: 'block'
              }}>
                What is your name, adventurer?
              </span>
            }
            labelFor="player-name"
            helperText={
              nameError ? 
                <span style={{ 
                  color: 'var(--glass-danger)',
                  marginTop: '8px',
                  display: 'block'
                }}>
                  {nameError}
                </span> : null
            }
          >
            <InputGroup
              id="player-name"
              placeholder="Enter your name"
              value={name}
              onChange={handleNameChange}
              className="glass-input"
              style={{
                height: '50px',
                fontSize: '1.1rem',
                textAlign: 'center'
              }}
              autoFocus
              large
            />
          </FormGroup>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Button 
            className="glass-btn glass-btn-primary"
            style={{
              height: '50px',
              width: '200px',
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
            onClick={handleStartAdventure}
            disabled={!name.trim()}
            large
          >
            Start Adventure
          </Button>
        </div>
        
        <div style={{
          marginTop: '32px',
          color: 'var(--glass-text-secondary)',
          fontSize: '0.9rem',
          opacity: 0.7,
          fontStyle: 'italic'
        }}>
          Imagine a game where the story changes based on your decisions.<br />
          An interactive adventure that adapts to you and your friends in real-time.
        </div>
      </div>
    </div>
  )
}

export default Home 