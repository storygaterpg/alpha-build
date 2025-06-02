import chatReducer, {
  messageReceived,
  userTyping,
  clearUnread,
  cleanupTypingIndicators,
  clearMessages,
  sendInCharacterChat,
  sendOutOfCharacterChat
} from '../../store/slices/chatSlice';
import { CHAT_SEND_IN_CHARACTER, CHAT_SEND_OUT_OF_CHARACTER } from '../../store/actionTypes';
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
}); 