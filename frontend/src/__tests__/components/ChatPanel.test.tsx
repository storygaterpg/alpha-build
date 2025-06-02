import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        ]
      },
      socket: {
        connected: true
      }
    });
    
    // Mock dispatch
    store.dispatch = jest.fn();
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
        messages: []
      },
      socket: {
        connected: true
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
  
  test('shows validation error for empty message', () => {
    render(
      <Provider store={store}>
        <ChatPanel />
      </Provider>
    );
    
    // Try to send an empty message
    const sendButton = screen.getByRole('button', { name: '' });
    fireEvent.click(sendButton);
    
    // Check if validation error is displayed
    expect(screen.getByText('Message cannot be empty')).toBeInTheDocument();
    expect(store.dispatch).not.toHaveBeenCalled();
  });
  
  test('shows validation error when not connected to server', () => {
    // Create a store with disconnected socket
    const disconnectedStore = mockStore({
      game: {
        playerName: 'TestPlayer',
        player: { id: 'player-123' }
      },
      chat: {
        messages: []
      },
      socket: {
        connected: false
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
    
    // Try to send
    const sendButton = screen.getByRole('button', { name: '' });
    fireEvent.click(sendButton);
    
    // Check if validation error is displayed
    expect(screen.getByText('Not connected to server. Your message will not be sent.')).toBeInTheDocument();
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
}); 