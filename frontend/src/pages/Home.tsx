import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Button, Card, H1, H3, FormGroup, InputGroup, Intent } from '@blueprintjs/core'
import { setPlayerName } from '../store/slices/gameSlice'

const Home: React.FC = () => {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const navigate = useNavigate()
  const dispatch = useDispatch()

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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--glass-background)',
      backgroundImage: `
        radial-gradient(circle at 10% 20%, rgba(67, 97, 238, 0.3) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(247, 37, 133, 0.3) 0%, transparent 40%),
        radial-gradient(circle at 50% 50%, rgba(76, 201, 240, 0.1) 0%, transparent 90%)
      `,
      backgroundAttachment: 'fixed',
      perspective: '1000px'
    }}>
      <div className="glass-panel" style={{
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
          StoryGate RPG
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
        
        <Button 
          className="glass-btn glass-btn-primary"
          style={{
            height: '50px',
            width: '200px',
            fontSize: '1.1rem',
            fontWeight: 600,
            marginTop: '16px'
          }}
          onClick={handleStartAdventure}
          disabled={!name.trim()}
          large
        >
          Start Adventure
        </Button>
        
        <div style={{ 
          marginTop: '32px',
          color: 'var(--glass-text-secondary)',
          fontSize: '0.9rem',
          opacity: 0.7
        }}>
          A professional glassmorphic RPG experience
        </div>
      </div>
    </div>
  )
}

export default Home 