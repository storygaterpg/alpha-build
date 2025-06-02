import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the socket connection state
export interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: { 
    message: string; 
    code?: number;
    timestamp?: number;
  } | null;
  lastMessage: {
    type: string;
    data: any;
  } | null;
  connectionInfo: {
    url: string | null;
    path: string | null;
    reconnectAttempts: number;
  };
}

// Initial state
const initialState: SocketState = {
  connected: false,
  connecting: false,
  error: null,
  lastMessage: null,
  connectionInfo: {
    url: null,
    path: null,
    reconnectAttempts: 0
  }
};

// Create the socket slice
const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    // Connection actions
    socketConnect: (state, action: PayloadAction<{ url?: string; path?: string }>) => {
      state.connecting = true;
      if (action.payload?.url) {
        state.connectionInfo.url = action.payload.url;
      }
      if (action.payload?.path) {
        state.connectionInfo.path = action.payload.path;
      }
    },
    socketConnected: (state) => {
      state.connected = true;
      state.connecting = false;
      state.error = null;
      state.connectionInfo.reconnectAttempts = 0;
    },
    socketDisconnect: (state) => {
      state.connecting = false;
    },
    socketDisconnected: (state) => {
      state.connected = false;
      state.connecting = false;
    },
    socketError: (state, action: PayloadAction<{ message: string; code?: number }>) => {
      state.error = {
        message: action.payload.message,
        code: action.payload.code,
        timestamp: Date.now()
      };
      state.connecting = false;
    },
    socketReconnectAttempt: (state, action: PayloadAction<number>) => {
      state.connectionInfo.reconnectAttempts = action.payload;
    },

    // Message actions
    messageReceived: (state, action: PayloadAction<{ type: string; data: any }>) => {
      state.lastMessage = action.payload;
    },
    
    // Reset state
    resetSocketState: (state) => {
      state.connected = false;
      state.connecting = false;
      state.error = null;
      state.lastMessage = null;
      state.connectionInfo = {
        url: null,
        path: null,
        reconnectAttempts: 0
      };
    }
  }
});

// Export the actions
export const {
  socketConnect,
  socketConnected,
  socketDisconnect,
  socketDisconnected,
  socketError,
  socketReconnectAttempt,
  messageReceived,
  resetSocketState
} = socketSlice.actions;

// Export the reducer
export default socketSlice.reducer; 