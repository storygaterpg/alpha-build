/**
 * Network utilities index
 */

// WebSocket client
export { default as websocketClient } from './WebSocketClient';
export type { WebSocketClient, WebSocketEventType, WebSocketEventHandler } from './WebSocketClient';
export { default as useWebSocket } from './useWebSocket';

// REST API client
export { default as api } from './api';

// Export everything as a default object
import websocketClient from './WebSocketClient';
import useWebSocket from './useWebSocket';
import api from './api';

export default {
  websocketClient,
  useWebSocket,
  api
}; 