import React, { useState, useEffect, useRef } from 'react';
import { InputGroup, Button, Callout, Intent, ButtonGroup } from '@blueprintjs/core';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { sendInCharacterChat, sendOutOfCharacterChat, clearUnread } from '../store/slices/chatSlice';
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
  const messages = useSelector((state: RootState) => state.chat.messages);
  const player = useSelector((state: RootState) => state.game.player);
  const socketConnected = useSelector((state: RootState) => state.socket.connected);
  
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<'in-character' | 'out-of-character'>('in-character');
  
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
    dispatch(clearUnread());
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
    if (!socketConnected) {
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
    
    try {
      // Send message based on mode
      if (messageMode === 'in-character') {
        dispatch(sendInCharacterChat(inputValue, player?.id));
      } else {
        dispatch(sendOutOfCharacterChat(inputValue));
      }
      
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
    <div className="chat-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div 
        className="scrollable-content message-list" 
        ref={messageListRef}
        style={{ 
          padding: '16px', 
          margin: '16px',
          height: 'calc(100% - 100px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flex: 1
        }}
      >
        {messages.length === 0 ? (
          <div className="chat-bubble system-bubble">
            <strong>System:</strong> Welcome to StoryGate RPG, {playerName || 'Adventurer'}!
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`chat-bubble ${msg.type === 'in-character' ? 'player-bubble' : 
                msg.type === 'out-of-character' ? 'ooc-bubble' : 'system-bubble'}`}
              style={{
                alignSelf: msg.type === 'in-character' ? 'flex-end' : 
                  msg.type === 'out-of-character' ? 'flex-start' : 'center',
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: '18px',
                backgroundColor: 
                  msg.type === 'in-character' ? 'rgba(67, 97, 238, 0.2)' : 
                  msg.type === 'out-of-character' ? 'rgba(134, 142, 150, 0.2)' : 
                  'rgba(29, 31, 58, 0.4)',
                borderLeft: msg.type === 'in-character' ? 'none' : 
                  msg.type === 'out-of-character' ? '3px solid rgba(134, 142, 150, 0.5)' : 
                  '3px solid rgba(76, 201, 240, 0.5)',
                borderRight: msg.type === 'in-character' ? '3px solid rgba(247, 37, 133, 0.5)' : 'none',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                position: 'relative'
              }}
            >
              {msg.type === 'out-of-character' && (
                <div className="ooc-tag" style={{ 
                  fontSize: '10px', 
                  fontWeight: 'bold', 
                  color: 'rgba(134, 142, 150, 0.9)',
                  position: 'absolute',
                  top: '-18px',
                  left: '0'
                }}>
                  OUT-OF-CHARACTER
                </div>
              )}
              <div className="bubble-sender" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {msg.sender}
              </div>
              <div className="bubble-content" style={{ wordBreak: 'break-word' }}>
                {msg.content}
              </div>
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
      
      <div className="chat-mode-selector" style={{ margin: '0 16px 8px' }}>
        <ButtonGroup fill={true}>
          <Button
            text="In Character"
            active={messageMode === 'in-character'}
            intent={messageMode === 'in-character' ? Intent.PRIMARY : Intent.NONE}
            onClick={() => setMessageMode('in-character')}
            icon="person"
            style={{ borderRadius: '4px 0 0 4px' }}
          />
          <Button
            text="Out of Character"
            active={messageMode === 'out-of-character'}
            intent={messageMode === 'out-of-character' ? Intent.PRIMARY : Intent.NONE}
            onClick={() => setMessageMode('out-of-character')}
            icon="comment"
            style={{ borderRadius: '0 4px 4px 0' }}
          />
        </ButtonGroup>
      </div>
      
      <div className="chat-input-container" style={{ margin: '0 16px 16px' }}>
        <InputGroup
          placeholder={socketConnected ? 
            messageMode === 'in-character' ? "Speak as your character..." : "Send an out-of-character message..." 
            : "Connecting..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          fill={true}
          large={true}
          intent={messageMode === 'in-character' ? Intent.PRIMARY : Intent.NONE}
          className="chat-input"
          style={{
            backgroundColor: 'rgba(29, 31, 58, 0.3)',
            border: `1px solid ${messageMode === 'in-character' ? 'var(--glass-primary)' : 'var(--glass-border)'}`,
            borderRadius: '20px',
            color: 'var(--glass-text-primary)',
            whiteSpace: 'normal',
            padding: '10px 16px'
          }}
          rightElement={
            <Button
              icon="send-message"
              minimal={true}
              onClick={handleSendMessage}
              disabled={!socketConnected || !inputValue.trim()}
            />
          }
          disabled={!socketConnected}
          autoFocus
        />
      </div>
      
      {/* Connection status indicator */}
      <div 
        className="connection-status" 
        style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px',
          padding: '4px 8px',
          borderRadius: '10px',
          fontSize: '12px',
          backgroundColor: socketConnected ? 'rgba(76, 201, 240, 0.2)' : 'rgba(230, 57, 70, 0.2)',
          color: socketConnected ? 'var(--glass-success)' : 'var(--glass-danger)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          backgroundColor: socketConnected ? 'var(--glass-success)' : 'var(--glass-danger)',
        }} />
        {socketConnected ? 'Connected' : 'Disconnected'}
      </div>
      
      {/* Add CSS for chat bubbles */}
      <style>
        {`
          .chat-bubble {
            transition: all 0.2s ease;
          }
          
          .chat-bubble:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }
          
          .player-bubble {
            background: linear-gradient(to right, rgba(67, 97, 238, 0.1), rgba(67, 97, 238, 0.2));
            border-bottom-right-radius: 4px;
          }
          
          .system-bubble {
            background: linear-gradient(to left, rgba(29, 31, 58, 0.3), rgba(29, 31, 58, 0.5));
            border-bottom-left-radius: 4px;
          }
          
          .ooc-bubble {
            background: linear-gradient(to left, rgba(134, 142, 150, 0.1), rgba(134, 142, 150, 0.2));
            border-bottom-left-radius: 4px;
            font-style: italic;
          }
        `}
      </style>
    </div>
  );
};

export default ChatPanel; 