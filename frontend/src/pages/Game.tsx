import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Intent, ButtonGroup, Button } from '@blueprintjs/core';
import { Mosaic, MosaicWindow, MosaicNode } from 'react-mosaic-component';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RootState } from '../store';
import { moveActor, addActor, removeActor, updateActor } from '../store/slices/gameSlice';
import { 
  resetLayout, 
  PRESET_LAYOUTS, 
  applyPresetLayout, 
  LayoutPresetId, 
  ViewId,
  updateLayout
} from '../store/slices/settingsSlice';
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
import ConnectionStatus from '../components/ConnectionStatus';

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

/**
 * Game component - Main game interface
 */
const Game: React.FC = () => {
  const dispatch = useDispatch();
  const player = useSelector((state: RootState) => state.game.player);
  const actors = useSelector((state: RootState) => state.game.actors);
  const currentLayout = useSelector((state: RootState) => state.settings.currentLayout);
  const lastLayoutId = useSelector((state: RootState) => state.settings.lastLayoutId) as LayoutPresetId;
  
  // Phaser game instance
  const [phaserGame, setPhaserGame] = useState<PhaserGame | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  
  // Define a simple default layout to avoid any issues with stored layouts
  const defaultLayout: MosaicNode<ViewId> = {
    direction: 'row',
    first: 'chatView',
    second: 'logView',
    splitPercentage: 70
  };
  
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

  // Reset local storage on component mount to ensure clean state
  useEffect(() => {
    try {
      // Reset to a known good layout on first load
      dispatch(applyPresetLayout('combat'));
    } catch (error) {
      console.error("Failed to reset layout:", error);
    }
  }, [dispatch]);

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: MosaicNode<ViewId> | null) => {
    if (newLayout) {
      dispatch(updateLayout(newLayout));
    }
  }, [dispatch]);

  // Render tile content based on viewId
  const renderTileContent = useCallback((viewId: ViewId) => {
    switch (viewId) {
      case 'mapView':
        return <MapPanel onGameInitialized={handleGameInitialized} />;
      case 'chatView':
        return <ChatPanel />;
      case 'logView':
        return <LogView />;
      case 'videoView1':
      case 'videoView2':
      case 'videoView3':
        return <VideoGrid />;
      default:
        return <div>Unknown view: {viewId}</div>;
    }
  }, [handleGameInitialized]);

  // Get the title for each tile
  const getTileTitle = useCallback((viewId: ViewId): string => {
    switch (viewId) {
      case 'mapView':
        return 'Map';
      case 'chatView':
        return 'Chat';
      case 'logView':
        return 'Game Log';
      case 'videoView1':
        return 'Video 1';
      case 'videoView2':
        return 'Video 2';
      case 'videoView3':
        return 'Video 3';
      default:
        return 'Unknown';
    }
  }, []);

  // Create toolbar controls for a mosaic window
  const getToolbarControls = useCallback((viewId: ViewId) => {
    return []; // Empty for now - can add custom buttons later
  }, []);

  // Get current effective layout (preferring currentLayout, falling back to default)
  const effectiveLayout = currentLayout || defaultLayout;

  // Debug function to help diagnose issues
  const debugLayout = () => {
    console.log("Current game state:", { 
      phaserGame: phaserGame ? "initialized" : "not initialized",
      player,
      actors,
      error: gameError,
      toasterAvailable: !!AppToaster,
      currentLayout,
      effectiveLayout
    });
  };

  return (
    <div className="game-page glass-mosaic" style={{ 
      padding: "16px", 
      height: "calc(100vh - 32px)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header with layout controls */}
      <div style={{ 
        marginBottom: '16px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0 /* Prevent header from shrinking */
      }}>
        <LayoutControls />
        
        <div className="game-header-right">
          <ConnectionStatus />
        </div>
      </div>
      
      {/* Mosaic Layout - With fixed resize options */}
      <div style={{ 
        height: 'calc(100% - 48px)', 
        position: 'relative',
        flex: 1,
        overflow: 'hidden'
      }}>
        <DndProvider backend={HTML5Backend}>
          <Mosaic<ViewId>
            renderTile={(id, path) => (
              <MosaicWindow<ViewId>
                path={path}
                title={getTileTitle(id)}
                toolbarControls={getToolbarControls(id)}
                draggable={true}
                renderPreview={() => <div />} // Empty preview to avoid outline issues
                className="no-outline-window mosaic-window-mini-header" // Use mini header instead of no header
                renderToolbar={() => (
                  <div className="mini-toolbar">
                    <div className="drag-handle" />
                  </div>
                )} // Mini toolbar with drag handle
                additionalControls={[
                  <div key="pointer-fix" style={{ pointerEvents: 'none', position: 'absolute' }} />
                ]}
              >
                <div style={{ 
                  height: '100%', 
                  width: '100%',
                  position: 'relative',
                  zIndex: 1,
                  pointerEvents: 'auto' // Ensure pointer events pass through
                }}>
                  {renderTileContent(id)}
                </div>
              </MosaicWindow>
            )}
            value={effectiveLayout}
            onChange={handleLayoutChange}
            className="mosaic-blueprint-theme no-outlines" // Add custom class
            resize={{ minimumPaneSizePercentage: 10 }}
            zeroStateView={<div className="zero-state">Add a panel to get started</div>}
          />
        </DndProvider>
      </div>
    </div>
  );
};

export default Game; 