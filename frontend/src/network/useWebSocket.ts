import { useEffect, useCallback, useState } from 'react';
import websocketClient, { WebSocketEventType, WebSocketEventHandler } from './WebSocketClient';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnect?: WebSocketEventHandler;
  onDisconnect?: WebSocketEventHandler;
  onError?: WebSocketEventHandler;
}

/**
 * React hook for using the WebSocketClient
 * 
 * @param options Configuration options
 * @returns WebSocket utilities and connection state
 */
export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { 
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError 
  } = options;
  
  const [isConnected, setIsConnected] = useState<boolean>(websocketClient.isConnected());
  const [connectionState, setConnectionState] = useState<number>(websocketClient.getState());

  // Connect to the WebSocket server
  const connect = useCallback(() => {
    websocketClient.connect();
  }, []);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    websocketClient.disconnect();
  }, []);

  // Send a message to the server
  const send = useCallback((eventType: string, data?: any) => {
    websocketClient.send(eventType, data);
  }, []);

  // Subscribe to an event
  const on = useCallback((eventType: WebSocketEventType, handler: WebSocketEventHandler) => {
    websocketClient.on(eventType, handler);
    
    // Return a cleanup function to unsubscribe when the component unmounts
    return () => {
      websocketClient.off(eventType, handler);
    };
  }, []);

  // Handle connection state changes
  useEffect(() => {
    const handleConnect = (data: any) => {
      setIsConnected(true);
      setConnectionState(WebSocket.OPEN);
      if (onConnect) onConnect(data);
    };

    const handleDisconnect = (data: any) => {
      setIsConnected(false);
      setConnectionState(WebSocket.CLOSED);
      if (onDisconnect) onDisconnect(data);
    };

    const handleError = (data: any) => {
      if (onError) onError(data);
    };

    // Subscribe to connection events
    websocketClient.on('connect', handleConnect);
    websocketClient.on('disconnect', handleDisconnect);
    websocketClient.on('error', handleError);

    // Connect automatically if specified
    if (autoConnect && !websocketClient.isConnected()) {
      websocketClient.connect();
    }

    // Update the initial state
    setIsConnected(websocketClient.isConnected());
    setConnectionState(websocketClient.getState());

    // Cleanup subscriptions when the component unmounts
    return () => {
      websocketClient.off('connect', handleConnect);
      websocketClient.off('disconnect', handleDisconnect);
      websocketClient.off('error', handleError);
    };
  }, [autoConnect, onConnect, onDisconnect, onError]);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    send,
    on,
    // Expose the WebSocket states for convenience
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
  };
};

export default useWebSocket; 