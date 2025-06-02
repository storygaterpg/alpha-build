// Make sure the test environment is set up correctly
// @ts-ignore - Mock environment
global.import = {
  meta: {
    env: {
      VITE_WEBSOCKET_URL: undefined,
      VITE_WEBSOCKET_PORT: '8000'
    }
  }
};

// Mock the WebSocket class before importing the client
const mockWebSocketCreationCount = { count: 0 };
const mockSuccessPaths = new Set(['/ws']);
const mockLastUrl = { url: '' };

// Mock the WebSocket global object
global.WebSocket = jest.fn().mockImplementation((url: string) => {
  mockWebSocketCreationCount.count++;
  mockLastUrl.url = url;
  
  // Check if this URL contains a path that should succeed
  let shouldSucceed = false;
  try {
    const urlObj = new URL(url);
    shouldSucceed = Array.from(mockSuccessPaths).some(path => urlObj.pathname === path);
  } catch (e) {
    shouldSucceed = false;
  }
  
  // Create mock instance
  const instance = {
    url,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    readyState: 0,
    close: jest.fn(),
    send: jest.fn(),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  };
  
  // Simulate events asynchronously
  setTimeout(() => {
    if (shouldSucceed) {
      instance.readyState = 1;
      if (instance.onopen) instance.onopen({} as any);
    } else {
      if (instance.onerror) instance.onerror(new Error('Connection failed') as any);
    }
  }, 10);
  
  return instance;
});

// Import after setting up the environment
import websocketClient from '../../network/WebSocketClient';

describe('WebSocketClient Connectivity Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocketCreationCount.count = 0;
    mockLastUrl.url = '';
    
    // Reset WebSocketClient state
    websocketClient.disconnect();
  });
  
  it('should test connectivity to multiple paths', async () => {
    // Configure which paths should succeed
    mockSuccessPaths.clear();
    mockSuccessPaths.add('/ws');
    
    // Test connectivity
    const bestPath = await websocketClient.testConnectivity();
    
    // Should have tested multiple paths
    expect(mockWebSocketCreationCount.count).toBeGreaterThan(1);
    
    // Should have found the /ws path
    expect(bestPath).toBe('/ws');
  });
  
  it('should return undefined when no paths succeed', async () => {
    // Configure all paths to fail
    mockSuccessPaths.clear();
    
    // Test connectivity
    const bestPath = await websocketClient.testConnectivity();
    
    // Should have tested multiple paths
    expect(mockWebSocketCreationCount.count).toBeGreaterThan(1);
    
    // Should not have found a working path
    expect(bestPath).toBeUndefined();
  });
  
  it('should connect using the best path', async () => {
    // Configure which paths should succeed
    mockSuccessPaths.clear();
    mockSuccessPaths.add('/ws');
    
    // Test connectivity and then connect
    const bestPath = await websocketClient.testConnectivity();
    const success = await websocketClient.connect(undefined, bestPath);
    
    // Connection should succeed
    expect(success).toBe(true);
    
    // Should use the best path
    expect(mockLastUrl.url.endsWith('/ws')).toBe(true);
  });
}); 