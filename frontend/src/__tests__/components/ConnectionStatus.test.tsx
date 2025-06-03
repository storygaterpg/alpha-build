import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ConnectionStatus from '../../components/ConnectionStatus';

// Mock the ConnectionStatus component to add a testId
jest.mock('../../components/ConnectionStatus', () => {
  // Get the original component
  const originalModule = jest.requireActual('../../components/ConnectionStatus');
  
  // Return a wrapper component that adds a data-testid
  return {
    __esModule: true,
    default: (props: any) => {
      const OriginalComponent = originalModule.default;
      return <div data-testid="connection-status"><OriginalComponent {...props} /></div>;
    }
  };
});

// Create mock store
const mockStore = configureStore([]);

// Mock the timer functions
jest.useFakeTimers();

describe('ConnectionStatus Component', () => {
  // Default connected state
  const connectedState = {
    socket: {
      connected: true,
      error: {
        message: null,
        code: null
      }
    },
    connection: {
      reconnecting: false,
      disconnectReason: null
    }
  };
  
  // Disconnected state
  const disconnectedState = {
    socket: {
      connected: false,
      error: {
        message: null,
        code: null
      }
    },
    connection: {
      reconnecting: false,
      disconnectReason: 'User disconnected'
    }
  };
  
  // Reconnecting state
  const reconnectingState = {
    socket: {
      connected: false,
      error: {
        message: null,
        code: null
      }
    },
    connection: {
      reconnecting: true,
      disconnectReason: 'Connection lost'
    }
  };
  
  // Error state
  const errorState = {
    socket: {
      connected: false,
      error: {
        message: 'Failed to connect',
        code: 1006
      }
    },
    connection: {
      reconnecting: false,
      disconnectReason: 'Connection error'
    }
  };
  
  test('renders connected state in compact mode', () => {
    const store = mockStore(connectedState);
    
    const { container } = render(
      <Provider store={store}>
        <ConnectionStatus compact={true} />
      </Provider>
    );
    
    // Should have the green indicator dot
    const statusDot = container.querySelector('div[style*="var(--glass-success)"]');
    expect(statusDot).toBeInTheDocument();
    
    // Should not display reconnecting icon
    const reconnectIcon = container.querySelector('svg[data-icon="refresh"]');
    expect(reconnectIcon).not.toBeInTheDocument();
  });
  
  test('renders disconnected state in compact mode', () => {
    const store = mockStore(disconnectedState);
    
    const { container } = render(
      <Provider store={store}>
        <ConnectionStatus compact={true} />
      </Provider>
    );
    
    // Should have the red indicator dot
    const statusDot = container.querySelector('div[style*="var(--glass-danger)"]');
    expect(statusDot).toBeInTheDocument();
  });
  
  test('renders reconnecting state in compact mode', () => {
    const store = mockStore(reconnectingState);
    
    const { container } = render(
      <Provider store={store}>
        <ConnectionStatus compact={true} />
      </Provider>
    );
    
    // Should have the yellow indicator dot
    const statusDot = container.querySelector('div[style*="var(--glass-warning)"]');
    expect(statusDot).toBeInTheDocument();
    
    // Should display reconnecting icon
    const reconnectIcon = container.querySelector('svg[data-icon="refresh"]');
    expect(reconnectIcon).toBeInTheDocument();
  });
  
  test('renders full connection status when not in compact mode', () => {
    const store = mockStore(connectedState);
    
    render(
      <Provider store={store}>
        <ConnectionStatus compact={false} />
      </Provider>
    );
    
    // Should display "Connected" text
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
  
  test('renders full disconnected status when not in compact mode', () => {
    const store = mockStore(disconnectedState);
    
    render(
      <Provider store={store}>
        <ConnectionStatus compact={false} />
      </Provider>
    );
    
    // Should display "Disconnected" text
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });
  
  test('renders full reconnecting status when not in compact mode', () => {
    const store = mockStore(reconnectingState);
    
    render(
      <Provider store={store}>
        <ConnectionStatus compact={false} />
      </Provider>
    );
    
    // Should display "Reconnecting..." text
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });
  
  test('simulates ping time updates', () => {
    const store = mockStore(connectedState);
    
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
    
    render(
      <Provider store={store}>
        <ConnectionStatus compact={false} />
      </Provider>
    );
    
    // Initially should show ping time (110ms based on our Math.random mock)
    expect(screen.getByText('110ms')).toBeInTheDocument();
    
    // Fast-forward 10 seconds to trigger next ping update
    jest.advanceTimersByTime(10000);
    
    // Should still show 110ms (same random value)
    expect(screen.getByText('110ms')).toBeInTheDocument();
    
    // Restore Math.random
    (global.Math.random as jest.Mock).mockRestore();
  });
  
  test('applies custom className', () => {
    const store = mockStore(connectedState);
    
    const { container } = render(
      <Provider store={store}>
        <ConnectionStatus className="custom-class" />
      </Provider>
    );
    
    // Check if custom class is applied
    const statusElement = container.querySelector('.connection-status.custom-class');
    expect(statusElement).toBeInTheDocument();
  });
  
  test('clears ping time when disconnected', () => {
    // Start with connected state
    const store = mockStore(connectedState);
    
    const { rerender } = render(
      <Provider store={store}>
        <ConnectionStatus compact={false} />
      </Provider>
    );
    
    // Should show ping time
    expect(screen.getByText(/\d+ms/)).toBeInTheDocument();
    
    // Now update to disconnected state
    const newStore = mockStore(disconnectedState);
    
    rerender(
      <Provider store={newStore}>
        <ConnectionStatus compact={false} />
      </Provider>
    );
    
    // Should not show ping time anymore
    expect(screen.queryByText(/\d+ms/)).not.toBeInTheDocument();
  });
}); 