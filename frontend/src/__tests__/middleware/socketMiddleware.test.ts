import { createSocketMiddleware } from '../../store/middleware/socketMiddleware';
import websocketClient from '../../network/WebSocketClient';
import { 
  socketConnect, 
  socketConnected, 
  socketDisconnect,
  socketDisconnected,
  socketError,
  messageReceived
} from '../../store/slices/socketSlice';
import { messageReceived as chatMessageReceived } from '../../store/slices/chatSlice';
import { setOnline, setOffline } from '../../store/slices/connectionSlice';
import { showError } from '../../store/slices/notificationSlice';
import { configureStore } from '@reduxjs/toolkit';
import { CHAT_RECEIVE, CONNECTION_OFFLINE } from '../../store/actionTypes';

// Mock the WebSocketClient module
jest.mock('../../network/WebSocketClient', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn(),
    isConnected: jest.fn(),
    isConnecting: jest.fn(),
    getUrl: jest.fn(),
    getLastCloseInfo: jest.fn(),
    testConnectivity: jest.fn().mockResolvedValue('/ws'),
    on: jest.fn(),
    off: jest.fn(),
    onMessageType: jest.fn(),
    offMessageType: jest.fn(),
    send: jest.fn()
  }
}));

// Mock chatSlice's messageReceived action creator
const mockChatMessageReceived = jest.fn().mockImplementation((message) => ({
  type: 'chat/messageReceived',
  payload: message
}));

jest.mock('../../store/slices/chatSlice', () => ({
  messageReceived: (message: any) => mockChatMessageReceived(message)
}));

describe('socketMiddleware', () => {
  let store: any;
  let middleware: ReturnType<typeof createSocketMiddleware>;
  let next: jest.Mock;
  let invoke: (action: any) => any;
  
  // Helper to simulate WebSocket events
  const simulateWebSocketEvent = (eventType: string, data?: any) => {
    // Find the event handler registered with the client
    const eventHandler = (websocketClient.on as jest.Mock).mock.calls.find(
      call => call[0] === eventType
    );
    
    if (eventHandler && eventHandler[1]) {
      eventHandler[1](data);
    }
  };
  
  // Helper to simulate message type events
  const simulateMessageTypeEvent = (messageType: string, data?: any) => {
    // Find the event handler registered for this message type
    const eventHandler = (websocketClient.onMessageType as jest.Mock).mock.calls.find(
      call => call[0] === messageType
    );
    
    if (eventHandler && eventHandler[1]) {
      eventHandler[1](data);
    }
  };
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Make sure mockChatMessageReceived implementation is restored
    mockChatMessageReceived.mockImplementation((message) => ({
      type: 'chat/messageReceived',
      payload: message
    }));
    
    // Mock store with dispatch and getState
    store = {
      dispatch: jest.fn(),
      getState: jest.fn().mockReturnValue({})
    };
    
    // Create the middleware with a simple message handler
    middleware = createSocketMiddleware({
      test_event: jest.fn()
    });
    
    // Mock the next middleware or reducer
    next = jest.fn();
    
    // Create function to invoke the middleware
    invoke = (action) => middleware(store)(next)(action);
    
    // Return connected state by default
    (websocketClient.isConnected as jest.Mock).mockReturnValue(true);
    (websocketClient.isConnecting as jest.Mock).mockReturnValue(false);
    (websocketClient.getUrl as jest.Mock).mockReturnValue('ws://localhost:8000');
    (websocketClient.getLastCloseInfo as jest.Mock).mockReturnValue({ code: null, reason: null });
  });
  
  it('should pass non-socket actions through to the next middleware', () => {
    const action = { type: 'TEST_ACTION' };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
  });
  
  it('should handle socketConnect action', async () => {
    // Mock the Promise resolution
    (websocketClient.connect as jest.Mock).mockResolvedValue(true);
    
    await invoke(socketConnect({}));
    expect(websocketClient.connect).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
  
  it('should handle connection failure during socketConnect', async () => {
    // Mock the Promise resolution to indicate failure
    (websocketClient.connect as jest.Mock).mockResolvedValue(false);
    
    await invoke(socketConnect({}));
    expect(websocketClient.connect).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
  
  it('should handle socketDisconnect action', () => {
    invoke(socketDisconnect());
    expect(websocketClient.disconnect).toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith(setOffline('User disconnected'));
    expect(next).toHaveBeenCalled();
  });
  
  it('should handle connection established event', () => {
    // Register event handlers
    middleware(store);
    
    // Simulate a connection event
    simulateWebSocketEvent('connect');
    
    expect(store.dispatch).toHaveBeenCalledWith(socketConnected());
    expect(store.dispatch).toHaveBeenCalledWith(setOnline());
  });
  
  it('should handle connection closed event - clean close', () => {
    middleware(store);
    
    // Simulate a clean close event
    simulateWebSocketEvent('disconnect', { 
      code: 1000, 
      reason: 'Normal closure', 
      wasClean: true 
    });
    
    expect(store.dispatch).toHaveBeenCalledWith(socketDisconnected());
    expect(store.dispatch).toHaveBeenCalledWith(setOffline('Normal closure'));
    expect(store.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: CONNECTION_OFFLINE })
    );
  });
  
  it('should handle connection closed event - abnormal close', () => {
    middleware(store);
    
    // Mock getLastCloseInfo to return close code and reason
    (websocketClient.getLastCloseInfo as jest.Mock).mockReturnValue({ 
      code: 1006, 
      reason: 'Abnormal closure' 
    });
    
    // Simulate an abnormal close event
    simulateWebSocketEvent('disconnect', { 
      code: 1006, 
      reason: 'Abnormal closure', 
      wasClean: false 
    });
    
    expect(store.dispatch).toHaveBeenCalledWith(socketDisconnected());
    expect(store.dispatch).toHaveBeenCalledWith(setOffline('Abnormal closure'));
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ 
        type: CONNECTION_OFFLINE,
        payload: expect.objectContaining({
          reason: 'Abnormal closure',
          code: 1006
        })
      })
    );
  });
  
  it('should handle connection error event', () => {
    middleware(store);
    
    // Simulate an error event
    simulateWebSocketEvent('error', { message: 'Connection failed' });
    
    expect(store.dispatch).toHaveBeenCalledWith(
      socketError(expect.objectContaining({ 
        message: 'Connection failed' 
      }))
    );
    expect(store.dispatch).toHaveBeenCalledWith(setOffline('Connection failed'));
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ 
        type: CONNECTION_OFFLINE 
      })
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      showError(
        'Connection Error',
        expect.stringContaining('Connection failed'),
        expect.any(Number)
      )
    );
  });
  
  it('should handle sending messages to the server', () => {
    // Test a message sending action
    invoke({ type: 'socket/send/test_message', payload: { data: 'test' } });
    
    expect(websocketClient.send).toHaveBeenCalledWith(
      'test_message',
      { data: 'test' }
    );
    expect(next).toHaveBeenCalled();
  });
  
  // New tests for chat message handling and deduplication
  
  it('should process incoming chat messages', () => {
    // Setup the middleware
    middleware(store);
    
    // Create a chat message
    const chatMessage = {
      id: 'msg-123',
      sender: 'TestUser',
      content: 'Hello world',
      timestamp: Date.now(),
      type: 'in-character'
    };
    
    // Simulate receiving a chat message
    simulateMessageTypeEvent('chat_message', chatMessage);
    
    // Should have dispatched the messageReceived action
    expect(mockChatMessageReceived).toHaveBeenCalledWith(expect.objectContaining({
      id: chatMessage.id,
      sender: chatMessage.sender,
      content: chatMessage.content
    }));
    
    expect(store.dispatch).toHaveBeenCalled();
  });
  
  it('should assign an ID to messages without one', () => {
    // Setup the middleware
    middleware(store);
    
    // Create a chat message without an ID
    const chatMessage = {
      sender: 'TestUser',
      content: 'Message without ID',
      timestamp: Date.now(),
      type: 'in-character'
    };
    
    // Simulate receiving a chat message
    simulateMessageTypeEvent('chat_message', chatMessage);
    
    // Should have assigned an ID
    expect(mockChatMessageReceived).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.any(String),
      sender: chatMessage.sender,
      content: chatMessage.content
    }));
    
    // ID should be in the expected format
    const calledWith = mockChatMessageReceived.mock.calls[0][0];
    expect(calledWith.id).toMatch(/^msg_\d+_[a-z0-9]+_[a-z0-9]+$/);
  });
  
  it('should deduplicate identical messages', () => {
    // Setup the middleware
    middleware(store);
    
    // Create a chat message
    const chatMessage = {
      id: 'duplicate-id',
      sender: 'TestUser',
      content: 'Duplicate message',
      timestamp: Date.now(),
      type: 'in-character'
    };
    
    // Simulate receiving the same message twice
    simulateMessageTypeEvent('chat_message', chatMessage);
    simulateMessageTypeEvent('chat_message', chatMessage);
    
    // Should only dispatch once
    expect(mockChatMessageReceived).toHaveBeenCalledTimes(1);
  });
  
  it('should deduplicate messages with similar content', () => {
    // Setup the middleware
    middleware(store);
    
    // Create a timestamp
    const timestamp = Date.now();
    
    // Create two messages with different IDs but same content and close timestamps
    const message1 = {
      id: 'msg-1',
      sender: 'TestUser',
      content: 'Similar content message',
      timestamp: timestamp,
      type: 'in-character'
    };
    
    const message2 = {
      id: 'msg-2', // Different ID
      sender: 'TestUser',
      content: 'Similar content message', // Same content
      timestamp: timestamp + 1000, // Close in time
      type: 'in-character'
    };
    
    // Simulate receiving both messages
    simulateMessageTypeEvent('chat_message', message1);
    simulateMessageTypeEvent('chat_message', message2);
    
    // Should only dispatch once
    expect(mockChatMessageReceived).toHaveBeenCalledTimes(1);
  });
  
  it('should not deduplicate messages with different content', () => {
    // Setup the middleware
    middleware(store);
    
    // Create a timestamp
    const timestamp = Date.now();
    
    // Create two messages with different content
    const message1 = {
      id: 'msg-1',
      sender: 'TestUser',
      content: 'First message',
      timestamp: timestamp,
      type: 'in-character'
    };
    
    const message2 = {
      id: 'msg-2',
      sender: 'TestUser',
      content: 'Second message', // Different content
      timestamp: timestamp + 1000,
      type: 'in-character'
    };
    
    // Simulate receiving both messages
    simulateMessageTypeEvent('chat_message', message1);
    simulateMessageTypeEvent('chat_message', message2);
    
    // Should dispatch twice
    expect(mockChatMessageReceived).toHaveBeenCalledTimes(2);
  });
  
  it('should not deduplicate messages from different senders', () => {
    // Setup the middleware
    middleware(store);
    
    // Create a timestamp
    const timestamp = Date.now();
    
    // Create two messages with same content but different senders
    const message1 = {
      id: 'msg-1',
      sender: 'User1',
      content: 'Same content', 
      timestamp: timestamp,
      type: 'in-character'
    };
    
    const message2 = {
      id: 'msg-2',
      sender: 'User2', // Different sender
      content: 'Same content',
      timestamp: timestamp + 1000,
      type: 'in-character'
    };
    
    // Simulate receiving both messages
    simulateMessageTypeEvent('chat_message', message1);
    simulateMessageTypeEvent('chat_message', message2);
    
    // Should dispatch twice
    expect(mockChatMessageReceived).toHaveBeenCalledTimes(2);
  });
}); 