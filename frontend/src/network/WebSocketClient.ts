// src/network/WebSocketClient.ts

/**
 * WebSocketClient wraps the browser's WebSocket API to provide
 * an event-based messaging interface with connect/disconnect
 * notifications and safe send semantics.
 */

class WebSocketClient {
    private socket: WebSocket;
    private handlers: { [event: string]: Array<(data: any) => void> } = {};
  
    constructor() {
      // Read server URL from environment or default to localhost
      const url =
        import.meta.env.VITE_SERVER_URL || `ws://${window.location.hostname}:8000/ws`;
      this.socket = new WebSocket(url);
  
      // Emit lifecycle events
      this.socket.onopen = () => this.emit('connect', {});
      this.socket.onclose = () => this.emit('disconnect', {});
      this.socket.onerror = () => this.emit('disconnect', {});
  
      // Dispatch incoming messages to registered handlers
      this.socket.onmessage = (msg: MessageEvent) => {
        try {
          const { event, payload } = JSON.parse(msg.data);
          this.emit(event, payload);
        } catch (e) {
          console.error('Invalid WebSocket message', msg.data, e);
        }
      };
    }
  
    /**
     * Register a handler for a given event name.
     * @param event - Name of the event to listen for.
     * @param handler - Callback invoked with the event payload.
     */
    public on(event: string, handler: (data: any) => void): void {
      if (!this.handlers[event]) {
        this.handlers[event] = [];
      }
      this.handlers[event].push(handler);
    }
  
    /**
     * Send a named event with payload to the server.
     * @param event - Event name.
     * @param data - Payload object.
     */
    public send(event: string, data: any): void {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ event, payload: data }));
      } else {
        console.warn(`WebSocket not open, cannot send event "${event}"`);
      }
    }
  
    /**
     * Check if the WebSocket connection is currently open.
     * @returns True if connected.
     */
    public isConnected(): boolean {
      return this.socket.readyState === WebSocket.OPEN;
    }
  
    /**
     * Internal helper to invoke all handlers for an event.
     * @param event - Event name.
     * @param data - Payload data.
     */
    private emit(event: string, data: any): void {
      (this.handlers[event] || []).forEach((handler) => {
        try {
          handler(data);
        } catch (e) {
          console.error(`Error in handler for event "${event}"`, e);
        }
      });
    }
  }
  
  // Export a singleton instance for app-wide use
  const wsClient = new WebSocketClient();
  export default wsClient;
  