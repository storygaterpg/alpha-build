/**
 * WebSocketClient
 * 
 * A wrapper around the WebSocket API that provides:
 * - Automatic connection to the server using VITE_SERVER_URL
 * - Event-based communication
 * - Reconnection logic
 * - Typed message handling
 */
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '../App';

// Add ENV interface to window
declare global {
  interface Window {
    ENV?: {
      WEBSOCKET_PORT?: string;
      WEBSOCKET_URL?: string;
      [key: string]: string | undefined;
    };
  }
}

// Define event types for type safety
export type WebSocketEventType = 
  | 'connect'      // Connection established
  | 'disconnect'   // Connection closed
  | 'error'        // Connection error
  | 'message'      // Generic message
  | string;        // Custom event types

// Define handler type for events
export type WebSocketEventHandler = (data?: any) => void;

// Safe toast helper that works even if AppToaster is not initialized
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

// Check if we're in a test environment
const isTestEnvironment = (): boolean => {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
};

// Get environment variables in a way that works in both browser and test environments
const getEnvVar = (name: string, defaultValue: string = ''): string => {
  // First check window.ENV if available (set in index.html)
  if (typeof window !== 'undefined' && window.ENV && window.ENV[name.replace('VITE_', '')]) {
    const value = window.ENV[name.replace('VITE_', '')];
    return value || defaultValue;
  }
  
  if (isTestEnvironment()) {
    // In test environment, use the mock values from setupTests.js
    return (global as any).import?.meta?.env?.[name] || defaultValue;
  } else {
    // In browser environment, use Vite's import.meta.env
    return (import.meta.env as any)[name] || defaultValue;
  }
};

/**
 * Determine the appropriate WebSocket URL based on environment or fallbacks
 * @param customPath Optional path to append to the WebSocket URL
 */
function getWebSocketUrl(customPath?: string): string {
  // First priority: Use the environment variable if available
  let url = '';
  const wsUrl = getEnvVar('VITE_WEBSOCKET_URL');
  
  if (wsUrl) {
    url = wsUrl;
  } else {
    // Second priority: Use the backend port from environment or default to 8000
    const serverPort = getEnvVar('VITE_WEBSOCKET_PORT', '8000');
    
    // Determine protocol
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Use the same hostname as the current page or localhost in tests
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    url = `${protocol}//${hostname}:${serverPort}`;
  }

  // Add the custom path if provided
  if (customPath) {
    // Make sure we don't double up on slashes
    if (url.endsWith('/') && customPath.startsWith('/')) {
      url += customPath.substring(1);
    } else if (!url.endsWith('/') && !customPath.startsWith('/')) {
      url += '/' + customPath;
    } else {
      url += customPath;
    }
  }

  return url;
}

/**
 * Checks if a WebSocket connection can be established
 * @param url WebSocket URL to test
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise that resolves with success or rejects with error
 */
async function testWebSocketConnection(url: string, timeoutMs: number = 5000): Promise<{success: boolean, message?: string}> {
  return new Promise((resolve) => {
    try {
      const socket = new WebSocket(url);
      
      // Set up timeout
      const timeout = setTimeout(() => {
        socket.close();
        resolve({ 
          success: false, 
          message: `Connection attempt timed out after ${timeoutMs}ms` 
        });
      }, timeoutMs);
      
      socket.onopen = () => {
        clearTimeout(timeout);
        socket.close();
        resolve({ success: true });
      };
      
      socket.onerror = () => {
        clearTimeout(timeout);
        socket.close();
        resolve({ 
          success: false, 
          message: 'Failed to establish connection' 
        });
      };
    } catch (error) {
      resolve({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
}

class WebSocketClient {
  private static instance: WebSocketClient;
  private socket: WebSocket | null = null;
  private url: string = '';
  private connected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private lastCloseCode: number | null = null;
  private lastCloseReason: string | null = null;
  private connectionPath: string | undefined = undefined;
  private connectionAttemptInProgress: boolean = false;
  
  // Event handlers
  private messageHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private connectHandlers: Set<WebSocketEventHandler> = new Set();
  private disconnectHandlers: Set<WebSocketEventHandler> = new Set();
  private errorHandlers: Set<WebSocketEventHandler> = new Set();

  // Private constructor to enforce singleton pattern
  private constructor() {}

  // Get the singleton instance
  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  /**
   * Get the current WebSocket URL
   */
  public getUrl(): string {
    return this.url;
  }

  /**
   * Get the last close code and reason
   */
  public getLastCloseInfo(): { code: number | null, reason: string | null } {
    return {
      code: this.lastCloseCode,
      reason: this.lastCloseReason
    };
  }

  /**
   * Test connectivity to multiple WebSocket paths
   * @returns Promise resolving to the best working URL or undefined if none work
   */
  public async testConnectivity(): Promise<string | undefined> {
    // Paths to try in order - prioritize /ws on port 8000 which is the main server endpoint
    const pathsToTry = [
      '/ws',
      '/websocket',
      '',
    ];
    // First, try port 8000 which is where our server is running
    for (const path of pathsToTry) {
      const url = `ws://localhost:8000${path}`;
      try {
        console.log(`Attempting to connect to: ${url}`);
        const websocket = new WebSocket(url);
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            websocket.close();
            reject(new Error('Connection timeout'));
          }, 3000);
          
          websocket.onopen = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          websocket.onerror = (event) => {
            clearTimeout(timeout);
            reject(new Error(`WebSocket error: ${event}`));
          };
        });
        
        websocket.close();
        return url;
      } catch (error) {
        console.warn(`Failed to connect to ${url}:`, error);
      }
    }
    
    // If port 8000 fails, try the default port detection
    for (const path of pathsToTry) {
      const url = getWebSocketUrl(path);
      console.log(`Testing connection to: ${url}`);
      
      const result = await testWebSocketConnection(url, 5000);
      
      if (result.success) {
        console.log(`✓ Successfully connected to ${url}`);
        return path;
      } else {
        console.log(`✗ Failed to connect to ${url}: ${result.message}`);
      }
    }
    
    console.log('No working WebSocket paths found');
    return undefined;
  }

  /**
   * Connect to the WebSocket server
   * @param url Optional URL to override the default
   * @param path Optional path to append to the URL
   */
  public async connect(url?: string, path?: string): Promise<boolean> {
    if (this.socket && this.connected) {
      console.log('WebSocket already connected');
      return true;
    }
    
    if (this.connectionAttemptInProgress) {
      console.log('Connection attempt already in progress');
      return false;
    }
    
    this.connectionAttemptInProgress = true;
    
    try {
      // Clear last close info
      this.lastCloseCode = null;
      this.lastCloseReason = null;
      
      // If path is provided, save it for reconnection attempts
      if (path) {
        this.connectionPath = path;
      }
      
      // If no explicit path is provided, and we don't have a saved path,
      // try to find a working one
      if (!url && !this.connectionPath) {
        this.connectionPath = await this.testConnectivity();
      }
      
      // Determine URL - provided URL takes precedence over auto-determined URL
      this.url = url || getWebSocketUrl(this.connectionPath);
      
      // If no explicit URL provided and no working path found, try port 8000 with /ws first
      if (!url) {
        this.url = 'ws://localhost:8000/ws';
      }
      
      console.log('WebSocket connecting to:', this.url);
      
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      return true;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.handleError(error);
      return false;
    } finally {
      this.connectionAttemptInProgress = false;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      
      // Clear any reconnect timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if a connection attempt is in progress
   */
  public isConnecting(): boolean {
    return this.connectionAttemptInProgress;
  }

  /**
   * Send a message to the server
   * @param eventType The event type
   * @param data The data to send
   */
  public send(eventType: string, data: any): void {
    if (!this.socket || !this.connected) {
      console.error('Cannot send message, WebSocket not connected');
      return;
    }

    try {
      // Format message to match server expectations
      const message = JSON.stringify({
        event: eventType,      // Changed from 'type' to 'event'
        payload: data,         // Changed from 'data' to 'payload'
        timestamp: Date.now()  // Kept for client-side logging but not used by server
      });
      
      this.socket.send(message);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  /**
   * Register an event handler
   * @param eventType The event type to listen for
   * @param handler The handler function to call when the event occurs
   */
  public on(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (eventType === 'message') {
      // For message events, we need to register message type handlers
      if (typeof handler !== 'function') {
        console.error('Message handler must be a function');
        return;
      }
      
      const messageType = 'default'; // Default message type
      if (!this.messageHandlers.has(messageType)) {
        this.messageHandlers.set(messageType, new Set());
      }
      
      this.messageHandlers.get(messageType)?.add(handler);
    } else if (eventType === 'connect') {
      this.connectHandlers.add(handler);
    } else if (eventType === 'disconnect') {
      this.disconnectHandlers.add(handler);
    } else if (eventType === 'error') {
      this.errorHandlers.add(handler);
    }
  }

  /**
   * Register a handler for a specific message type
   * @param messageType The message type to listen for
   * @param handler The handler function to call when the event occurs
   */
  public onMessageType(messageType: string, handler: WebSocketEventHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)?.add(handler);
  }

  /**
   * Remove an event handler
   * @param eventType The event type
   * @param handler The handler function to remove
   */
  public off(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (eventType === 'message') {
      const messageType = 'default';
      this.messageHandlers.get(messageType)?.delete(handler);
    } else if (eventType === 'connect') {
      this.connectHandlers.delete(handler);
    } else if (eventType === 'disconnect') {
      this.disconnectHandlers.delete(handler);
    } else if (eventType === 'error') {
      this.errorHandlers.delete(handler);
    }
  }

  /**
   * Remove a handler for a specific message type
   * @param messageType The message type to remove
   * @param handler The handler function to remove
   */
  public offMessageType(messageType: string, handler: WebSocketEventHandler): void {
    this.messageHandlers.get(messageType)?.delete(handler);
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connected to', this.url);
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Notify all connect handlers
    this.connectHandlers.forEach(handler => handler());
    
    // Show toast notification
        safeShowToast({
      message: 'Connected to game server',
      intent: Intent.SUCCESS,
      icon: 'tick-circle',
          timeout: 3000
        });
      }
      
  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      const { event: eventType, payload } = message;
      
      // Debug logging to help diagnose message format issues
      console.log(`Received WebSocket message: event=${eventType}`, payload);
      
      // Normalize payload if it's not an object
      const normalizedPayload = typeof payload === 'object' ? payload : { data: payload };
      
      // Add safety checks to ensure we have valid message data
      if (!eventType) {
        console.warn('Received WebSocket message with no event type:', message);
      return;
    }

      // If we have handlers for this specific message type, call them
      if (eventType && this.messageHandlers.has(eventType)) {
        this.messageHandlers.get(eventType)?.forEach(handler => {
          try {
            handler(normalizedPayload);
          } catch (handlerError) {
            console.error(`Error in handler for ${eventType}:`, handlerError);
          }
        });
      }
      
      // Also call default message handlers
      if (this.messageHandlers.has('default')) {
        this.messageHandlers.get('default')?.forEach(handler => {
          try {
            handler(message);
          } catch (handlerError) {
            console.error('Error in default message handler:', handlerError);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.connected = false;
    
    // Store close information for diagnostics
    this.lastCloseCode = event.code;
    this.lastCloseReason = event.reason || (event.code === 1006 ? 'Abnormal closure (no close frame received)' : null);
    
    console.log(`WebSocket connection closed: ${event.code}${event.reason ? ' - ' + event.reason : ''}`);
    
    // Notify all disconnect handlers
    this.disconnectHandlers.forEach(handler => handler(event));
    
    // Attempt to reconnect if the close wasn't intentional
    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    } else {
      safeShowToast({
        message: `Disconnected from game server (Code: ${event.code})`,
        intent: Intent.WARNING,
        icon: 'offline',
        timeout: 3000
      });
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error?: any): void {
    console.error('WebSocket error', error);
    
    // Store diagnostics
    this.lastCloseCode = 1006; // Assuming abnormal closure on error
    this.lastCloseReason = error?.message || 'Connection error';
    
    // Notify all error handlers
    this.errorHandlers.forEach(handler => handler(error));
    
    // Show toast notification
    safeShowToast({
      message: 'Error connecting to game server',
      intent: Intent.DANGER,
      icon: 'error',
      timeout: 5000
    });
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(async () => {
      console.log(`Reconnecting to WebSocket (Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts})`);
      
      // If we've had multiple failed attempts, try to find a working path
      if (this.reconnectAttempts > 2) {
        this.connectionPath = await this.testConnectivity();
      }
      
      // Connect with the determined path
      this.connect();
    }, delay);
    
    safeShowToast({
      message: `Reconnecting to server in ${Math.round(delay / 1000)}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      intent: Intent.PRIMARY,
      icon: 'refresh',
      timeout: delay
    });
  }
}

// Export the singleton instance
export const websocketClient = WebSocketClient.getInstance();

export default websocketClient; 