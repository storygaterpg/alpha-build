import chatReducer, {
  messageReceived,
  userTyping,
  clearUnread,
  cleanupTypingIndicators,
  clearMessages,
  sendInCharacterChat,
  sendOutOfCharacterChat
} from '../../store/slices/chatSlice';
import { CHAT_RECEIVE, CHAT_SEND_IN_CHARACTER, CHAT_SEND_OUT_OF_CHARACTER } from '../../store/actionTypes';
import { ChatMessage } from '../../store/types';

describe('Chat Slice', () => {
  const initialState = {
    messages: [],
    unreadCount: 0,
    isTyping: {}
  };
  
  test('should handle initial state', () => {
    expect(chatReducer(undefined, { type: 'unknown' })).toEqual({
      messages: [],
      unreadCount: 0,
      isTyping: {}
    });
  });
  
  test('should handle messageReceived', () => {
    const message: ChatMessage = {
      id: 'test-id',
      sender: 'TestUser',
      content: 'Hello world',
      timestamp: Date.now(),
      type: 'in-character'
    };
    
    const newState = chatReducer(initialState, messageReceived(message));
    
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages[0]).toEqual(message);
    expect(newState.unreadCount).toBe(1);
  });
  
  test('should handle userTyping', () => {
    const typingInfo = {
      userId: 'user-1',
      username: 'TestUser'
    };
    
    const newState = chatReducer(initialState, userTyping(typingInfo));
    
    expect(newState.isTyping['user-1']).toBeDefined();
    expect(newState.isTyping['user-1'].username).toBe('TestUser');
    expect(typeof newState.isTyping['user-1'].timestamp).toBe('number');
  });
  
  test('should handle clearUnread', () => {
    const stateWithUnread = {
      ...initialState,
      unreadCount: 5
    };
    
    const newState = chatReducer(stateWithUnread, clearUnread());
    
    expect(newState.unreadCount).toBe(0);
  });
  
  test('should handle cleanupTypingIndicators', () => {
    const now = Date.now();
    const fourSecondsAgo = now - 4000; // Older than the 3000ms timeout
    
    const stateWithTyping = {
      ...initialState,
      isTyping: {
        'user-1': { username: 'ActiveUser', timestamp: now },
        'user-2': { username: 'InactiveUser', timestamp: fourSecondsAgo }
      }
    };
    
    const newState = chatReducer(stateWithTyping, cleanupTypingIndicators());
    
    // Only the recent typing indicator should remain
    expect(Object.keys(newState.isTyping)).toHaveLength(1);
    expect(newState.isTyping['user-1']).toBeDefined();
    expect(newState.isTyping['user-2']).toBeUndefined();
  });
  
  test('should handle clearMessages', () => {
    const stateWithMessages = {
      messages: [
        { id: '1', sender: 'User1', content: 'Hello', timestamp: 123, type: 'in-character' as const },
        { id: '2', sender: 'User2', content: 'Hi', timestamp: 456, type: 'out-of-character' as const }
      ],
      unreadCount: 2,
      isTyping: {
        'user-1': { username: 'User1', timestamp: Date.now() }
      }
    };
    
    const newState = chatReducer(stateWithMessages, clearMessages());
    
    expect(newState.messages).toHaveLength(0);
    expect(newState.unreadCount).toBe(0);
    expect(Object.keys(newState.isTyping)).toHaveLength(0);
  });
  
  test('should create sendInCharacterChat action', () => {
    const action = sendInCharacterChat('Hello world', 'char-123');
    
    expect(action).toEqual({
      type: CHAT_SEND_IN_CHARACTER,
      payload: {
        content: 'Hello world',
        characterId: 'char-123',
        type: 'in-character'
      }
    });
  });
  
  test('should create sendOutOfCharacterChat action', () => {
    const action = sendOutOfCharacterChat('OOC message');
    
    expect(action).toEqual({
      type: CHAT_SEND_OUT_OF_CHARACTER,
      payload: {
        content: 'OOC message',
        type: 'out-of-character'
      }
    });
  });
  
  // New tests for message deduplication
  
  test('should deduplicate messages with same ID', () => {
    const message: ChatMessage = {
      id: 'duplicate-id',
      sender: 'TestUser',
      content: 'Hello world',
      timestamp: Date.now(),
      type: 'in-character'
    };
    
    // Add the message once
    const firstState = chatReducer(initialState, messageReceived(message));
    expect(firstState.messages).toHaveLength(1);
    
    // Try to add the same message again
    const secondState = chatReducer(firstState, messageReceived(message));
    
    // Should still only have 1 message
    expect(secondState.messages).toHaveLength(1);
    expect(secondState.unreadCount).toBe(1); // Unread count shouldn't increase
  });
  
  test('should deduplicate messages with same content and sender', () => {
    const timestamp = Date.now();
    
    // First message
    const message1: ChatMessage = {
      id: 'id-1',
      sender: 'TestUser',
      content: 'Duplicate content',
      timestamp: timestamp,
      type: 'in-character'
    };
    
    // Second message with different ID but same content, sender, and close timestamp
    const message2: ChatMessage = {
      id: 'id-2', // Different ID
      sender: 'TestUser',
      content: 'Duplicate content',
      timestamp: timestamp + 1000, // Within deduplication time window
      type: 'in-character'
    };
    
    // Add first message
    const firstState = chatReducer(initialState, messageReceived(message1));
    expect(firstState.messages).toHaveLength(1);
    
    // Try to add similar message
    const secondState = chatReducer(firstState, messageReceived(message2));
    
    // Should still only have 1 message
    expect(secondState.messages).toHaveLength(1);
  });
  
  test('should not deduplicate messages with same content but different senders', () => {
    const timestamp = Date.now();
    
    // First message
    const message1: ChatMessage = {
      id: 'id-1',
      sender: 'User1',
      content: 'Same content',
      timestamp: timestamp,
      type: 'in-character'
    };
    
    // Second message with different sender
    const message2: ChatMessage = {
      id: 'id-2',
      sender: 'User2', // Different sender
      content: 'Same content',
      timestamp: timestamp + 1000,
      type: 'in-character'
    };
    
    // Add first message
    const firstState = chatReducer(initialState, messageReceived(message1));
    expect(firstState.messages).toHaveLength(1);
    
    // Add second message from different sender
    const secondState = chatReducer(firstState, messageReceived(message2));
    
    // Should have 2 messages
    expect(secondState.messages).toHaveLength(2);
  });
  
  test('should handle message with no ID by generating a unique one', () => {
    const messageWithoutId: Omit<ChatMessage, 'id'> = {
      sender: 'TestUser',
      content: 'Hello world',
      timestamp: Date.now(),
      type: 'in-character'
    };
    
    // @ts-ignore - Intentionally passing message without ID
    const newState = chatReducer(initialState, messageReceived(messageWithoutId));
    
    expect(newState.messages).toHaveLength(1);
    expect(newState.messages[0].id).toBeDefined();
    expect(typeof newState.messages[0].id).toBe('string');
    expect(newState.messages[0].id.length).toBeGreaterThan(10); // Should be a reasonably long ID
  });
}); 