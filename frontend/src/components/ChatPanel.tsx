import React, { useState, useEffect, useRef } from 'react';
import { InputGroup, Button, H2, Callout, Intent } from '@blueprintjs/core';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { websocketClient } from '../network';
import { addChatMessage, clearChatUnread } from '../store/slices/gameSlice';
import { ChatMessage } from '../store/types';
import { AppToaster } from '../App';

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

/**
 * ChatPanel component
 * 
 * Displays chat messages and provides input for new messages
 */
const ChatPanel: React.FC = () => {
  const dispatch = useDispatch();
  const playerName = useSelector((state: RootState) => state.game.playerName);
  const messages = useSelector((state: RootState) => state.game.chat.messages);
  const player = useSelector((state: RootState) => state.game.player);
  
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(websocketClient.isConnected());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Clear unread messages when component mounts
  useEffect(() => {
    dispatch(clearChatUnread());
  }, [dispatch]);
  
  // Handle WebSocket connection status
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setValidationError(null);
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
    };
    
    // Register WebSocket event handlers
    websocketClient.on('connect', handleConnect);
    websocketClient.on('disconnect', handleDisconnect);
    
    // Set initial connection status
    setIsConnected(websocketClient.isConnected());
    
    // Clean up event handlers on unmount
    return () => {
      websocketClient.off('connect', handleConnect);
      websocketClient.off('disconnect', handleDisconnect);
    };
  }, []);
  
  // Handle WebSocket chat events
  useEffect(() => {
    // Handle incoming chat messages
    const handleChatMessage = (data: any) => {
      if (data && data.message) {
        dispatch(addChatMessage({
          id: data.id || `msg-${Date.now()}`,
          sender: data.sender || 'System',
          content: data.message,
          timestamp: data.timestamp || Date.now(),
          type: data.type || 'system'
        }));
      }
    };
    
    // Register WebSocket event handler
    websocketClient.on('chat', handleChatMessage);
    
    // Clean up event handler on unmount
    return () => {
      websocketClient.off('chat', handleChatMessage);
    };
  }, [dispatch]);
  
  // Validate message before sending
  const validateMessage = (message: string): boolean => {
    // Clear previous validation error
    setValidationError(null);
    
    // Check if message is empty
    if (!message.trim()) {
      setValidationError("Message cannot be empty");
      return false;
    }
    
    // Check if message is too long (e.g., > 500 characters)
    if (message.length > 500) {
      setValidationError(`Message is too long (${message.length}/500 characters)`);
      return false;
    }
    
    // Check if player name is set
    if (!playerName) {
      setValidationError("You must set a player name before sending messages");
      return false;
    }
    
    // Check if connected to server
    if (!isConnected) {
      setValidationError("Not connected to server. Your message will not be sent.");
      return false;
    }
    
    return true;
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    // Validate message
    if (!validateMessage(inputValue)) {
      return;
    }
    
    // Create message object
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: playerName || 'Player',
      content: inputValue,
      timestamp: Date.now(),
      type: 'player'
    };
    
    try {
      // Add message to local state
      dispatch(addChatMessage(message));
      
      // Send message to server via WebSocket
      websocketClient.send('chat', {
        message: inputValue,
        playerId: player?.id,
        playerName: playerName
      });
      
      // Clear input
      setInputValue('');
    } catch (error) {
      // Show error toast
      safeShowToast({
        message: "Failed to send message",
        intent: Intent.DANGER,
        icon: "error",
        timeout: 3000
      });
      
      console.error('Error sending message:', error);
    }
  };
  
  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="chat-panel">
      <div 
        className="scrollable-content message-list" 
        ref={messageListRef}
        style={{ 
          padding: '16px', 
          margin: '16px',
          height: 'calc(100% - 60px)',
          overflowY: 'auto' 
        }}
      >
        {messages.length === 0 ? (
          <div className="glass-card">
            <strong>System:</strong> Welcome to StoryGate RPG, {playerName || 'Adventurer'}!
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message-card ${msg.type === 'player' ? 'player-message' : 'system-message'}`}
            >
              <div className="message-header">
                <strong>{msg.sender}</strong>
                <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {validationError && (
        <Callout
          intent={Intent.DANGER}
          title="Message Error"
          style={{ margin: '0 16px 16px' }}
        >
          {validationError}
        </Callout>
      )}
      
      <div className="chat-input-container" style={{ margin: '0 16px 16px' }}>
        <InputGroup
          placeholder={isConnected ? "Type your message..." : "Connecting..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          fill={true}
          large={true}
          intent={Intent.NONE}
          className="chat-input"
          style={{
            backgroundColor: 'rgba(29, 31, 58, 0.3)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            color: 'var(--glass-text-primary)',
            whiteSpace: 'normal'
          }}
          rightElement={
            <Button
              icon="send-message"
              minimal={true}
              onClick={handleSendMessage}
              disabled={!isConnected || !inputValue.trim()}
            />
          }
          disabled={!isConnected}
          autoFocus
        />
      </div>
    </div>
  );
};

export default ChatPanel; 