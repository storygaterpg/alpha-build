import React, { useState, useEffect } from 'react';
import { H2, Button, Icon, Slider } from '@blueprintjs/core';

interface PlayerVideo {
  id: string;
  name: string;
  isActive: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
  avatarColor: string;
}

/**
 * VideoGrid component
 * 
 * Displays a grid of video feeds for multiplayer sessions with glassmorphic styling
 */
const VideoGrid: React.FC = () => {
  // Mock data for demonstration
  const [players, setPlayers] = useState<PlayerVideo[]>([
    { 
      id: '1', 
      name: 'Player 1', 
      isActive: true, 
      isMuted: false, 
      isCameraOn: true, 
      isSpeaking: false,
      avatarColor: '#3498db' 
    },
    { 
      id: '2', 
      name: 'Player 2', 
      isActive: false, 
      isMuted: true, 
      isCameraOn: false, 
      isSpeaking: false,
      avatarColor: '#e74c3c' 
    },
    { 
      id: '3', 
      name: 'Player 3', 
      isActive: true, 
      isMuted: false, 
      isCameraOn: true, 
      isSpeaking: true,
      avatarColor: '#2ecc71' 
    },
    { 
      id: '4', 
      name: 'DM', 
      isActive: true, 
      isMuted: false, 
      isCameraOn: true, 
      isSpeaking: false,
      avatarColor: '#f39c12' 
    },
  ]);

  // Volume control
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isLayoutExpanded, setIsLayoutExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<string | null>(null);
  
  // Simulate speaking effect
  useEffect(() => {
    const speakingInterval = setInterval(() => {
      setPlayers(players.map(player => {
        // Randomly toggle speaking state to simulate conversation
        if (Math.random() > 0.8 && !player.isMuted) {
          return { ...player, isSpeaking: !player.isSpeaking };
        }
        return player;
      }));
    }, 2000);
    
    return () => clearInterval(speakingInterval);
  }, [players]);

  // Toggle mute status for a player
  const toggleMute = (playerId: string) => {
    setPlayers(players.map(player => 
      player.id === playerId 
        ? { ...player, isMuted: !player.isMuted, isSpeaking: false } 
        : player
    ));
  };

  // Toggle camera status for a player
  const toggleCamera = (playerId: string) => {
    setPlayers(players.map(player => 
      player.id === playerId 
        ? { ...player, isCameraOn: !player.isCameraOn } 
        : player
    ));
  };

  // Toggle fullscreen for a player
  const toggleFullscreen = (playerId: string) => {
    if (isFullscreen === playerId) {
      setIsFullscreen(null);
    } else {
      setIsFullscreen(playerId);
    }
  };

  // Get grid layout based on player count and fullscreen state
  const getGridLayout = () => {
    if (isFullscreen) {
      return {
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
      };
    }
    
    // For the expanded layout in Roleplay view, use a different grid
    if (isLayoutExpanded) {
      if (players.length <= 2) {
        return { 
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: '1fr' 
        };
      } else if (players.length <= 4) {
        return { 
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)' 
        };
      } else {
        return { 
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)' 
        };
      }
    } else {
      return { 
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gridTemplateRows: '1fr' 
      };
    }
  };
  
  // Get player to render in fullscreen mode
  const getFullscreenPlayer = () => {
    return players.find(player => player.id === isFullscreen);
  };
  
  useEffect(() => {
    // Check if this component is being used as main panel by checking its size
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.height > 400) {
          setIsLayoutExpanded(true);
        } else {
          setIsLayoutExpanded(false);
        }
      }
    });
    
    // Find the container element
    const container = document.querySelector('.video-grid');
    if (container) {
      resizeObserver.observe(container);
    }
    
    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
    };
  }, []);
  
  // Render player card (either in grid or fullscreen)
  const renderPlayerCard = (player: PlayerVideo, isFullscreenMode: boolean = false) => {
    return (
      <div 
        key={player.id}
        className={`glass-card video-card ${player.isSpeaking && !player.isMuted ? 'speaking' : ''}`}
        style={{ 
          position: 'relative',
          aspectRatio: isFullscreenMode ? 'auto' : '16/9',
          height: isFullscreenMode ? '100%' : undefined,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: player.isSpeaking && !player.isMuted 
            ? '1px solid var(--success-color)' 
            : player.isActive 
              ? '1px solid var(--glass-highlight)' 
              : '1px solid var(--glass-border)',
          boxShadow: player.isSpeaking && !player.isMuted
            ? '0 0 15px var(--success-color-glow)' 
            : player.isActive 
              ? '0 0 10px var(--glass-highlight-glow)' 
              : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Video placeholder or avatar if camera is off */}
        {player.isCameraOn ? (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(44, 62, 80, 0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Simulated video content with gradient background */}
            <div style={{
              width: '100%',
              height: '100%',
              background: `radial-gradient(circle, rgba(52, 152, 219, 0.2) 0%, rgba(44, 62, 80, 0.4) 100%)`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {/* Animated pulse to simulate video movement */}
              <div className={`pulse-animation ${player.isSpeaking && !player.isMuted ? 'speaking-pulse' : ''}`} style={{
                width: '60%',
                height: '70%',
                borderRadius: '50%',
                background: player.isSpeaking && !player.isMuted
                  ? `radial-gradient(circle, rgba(46, 204, 113, 0.3) 0%, rgba(44, 62, 80, 0.1) 100%)`
                  : `radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(44, 62, 80, 0.1) 100%)`
              }}></div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%'
          }}>
            <div style={{
              width: isFullscreenMode ? '120px' : '60px',
              height: isFullscreenMode ? '120px' : '60px',
              borderRadius: '50%',
              backgroundColor: player.avatarColor,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              fontSize: isFullscreenMode ? '48px' : '24px',
              fontWeight: 'bold'
            }}>
              {player.name.charAt(0).toUpperCase()}
            </div>
            {isFullscreenMode && (
              <div style={{
                marginTop: '20px',
                fontSize: '24px',
                color: 'var(--glass-text-primary)'
              }}>
                {player.name}
              </div>
            )}
          </div>
        )}

        {/* Username and status indicators */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '8px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: 'white', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>
            {player.name}
          </span>
          <div style={{ display: 'flex', gap: '5px' }}>
            {/* Speaking indicator */}
            {player.isSpeaking && !player.isMuted && (
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: '#2ecc71',
                boxShadow: '0 0 8px rgba(46, 204, 113, 0.8)',
                animation: 'pulse-speak 1s infinite'
              }}></span>
            )}
            
            {/* Status indicator */}
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: player.isActive ? '#2ecc71' : '#e74c3c',
              boxShadow: '0 0 4px rgba(0,0,0,0.5)'
            }}></span>
          </div>
        </div>

        {/* Control buttons (mute, camera, fullscreen) */}
        <div style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          display: 'flex',
          gap: '5px'
        }}>
          <Button
            small
            minimal
            icon={player.isMuted ? "disable" : "microphone"}
            onClick={() => toggleMute(player.id)}
            className="glass-btn-micro"
            style={{
              backgroundColor: player.isMuted ? 'rgba(231, 76, 60, 0.7)' : 'rgba(0, 0, 0, 0.3)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              padding: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          />
          <Button
            small
            minimal
            icon={player.isCameraOn ? "video" : "eye-off"}
            onClick={() => toggleCamera(player.id)}
            className="glass-btn-micro"
            style={{
              backgroundColor: !player.isCameraOn ? 'rgba(231, 76, 60, 0.7)' : 'rgba(0, 0, 0, 0.3)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              padding: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          />
          <Button
            small
            minimal
            icon={isFullscreen === player.id ? "minimize" : "maximize"}
            onClick={() => toggleFullscreen(player.id)}
            className="glass-btn-micro"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              padding: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="video-grid" style={{ 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {isLayoutExpanded && (
        <div style={{ 
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '20px',
          padding: '5px 10px'
        }}>
          <Icon icon="volume-up" />
          <div style={{ width: '100px' }}>
            <Slider 
              min={0} 
              max={1} 
              stepSize={0.1} 
              labelRenderer={false}
              value={masterVolume} 
              onChange={setMasterVolume} 
              showTrackFill={true}
            />
          </div>
        </div>
      )}
      
      <div className="scrollable-content" style={{
        padding: isFullscreen ? '0' : '16px',
        height: '100%',
        overflow: 'hidden'
      }}>
        {isFullscreen ? (
          // Fullscreen mode - show one player
          <div style={{ width: '100%', height: '100%' }}>
            {getFullscreenPlayer() && renderPlayerCard(getFullscreenPlayer()!, true)}
          </div>
        ) : (
          // Grid mode - show all players
          <div style={{ 
            display: 'grid',
            ...getGridLayout(),
            gap: '16px',
            height: '100%',
            overflow: 'auto'
          }}>
            {players.map(player => renderPlayerCard(player))}
          </div>
        )}
      </div>

      {/* Add CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.05); opacity: 0.9; }
            100% { transform: scale(0.95); opacity: 0.7; }
          }
          
          @keyframes pulse-speak {
            0% { opacity: 0.5; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.3); }
            100% { opacity: 0.5; transform: scale(0.8); }
          }
          
          @keyframes speaking-glow {
            0% { box-shadow: 0 0 10px rgba(46, 204, 113, 0.5); }
            50% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.8); }
            100% { box-shadow: 0 0 10px rgba(46, 204, 113, 0.5); }
          }
          
          .pulse-animation {
            animation: pulse 3s infinite ease-in-out;
          }
          
          .speaking-pulse {
            animation: pulse 1.5s infinite ease-in-out;
          }
          
          .video-card.speaking {
            animation: speaking-glow 1.5s infinite ease-in-out;
          }
          
          .glass-btn-micro:hover {
            background-color: rgba(52, 152, 219, 0.5) !important;
          }
        `}
      </style>
    </div>
  );
};

export default VideoGrid; 