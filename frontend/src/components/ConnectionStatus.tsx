import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Popover, Icon, Tooltip, Intent } from '@blueprintjs/core';
import { RootState } from '../store';

interface ConnectionStatusProps {
  className?: string;
  compact?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className, compact = false }) => {
  const socketConnected = useSelector((state: RootState) => state.socket.connected);
  const socketError = useSelector((state: RootState) => state.socket.error);
  const reconnecting = useSelector((state: RootState) => state.connection.reconnecting);
  const disconnectReason = useSelector((state: RootState) => state.connection.disconnectReason);
  
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [lastPingTime, setLastPingTime] = useState<number>(Date.now());
  
  // Simulate ping every 10 seconds
  useEffect(() => {
    if (!socketConnected) {
      setPingTime(null);
      return;
    }
    
    const pingInterval = setInterval(() => {
      // In a real implementation, you would send a ping request to the server here
      // and measure the time it takes to get a response
      // For now, we'll simulate a random ping time between 20-200ms
      if (socketConnected) {
        const simulatedPing = Math.floor(Math.random() * 180) + 20;
        setPingTime(simulatedPing);
        setLastPingTime(Date.now());
      }
    }, 10000);
    
    // Initial ping
    if (socketConnected) {
      const simulatedPing = Math.floor(Math.random() * 180) + 20;
      setPingTime(simulatedPing);
      setLastPingTime(Date.now());
    }
    
    return () => clearInterval(pingInterval);
  }, [socketConnected]);
  
  // Get connection quality based on ping time
  const getConnectionQuality = (): { quality: string; intent: Intent } => {
    if (!pingTime || !socketConnected) {
      return { quality: 'Unknown', intent: Intent.NONE };
    }
    
    if (pingTime < 50) {
      return { quality: 'Excellent', intent: Intent.SUCCESS };
    } else if (pingTime < 100) {
      return { quality: 'Good', intent: Intent.PRIMARY };
    } else if (pingTime < 200) {
      return { quality: 'Fair', intent: Intent.WARNING };
    } else {
      return { quality: 'Poor', intent: Intent.DANGER };
    }
  };
  
  const { quality, intent } = getConnectionQuality();
  
  // Simple indicator for compact mode
  if (compact) {
    return (
      <Tooltip
        content={
          <div>
            <div><strong>Status:</strong> {socketConnected ? 'Connected' : reconnecting ? 'Reconnecting...' : 'Disconnected'}</div>
            {pingTime && socketConnected && <div><strong>Ping:</strong> {pingTime}ms ({quality})</div>}
            {disconnectReason && <div><strong>Reason:</strong> {disconnectReason}</div>}
          </div>
        }
        intent={socketConnected ? Intent.SUCCESS : reconnecting ? Intent.WARNING : Intent.DANGER}
      >
        <div 
          className={`connection-status-compact ${className || ''}`}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer'
          }}
        >
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: socketConnected ? 'var(--glass-success)' : 
                              reconnecting ? 'var(--glass-warning)' : 'var(--glass-danger)',
            animation: reconnecting ? 'pulse 1.5s infinite' : 'none'
          }} />
          {!socketConnected && reconnecting && (
            <Icon icon="refresh" intent={Intent.WARNING} size={12} />
          )}
        </div>
      </Tooltip>
    );
  }
  
  // Full status display
  return (
    <>
      <Popover
        content={
          <div style={{ padding: '10px', maxWidth: '300px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Connection Details</h4>
            
            <div style={{ marginBottom: '5px' }}>
              <strong>Status:</strong> {socketConnected ? 'Connected' : reconnecting ? 'Reconnecting...' : 'Disconnected'}
            </div>
            
            {pingTime && socketConnected && (
              <div style={{ marginBottom: '5px' }}>
                <strong>Ping:</strong> {pingTime}ms ({quality})
              </div>
            )}
            
            {socketConnected && lastPingTime && (
              <div style={{ marginBottom: '5px' }}>
                <strong>Last Ping:</strong> {new Date(lastPingTime).toLocaleTimeString()}
              </div>
            )}
            
            {disconnectReason && (
              <div style={{ marginBottom: '5px' }}>
                <strong>Disconnect Reason:</strong> {disconnectReason}
              </div>
            )}
            
            {socketError && socketError.message && (
              <div style={{ marginBottom: '5px' }}>
                <strong>Last Error:</strong> {socketError.message}
                {socketError.code && <div>Code: {socketError.code}</div>}
              </div>
            )}
            
            <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.7 }}>
              Click for more connection diagnostics
            </div>
          </div>
        }
        placement="bottom"
      >
        <div 
          className={`connection-status ${className || ''}`}
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '16px',
            backgroundColor: socketConnected ? 'rgba(76, 201, 240, 0.2)' : 
                              reconnecting ? 'rgba(255, 190, 11, 0.2)' : 'rgba(230, 57, 70, 0.2)',
            color: socketConnected ? 'var(--glass-success)' : 
                    reconnecting ? 'var(--glass-warning)' : 'var(--glass-danger)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: socketConnected ? 'var(--glass-success)' : 
                              reconnecting ? 'var(--glass-warning)' : 'var(--glass-danger)',
            animation: reconnecting ? 'pulse 1.5s infinite' : 'none'
          }} />
          
          {socketConnected ? (
            <>
              Connected
              {pingTime && (
                <span style={{ fontSize: '11px', opacity: 0.9 }}>
                  {pingTime}ms
                </span>
              )}
            </>
          ) : reconnecting ? (
            <>
              <Icon icon="refresh" intent={Intent.WARNING} />
              Reconnecting...
            </>
          ) : (
            <>
              <Icon icon="offline" intent={Intent.DANGER} />
              Disconnected
            </>
          )}
        </div>
      </Popover>
      {/* Animation for the pulsing reconnect indicator */}
      <style>
        {`
          @keyframes pulse {
            0% {
              opacity: 0.6;
              transform: scale(0.8);
            }
            50% {
              opacity: 1;
              transform: scale(1.1);
            }
            100% {
              opacity: 0.6;
              transform: scale(0.8);
            }
          }
        `}
      </style>
    </>
  );
};

export default ConnectionStatus; 