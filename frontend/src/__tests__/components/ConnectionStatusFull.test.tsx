import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import socketReducer from '../../store/slices/socketSlice';
import connectionReducer from '../../store/slices/connectionSlice';
import ConnectionStatus from '../../components/ConnectionStatus';

function renderWithState(socketState: any, connectionState: any, compact: boolean = false) {
  const store = configureStore({
    reducer: { socket: socketReducer, connection: connectionReducer },
    preloadedState: { socket: socketState, connection: connectionState }
  });
  render(
    <Provider store={store}>
      <ConnectionStatus compact={compact} />
    </Provider>
  );
}

describe('ConnectionStatus component', () => {
  it('shows Connected state', () => {
    renderWithState(
      { connected: true, connecting: false, error: { message: null, code: null }, lastMessage: null },
      { online: true, latency: 50, lastPing: Date.now(), reconnecting: false, reconnectAttempts: 0, lastConnected: null, disconnectReason: null }
    );
    expect(screen.getByText(/Connected/i)).toBeInTheDocument();
  });

  it('shows Reconnecting state', () => {
    renderWithState(
      { connected: false, connecting: false, error: { message: null, code: null }, lastMessage: null },
      { online: false, latency: null, lastPing: null, reconnecting: true, reconnectAttempts: 1, lastConnected: null, disconnectReason: null }
    );
    expect(screen.getByText(/Reconnecting/i)).toBeInTheDocument();
  });

  it('shows Disconnected state', () => {
    renderWithState(
      { connected: false, connecting: false, error: { message: null, code: null }, lastMessage: null },
      { online: false, latency: null, lastPing: null, reconnecting: false, reconnectAttempts: 0, lastConnected: null, disconnectReason: 'error' }
    );
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });
}); 