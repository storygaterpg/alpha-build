import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Intent, ButtonGroup, Button, Popover, Menu, MenuItem, Icon, Dialog, Classes, Divider, FormGroup, InputGroup } from '@blueprintjs/core';
import '@styles/GameToolbar.css';
import { Mosaic, MosaicWindow, MosaicNode } from 'react-mosaic-component';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RootState } from '../store';
import { moveActor, addActor, removeActor, updateActor } from '../store/slices/gameSlice';
import { 
  resetLayout, 
  PRESET_LAYOUTS, 
  applyPresetLayout, 
  saveLayout, 
  loadLayout, 
  deleteLayout, 
  LayoutPresetId, 
  ViewId,
  updateLayout
} from '../store/slices/settingsSlice';
import { websocketClient } from '../network';
import { Game as PhaserGame } from '../phaser/game';
import { Position, Actor, Item } from '../store/types';
import { AppToaster } from '../App';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

// Import widget components
import MapPanel from '../components/MapPanel';
import ChatPanel from '../components/ChatPanel';
import LogView from '../components/LogView';
import CharacterSheet from '../components/CharacterSheet';
import VideoGrid from '../components/VideoGrid';
import ConnectionStatus from '../components/ConnectionStatus';
import CharacterSheetWindow from '../components/CharacterSheetWindow';
import SpellsWindow from '../components/SpellsWindow';

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
  const navigate = useNavigate();
  const savedLayouts = useSelector((state: RootState) => state.settings.savedLayouts);
  // save layout dialog state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const player = useSelector((state: RootState) => state.game.player);
  const actors = useSelector((state: RootState) => state.game.actors);
  const currentLayout = useSelector((state: RootState) => state.settings.currentLayout);
  const lastLayoutId = useSelector((state: RootState) => state.settings.lastLayoutId) as LayoutPresetId;
  
  // Phaser game instance
  const [phaserGame, setPhaserGame] = useState<PhaserGame | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [spellsOpen, setSpellsOpen] = useState(false);
  
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
        position: 'relative',
        marginBottom: '16px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0 /* Prevent header from shrinking */
      }}>
        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-item hamburger">
            <Popover
              content={
                <Menu>
                  <MenuItem text="Profile" onClick={() => navigate('/profile')} />
                  <MenuItem text="Games" onClick={() => navigate('/dashboard')} />
                  <MenuItem text="Friends" onClick={() => navigate('/friends')} />
                  <MenuItem text="Settings" onClick={() => navigate('/settings')} />
                </Menu>
              }
              position="bottom-left"
              popoverClassName="toolbar-dropdown"
              minimal
            >
              <button className="glass-btn" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon="menu" />
              </button>
            </Popover>
          </div>
          <div className="toolbar-item">
            <ConnectionStatus />
          </div>
          <div className="toolbar-item">
            <button className="glass-btn" onClick={() => setSheetOpen(true)}>Character Sheet</button>
          </div>
          <div className="toolbar-item">
            <button className="glass-btn" onClick={() => setSpellsOpen(true)}>Spells</button>
          </div>
          {/* View selector dropdown */}
          <div className="toolbar-item">
            <Popover
              content={
                <Menu>
                  <MenuItem text="Reset" icon="reset" onClick={() => dispatch(resetLayout())} />
                  <Divider />
                  <MenuItem text="Save Current Layout..." icon="floppy-disk" onClick={() => setIsSaveDialogOpen(true)} />
                  <Divider />
                  <MenuItem text="Combat View" icon="shield" active={lastLayoutId === 'combat'} onClick={() => dispatch(applyPresetLayout('combat'))} />
                  <MenuItem text="Story View" icon="book" active={lastLayoutId === 'story'} onClick={() => dispatch(applyPresetLayout('story'))} />
                  <MenuItem text="Roleplay View" icon="people" active={lastLayoutId === 'roleplay'} onClick={() => dispatch(applyPresetLayout('roleplay'))} />
                  {savedLayouts.length > 0 && (
                    <>
                      <Divider />
                      <MenuItem text="Saved Layouts" disabled />
                      {savedLayouts.map(layout => (
                        <MenuItem
                          key={layout.id}
                          text={layout.name}
                          icon="floppy-disk"
                          active={lastLayoutId === layout.id}
                          onClick={() => dispatch(loadLayout(layout.id))}
                          labelElement={
                            <Button icon="trash" minimal small onClick={e => { e.stopPropagation(); dispatch(deleteLayout(layout.id)); }} />
                          }
                        />
                      ))}
                    </>
                  )}
                </Menu>
              }
              position="bottom-left"
              popoverClassName="toolbar-dropdown"
              minimal
            >
              <button className="glass-btn" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon="layout-grid" />
              </button>
            </Popover>
          </div>
        </div>
      </div>
      {sheetOpen && <CharacterSheetWindow onClose={() => setSheetOpen(false)} />}
      {spellsOpen && <SpellsWindow onClose={() => setSpellsOpen(false)} />}
      {/* Save Layout dialog */}
      {isSaveDialogOpen && (
        <Dialog isOpen={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)} title="Save Layout" className={Classes.DARK}>
          <div className={Classes.DIALOG_BODY}>
            <FormGroup label="Layout Name" labelFor="layout-name" helperText="Enter a name for your custom layout">
              <InputGroup id="layout-name" placeholder="My Layout" value={layoutName} onChange={e => setLayoutName(e.target.value)} autoFocus />
            </FormGroup>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
              <Button intent={Intent.PRIMARY} onClick={() => {
                  if (layoutName.trim()) {
                    dispatch(saveLayout({ id: uuidv4(), name: layoutName.trim() }));
                    setLayoutName('');
                    setIsSaveDialogOpen(false);
                  }
                }}>Save</Button>
            </div>
          </div>
        </Dialog>
      )}
      
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