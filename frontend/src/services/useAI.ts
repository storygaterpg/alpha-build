import { useState, useEffect, useCallback } from 'react';
import aiProxy, { ChatMessage } from './AIProxy';

/**
 * React hook for interacting with the AI through the AIProxy service
 * @returns Object with AI interaction methods and state
 */
export const useAI = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<ChatMessage | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);

  // Initialize the AI proxy
  useEffect(() => {
    aiProxy.initialize();
  }, []);

  // Set up response handler
  useEffect(() => {
    const cleanup = aiProxy.onResponse((response) => {
      setLastResponse(response);
      setHistory(prev => [...prev, response]);
      setIsProcessing(false);
    });

    return cleanup;
  }, []);

  /**
   * Send a message to the AI
   * @param message The message to send
   */
  const sendMessage = useCallback((message: string) => {
    // Add the user message to history
    const userMessage: ChatMessage = {
      sender: 'Player',
      text: message,
      timestamp: Date.now()
    };
    
    setHistory(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    // Send the message to the AI
    aiProxy.sendMessage(message);
  }, []);

  /**
   * Clear the chat history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastResponse(null);
  }, []);

  return {
    sendMessage,
    clearHistory,
    isProcessing,
    lastResponse,
    history
  };
};

export default useAI; 