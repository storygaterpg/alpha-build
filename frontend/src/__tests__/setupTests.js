// Import @testing-library/jest-dom extensions to extend Jest with custom DOM matchers
import '@testing-library/jest-dom';

// Mock the import.meta.env for Vite environment variables
window.global = window;
global.import = {};
global.import.meta = {
  env: {
    VITE_WEBSOCKET_URL: 'ws://localhost:8000',
    VITE_WEBSOCKET_PORT: '8000',
    VITE_API_URL: 'http://localhost:8000',
    MODE: 'test'
  }
};

// Mock for toasts
jest.mock('../App', () => ({
  AppToaster: {
    show: jest.fn(),
    dismiss: jest.fn(),
    clear: jest.fn()
  }
}));

// Mock for WebSocket API
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
  }
  
  close() {}
  send() {}
}

global.WebSocket = MockWebSocket;

// Extend expect with custom matchers
expect.extend({
  toBeConnected(received) {
    const pass = received && received.isConnected && received.isConnected();
    if (pass) {
      return {
        message: () => `expected ${received} not to be connected`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be connected`,
        pass: false,
      };
    }
  },
});

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    // Filter out React DOM attribute warnings
    /Warning.*ReactDOM/.test(args[0]) ||
    // Filter out unexpected prop warnings
    /Warning.*Received.*unexpected prop/.test(args[0]) ||
    // Filter out unknown prop warnings
    /Warning.*Unknown prop/.test(args[0]) ||
    // Filter out websocket connection errors
    /WebSocket connection/.test(args[0]) ||
    // Filter out act(...) warnings from Blueprint
    args[0]?.toString().includes("An update to Blueprint") ||
    args[0]?.toString().includes("inside a test was not wrapped in act")
  ) {
    return;
  }
  originalConsoleError(...args);
}; 