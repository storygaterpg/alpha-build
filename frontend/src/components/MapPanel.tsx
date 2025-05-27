import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { H2, Spinner } from '@blueprintjs/core';
import { RootState } from '../store';
import { Game as PhaserGame } from '../phaser/game';

interface MapPanelProps {
  onGameInitialized?: (game: PhaserGame) => void;
}

/**
 * MapPanel component
 * 
 * Wraps the Phaser canvas in a styled container
 */
const MapPanel: React.FC<MapPanelProps> = ({ onGameInitialized }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<PhaserGame | null>(null);
  const gameInitializedRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store the callback in a ref to prevent dependency issues
  const callbackRef = useRef(onGameInitialized);
  
  // Update the callback ref when the prop changes
  useEffect(() => {
    callbackRef.current = onGameInitialized;
  }, [onGameInitialized]);
  
  // Initialize Phaser game only once
  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;
    
    // Only initialize if not already done and container exists
    if (gameContainerRef.current && !phaserGameRef.current && !gameInitializedRef.current) {
      try {
        // Create the game instance
        const newGame = new PhaserGame({
          parent: gameContainerRef.current.id,
          width: gameContainerRef.current.clientWidth,
          height: gameContainerRef.current.clientHeight,
        });
        
        phaserGameRef.current = newGame;
        gameInitializedRef.current = true;
        setIsLoading(false);
        
        // Call the initialization callback
        if (callbackRef.current) {
          try {
            callbackRef.current(newGame);
          } catch (callbackError) {
            console.error("Error in game initialization callback:", callbackError);
            setError("Failed to initialize game properly");
          }
        }
        
        // Clean up function to be called on unmount
        cleanupFunction = () => {
          try {
            newGame.destroy();
            phaserGameRef.current = null;
            gameInitializedRef.current = false;
          } catch (destroyError) {
            console.error("Error destroying game:", destroyError);
          }
        };
      } catch (initError) {
        console.error("Failed to initialize Phaser game:", initError);
        setError(`Game initialization failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    } else {
      // If we already have a game or no container, we're ready
      setIsLoading(false);
    }
    
    // Clean up on unmount
    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
    };
  }, []); // Empty dependency array ensures this only runs once

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (phaserGameRef.current && gameContainerRef.current) {
        try {
          // Get the Phaser game instance
          const phaserInstance = phaserGameRef.current.getGameInstance();
          if (phaserInstance) {
            // Update canvas size
            const width = gameContainerRef.current.clientWidth;
            const height = gameContainerRef.current.clientHeight;
            phaserInstance.scale.resize(width, height);
          }
        } catch (resizeError) {
          console.error("Error resizing game:", resizeError);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="map-panel">
      <div 
        id="phaser-game" 
        ref={gameContainerRef} 
        className="phaser-container"
        style={{ 
          backgroundColor: 'rgba(18, 18, 31, 0.6)',
          flex: 1,
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {isLoading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <Spinner size={50} />
          </div>
        )}
        
        {error && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.7)',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '80%',
              textAlign: 'center'
            }}
          >
            <p style={{ color: 'var(--glass-danger)' }}>{error}</p>
            <button 
              className="glass-btn glass-btn-primary" 
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPanel; 