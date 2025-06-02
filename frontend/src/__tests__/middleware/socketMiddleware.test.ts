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
import { setOnline, setOffline } from '../../store/slices/connectionSlice';
import { showError } from '../../store/slices/notificationSlice';
import { configureStore } from '@reduxjs/toolkit';
import { CONNECTION_OFFLINE } from '../../store/actionTypes';

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
  
  beforeEach(() => {
    jest.clearAllMocks();
    
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
}); 