import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the socket connection state
export interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: {
    message: string | null;
    code: number | null;
  };
  lastMessage: any | null;
}

// Initial state
const initialState: SocketState = {
  connected: false,
  connecting: false,
  error: {
    message: null,
    code: null
  },
  lastMessage: null
};

// Create the socket slice
const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    // Connection actions
    socketConnect: (state, action: PayloadAction<{ url?: string; path?: string }>) => {
      state.connecting = true;
    },
    socketConnected: (state) => {
      state.connected = true;
      state.connecting = false;
      state.error = { message: null, code: null };
    },
    socketDisconnect: (state) => {
      state.connecting = false;
    },
    socketDisconnected: (state) => {
      state.connected = false;
      state.connecting = false;
    },
    socketError: (state, action: PayloadAction<{ message: string; code?: number }>) => {
      state.connected = false;
      state.connecting = false;
      state.error = {
        message: action.payload.message,
        code: action.payload.code || null
      };
    },

    // Message actions
    messageReceived: (state, action: PayloadAction<{ type: string; data: any }>) => {
      state.lastMessage = action.payload;
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
  messageReceived
} = socketSlice.actions;

// Export the reducer
export default socketSlice.reducer; 