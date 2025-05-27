import React, { useState, useEffect, useRef } from 'react';
import { Button, H2, InputGroup } from '@blueprintjs/core';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { websocketClient } from '../network';
import { addChatMessage, clearChatUnread } from '../store/slices/gameSlice';
import { ChatMessage } from '../store/types';

/**
 * ChatInterface component
 * 
 * A simple chat interface that uses the AIProxy service to communicate with the AI
 */
const ChatInterface: React.FC = () => {
  const dispatch = useDispatch();
  const playerName = useSelector((state: RootState) => state.game.playerName);
  const messages = useSelector((state: RootState) => state.game.chat.messages);
  const player = useSelector((state: RootState) => state.game.player);
  
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Create message object
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: playerName || 'Player',
      content: inputValue,
      timestamp: Date.now(),
      type: 'player'
    };
    
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
  };
  
  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      <H2>Chat</H2>
      <div className="chat-messages" style={{ 
        flex: 1, 
        overflowY: 'auto',
        backgroundColor: '#f9f9f9',
        padding: '10px',
        marginBottom: '10px'
      }}>
        {messages.length === 0 ? (
          <p><strong>System:</strong> Welcome to StoryGate RPG, {playerName || 'Adventurer'}!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="chat-message" style={{
              marginBottom: '8px',
              padding: '5px',
              backgroundColor: msg.sender === playerName ? '#e3f2fd' : 'transparent',
              borderRadius: '4px'
            }}>
              <strong>{msg.sender}:</strong> {msg.content}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input" style={{ display: 'flex' }}>
        <InputGroup
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          style={{ flex: 1, marginRight: '10px' }}
        />
        <Button intent="primary" onClick={handleSendMessage}>Send</Button>
      </div>
    </>
  );
};

export default ChatInterface; 