import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, FormGroup, InputGroup, TextArea, H3, Code } from '@blueprintjs/core';
import { useWebSocket } from '../network';

/**
 * WebSocketDemo component
 * 
 * Demonstrates how to use the WebSocket client in a React component
 */
const WebSocketDemo: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [eventType, setEventType] = useState('chat');
  
  // Use the WebSocket hook with auto-connect enabled
  const { 
    isConnected, 
    connectionState, 
    connect, 
    disconnect, 
    send, 
    on,
    CONNECTING,
    OPEN,
    CLOSING,
    CLOSED
  } = useWebSocket({
    // Event handlers
    onConnect: () => {
      addMessage('System', 'Connected to server');
    },
    onDisconnect: (data) => {
      addMessage('System', `Disconnected: ${data?.reason || 'Unknown reason'}`);
    },
    onError: () => {
      addMessage('System', 'Connection error');
    }
  });

  // Helper function to add a message to the list
  const addMessage = (sender: string, content: string) => {
    setMessages(prev => [...prev, `[${sender}] ${content}`]);
  };

  // Subscribe to chat messages
  useEffect(() => {
    // This will be cleaned up automatically when the component unmounts
    const cleanup = on('chat', (data) => {
      if (data && data.sender && data.content) {
        addMessage(data.sender, data.content);
      }
    });
    
    return cleanup;
  }, [on]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    send(eventType, {
      sender: 'Me',
      content: messageInput
    });
    
    // Add the message to our local list
    addMessage('Me', messageInput);
    
    // Clear the input
    setMessageInput('');
  };

  // Get connection status tag
  const getConnectionStatusTag = () => {
    switch (connectionState) {
      case CONNECTING:
        return <Tag intent="warning">Connecting...</Tag>;
      case OPEN:
        return <Tag intent="success">Connected</Tag>;
      case CLOSING:
        return <Tag intent="warning">Closing...</Tag>;
      case CLOSED:
        return <Tag intent="danger">Disconnected</Tag>;
      default:
        return <Tag intent="none">Unknown</Tag>;
    }
  };

  return (
    <Card elevation={2}>
      <H3>WebSocket Demo</H3>
      
      <div style={{ marginBottom: '1rem' }}>
        <span>Status: {getConnectionStatusTag()}</span>
        <div style={{ marginTop: '0.5rem' }}>
          <Button 
            intent="primary" 
            onClick={connect} 
            disabled={isConnected} 
            style={{ marginRight: '0.5rem' }}
          >
            Connect
          </Button>
          <Button 
            intent="danger" 
            onClick={disconnect} 
            disabled={!isConnected}
          >
            Disconnect
          </Button>
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <FormGroup label="Event Type">
          <InputGroup
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            placeholder="Event type"
          />
        </FormGroup>
        
        <FormGroup label="Message">
          <TextArea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Enter your message"
            fill
            style={{ minHeight: '80px' }}
          />
        </FormGroup>
        
        <Button
          intent="primary"
          onClick={handleSendMessage}
          disabled={!isConnected || !messageInput.trim()}
        >
          Send Message
        </Button>
      </div>
      
      <div>
        <h4>Messages</h4>
        <div
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: '3px',
            padding: '0.5rem',
            backgroundColor: '#f5f5f5',
          }}
        >
          {messages.length === 0 ? (
            <p>No messages yet</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: '0.25rem' }}>
                <Code>{msg}</Code>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};

export default WebSocketDemo; 