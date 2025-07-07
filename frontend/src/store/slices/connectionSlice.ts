import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CONNECTION_ONLINE, CONNECTION_OFFLINE } from '../actionTypes';

// Connection state interface
export interface ConnectionState {
  online: boolean;
  latency: number | null;
  lastPing: number | null;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastConnected: number | null;
  disconnectReason: string | null;
}

const initialState: ConnectionState = {
  online: false,
  latency: null,
  lastPing: null,
  reconnecting: false,
  reconnectAttempts: 0,
  lastConnected: null,
  disconnectReason: null
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    // Set connection status
    setOnline: (state) => {
      state.online = true;
      state.reconnecting = false;
      state.reconnectAttempts = 0;
      state.lastConnected = Date.now();
      state.disconnectReason = null;
    },
    
    setOffline: (state, action: PayloadAction<string | undefined>) => {
      state.online = false;
      state.disconnectReason = action.payload || null;
    },
    
    // Update latency
    updateLatency: (state, action: PayloadAction<number>) => {
      state.latency = action.payload;
      state.lastPing = Date.now();
    },
    
    // Reconnection
    startReconnecting: (state) => {
      state.reconnecting = true;
      state.reconnectAttempts += 1;
    },
    
    reconnectFailed: (state) => {
      state.reconnecting = false;
    },
    
    // Reset
    resetConnection: (state) => {
      return initialState;
    }
  }
});

// Export actions
export const {
  setOnline,
  setOffline,
  updateLatency,
  startReconnecting,
  reconnectFailed,
  resetConnection
} = connectionSlice.actions;

// Thunk actions
export const connectionOnline = () => ({
  type: CONNECTION_ONLINE
});

export const connectionOffline = (reason?: string) => ({
  type: CONNECTION_OFFLINE,
  payload: { reason }
});

export default connectionSlice.reducer; 