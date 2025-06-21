import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ChatPanel from '../../components/ChatPanel';
import { sendInCharacterChat, sendOutOfCharacterChat } from '../../store/slices/chatSlice';

// Mock the AppToaster from App.tsx
jest.mock('../../App', () => ({
  AppToaster: {
    show: jest.fn()
  }
}));

// Mock the localStorage API
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Create a mock store
const mockStore = configureStore([]);

describe('ChatPanel Component', () => {
  let store: any;
  
  beforeEach(() => {
    // Set up store with initial state for each test
    store = mockStore({
      game: {
        playerName: 'TestPlayer',
        player: { id: 'player-123' }
      },
      chat: {
        messages: [
          { 
            id: 'msg-1', 
            sender: 'System', 
            content: 'Welcome to the game', 
            timestamp: Date.now() - 1000,
            type: 'system'
          },
          { 
            id: 'msg-2', 
            sender: 'TestPlayer', 
            content: 'Hello world', 
            timestamp: Date.now(),
            type: 'in-character'
          }
        ],
        isTyping: {}
      },
      socket: {
        connected: true
      },
      connection: {
        reconnecting: false,
        disconnectReason: null
      }
    });
    
    // Mock dispatch
    store.dispatch = jest.fn();
    
    // Reset localStorage mock
    localStorageMock.clear();
  });
  
  test('renders chat panel with messages', () => {
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Check if messages are displayed
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the game')).toBeInTheDocument();
    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
  
  test('displays welcome message when no messages exist', () => {
    // Create a store with no messages
    const emptyStore = mockStore({
      game: {
        playerName: 'TestPlayer',
        player: { id: 'player-123' }
      },
      chat: {
        messages: [],
        isTyping: {}
      },
      socket: {
        connected: true
      },
      connection: {
        reconnecting: false,
        disconnectReason: null
      }
    });
    
    render(
      <Provider store={emptyStore}>
        <ChatPanel />
      </Provider>
    );
    
    // Check if welcome message is displayed
    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to StoryGate RPG, TestPlayer/)).toBeInTheDocument();
  });
  
  test('sends in-character message when form is submitted', () => {
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Type a message
    const input = screen.getByPlaceholderText('Speak as your character...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    // Click send button
    const sendButton = screen.getByRole('button', { name: '' }); // Empty name because it's an icon button
    fireEvent.click(sendButton);
    
    // Check if action was dispatched
    expect(store.dispatch).toHaveBeenCalledWith(
      sendInCharacterChat('Test message', 'player-123')
    );
    
    // Input should be cleared
    expect(input).toHaveValue('');
  });
  
  test('sends out-of-character message when in OOC mode', () => {
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Switch to out-of-character mode
    const oocButton = screen.getByText('Out of Character');
    fireEvent.click(oocButton);
    
    // Type a message
    const input = screen.getByPlaceholderText('Send an out-of-character message...');
    fireEvent.change(input, { target: { value: 'OOC message' } });
    
    // Press Enter to send
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    // Check if action was dispatched
    expect(store.dispatch).toHaveBeenCalledWith(
      sendOutOfCharacterChat('OOC message')
    );
  });
  
  test('shows validation error for empty message', async () => {
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    // Clear initial clearUnread dispatch call
    store.dispatch.mockClear();
    
    // Try to send an empty message
    const input = screen.getByPlaceholderText('Speak as your character...');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    // Check if validation error is displayed - use waitFor for async updates
    await waitFor(() => {
      // Look for any element containing the partial text
      const errorElement = screen.queryByText(/cannot be empty/i);
      expect(errorElement).toBeInTheDocument();
    });
    
    expect(store.dispatch).not.toHaveBeenCalled();
  });
  
  test('shows validation error when not connected to server', async () => {
    // Create a store with disconnected socket
    const disconnectedStore = mockStore({
      game: {
        playerName: 'TestPlayer',
        player: { id: 'player-123' }
      },
      chat: {
        messages: [],
        isTyping: {}
      },
      socket: {
        connected: false
      },
      connection: {
        reconnecting: false,
        disconnectReason: null
      }
    });
    
    render(
      <Provider store={disconnectedStore}>
        <ChatPanel />
      </Provider>
    );
    
    // Type a message
    const input = screen.getByPlaceholderText('Connecting...');
    fireEvent.change(input, { target: { value: 'This will fail' } });
    
    // Try to send via Enter key
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    // Check if validation error is displayed - use waitFor for async updates
    await waitFor(() => {
      // Look for any element containing the partial text
      const errorElement = screen.queryByText(/not connected/i);
      expect(errorElement).toBeInTheDocument();
    });
  });
  
  test('shows validation error for message that is too long', () => {
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Create a message with more than 500 characters
    const longMessage = 'a'.repeat(501);
    
    // Type the long message
    const input = screen.getByPlaceholderText('Speak as your character...');
    fireEvent.change(input, { target: { value: longMessage } });
    
    // Try to send
    const sendButton = screen.getByRole('button', { name: '' });
    fireEvent.click(sendButton);
    
    // Check if validation error is displayed
    expect(screen.getByText(/Message is too long/)).toBeInTheDocument();
  });
  
  test('prevents sending duplicate messages in quick succession', () => {
    // Enable NODE_ENV for this test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Type a message
    const input = screen.getByPlaceholderText('Speak as your character...');
    fireEvent.change(input, { target: { value: 'Duplicate message' } });
    
    // Send the message
    const sendButton = screen.getByRole('button', { name: '' });
    fireEvent.click(sendButton);
    
    // Check that the sendInCharacterChat action was dispatched
    expect(store.dispatch).toHaveBeenCalledWith(
      sendInCharacterChat('Duplicate message', 'player-123')
    );
    
    // Reset the mock
    store.dispatch.mockClear();
    
    // Try to send the same message again immediately
    fireEvent.change(input, { target: { value: 'Duplicate message' } });
    fireEvent.click(sendButton);
    
    // Check if validation error is displayed
    expect(screen.getByText(/Duplicate message/)).toBeInTheDocument();
    // Should not dispatch sendInCharacterChat again
    expect(store.dispatch).not.toHaveBeenCalledWith(
      sendInCharacterChat('Duplicate message', 'player-123')
    );
    
    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });
  
  test('handles space key properly', () => {
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Get the input
    const input = screen.getByPlaceholderText('Speak as your character...');
    
    // Type a character
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    // Press the space key
    fireEvent.keyDown(input, { key: ' ', code: 'Space' });
    
    // The value should now include a space
    expect(input).toHaveValue('Hello ');
  });
  
  test('renders debug toggle in development mode', () => {
    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Check for debug toggle button (initially showing debug off)
    const debugToggle = screen.getByText('🔇 Debug');
    expect(debugToggle).toBeInTheDocument();
    
    // Click toggle
    fireEvent.click(debugToggle);
    
    // Should have updated localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('verbose_logging', 'true');
    
    // Check if button text updated
    expect(screen.getByText('🔊 Debug')).toBeInTheDocument();
    
    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });
  
  test('does not render debug toggle in production mode', () => {
    // Set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Debug toggle should not be present
    expect(screen.queryByText('🔇 Debug')).not.toBeInTheDocument();
    expect(screen.queryByText('🔊 Debug')).not.toBeInTheDocument();
    
    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });
  
  test('deduplicates messages with identical content', () => {
    // Create a store with duplicate messages
    const timestamp = Date.now();
    const duplicateStore = mockStore({
      game: {
        playerName: 'TestPlayer',
        player: { id: 'player-123' }
      },
      chat: {
        messages: [
          { 
            id: 'msg-1', 
            sender: 'System', 
            content: 'Duplicate message', 
            timestamp: timestamp,
            type: 'system'
          },
          { 
            id: 'msg-2', 
            sender: 'System', 
            content: 'Duplicate message', 
            timestamp: timestamp + 1000, // Very close in time
            type: 'system'
          },
          { 
            id: 'msg-3', 
            sender: 'TestPlayer', 
            content: 'Unique message', 
            timestamp: timestamp + 2000,
            type: 'in-character'
          }
        ],
        isTyping: {}
      },
      socket: {
        connected: true
      },
      connection: {
        reconnecting: false,
        disconnectReason: null
      }
    });
    
    render(
      <Provider store={duplicateStore}>
        <ChatPanel />
      </Provider>
    );
    
    // Get all chat bubble elements
    const systemBubbles = document.querySelectorAll('.chat-bubble.system-bubble');
    const playerBubbles = document.querySelectorAll('.chat-bubble.player-bubble');
    
    // Should have only 2 bubbles total - one system (deduped) and one player
    expect(systemBubbles.length).toBe(1);
    expect(playerBubbles.length).toBe(1);
    
    // Verify the content of the messages
    expect(screen.getByText('Unique message')).toBeInTheDocument();
    expect(screen.getByText('Duplicate message')).toBeInTheDocument();
  });
}); 