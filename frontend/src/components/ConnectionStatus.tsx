import React from 'react';
import { useAppSelector } from '../store/hooks';
import { Icon, Colors, Tooltip, Position, Button, Tag } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { useDispatch } from 'react-redux';
import { socketConnect } from '../store/slices/socketSlice';
import websocketClient from '../network/WebSocketClient';

/**
 * ConnectionStatus component
 * 
 * Displays the current connection status (online/offline) with visual indicators
 * and details about connection latency or disconnect reason when available
 */
const ConnectionStatus: React.FC = () => {
  const connection = useAppSelector(state => state.connection);
  const socket = useAppSelector(state => state.socket);
  const dispatch = useDispatch();
  
  // Handle manual reconnect
  const handleReconnect = () => {
    // Attempt to find a working connection path before reconnecting
    websocketClient.testConnectivity().then(path => {
      console.log('Reconnecting with path:', path);
      dispatch(socketConnect({ path }));
    }).catch(() => {
      // If testing fails, try reconnecting anyway
      dispatch(socketConnect({}));
    });
  };
  
  // Build tooltip content based on connection status
  const getTooltipContent = () => {
    if (connection.online) {
      return (
        <div className="connection-tooltip">
          <div>Connected to game server</div>
          {connection.latency && (
            <div>Latency: {connection.latency}ms</div>
          )}
          <div className="connection-url">URL: {websocketClient.getUrl() || 'Unknown'}</div>
        </div>
      );
    } else {
      const closeInfo = websocketClient.getLastCloseInfo();
      const errorDetails = socket.error ? 
        `${socket.error.message}${socket.error.code ? ` (Code: ${socket.error.code})` : ''}` : 
        closeInfo.reason || 'Unknown reason';
        
      return (
        <div className="connection-tooltip">
          <div>Disconnected from game server</div>
          {connection.disconnectReason && (
            <div>Reason: {connection.disconnectReason}</div>
          )}
          <div>Diagnostics: {errorDetails}</div>
          {connection.reconnecting ? (
            <div>Reconnecting... (Attempt {socket.connectionInfo.reconnectAttempts})</div>
          ) : (
            <Button 
              small 
              intent="primary" 
              onClick={handleReconnect}
              icon="refresh"
              style={{ marginTop: '8px' }}
            >
              Try reconnect
            </Button>
          )}
        </div>
      );
    }
  };

  // Determine icon based on connection status
  const getIcon = () => {
    if (connection.online) {
      return IconNames.SIGNAL_SEARCH;
    } else if (connection.reconnecting) {
      return IconNames.REFRESH;
    } else {
      return IconNames.OFFLINE;
    }
  };

  // Determine color based on connection status
  const getColor = () => {
    if (connection.online) {
      return Colors.GREEN3;
    } else if (connection.reconnecting) {
      return Colors.ORANGE3;
    } else {
      return Colors.RED3;
    }
  };

  // Get diagnostics tag for socket errors
  const getDiagnosticsTag = () => {
    if (!socket.error) return null;
    
    return (
      <Tag
        minimal
        intent="danger"
        icon="warning-sign"
        className="connection-error-tag"
      >
        Error {socket.error.code || ''}
      </Tag>
    );
  };

  return (
    <Tooltip 
      content={getTooltipContent()}
      position={Position.BOTTOM}
      className="connection-status-tooltip"
    >
      <div className="connection-status">
        <Icon 
          icon={getIcon()} 
          color={getColor()} 
          size={16} 
          className={`connection-status-icon ${connection.reconnecting ? 'reconnecting' : ''}`} 
        />
        <span 
          className="connection-status-text" 
          style={{ color: getColor() }}
        >
          {connection.online ? 'Online' : connection.reconnecting ? 'Reconnecting...' : 'Offline'}
        </span>
        {getDiagnosticsTag()}
      </div>
    </Tooltip>
  );
};

export default ConnectionStatus; 