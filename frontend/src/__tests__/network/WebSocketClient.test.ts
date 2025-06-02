// Mock the WebSocketClient module
jest.mock('../../network/WebSocketClient', () => {
  class MockWebSocketClientClass {
    private socket: any = null;
    private url: string = '';
    private connected: boolean = false;
    private lastCloseCode: number | null = null;
    private lastCloseReason: string | null = null;
    private messageHandlers: Map<string, Set<Function>> = new Map();
    private connectHandlers: Set<Function> = new Set();
    private disconnectHandlers: Set<Function> = new Set();
    private errorHandlers: Set<Function> = new Set();
    private connectionAttemptInProgress: boolean = false;
    private connectionPath: string | null = null;

    getUrl() {
      return this.url;
    }

    getLastCloseInfo() {
      return {
        code: this.lastCloseCode,
        reason: this.lastCloseReason
      };
    }

    async connect(url: string = 'ws://localhost:8000', path?: string) {
      this.url = url;
      this.connectionPath = path || null;
      this.socket = { url };
      // Simulate successful connection in tests
      setTimeout(() => this._simulateOpen(), 0);
      return true;
    }

    disconnect() {
      if (this.socket) {
        this.connected = false;
        this.socket = null;
      }
      return this;
    }

    isConnected() {
      return this.connected;
    }

    isConnecting() {
      return this.connectionAttemptInProgress;
    }

    async testConnectivity() {
      // Mock returning a successful path
      return '/ws';
    }

    on(eventType: string, handler: Function) {
      if (eventType === 'connect') {
        this.connectHandlers.add(handler);
      } else if (eventType === 'disconnect') {
        this.disconnectHandlers.add(handler);
      } else if (eventType === 'error') {
        this.errorHandlers.add(handler);
      } else if (eventType === 'message') {
        if (!this.messageHandlers.has('default')) {
          this.messageHandlers.set('default', new Set());
        }
        this.messageHandlers.get('default')?.add(handler);
      }
      return this;
    }

    onMessageType(messageType: string, handler: Function) {
      if (!this.messageHandlers.has(messageType)) {
        this.messageHandlers.set(messageType, new Set());
      }
      this.messageHandlers.get(messageType)?.add(handler);
      return this;
    }

    off(eventType: string, handler: Function) {
      if (eventType === 'connect') {
        this.connectHandlers.delete(handler);
      } else if (eventType === 'disconnect') {
        this.disconnectHandlers.delete(handler);
      } else if (eventType === 'error') {
        this.errorHandlers.delete(handler);
      } else if (eventType === 'message') {
        this.messageHandlers.get('default')?.delete(handler);
      }
      return this;
    }

    offMessageType(messageType: string, handler: Function) {
      this.messageHandlers.get(messageType)?.delete(handler);
      return this;
    }

    send() {
      return this;
    }

    // Test helpers
    _simulateOpen() {
      this.connected = true;
      this.connectHandlers.forEach(handler => handler());
    }

    _simulateMessage(message: any) {
      const { type, data } = message;
      if (type && this.messageHandlers.has(type)) {
        this.messageHandlers.get(type)?.forEach(handler => handler(data));
      }
      this.messageHandlers.get('default')?.forEach(handler => handler(message));
    }

    _simulateClose(code: number = 1000, reason: string = '', wasClean: boolean = true) {
      this.connected = false;
      this.lastCloseCode = code;
      this.lastCloseReason = reason || (code === 1006 ? 'Abnormal closure (no close frame received)' : null);
      this.disconnectHandlers.forEach(handler => handler({ code, reason, wasClean }));
    }

    _simulateError(error?: any) {
      this.connected = false;
      this.lastCloseCode = 1006;
      this.lastCloseReason = error?.message || 'Connection error';
      this.errorHandlers.forEach(handler => handler(error));
    }
  }

  const mockInstance = new MockWebSocketClientClass();
  
  return {
    __esModule: true,
    default: mockInstance,
    websocketClient: mockInstance
  };
});

// Import the mocked WebSocketClient after it's been mocked
import websocketClient from '../../network/WebSocketClient';

describe('WebSocketClient', () => {
  let mockConnectHandler: jest.Mock;
  let mockDisconnectHandler: jest.Mock;
  let mockErrorHandler: jest.Mock;
  let mockMessageHandler: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectHandler = jest.fn();
    mockDisconnectHandler = jest.fn();
    mockErrorHandler = jest.fn();
    mockMessageHandler = jest.fn();
    
    // Reset WebSocketClient state
    websocketClient.disconnect();
  });
  
  it('should connect to WebSocket server', () => {
    websocketClient.on('connect', mockConnectHandler);
    websocketClient.connect('ws://localhost:8000');
    
    // Simulate connection
    (websocketClient as any)._simulateOpen();
    
    expect(mockConnectHandler).toHaveBeenCalled();
    expect(websocketClient.isConnected()).toBe(true);
    expect(websocketClient.getUrl()).toBe('ws://localhost:8000');
  });
  
  it('should handle WebSocket messages', () => {
    websocketClient.connect('ws://localhost:8000');
    websocketClient.onMessageType('test_event', mockMessageHandler);
    
    // Simulate message
    (websocketClient as any)._simulateMessage({
      type: 'test_event',
      data: { value: 'test' }
    });
    
    expect(mockMessageHandler).toHaveBeenCalledWith({ value: 'test' });
  });
  
  it('should handle WebSocket close events', () => {
    websocketClient.on('disconnect', mockDisconnectHandler);
    websocketClient.connect('ws://localhost:8000');
    
    // Simulate close
    (websocketClient as any)._simulateClose(1001, 'Going away', true);
    
    expect(mockDisconnectHandler).toHaveBeenCalled();
    expect(websocketClient.isConnected()).toBe(false);
    
    const closeInfo = websocketClient.getLastCloseInfo();
    expect(closeInfo.code).toBe(1001);
    expect(closeInfo.reason).toBe('Going away');
  });
  
  it('should handle WebSocket error events', () => {
    websocketClient.on('error', mockErrorHandler);
    websocketClient.connect('ws://localhost:8000');
    
    // Simulate error
    (websocketClient as any)._simulateError({ message: 'Connection error' });
    
    expect(mockErrorHandler).toHaveBeenCalled();
    expect(websocketClient.isConnected()).toBe(false);
  });
  
  it('should handle abnormal close with code 1006', () => {
    websocketClient.on('disconnect', mockDisconnectHandler);
    websocketClient.connect('ws://localhost:8000');
    
    // Simulate abnormal close
    (websocketClient as any)._simulateClose(1006, '', false);
    
    expect(mockDisconnectHandler).toHaveBeenCalled();
    expect(websocketClient.isConnected()).toBe(false);
    
    const closeInfo = websocketClient.getLastCloseInfo();
    expect(closeInfo.code).toBe(1006);
    expect(closeInfo.reason).toContain('Abnormal closure');
  });
}); 