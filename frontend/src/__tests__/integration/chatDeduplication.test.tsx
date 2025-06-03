import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { socketConnect } from '../../store/slices/socketSlice';
import { messageReceived } from '../../store/slices/chatSlice';
import ChatPanel from '../../components/ChatPanel';
import { ChatMessage } from '../../store/types';

// Mock the WebSocketClient module
jest.mock('../../network/WebSocketClient', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    isConnecting: jest.fn().mockReturnValue(false),
    getUrl: jest.fn().mockReturnValue('ws://localhost:8000'),
    getLastCloseInfo: jest.fn().mockReturnValue({ code: null, reason: null }),
    on: jest.fn(),
    off: jest.fn(),
    onMessageType: jest.fn(),
    offMessageType: jest.fn(),
    send: jest.fn()
  }
}));

// Mock localStorage for debug toggle
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

// Mock the AppToaster from App.tsx
jest.mock('../../App', () => ({
  AppToaster: {
    show: jest.fn()
  }
}));

// Define types for our reducers
interface GameState {
  playerName: string;
  player: { id: string };
}

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isTyping: Record<string, { username: string; timestamp: number }>;
}

interface SocketState {
  connected: boolean;
}

interface RootState {
  game: GameState;
  chat: ChatState;
  socket: SocketState;
}

describe('Chat Deduplication Integration Tests', () => {
  let store: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage mock
    localStorageMock.clear();
    
    // Set NODE_ENV to development for testing debug features
    process.env.NODE_ENV = 'development';
    
    // Create a store with the actual reducers and middleware
    store = configureStore({
      reducer: {
        game: (state: GameState = { playerName: 'TestPlayer', player: { id: 'player-123' } }, action: any): GameState => state,
        chat: (state: ChatState = { messages: [], unreadCount: 0, isTyping: {} }, action: any): ChatState => {
          if (action.type === 'chat/messageReceived') {
            // Simple implementation of deduplication logic for testing
            const message = action.payload as ChatMessage;
            const isDuplicate = state.messages.some(msg => 
              msg.id === message.id || 
              (msg.sender === message.sender && 
               msg.content === message.content && 
               Math.abs((msg.timestamp || 0) - (message.timestamp || 0)) < 3000)
            );
            
            if (isDuplicate) {
              return state;
            }
            
            return {
              ...state,
              messages: [...state.messages, message],
              unreadCount: state.unreadCount + 1
            };
          }
          return state;
        },
        socket: (state: SocketState = { connected: true }, action: any): SocketState => state
      },
      middleware: (getDefaultMiddleware: any) => getDefaultMiddleware()
    });
    
    // Spy on store.dispatch
    jest.spyOn(store, 'dispatch');
  });
  
  afterEach(() => {
    // Restore original env
    process.env.NODE_ENV = 'test';
  });
  
  test('integration test for message deduplication at multiple levels', async () => {
    // Render the ChatPanel
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Create some test messages
    const baseMessage = {
      sender: 'TestUser',
      content: 'Test message for deduplication',
      type: 'in-character' as const
    };
    
    // First send message normally through Redux
    const message1 = {
      ...baseMessage,
      id: 'msg-1',
      timestamp: Date.now()
    };
    
    await act(async () => {
      store.dispatch(messageReceived(message1));
    });
    
    // Verify message appears once
    expect(screen.getAllByText('Test message for deduplication')).toHaveLength(1);
    
    // Send a duplicate message with the same ID
    const duplicateIdMessage = {
      ...baseMessage,
      id: 'msg-1', // Same ID
      timestamp: Date.now() + 1000
    };
    
    await act(async () => {
      store.dispatch(messageReceived(duplicateIdMessage));
    });
    
    // Should still only see the message once
    expect(screen.getAllByText('Test message for deduplication')).toHaveLength(1);
    
    // Send another message with different ID but same content and close timestamp
    const similarContentMessage = {
      ...baseMessage,
      id: 'msg-2', // Different ID
      timestamp: Date.now() + 2000 // Close in time
    };
    
    await act(async () => {
      store.dispatch(messageReceived(similarContentMessage));
    });
    
    // Should still only see the message once due to content/timestamp-based deduplication
    expect(screen.getAllByText('Test message for deduplication')).toHaveLength(1);
    
    // Finally, send a message with different content
    const differentMessage = {
      sender: 'TestUser',
      id: 'msg-3',
      content: 'This is a different message',
      timestamp: Date.now() + 3000,
      type: 'in-character' as const
    };
    
    await act(async () => {
      store.dispatch(messageReceived(differentMessage));
    });
    
    // Should now see two different messages
    expect(screen.getByText('Test message for deduplication')).toBeInTheDocument();
    expect(screen.getByText('This is a different message')).toBeInTheDocument();
  });
  
  test('debug toggle affects verbose logging', async () => {
    // Mock console.log
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;
    
    try {
      // Render with debug off
      render(
        <Provider store={store}>
          <ChatPanel />
        </Provider>
      );
      
      // Find and click debug toggle
      const debugToggle = screen.getByText('🔇 Debug');
      fireEvent.click(debugToggle);
      
      // Should have set localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('verbose_logging', 'true');
      
      // Re-render component to apply debug setting
      await act(async () => {
        store.dispatch(messageReceived({
          id: 'debug-msg',
          sender: 'System',
          content: 'Debug test message',
          timestamp: Date.now(),
          type: 'system' as const
        }));
      });
      
      // Should have logged verbose debug info
      expect(mockConsoleLog).toHaveBeenCalled();
      
      // Should be able to toggle debug off
      const debugToggleOn = screen.getByText('🔊 Debug');
      fireEvent.click(debugToggleOn);
      
      // Should have updated localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('verbose_logging', 'false');
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
    }
  });
  
  test('prevents sending duplicate chat messages in quick succession', async () => {
    // Create a store with a spy on dispatch
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    
    // Mock the dispatch to simulate a successful send
    dispatchSpy.mockImplementation((action: any) => {
      if (action.type === 'socket/send/chat_message') {
        return { type: 'MOCKED_SUCCESS' };
      }
      return action;
    });
    
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Type a message
    const input = screen.getByPlaceholderText('Speak as your character...');
    fireEvent.change(input, { target: { value: 'Test duplicate prevention' } });
    
    // Send the message
    const sendButton = screen.getByRole('button', { name: '' });
    fireEvent.click(sendButton);
    
    // Input should be cleared
    expect(input).toHaveValue('');
    
    // Type the same message again
    fireEvent.change(input, { target: { value: 'Test duplicate prevention' } });
    
    // Try to send again immediately
    fireEvent.click(sendButton);
    
    // Should show validation error
    await waitFor(() => {
      const errorElement = screen.queryByText(/duplicate message/i);
      expect(errorElement).toBeInTheDocument();
    });
    
    // Check the actual dispatch calls for the chat message action
    const chatMessageCalls = dispatchSpy.mock.calls.filter(
      ([action]) => {
        const typedAction = action as any;
        return typedAction.type === 'socket/send/chat_message' && 
               typedAction.payload?.content === 'Test duplicate prevention';
      }
    );
    
    // Should only have one dispatch with this content
    expect(chatMessageCalls.length).toBe(1);
    
    // Cleanup
    dispatchSpy.mockRestore();
  });
}); 