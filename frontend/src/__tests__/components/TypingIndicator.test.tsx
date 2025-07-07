import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import TypingIndicator from '../../components/TypingIndicator';

// Create a mock store
const mockStore = configureStore([]);

describe('TypingIndicator Component', () => {
  // Set up date mock to ensure consistent tests
  const originalDateNow = Date.now;
  
  beforeEach(() => {
    // Mock Date.now() to return a fixed timestamp
    Date.now = jest.fn(() => 1000000000000);
  });
  
  afterEach(() => {
    // Restore original Date.now
    Date.now = originalDateNow;
  });
  
  test('renders nothing when no one is typing', () => {
    const store = mockStore({
      chat: {
        isTyping: {}
      }
    });
    
    const { container } = render(
      <Provider store={store}>
        <TypingIndicator />
      </Provider>
    );
    
    // The component should not render anything
    expect(container.firstChild).toBeNull();
  });
  
  test('renders with single user typing', () => {
    const store = mockStore({
      chat: {
        isTyping: {
          'user-1': {
            username: 'Alice',
            timestamp: Date.now() - 1000 // 1 second ago
          }
        }
      }
    });
    
    render(
      <Provider store={store}>
        <TypingIndicator />
      </Provider>
    );
    
    // Check if correct message is displayed
    expect(screen.getByText('Alice is typing...')).toBeInTheDocument();
  });
  
  test('renders with two users typing', () => {
    const store = mockStore({
      chat: {
        isTyping: {
          'user-1': {
            username: 'Alice',
            timestamp: Date.now() - 1000
          },
          'user-2': {
            username: 'Bob',
            timestamp: Date.now() - 2000
          }
        }
      }
    });
    
    render(
      <Provider store={store}>
        <TypingIndicator />
      </Provider>
    );
    
    // Check if correct message is displayed
    expect(screen.getByText('Alice and Bob are typing...')).toBeInTheDocument();
  });
  
  test('renders with three users typing', () => {
    const store = mockStore({
      chat: {
        isTyping: {
          'user-1': {
            username: 'Alice',
            timestamp: Date.now() - 1000
          },
          'user-2': {
            username: 'Bob',
            timestamp: Date.now() - 2000
          },
          'user-3': {
            username: 'Charlie',
            timestamp: Date.now() - 1500
          }
        }
      }
    });
    
    render(
      <Provider store={store}>
        <TypingIndicator />
      </Provider>
    );
    
    // Check if correct message is displayed
    expect(screen.getByText('Alice, Bob, and Charlie are typing...')).toBeInTheDocument();
  });
  
  test('renders with many users typing', () => {
    const store = mockStore({
      chat: {
        isTyping: {
          'user-1': { username: 'Alice', timestamp: Date.now() - 1000 },
          'user-2': { username: 'Bob', timestamp: Date.now() - 2000 },
          'user-3': { username: 'Charlie', timestamp: Date.now() - 1500 },
          'user-4': { username: 'David', timestamp: Date.now() - 1200 },
          'user-5': { username: 'Eve', timestamp: Date.now() - 800 }
        }
      }
    });
    
    render(
      <Provider store={store}>
        <TypingIndicator />
      </Provider>
    );
    
    // Check if correct message is displayed
    expect(screen.getByText('5 people are typing...')).toBeInTheDocument();
  });
  
  test('filters out expired typing indicators', () => {
    const store = mockStore({
      chat: {
        isTyping: {
          'user-1': {
            username: 'Alice',
            timestamp: Date.now() - 1000 // 1 second ago - active
          },
          'user-2': {
            username: 'Bob',
            timestamp: Date.now() - 4000 // 4 seconds ago - expired
          }
        }
      }
    });
    
    render(
      <Provider store={store}>
        <TypingIndicator />
      </Provider>
    );
    
    // Only Alice should be shown as typing
    expect(screen.getByText('Alice is typing...')).toBeInTheDocument();
  });
  
  test('applies custom className and style', () => {
    const store = mockStore({
      chat: {
        isTyping: {
          'user-1': {
            username: 'Alice',
            timestamp: Date.now() - 1000
          }
        }
      }
    });
    
    const { container } = render(
      <Provider store={store}>
        <TypingIndicator 
          className="custom-class"
          style={{ color: 'red', marginTop: '10px' }}
        />
      </Provider>
    );
    
    // Check if custom class and style are applied
    const indicator = container.firstChild as HTMLElement;
    expect(indicator).toHaveClass('typing-indicator');
    expect(indicator).toHaveClass('custom-class');
    expect(indicator.style.color).toBe('red');
    expect(indicator.style.marginTop).toBe('10px');
  });
}); 