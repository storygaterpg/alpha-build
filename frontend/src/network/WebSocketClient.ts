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

// Define event types for type safety
export type WebSocketEventType = 
  | 'connect'      // Connection established
  | 'disconnect'   // Connection closed
  | 'error'        // Connection error
  | 'message'      // Generic message
  | string;        // Custom event types

// Event handler type
export type WebSocketEventHandler = (data?: any) => void;

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

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private eventHandlers: Map<WebSocketEventType, WebSocketEventHandler[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 3000; // 3 seconds
  private isConnecting: boolean = false;
  private manualClose: boolean = false;
  
  // Notification management
  private lastErrorTime: number = 0;
  private errorNotificationDebounce: number = 10000; // 10 seconds between error notifications
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3; // Max attempts when server is unavailable
  private hasShownErrorNotification: boolean = false;
  private hasShownReconnectFailedNotification: boolean = false;

  /**
   * Create a new WebSocketClient
   */
  constructor() {
    // Get the WebSocket URL from environment variables or use a default
    this.url = import.meta.env.VITE_SERVER_URL || 'ws://localhost:8000/ws';
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }
    
    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }
    
    // If we've exceeded the maximum connection attempts, don't try again
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log(`Maximum connection attempts (${this.maxConnectionAttempts}) reached, not trying again`);
      return;
    }
    
    this.isConnecting = true;
    this.connectionAttempts++;
    
    try {
      console.log(`Connecting to WebSocket server at ${this.url} (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.connectionAttempts = 0;
        this.hasShownErrorNotification = false;
        this.hasShownReconnectFailedNotification = false;
        
        // Show success notification
        safeShowToast({
          message: "Connected to game server",
          intent: Intent.SUCCESS,
          icon: "tick-circle",
          timeout: 3000
        });
        
        // Dispatch connect event
        this.dispatchEvent('connect');
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
        this.isConnecting = false;
        this.socket = null;
        
        // Dispatch disconnect event
        this.dispatchEvent('disconnect', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect if not closed manually and not closed cleanly
        if (!this.manualClose && !event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          
          // Only show the reconnection notification for the first attempt or every few attempts
          if (this.reconnectAttempts === 1 || this.reconnectAttempts % 3 === 0) {
            // Show reconnection notification
            safeShowToast({
              message: `Connection lost. Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
              intent: Intent.WARNING,
              icon: "refresh",
              timeout: 3000
            });
          }
          
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          
          setTimeout(() => {
            this.connect();
          }, this.reconnectInterval);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts && !this.hasShownReconnectFailedNotification) {
          // Show failed reconnection notification (only once)
          this.hasShownReconnectFailedNotification = true;
          safeShowToast({
            message: "Failed to reconnect after multiple attempts. Please refresh the page.",
            intent: Intent.DANGER,
            icon: "error",
            timeout: 0 // Don't auto-dismiss
          });
        }
        
        this.manualClose = false;
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        // Check if we should show an error notification (debounce)
        const now = Date.now();
        if (!this.hasShownErrorNotification || (now - this.lastErrorTime > this.errorNotificationDebounce)) {
          this.hasShownErrorNotification = true;
          this.lastErrorTime = now;
          
          // Show error notification
          safeShowToast({
            message: "WebSocket connection error. Server may be unavailable.",
            intent: Intent.DANGER,
            icon: "warning-sign",
            timeout: 5000
          });
        }
        
        // Dispatch error event
        this.dispatchEvent('error', error);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type && message.data) {
            // Dispatch the event to any registered listeners
            this.dispatchEvent(message.type, message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket server:', error);
      this.isConnecting = false;
      
      // Show connection error notification (with debounce)
      const now = Date.now();
      if (!this.hasShownErrorNotification || (now - this.lastErrorTime > this.errorNotificationDebounce)) {
        this.hasShownErrorNotification = true;
        this.lastErrorTime = now;
        
        safeShowToast({
          message: "Failed to connect to game server. Server may be unavailable.",
          intent: Intent.DANGER,
          icon: "error",
          timeout: 5000
        });
      }
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.manualClose = true;
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * Reset the connection state and attempt counts
   */
  public resetConnectionState(): void {
    this.reconnectAttempts = 0;
    this.connectionAttempts = 0;
    this.isConnecting = false;
    this.manualClose = false;
    this.hasShownErrorNotification = false;
    this.hasShownReconnectFailedNotification = false;
    
    // Close existing socket if it exists
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error('Error closing socket during reset:', error);
      }
      this.socket = null;
    }
    
    console.log('WebSocket connection state reset');
  }

  /**
   * Register an event handler
   * @param eventType The event type to listen for
   * @param handler The handler function to call when the event occurs
   */
  public on(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove an event handler
   * @param eventType The event type
   * @param handler The handler function to remove
   */
  public off(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(eventType)!;
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Send a message to the server
   * @param eventType The event type
   * @param data The data to send
   */
  public send(eventType: string, data?: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message, WebSocket is not connected');
      
      // Only show the notification if we haven't shown an error notification recently
      const now = Date.now();
      if (now - this.lastErrorTime > this.errorNotificationDebounce) {
        this.lastErrorTime = now;
        
        // Show warning notification
        safeShowToast({
          message: "Cannot send message, not connected to server",
          intent: Intent.WARNING,
          icon: "offline",
          timeout: 3000
        });
      }
      
      return;
    }

    const message = {
      type: eventType,
      data: data || null,
      timestamp: Date.now()
    };

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Only show the notification if we haven't shown an error notification recently
      const now = Date.now();
      if (now - this.lastErrorTime > this.errorNotificationDebounce) {
        this.lastErrorTime = now;
        
        // Show send error notification
        safeShowToast({
          message: "Failed to send message to server",
          intent: Intent.DANGER,
          icon: "warning-sign",
          timeout: 3000
        });
      }
    }
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get the current connection state
   */
  public getState(): number {
    if (!this.socket) {
      return WebSocket.CLOSED;
    }
    return this.socket.readyState;
  }

  /**
   * Dispatch an event to all registered handlers
   * @param eventType The event type
   * @param data The event data
   */
  private dispatchEvent(eventType: string, data?: any): void {
    if (!this.eventHandlers.has(eventType as WebSocketEventType)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(eventType as WebSocketEventType)!;
    
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in WebSocket event handler for '${eventType}':`, error);
      }
    }
  }
}

// Create a singleton instance
export const websocketClient = new WebSocketClient();

export default websocketClient; 