import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import socketReducer from '../../store/slices/socketSlice';
import connectionReducer from '../../store/slices/connectionSlice';
import ConnectionStatus from '../../components/ConnectionStatus';

describe('ConnectionStatus compact mode', () => {
  function renderCompact(connected: boolean, reconnecting: boolean) {
    const store = configureStore({
      reducer: { socket: socketReducer, connection: connectionReducer },
      preloadedState: {
        socket: { connected, connecting: false, error: { message: null, code: null }, lastMessage: null },
        connection: { online: connected, latency: null, lastPing: null, reconnecting, reconnectAttempts: 0, lastConnected: null, disconnectReason: null }
      }
    });
    return render(
      <Provider store={store}>
        <ConnectionStatus compact />
      </Provider>
    );
  }

  it('renders connected indicator without refresh icon', () => {
    renderCompact(true, false);
    const compactEl = document.querySelector('.connection-status-compact');
    expect(compactEl).toBeInTheDocument();
    // Should not show refresh svg
    expect(compactEl?.querySelector('svg[data-icon]')).toBeNull();
  });

  it('renders reconnecting indicator with refresh icon', () => {
    renderCompact(false, true);
    const compactEl = document.querySelector('.connection-status-compact');
    expect(compactEl).toBeInTheDocument();
    // Should show refresh svg for reconnecting
    expect(compactEl?.querySelector('svg[data-icon="refresh"]')).toBeInTheDocument();
  });
}); 