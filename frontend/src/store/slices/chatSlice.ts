import { createSlice, PayloadAction, createAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../types';
import { CHAT_RECEIVE, CHAT_SEND_IN_CHARACTER, CHAT_SEND_OUT_OF_CHARACTER } from '../actionTypes';

// Create a typed action creator for chat receive
export const chatReceiveAction = createAction<ChatMessage>(CHAT_RECEIVE);

// Store processed message ids to prevent duplicates across different reducer invocations
const processedMessageIds = new Set<string>();
const recentMessageContents = new Map<string, number>();
const MESSAGE_CONTENT_EXPIRY = 5000; // 5 seconds

// Helper function to ensure unique message IDs
const ensureUniqueMessageId = (message: ChatMessage): ChatMessage => {
  // If message already has an ID, keep it
  if (message.id) return message;
  
  // Generate a unique ID
  const uniqueId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
  
  return {
    ...message,
    id: uniqueId
  };
};

// Helper function to check if a message is a duplicate
const isDuplicateMessage = (message: ChatMessage): boolean => {
  // Check if we've seen this exact message ID before
  if (message.id && processedMessageIds.has(message.id)) {
    return true;
  }
  
  // Check content-based duplicates
  if (message.content && message.sender) {
    const contentKey = `${message.sender}:${message.content}`;
    const lastSeen = recentMessageContents.get(contentKey);
    
    if (lastSeen && Date.now() - lastSeen < MESSAGE_CONTENT_EXPIRY) {
      return true;
    }
    
    // If not a duplicate, record this content
    recentMessageContents.set(contentKey, Date.now());
    
    // Clean up old entries
    const now = Date.now();
    recentMessageContents.forEach((timestamp, key) => {
      if (now - timestamp > MESSAGE_CONTENT_EXPIRY) {
        recentMessageContents.delete(key);
      }
    });
  }
  
  // If we have an ID, mark it as processed
  if (message.id) {
    processedMessageIds.add(message.id);
    
    // If the set gets too large, clear out old entries
    if (processedMessageIds.size > 1000) {
      const oldEntries = Array.from(processedMessageIds).slice(0, 500);
      oldEntries.forEach(id => processedMessageIds.delete(id));
    }
  }
  
  return false;
};

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
      console.log('Chat message received in reducer:', action.payload);
      
      // Ensure we have a valid message with required fields and unique ID
      const normalizedMessage = ensureUniqueMessageId(action.payload);
      
      if (!normalizedMessage.id || !normalizedMessage.content) {
        console.error('Invalid chat message received:', normalizedMessage);
        return;
      }
      
      // Check if this is a duplicate using our enhanced detection
      if (isDuplicateMessage(normalizedMessage)) {
        console.log('Duplicate message detected in reducer, skipping:', normalizedMessage.id);
        return;
      }
      
      state.messages.push(normalizedMessage);
      state.unreadCount += 1;
      
      console.log('Updated chat state, messages count:', state.messages.length);
      
      // Clear typing indicator for this user if they sent a message
      if (normalizedMessage.sender && state.isTyping[normalizedMessage.sender]) {
        delete state.isTyping[normalizedMessage.sender];
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
      
      // Also clear our duplicate detection caches
      processedMessageIds.clear();
      recentMessageContents.clear();
    }
  },
  extraReducers: (builder) => {
    // Handle CHAT_RECEIVE action explicitly using the typed action creator
    builder.addCase(chatReceiveAction, (state, action) => {
      console.log('CHAT_RECEIVE action received:', action.payload);
      
      // Ensure we have a valid message with required fields and unique ID
      const normalizedMessage = ensureUniqueMessageId(action.payload);
      
      if (!normalizedMessage.id || !normalizedMessage.content) {
        console.error('Invalid chat message received in CHAT_RECEIVE:', normalizedMessage);
        return;
      }
      
      // Check if this is a duplicate using our enhanced detection
      if (isDuplicateMessage(normalizedMessage)) {
        console.log('Duplicate message detected in CHAT_RECEIVE, skipping:', normalizedMessage.id);
        return;
      }
      
      state.messages.push(normalizedMessage);
      state.unreadCount += 1;
      
      console.log('Updated chat state from CHAT_RECEIVE, messages count:', state.messages.length);
    });
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