import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../types';
import { CHAT_RECEIVE, CHAT_SEND_IN_CHARACTER, CHAT_SEND_OUT_OF_CHARACTER } from '../actionTypes';

export interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isTyping: {
    [userId: string]: {
      username: string;
      timestamp: number;
    };
  };
}

const initialState: ChatState = {
  messages: [],
  unreadCount: 0,
  isTyping: {}
};

// Calculate if a user is still considered to be typing
// (for showing typing indicators - timeout after 3 seconds)
const TYPING_TIMEOUT = 3000; // 3 seconds

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Handle a new message received from the server
    messageReceived: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      state.unreadCount += 1;
      
      // Clear typing indicator for this user if they sent a message
      if (action.payload.sender && state.isTyping[action.payload.sender]) {
        delete state.isTyping[action.payload.sender];
      }
    },
    
    // Handle when a user is typing
    userTyping: (state, action: PayloadAction<{ userId: string; username: string }>) => {
      const { userId, username } = action.payload;
      state.isTyping[userId] = {
        username,
        timestamp: Date.now()
      };
    },
    
    // Reset unread message count (called when chat panel is focused)
    clearUnread: (state) => {
      state.unreadCount = 0;
    },
    
    // Remove old typing indicators (called periodically)
    cleanupTypingIndicators: (state) => {
      const now = Date.now();
      Object.keys(state.isTyping).forEach(userId => {
        if (now - state.isTyping[userId].timestamp > TYPING_TIMEOUT) {
          delete state.isTyping[userId];
        }
      });
    },
    
    // Send an in-character message (will be handled by middleware)
    sendInCharacterMessage: (state, action: PayloadAction<{ content: string; characterId?: string }>) => {
      // This action doesn't modify state directly - it's handled by middleware
      // which will send the message to the server
    },
    
    // Send an out-of-character message (will be handled by middleware)
    sendOutOfCharacterMessage: (state, action: PayloadAction<{ content: string }>) => {
      // This action doesn't modify state directly - it's handled by middleware
      // which will send the message to the server
    },
    
    // Clear all messages (for logout/reset)
    clearMessages: (state) => {
      state.messages = [];
      state.unreadCount = 0;
      state.isTyping = {};
    }
  }
});

export const {
  messageReceived,
  userTyping,
  clearUnread,
  cleanupTypingIndicators,
  sendInCharacterMessage,
  sendOutOfCharacterMessage,
  clearMessages
} = chatSlice.actions;

// Thunk actions to send messages through WebSocket
export const sendInCharacterChat = (content: string, characterId?: string) => ({
  type: CHAT_SEND_IN_CHARACTER,
  payload: { content, characterId, type: 'in-character' }
});

export const sendOutOfCharacterChat = (content: string) => ({
  type: CHAT_SEND_OUT_OF_CHARACTER,
  payload: { content, type: 'out-of-character' }
});

export default chatSlice.reducer; 