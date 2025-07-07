/**
 * AI Proxy Service
 * 
 * This service acts as a proxy between the frontend and the server-side AI.
 * It sends user messages to the server via WebSocket and handles AI responses.
 */

import { websocketClient } from '../network';

// Define types for chat messages
export interface ChatMessage {
  sender: string;
  text: string;
  timestamp?: number;
}

// Define types for AI response handlers
export type AIResponseHandler = (response: ChatMessage) => void;

class AIProxyService {
  private responseHandlers: AIResponseHandler[] = [];
  private isInitialized: boolean = false;

  /**
   * Initialize the AI Proxy service
   * Sets up WebSocket event listeners for chat messages
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Listen for chat messages from the server
    websocketClient.on('chat', (data: ChatMessage) => {
      // Only process messages from the AI (DM)
      if (data.sender === 'DM') {
        this.notifyHandlers(data);
      }
    });

    this.isInitialized = true;
  }

  /**
   * Send a chat message to the AI
   * @param message The message to send
   */
  public sendMessage(message: string): void {
    // Ensure the service is initialized
    if (!this.isInitialized) {
      this.initialize();
    }

    // Ensure WebSocket is connected
    if (!websocketClient.isConnected()) {
      websocketClient.connect();
    }

    // Send the message to the server
    websocketClient.send('chat', {
      text: message
    });
  }

  /**
   * Register a handler for AI responses
   * @param handler The handler function to call when an AI response is received
   */
  public onResponse(handler: AIResponseHandler): () => void {
    this.responseHandlers.push(handler);
    
    // Return a function to unregister the handler
    return () => {
      const index = this.responseHandlers.indexOf(handler);
      if (index !== -1) {
        this.responseHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all registered handlers of an AI response
   * @param response The AI response
   */
  private notifyHandlers(response: ChatMessage): void {
    for (const handler of this.responseHandlers) {
      try {
        handler(response);
      } catch (error) {
        console.error('Error in AI response handler:', error);
      }
    }
  }
}

// Create a singleton instance
const aiProxy = new AIProxyService();

export default aiProxy; 