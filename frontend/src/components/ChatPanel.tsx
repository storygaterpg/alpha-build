import React, { useState, useEffect, useRef } from 'react';
import { InputGroup, Button, Callout, Intent, ButtonGroup } from '@blueprintjs/core';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { sendInCharacterChat, sendOutOfCharacterChat, clearUnread, userTyping } from '../store/slices/chatSlice';
import { AppToaster } from '../App';
import DebugToggle from './DebugToggle';
import TypingIndicator from './TypingIndicator';
import ConnectionStatus from './ConnectionStatus';

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
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Track last sent message to prevent duplicates
  const [lastSentMessage, setLastSentMessage] = useState<{
    content: string;
    timestamp: number;
    mode: string;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Create a map of message IDs to prevent duplicates
  const messageIdMap = useRef<Record<string, boolean>>({});
  
  // Filter out duplicate messages before combining
  const uniqueMessages = React.useMemo(() => {
    // Reset the ID map
    messageIdMap.current = {};
    
    // First add all Redux messages to the map and unique list
    const uniqueList = messages.filter(msg => {
      if (!msg.id || messageIdMap.current[msg.id]) return false;
      messageIdMap.current[msg.id] = true;
      return true;
    });
    
    // Then add any local messages that aren't duplicates
    localMessages.forEach(msg => {
      if (msg.id && !messageIdMap.current[msg.id]) {
        messageIdMap.current[msg.id] = true;
        uniqueList.push(msg);
      }
    });
    
    // Sort by timestamp
    uniqueList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    return uniqueList;
  }, [messages, localMessages]);
  
  // Clear unread messages when component mounts
  useEffect(() => {
    dispatch(clearUnread());
  }, [dispatch]);
  
  // Add debugging to check messages from Redux
  useEffect(() => {
    // Only log in development mode with verbose logging enabled
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
      console.log('ChatPanel: messages from Redux:', messages);
      console.log('ChatPanel: local messages:', localMessages);
      console.log('ChatPanel: unique messages:', uniqueMessages);
    
      // Check for invalid messages and log them
      const invalidMessages = uniqueMessages.filter(msg => !msg || !msg.id || !msg.content);
      if (invalidMessages.length > 0) {
        console.warn('Found invalid messages:', invalidMessages);
      }
    }
    
    // Force a re-render when messages change
    if (messagesEndRef.current && uniqueMessages.length > 0) {
      try {
        // In test environment, scrollIntoView might not be available
        if (typeof messagesEndRef.current.scrollIntoView === 'function') {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (error) {
        console.error('Error scrolling to bottom:', error);
      }
    }
  }, [messages, localMessages, uniqueMessages]);
  
  // Debug render - log when component renders
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
      console.log('ChatPanel rendered, connected:', socketConnected);
      console.log('Chat state:', {
        messageCount: messages.length,
        playerName,
        socketConnected
      });
    }
  }, []);
  
  // Direct WebSocket fallback disabled: using Redux WebSocket client exclusively
  
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
    
    // Check if this is a duplicate of the last sent message
    if (lastSentMessage && 
        lastSentMessage.content === message &&
        lastSentMessage.mode === messageMode && 
        Date.now() - lastSentMessage.timestamp < 5000) {
      setValidationError("Duplicate message. Please wait before sending the same message again.");
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
      if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
        console.log("Sending chat message:", { 
          content: inputValue, 
          messageMode,
          characterId: player?.id
        });
      }
      
      // Record this as the last sent message
      setLastSentMessage({
        content: inputValue,
        timestamp: Date.now(),
        mode: messageMode
      });
      
      // Send message based on mode
      if (messageMode === 'in-character') {
        dispatch(sendInCharacterChat(inputValue, player?.id));
      } else {
        dispatch(sendOutOfCharacterChat(inputValue));
      }
      
      // Clear input
      setInputValue('');
      
      // Clear typing indicator when message is sent
      if (typingTimer) {
        clearTimeout(typingTimer);
        setTypingTimer(null);
      }
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
  
  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Send typing indicator if user is typing and has a player ID
    if (newValue && player?.id && socketConnected) {
      // Clear previous timer if it exists
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
      
      // Dispatch typing action
      dispatch(userTyping({ userId: player.id, username: playerName }));
      
      // Set timer to clear typing status after 3 seconds
      const timer = setTimeout(() => {
        // No action needed, the backend will clean up typing indicators
        setTypingTimer(null);
      }, 3000);
      
      setTypingTimer(timer as unknown as NodeJS.Timeout);
    }
  };
  
  // Enhanced key down event handler to ensure spaces work correctly
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key for sending messages
    if (e.key === 'Enter') {
      handleKeyPress(e);
    } 
    
    // Special handling for space - ensure it gets added to the input value
    if (e.key === ' ') {
      e.preventDefault(); // Prevent default space behavior which might be causing issues
      
      // Directly manipulate the input value to include a space
      const newValue = inputValue + ' ';
      // Don't log normal space key presses
      setInputValue(newValue);
    }
  };
  
  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Only send message when Enter is pressed, not for other keys like Space
    if (e.key === 'Enter') {
      handleSendMessage();
      // Prevent default to avoid adding newlines in single-line input
      e.preventDefault();
    }
  };

  // Add effect to ensure input element can handle spaces properly and force focus
  useEffect(() => {
    // Focus the input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
      
      // Add a direct event listener to handle spaces via DOM
      const handleRawKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ') {
          // Don't log every space key press
          e.preventDefault();
          
          // Set a small timeout to ensure the React state gets the space
          setTimeout(() => {
            setInputValue(prev => prev + ' ');
          }, 5);
        }
      };
      
      // Add direct DOM event listener
      inputRef.current.addEventListener('keydown', handleRawKeyDown);
      
      // Clean up
      return () => {
        if (inputRef.current) {
          inputRef.current.removeEventListener('keydown', handleRawKeyDown);
        }
      };
    }
  }, []);

  // Second effect to maintain focus when input value changes (helpful for spaces)
  useEffect(() => {
    if (inputRef.current) {
      const cursorPosition = inputValue.length;
      
      // Set cursor at the end after value changes
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          try {
            // Try to set selection range
            if ('setSelectionRange' in inputRef.current) {
              inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
            }
          } catch (e) {
            console.log('Could not set cursor position:', e);
          }
        }
      }, 0);
    }
  }, [inputValue]);

  return (
    <div className="chat-panel" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      zIndex: 2,
      pointerEvents: 'auto'
    }}>
      {/* Add debug toggle in dev mode */}
      <DebugToggle />
      
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
        {uniqueMessages.length === 0 ? (
          <div className="chat-bubble system-bubble">
            <strong>System:</strong> Welcome to StoryGate RPG, {playerName || 'Adventurer'}!
          </div>
        ) : (
          uniqueMessages.map((msg, index) => {
            // Add defensive check for required props
            if (!msg || !msg.id) {
              console.error('Invalid message object:', msg);
              return (
                <div key={`error-${index}-${Date.now()}`} className="chat-bubble system-bubble" style={{ color: 'red' }}>
                  <strong>Error:</strong> Invalid message format
                </div>
              );
            }
            
            const msgType = msg.type || 'system';
            
            // Generate a truly unique key
            const uniqueKey = msg.id && typeof msg.id === 'string' 
              ? msg.id
              : `msg-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            return (
              <div 
                key={uniqueKey} 
                className={`chat-bubble ${msgType === 'in-character' ? 'player-bubble' : 
                  msgType === 'out-of-character' ? 'ooc-bubble' : 'system-bubble'}`}
                style={{
                  alignSelf: msgType === 'in-character' ? 'flex-end' : 
                    msgType === 'out-of-character' ? 'flex-start' : 'center',
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: '18px',
                  backgroundColor: 
                    msgType === 'in-character' ? 'rgba(67, 97, 238, 0.2)' : 
                    msgType === 'out-of-character' ? 'rgba(134, 142, 150, 0.2)' : 
                    'rgba(29, 31, 58, 0.4)',
                  borderLeft: msgType === 'in-character' ? 'none' : 
                    msgType === 'out-of-character' ? '3px solid rgba(134, 142, 150, 0.5)' : 
                    '3px solid rgba(76, 201, 240, 0.5)',
                  borderRight: msgType === 'in-character' ? '3px solid rgba(247, 37, 133, 0.5)' : 'none',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  margin: '4px 0'
                }}
              >
                {msgType === 'out-of-character' && (
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
                  {msg.sender || 'Unknown'}
                </div>
                <div className="bubble-content" style={{ wordBreak: 'break-word' }}>
                  {/* Handle both content and text field names (for backward compatibility) */}
                  {msg.content || (msg as any).text || ''}
                </div>
                {msg.timestamp && (
                  <div className="bubble-timestamp" style={{ 
                    fontSize: '10px', 
                    textAlign: 'right', 
                    marginTop: '4px',
                    opacity: 0.7 
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Typing indicator */}
      <TypingIndicator className="typing-indicator-container" style={{ margin: '0 16px', minHeight: '20px' }} />
      
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
      
      <div className="chat-input-container" style={{ 
        margin: '0 16px 16px',
        position: 'relative',
        zIndex: 5,
        pointerEvents: 'auto'
      }}>
        {/* Hidden native input as fallback */}
        {inputValue === '' && (
          <input
            type="text"
            ref={(el) => {
              // Store in both refs
              if (el) {
                // @ts-ignore - we know inputRef.current will be an HTMLInputElement
                inputRef.current = el;
              }
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1px',
              height: '1px',
              opacity: 0,
              pointerEvents: 'none'
            }}
            onChange={(e) => {
              // If the InputGroup is failing, capture input here
              const newValue = e.target.value;
              if (newValue && newValue !== inputValue) {
                console.log('Fallback input received:', newValue);
                setInputValue(newValue);
              }
            }}
          />
        )}
        
        <InputGroup
          placeholder={socketConnected ? 
            messageMode === 'in-character' ? "Speak as your character..." : "Send an out-of-character message..." 
            : "Connecting..."}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          spellCheck={true}
          fill={true}
          large={true}
          intent={messageMode === 'in-character' ? Intent.PRIMARY : Intent.NONE}
          className="chat-input"
          style={{
            backgroundColor: 'rgba(29, 31, 58, 0.3)',
            border: `1px solid ${messageMode === 'in-character' ? 'var(--glass-primary)' : 'var(--glass-border)'}`,
            borderRadius: '20px',
            color: 'var(--glass-text-primary)',
            whiteSpace: 'pre-wrap',
            padding: '10px 16px',
            cursor: 'text',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 1
          }}
          rightElement={
            <div style={{ 
              position: 'relative', 
              zIndex: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              pointerEvents: 'auto',
              height: '100%' 
            }}>
              <Button
                icon="send-message"
                minimal={true}
                onClick={handleSendMessage}
                disabled={!socketConnected || !inputValue.trim()}
                style={{
                  zIndex: 10,
                  pointerEvents: 'auto',
                  position: 'relative',
                  padding: '6px 10px',
                  margin: '4px',
                  backgroundColor: messageMode === 'in-character' ? 'rgba(67, 97, 238, 0.3)' : 'rgba(134, 142, 150, 0.3)',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  transform: 'scale(1.05)',
                  cursor: socketConnected && inputValue.trim() ? 'pointer' : 'not-allowed'
                }}
                className="send-button"
              />
            </div>
          }
          disabled={!socketConnected}
          autoFocus
        />
      </div>
      
      {/* Connection status indicator */}
      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
        <ConnectionStatus compact={true} />
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
          
          /* Override Blueprint's space key handling */
          .chat-input input {
            white-space: pre-wrap !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          /* Reset any default Blueprint event stopPropagation for space key */
          .bp4-input:focus {
            box-shadow: 0 0 0 1px var(--glass-primary), 0 0 0 3px rgba(67, 97, 238, 0.3);
          }

          /* Force input to respect spaces */
          .chat-input input::placeholder {
            white-space: pre-wrap;
          }
          
          /* !important overrides for ensuring Blueprint doesn't hijack space key */
          .chat-input {
            pointer-events: auto !important;
          }
          
          .chat-input input {
            pointer-events: auto !important;
          }
          
          /* Hide any potential hidden elements that might capture space */
          .bp4-overlay-backdrop, 
          .bp4-overlay-container {
            pointer-events: none !important;
          }

          /* Ensure textarea gets proper styling when active */
          textarea:focus {
            outline: none;
            box-shadow: 0 0 0 1px var(--glass-primary), 0 0 0 3px rgba(67, 97, 238, 0.3);
          }
          
          /* Ensure textarea respects spaces */
          textarea {
            white-space: pre-wrap !important;
          }
          
          /* Typing indicator container */
          .typing-indicator-container {
            margin-bottom: 4px;
          }
        `}
      </style>
    </div>
  );
};

export default ChatPanel; 