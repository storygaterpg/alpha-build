import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Intent, ButtonGroup, Button } from '@blueprintjs/core';
import { RootState } from '../store';
import { moveActor, addActor, removeActor, updateActor } from '../store/slices/gameSlice';
import { resetLayout, PRESET_LAYOUTS, applyPresetLayout, LayoutPresetId } from '../store/slices/settingsSlice';
import { websocketClient } from '../network';
import { Game as PhaserGame } from '../phaser/game';
import { Position, Actor, Item } from '../store/types';
import { AppToaster } from '../App';

// Import widget components
import MapPanel from '../components/MapPanel';
import ChatPanel from '../components/ChatPanel';
import LogView from '../components/LogView';
import CharacterSheet from '../components/CharacterSheet';
import VideoGrid from '../components/VideoGrid';
import LayoutControls from '../components/LayoutControls';

// Extended Item type to include equipped property
interface ExtendedItem extends Item {
  equipped?: boolean;
}

// Safe wrapper for using AppToaster
const safeShowToast = (props: any) => {
  if (AppToaster && typeof AppToaster.show === 'function') {
    try {
      AppToaster.show(props);
    } catch (error) {
      console.error('Failed to show toast:', error);
    }
  } else {
    console.log('Toast message (AppToaster not available):', props.message);
  }
};

const Game: React.FC = () => {
  const dispatch = useDispatch();
  const player = useSelector((state: RootState) => state.game.player);
  const actors = useSelector((state: RootState) => state.game.actors);
  const lastLayoutId = useSelector((state: RootState) => state.settings.lastLayoutId) as LayoutPresetId;
  
  // Phaser game instance
  const [phaserGame, setPhaserGame] = useState<PhaserGame | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  
  // Handle game errors safely with a try/catch block
  const handleGameError = useCallback((message: string, error: any) => {
    console.error(message, error);
    setGameError(message);
    
    safeShowToast({
      message: `${message}: ${error?.message || "Unknown error"}`,
      intent: Intent.DANGER,
      icon: "error",
      timeout: 5000
    });
  }, []);

  // Handle game initialization with proper error handling
  const handleGameInitialized = useCallback((game: PhaserGame) => {
    try {
      // Only set the game instance if we don't already have one
      if (!phaserGame) {
        setPhaserGame(game);
        
        safeShowToast({
          message: "Game engine initialized successfully",
          intent: Intent.SUCCESS,
          icon: "tick-circle",
          timeout: 3000
        });
      }
    } catch (error) {
      handleGameError("Failed to initialize game engine", error);
    }
  }, [phaserGame, handleGameError]);

  // Handle WebSocket connection - run only once on mount
  useEffect(() => {
    // Connect to WebSocket server only on initial mount
    if (!websocketClient.isConnected()) {
      try {
        // Try to connect to the server
        websocketClient.connect();
      } catch (error) {
        console.error("Failed to connect to game server:", error);
        // Error notifications will be handled by the WebSocketClient
      }
    }
  }, []); // Empty dependency array ensures this only runs once

  // Debug button to help diagnose issues
  const debugLayout = () => {
    console.log("Current game state:", { 
      phaserGame: phaserGame ? "initialized" : "not initialized",
      player,
      actors,
      error: gameError,
      toasterAvailable: !!AppToaster,
      currentView: lastLayoutId
    });
  };

  // Render view based on the current layout preset
  const renderView = () => {
    switch (lastLayoutId) {
      case 'combat':
        return (
          <div className="game-grid" style={{ 
            display: 'grid',
            gridTemplateColumns: '6fr 4fr',
            gridTemplateRows: '1fr 1fr 300px',
            gap: '16px',
            height: 'calc(100vh - 70px)',
            width: '100%'
          }}>
            {/* Map (main) */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '1', 
              gridRow: '1 / span 2',
              minHeight: '400px',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <MapPanel onGameInitialized={handleGameInitialized} />
            </div>
            
            {/* Chat */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '2', 
              gridRow: '1',
              maxHeight: '100%',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <ChatPanel />
            </div>
            
            {/* Log */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '2', 
              gridRow: '2',
              maxHeight: '100%',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <LogView />
            </div>
            
            {/* Video Grid (bottom) */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '1 / span 2', 
              gridRow: '3',
              height: '100%',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <VideoGrid />
            </div>
          </div>
        );
        
      case 'story':
        return (
          <div className="game-grid" style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 300px',
            gridTemplateRows: 'auto 1fr 300px',
            gap: '16px',
            height: 'calc(100vh - 70px)',
            width: '100%'
          }}>
            {/* Chat (main) */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '1', 
              gridRow: '1 / span 2',
              minHeight: '400px',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <ChatPanel />
            </div>
            
            {/* Log */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '2', 
              gridRow: '1 / span 2',
              maxHeight: '100%',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <LogView />
            </div>
            
            {/* Video Grid (bottom) */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '1 / span 2', 
              gridRow: '3',
              height: '100%',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <VideoGrid />
            </div>
          </div>
        );
        
      case 'roleplay':
      default: // Default to roleplay if no matching layout is found
        return (
          <div className="game-grid" style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 300px',
            gridTemplateRows: 'auto 1fr 300px',
            gap: '16px',
            height: 'calc(100vh - 70px)',
            width: '100%'
          }}>
            {/* Video Grid (main) */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '1', 
              gridRow: '1 / span 2',
              minHeight: '400px',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <VideoGrid />
            </div>
            
            {/* Log */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '2', 
              gridRow: '1 / span 2',
              maxHeight: '100%',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <LogView />
            </div>
            
            {/* Chat (bottom) */}
            <div className="game-grid-panel" style={{ 
              gridColumn: '1 / span 2', 
              gridRow: '3',
              height: '100%',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <ChatPanel />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="game-page" style={{ padding: "16px" }}>
      {/* Header with layout controls */}
      <div style={{ 
        marginBottom: '16px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <LayoutControls />
        
        <button 
          className="glass-btn" 
          onClick={debugLayout}
          style={{ marginLeft: '8px' }}
        >
          Debug
        </button>
      </div>
      
      {/* Render the current view */}
      {renderView()}
    </div>
  );
};

export default Game; 