import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { H2, Spinner } from '@blueprintjs/core';
import { RootState } from '../store';
import { Game as PhaserGame } from '../phaser/game';
import MainScene from '../phaser/scenes/MainScene';

interface MapPanelProps {
  onGameInitialized?: (game: PhaserGame) => void;
}

/**
 * MapPanel component
 * 
 * Wraps the Phaser canvas in a styled container
 */
const MapPanel: React.FC<MapPanelProps> = ({ onGameInitialized }) => {
  const dispatch = useDispatch();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<PhaserGame | null>(null);
  const gameInitializedRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get map data from Redux
  const currentMapId = useSelector((state: RootState) => state.game.currentMapId);
  const maps = useSelector((state: RootState) => state.game.maps);
  const currentMap = currentMapId ? maps[currentMapId] : null;
  const actors = useSelector((state: RootState) => state.game.actors);
  
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

  // Handle map data changes
  useEffect(() => {
    if (phaserGameRef.current && currentMap) {
      try {
        const mainScene = phaserGameRef.current.getScene('MainScene') as MainScene;
        if (mainScene && typeof mainScene.loadMapFromData === 'function') {
          mainScene.loadMapFromData(currentMap);
        }
      } catch (error) {
        console.error('Error loading map data into Phaser:', error);
      }
    }
  }, [currentMap]);
  
  // Handle actor changes
  useEffect(() => {
    if (phaserGameRef.current && actors) {
      try {
        const mainScene = phaserGameRef.current.getScene('MainScene') as MainScene;
        if (mainScene) {
          // Clear existing actors
          Object.values(actors).forEach(actor => {
            // First try to remove in case it already exists
            if (typeof mainScene.removeActor === 'function') {
              mainScene.removeActor(actor.id);
            }
            
            // Then add the actor
            if (typeof mainScene.addActor === 'function') {
              mainScene.addActor(actor);
            }
          });
        }
      } catch (error) {
        console.error('Error updating actors in Phaser:', error);
      }
    }
  }, [actors]);

  // Handle resize - enhanced for better responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (phaserGameRef.current && gameContainerRef.current) {
        try {
          // Get the Phaser game instance
          const phaserInstance = phaserGameRef.current.getGameInstance();
          if (phaserInstance && phaserInstance.scale) {
            // Force refresh the scale manager
            phaserInstance.scale.refresh();
          }
        } catch (resizeError) {
          console.error("Error resizing game:", resizeError);
        }
      }
    };

    // Initial resize to ensure proper sizing
    const initialResize = () => {
      setTimeout(handleResize, 100); // Small delay to ensure DOM is ready
    };

    window.addEventListener('resize', handleResize);
    initialResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="map-panel" style={{ 
      height: '100%', 
      width: '100%',
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    }}>
      <style>{`
        .phaser-container canvas {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
          display: block;
        }
        
        .phaser-container {
          width: 100%;
          height: 100%;
        }
      `}</style>
      <div 
        id="phaser-game" 
        ref={gameContainerRef} 
        className="phaser-container"
        style={{ 
          backgroundColor: 'rgba(18, 18, 31, 0.6)',
          flex: 1,
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          position: 'relative',
          display: 'block' // Changed from flex to block for better canvas handling
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