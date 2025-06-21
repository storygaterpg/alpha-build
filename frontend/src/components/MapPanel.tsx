import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { H2, Spinner } from '@blueprintjs/core';
import { RootState } from '../store';
import { Game as PhaserGame } from '../phaser/game';
import MainScene from '../phaser/scenes/MainScene';
import '../styles/phaser.css';
import MapToolbar from './MapToolbar';
import { requestMovementTiles, receiveMovementTiles, clearHighlightedTiles } from '../store/slices/mapSlice';
import { updateActor } from '../store/slices/actorsSlice';
import { ActorType } from '../store/types';
import Phaser from 'phaser';

interface MapPanelProps {
  onGameInitialized?: (game: PhaserGame) => void;
}

/**
 * MapPanel component
 * 
 * Wraps the Phaser canvas in a styled container
 */
const MapPanel: React.FC<MapPanelProps> = ({ onGameInitialized }) => {
  // console.log('[MapPanel] render or mount'); // debug removed
  const dispatch = useDispatch();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<PhaserGame | null>(null);
  const gameInitializedRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  const [path, setPath] = useState<{x: number, y: number}[]>([]);
  const [startPosition, setStartPosition] = useState<{x: number, y: number} | null>(null);
  const [rawSteps, setRawSteps] = useState<number>(0);
  // Keep track of which actor is currently moving for clear reset
  const [movingActorId, setMovingActorId] = useState<string | undefined>(undefined);

  // Recalculate rawSteps whenever path changes
  useEffect(() => {
    let steps = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = Math.abs(path[i].x - path[i - 1].x);
      const dy = Math.abs(path[i].y - path[i - 1].y);
      steps += dx === 1 && dy === 1 ? 1.5 : 1;
    }
    setRawSteps(steps);
  }, [path]);

  const prevPosRef = useRef<{x: number, y: number} | null>(null);

  // Get map data from Redux
  const currentMapId = useSelector((state: RootState) => state.game.currentMapId);
  const maps = useSelector((state: RootState) => state.game.maps);
  const currentMap = currentMapId ? maps[currentMapId] : null;
  const actors = useSelector((state: RootState) => state.game.actors);
  const playerId = useSelector((state: RootState) => state.game.player?.id);

  // Display step count by flooring rawSteps
  const displayStepCount = Math.floor(rawSteps);

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
        
        // Initialize movementEnabled on scene
        const initScene = newGame.getScene('MainScene') as MainScene | undefined;
        if (initScene && typeof initScene.setMovementEnabled === 'function') {
          initScene.setMovementEnabled(moveMode);
        }
        
        // Register actor movement callback immediately and on scene create
        if (initScene && typeof initScene.setOnActorMove === 'function' && initScene.events) {
          console.log('[MapPanel] initEffect registering onActorMove callback');
          initScene.setOnActorMove(handleActorMove);
          // Also ensure callback is registered once the scene has been created
          initScene.events.once(Phaser.Scenes.Events.CREATE, () => {
            console.log('[MapPanel] scene create event: registering onActorMove callback');
            initScene.setOnActorMove(handleActorMove);
          });
        }
        
        // Scene will call handleActorMove when updating player movement
        
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

  // Stable callback for actor movement: scene calls only when movementEnabled=true
  const handleActorMove = useCallback((actorId: string, position: { x: number, y: number }) => {
    // In networked mode, only count moves for the actual player; in test mode, playerId may be null, so accept any
    if (playerId != null && actorId !== playerId) return;
    // Compute step increment based on delta
    const prevPos = prevPosRef.current;
    if (prevPos) {
      const dx = Math.abs(position.x - prevPos.x);
      const dy = Math.abs(position.y - prevPos.y);
      const inc = dx === 1 && dy === 1 ? 1.5 : 1;
      setRawSteps(rs => rs + inc);
    }
    prevPosRef.current = { x: position.x, y: position.y };
    setPath(prev => {
      const newPoint = { x: position.x, y: position.y };
      const newPath = [...prev, newPoint];
      dispatch(receiveMovementTiles({ tiles: newPath }));
      return newPath;
    });
  }, [playerId, dispatch]);

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
    console.log('🎭 MapPanel: Actor data changed:', actors);
    console.log('🎭 MapPanel: Actor count:', Object.keys(actors || {}).length);
    
    if (phaserGameRef.current && actors) {
      try {
        const mainScene = phaserGameRef.current.getScene('MainScene') as MainScene;
        if (mainScene) {
          console.log('🎮 MapPanel: Updating actors in Phaser scene');
          
          // Get current actors in the scene
          const existingActors = new Set();
          
          // Add or update actors
          Object.values(actors).forEach(actor => {
            // Skip the original Rob actor; keep only test-rob
            if (actor.type === ActorType.ROB && actor.id !== 'test-rob') {
              console.log(`⏩ MapPanel: Skipping original Rob actor: ${actor.id}`);
              return;
            }
            existingActors.add(actor.id);
            
            // Check if actor already exists in scene
            const hasActor = mainScene.hasActor && mainScene.hasActor(actor.id);
            const existingActor = mainScene.getActor && mainScene.getActor(actor.id);
            
            if (!hasActor) {
              console.log(`➕ Adding new actor: ${actor.name} (${actor.id}) at position (${actor.position.x}, ${actor.position.y})`);
              // Add new actor
              if (typeof mainScene.addActor === 'function') {
                const result = mainScene.addActor(actor);
                if (result) {
                  console.log(`✅ Successfully added actor: ${actor.name}`);
                } else {
                  console.error(`❌ Failed to add actor: ${actor.name}`);
                }
              }
            } else if (existingActor) {
              // Update existing actor position if needed
              if (existingActor.position.x !== actor.position.x || existingActor.position.y !== actor.position.y) {
                console.log(`🔄 Updating position for actor: ${actor.name} from (${existingActor.position.x}, ${existingActor.position.y}) to (${actor.position.x}, ${actor.position.y})`);
                if (typeof mainScene.updateActorPosition === 'function') {
                  mainScene.updateActorPosition(actor.id, actor.position);
                }
              }
            }
          });
          
          // Remove actors that no longer exist in the data
          if (mainScene.getActorIds) {
            const sceneActorIds = mainScene.getActorIds();
            sceneActorIds.forEach((actorId: string) => {
              if (!existingActors.has(actorId)) {
                console.log(`🗑️ Removing deleted actor: ${actorId}`);
                if (typeof mainScene.removeActor === 'function') {
                  mainScene.removeActor(actorId);
                }
              }
            });
          }
          
          console.log(`🎭 MapPanel: Finished updating ${Object.keys(actors).length} actors`);
        } else {
          console.error('❌ MapPanel: MainScene not found');
        }
      } catch (error) {
        console.error('❌ MapPanel: Error updating actors in Phaser:', error);
      }
    } else {
      if (!phaserGameRef.current) {
        console.log('⏳ MapPanel: Phaser game not yet initialized');
      }
      if (!actors) {
        console.log('👻 MapPanel: No actor data available');
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

  // Handlers for toolbar buttons
  const handleMoveClick = () => {
    console.log('[MapPanel] handleMoveClick, moveMode=', moveMode);
    if (!phaserGameRef.current) return;
    const mainScene = phaserGameRef.current.getScene('MainScene') as any;
    // (Re-)register movement callback
    if (typeof mainScene.setOnActorMove === 'function') {
      mainScene.setOnActorMove(handleActorMove);
    }
    if (!moveMode) {
      // Enter move mode
      mainScene.setMovementEnabled(true);
      // Determine actor to move
      const scenePlayerId = typeof mainScene.getPlayerId === 'function' ? mainScene.getPlayerId() : undefined;
      const fallbackIds: string[] = mainScene.getActorIds();
      const targetId: string | undefined = playerId ?? scenePlayerId ?? (fallbackIds.length > 0 ? fallbackIds[0] : undefined);
      if (targetId) {
        setMovingActorId(targetId);
        const playerObj = mainScene.getActor(targetId);
        if (playerObj) {
          console.log('[MapPanel] starting move at', playerObj.position);
          setStartPosition({ ...playerObj.position });
          setPath([{ ...playerObj.position }]);
          dispatch(requestMovementTiles({ actorId: targetId }));
          dispatch(receiveMovementTiles({ tiles: [{ ...playerObj.position }] }));
          setRawSteps(0);
          prevPosRef.current = { ...playerObj.position };
        }
      }
      setMoveMode(true);
    } else {
      // Optimize path: compute shortest path between start and current end
      if (!startPosition || path.length === 0) return;
      const endPos = path[path.length - 1];
      // Compute shortest path via scene method
      let newPath: { x: number; y: number }[] = path;
      if (typeof mainScene.findPath === 'function') {
        newPath = mainScene.findPath(startPosition, endPos);
      }
      // Show highlights in scene if supported
      if (typeof mainScene.showPath === 'function') {
        mainScene.showPath(newPath);
      }
      // Update React state and Redux
      const serialized = newPath.map(({ x, y }) => ({ x, y }));
      setPath(serialized);
      dispatch(clearHighlightedTiles());
      dispatch(receiveMovementTiles({ tiles: serialized }));
      // rawSteps recalculated by effect
    }
  };

  const handleShortenPathClick = () => {
    // TODO: Send path to server for shortest path, update path state
    // For now, just stub
    alert('Shorten Path: Not yet implemented');
  };

  const handleClearClick = () => {
    console.log('[MapPanel] handleClearClick');
    if (phaserGameRef.current) {
      const mainScene = phaserGameRef.current.getScene('MainScene') as MainScene;
      // Disable movement and clear scene highlights
      mainScene.setMovementEnabled(false);
      // Determine which actor to reset: Redux playerId, movingActorId, scene player, or fallback
      const scenePlayerId = typeof mainScene.getPlayerId === 'function' ? mainScene.getPlayerId() : undefined;
      const fallbackIds = mainScene.getActorIds();
      const targetId = playerId ?? movingActorId ?? scenePlayerId ?? (fallbackIds.length > 0 ? fallbackIds[0] : undefined);
      // Reset to start position if we have one
      if (startPosition && targetId) {
        // Teleport actor via scene API if available
        if (phaserGameRef.current) {
          const sceneAny = phaserGameRef.current.getScene('MainScene') as any;
          if (typeof sceneAny.teleportActor === 'function') {
            sceneAny.teleportActor(targetId, startPosition);
          } else if (typeof sceneAny.updateActorPosition === 'function') {
            sceneAny.updateActorPosition(targetId, startPosition);
          }
        }
        // Reset React path and highlights
        setPath([{ ...startPosition }]);
        dispatch(clearHighlightedTiles());
        dispatch(receiveMovementTiles({ tiles: [{ ...startPosition }] }));
        // Update Redux actor position to reset state
        dispatch(updateActor({ id: targetId, position: startPosition }));
        // Reset raw step counter and prev position
        console.log('[MapPanel] clearing rawSteps, prevPos to', startPosition);
        setRawSteps(0);
        prevPosRef.current = { ...startPosition };
        setMovingActorId(undefined);
      }
    }
    // Exit move mode
    setMoveMode(false);
    setStartPosition(null);
  };

  return (
    <div className="map-panel" style={{ 
      height: '100%', 
      width: '100%',
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    }}>
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
          display: 'block'
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
      {/* Map Toolbar as sibling to avoid canvas overlay */}
      <MapToolbar
        moveActive={moveMode}
        onMoveClick={handleMoveClick}
        onShortenPathClick={handleShortenPathClick}
        onClearClick={handleClearClick}
        disabled={isLoading || !!error}
        stepCount={displayStepCount}
      />
    </div>
  );
};

export default MapPanel; 