import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux';
import websocketClient from '../../network/WebSocketClient';
import { 
  socketConnect,
  socketConnected,
  socketDisconnect,
  socketDisconnected,
  socketError,
  messageReceived as socketMessageReceived
} from '../slices/socketSlice';
import { RootState } from '../rootReducer';
import { messageReceived, chatReceiveAction } from '../slices/chatSlice';
import {
  MAP_REQUEST,
  MAP_RECEIVE,
  ACTORS_REQUEST,
  ACTORS_RECEIVE,
  SHEET_REQUEST,
  SHEET_RECEIVE,
  TURN_SET_ACTIVE_ACTOR,
  TURN_SET_AVAILABLE_ACTIONS,
  ACTION_REQUEST_MOVE,
  ACTION_REQUEST_ATTACK,
  ACTION_REQUEST_END_TURN,
  ACTION_RESULT,
  MOVEMENT_REQUEST_TILES,
  MOVEMENT_RECEIVE_TILES,
  CHAT_SEND_IN_CHARACTER,
  CHAT_SEND_OUT_OF_CHARACTER,
  CHAT_RECEIVE,
  LOGS_ADD_ENTRIES,
  LOGS_CLEAR,
  CONNECTION_ONLINE,
  CONNECTION_OFFLINE,
  NOTIFICATION_SHOW_ERROR
} from '../actionTypes';

// Import connection and notification actions
import { 
  setOnline, 
  setOffline,
  startReconnecting,
  reconnectFailed 
} from '../slices/connectionSlice';
import { showError } from '../slices/notificationSlice';

// Message cache to prevent duplicate dispatches
interface MessageCache {
  [key: string]: {
    content: string;
    sender: string;
    timestamp: number;
    lastSeen: number;
  }
}

// Max reconnect attempts before showing critical error
const MAX_RECONNECT_ATTEMPTS = 5;
// How long to keep messages in the cache (5 seconds)
const MESSAGE_CACHE_TTL = 5000;

// Global message cache for deduplication
const messageCache: MessageCache = {};

/**
 * Check if a message is a duplicate
 */
const isMessageDuplicate = (message: any): boolean => {
  if (!message) return false;
  
  // Check by ID first
  if (message.id && messageCache[message.id]) {
    return true;
  }
  
  // Then check by content + sender + time window
  const content = message.content || '';
  const sender = message.sender || '';
  const timestamp = message.timestamp || Date.now();
  
  // Look for a similar message in the cache
  for (const cachedId in messageCache) {
    const cached = messageCache[cachedId];
    
    // If content and sender match, and the message was seen recently
    if (cached.content === content && 
        cached.sender === sender && 
        Math.abs(cached.timestamp - timestamp) < 3000) {
      return true;
    }
  }
  
  return false;
};

/**
 * Add a message to the cache
 */
const cacheMessage = (message: any): void => {
  if (!message) return;
  
  const id = message.id || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const content = message.content || '';
  const sender = message.sender || '';
  const timestamp = message.timestamp || Date.now();
  
  messageCache[id] = {
    content,
    sender,
    timestamp,
    lastSeen: Date.now()
  };
  
  // Clean old items from cache
  cleanMessageCache();
};

/**
 * Remove old messages from the cache
 */
const cleanMessageCache = (): void => {
  const now = Date.now();
  
  Object.keys(messageCache).forEach(id => {
    if (now - messageCache[id].lastSeen > MESSAGE_CACHE_TTL) {
      delete messageCache[id];
    }
  });
};

// Types of messages our socket middleware will handle
export type MessageHandlers = {
  [key: string]: (data: any, dispatch: Dispatch<AnyAction>, getState: () => RootState) => void;
};

/**
 * Get diagnostic information about WebSocket connection
 */
const getConnectionDiagnostics = () => {
  const closeInfo = websocketClient.getLastCloseInfo();
  let diagnostics = '';
  
  if (closeInfo.code) {
    diagnostics += `Close Code: ${closeInfo.code}`;
    
    // Add explanations for common codes
    if (closeInfo.code === 1000) {
      diagnostics += ' (Normal closure)';
    } else if (closeInfo.code === 1001) {
      diagnostics += ' (Endpoint going away)';
    } else if (closeInfo.code === 1006) {
      diagnostics += ' (Abnormal closure - no close frame received)';
    } else if (closeInfo.code === 1011) {
      diagnostics += ' (Server error)';
    } else if (closeInfo.code === 1012) {
      diagnostics += ' (Service restart)';
    } else if (closeInfo.code === 1013) {
      diagnostics += ' (Try again later)';
    }
  }
  
  if (closeInfo.reason) {
    diagnostics += diagnostics ? ` - ${closeInfo.reason}` : closeInfo.reason;
  }
  
  return diagnostics || 'No diagnostic information available';
};

// Socket middleware creator that accepts message handlers
export const createSocketMiddleware = (messageHandlers: MessageHandlers): Middleware => {
  // @ts-ignore - Ignoring TypeScript errors for Redux middleware compatibility
  return (store: MiddlewareAPI<Dispatch, RootState>) => {
    // Track reconnection attempts
    let reconnectAttempts = 0;
    let reconnectTimer: NodeJS.Timeout | null = null;
    
    // Setup socket listeners when the middleware is created
    setupSocketListeners(store.dispatch, store.getState, messageHandlers);
    
    return (next: Dispatch<AnyAction>) => (action: AnyAction) => {
      const { dispatch } = store;
      
      // Handle socket-related actions
      if (socketConnect.match(action)) {
        // Clear previous reconnect state if any
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        reconnectAttempts = 0;
        
        // Get URL and path from action payload
        const { url, path } = action.payload || {};
        
        // Attempt connection and handle result
        websocketClient.connect(url, path)
          .then(success => {
            if (!success) {
              console.warn('WebSocket connection initialization was not successful');
              // Don't dispatch failure immediately - the error handlers will do that
            }
          })
          .catch(error => {
            console.error('Error during WebSocket connection attempt:', error);
            dispatch(socketError({ message: 'Connection attempt failed', code: 1006 }));
          });
      }
      else if (socketDisconnect.match(action)) {
        // Stop any reconnection attempts when explicitly disconnecting
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        reconnectAttempts = 0;
        
        websocketClient.disconnect();
        dispatch(setOffline('User disconnected'));
      }
      else if (action.type === CONNECTION_OFFLINE) {
        const reason = action.payload?.reason || 'Unknown reason';
        
        // Don't attempt to reconnect if we're explicitly disconnecting
        // or if a connection attempt is already in progress
        if (!websocketClient.isConnected() && 
            !websocketClient.isConnecting() && 
            reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          dispatch(startReconnecting());
          
          // Attempt to reconnect after delay with backoff
          const reconnectDelay = 2000 * Math.pow(1.5, reconnectAttempts - 1);
          
          reconnectTimer = setTimeout(() => {
            // Test available connection paths
            websocketClient.testConnectivity()
              .then(path => {
                console.log('Found working path:', path || 'None');
                // Connect with the determined path
                return websocketClient.connect(undefined, path);
              })
              .catch(error => {
                console.error('Error testing connectivity:', error);
                // Try to connect anyway with default settings
                return websocketClient.connect();
              })
              .then(success => {
                if (!success && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                  handleMaxReconnectFailure(dispatch);
                }
              });
          }, reconnectDelay);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          handleMaxReconnectFailure(dispatch);
        }
      }
      // Handle game-specific message sending
      else if (action.type === MAP_REQUEST) {
        // Request map data from server
        websocketClient.send('map_request', {});
      }
      else if (action.type === ACTORS_REQUEST) {
        // Request actors data from server
        websocketClient.send('actors_request', {});
      }
      else if (action.type === SHEET_REQUEST) {
        // Request character sheet for a specific actor
        websocketClient.send('sheet_request', { actorId: action.payload.actorId });
      }
      else if (action.type === ACTION_REQUEST_MOVE) {
        // Request move action
        websocketClient.send('action_request', { 
          type: 'move', 
          actorId: action.payload.actorId 
        });
      }
      else if (action.type === ACTION_REQUEST_ATTACK) {
        // Request attack action
        websocketClient.send('action_request', { 
          type: 'attack', 
          actorId: action.payload.actorId 
        });
      }
      else if (action.type === ACTION_REQUEST_END_TURN) {
        // Request end turn
        websocketClient.send('action_request', { type: 'end_turn' });
      }
      else if (action.type === MOVEMENT_REQUEST_TILES) {
        // Request movement tiles
        websocketClient.send('movement_request', { actorId: action.payload.actorId });
      }
      else if (action.type === CHAT_SEND_IN_CHARACTER) {
        // Send in-character chat message
        websocketClient.send('chat_message', { 
          content: action.payload.content,
          characterId: action.payload.characterId,
          type: 'in-character'
        });
      }
      else if (action.type === CHAT_SEND_OUT_OF_CHARACTER) {
        // Send out-of-character chat message
        websocketClient.send('chat_message', { 
          content: action.payload.content,
          type: 'out-of-character'
        });
      }
      else if (action.type.startsWith('socket/send')) {
        // Handle actions that should send data to the server
        // The event type is derived from the action type (socket/send/MESSAGE_TYPE -> MESSAGE_TYPE)
        const eventType = action.type.replace('socket/send/', '');
        websocketClient.send(eventType, action.payload);
      }
      
      // Continue the middleware chain
      return next(action);
    };
  };
};

// Setup WebSocket event listeners
const setupSocketListeners = (
  dispatch: Dispatch<AnyAction>, 
  getState: () => RootState,
  messageHandlers: MessageHandlers
) => {
  // Connection established
  websocketClient.on('connect', () => {
    dispatch(socketConnected());
    dispatch(setOnline());
  });
  
  // Connection closed
  websocketClient.on('disconnect', (event: any) => {
    dispatch(socketDisconnected());
    
    // Check if this was a clean close or an error
    const closeInfo = websocketClient.getLastCloseInfo();
    const reason = closeInfo.reason || event?.reason || 'Connection closed';
    const wasClean = event?.wasClean || false;
    const code = closeInfo.code || event?.code;
    
    // Debug information
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
      console.log(`Socket disconnected: ${wasClean ? 'Clean' : 'Unclean'} close, code ${code}${reason ? ': ' + reason : ''}`);
    }
    
    if (wasClean || code === 1000) {
      // Clean disconnection (e.g. user navigated away)
      dispatch(setOffline(reason));
    } else {
      // Unexpected disconnection, attempt reconnect
      dispatch(setOffline(reason));
      dispatch({ type: CONNECTION_OFFLINE, payload: { reason, code } });
    }
  });
  
  // Connection error
  websocketClient.on('error', (error: any) => {
    const closeInfo = websocketClient.getLastCloseInfo();
    const errorMessage = error?.message || closeInfo.reason || 'Unknown connection error';
    const code = closeInfo.code || 1006;
    
    console.error(`Socket error: ${errorMessage}, code: ${code}`);
    
    dispatch(socketError({ message: errorMessage, code }));
    dispatch(setOffline(errorMessage));
    dispatch({ type: CONNECTION_OFFLINE, payload: { reason: errorMessage, code } });
    
    // Show notification with detailed info for critical errors
    dispatch(showError(
      'Connection Error', 
      `${errorMessage}${code ? ` (Code: ${code})` : ''}`,
      10000 // 10 second notification
    ));
  });
  
  // Register message type handlers
  
  // Map data
  websocketClient.onMessageType('mapData', (data) => {
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
      console.log('Received map data:', data);
    }
    
    // Process map data to ensure it has all required fields
    const processedData = {
      id: data.id || `map_${Date.now()}`,
      name: data.name || 'Unnamed Map',
      width: data.width || 15,
      height: data.height || 15,
      tiles: data.tiles || Array(data.height || 15).fill(Array(data.width || 15).fill({ type: 'normal', walkable: true })),
      startPosition: data.startPosition || { x: 0, y: 0 },
      backgroundImage: data.backgroundImage || null,
      gridSize: data.gridSize || 64
    };
    
    // Dispatch to the map reducer
    dispatch({
      type: MAP_RECEIVE,
      payload: processedData
    });
    
    // Also add/update the map in the game state
    if (getState().game.maps[processedData.id]) {
      dispatch({
        type: 'game/updateMap',
        payload: processedData
      });
    } else {
      dispatch({
        type: 'game/addMap',
        payload: processedData
      });
    }
    
    // Set as current map if none is selected
    if (!getState().game.currentMapId) {
      dispatch({
        type: 'game/setCurrentMap',
        payload: processedData.id
      });
    }
  });
  
  // Actors data - handle both 'actors' and 'actors_data' events
  websocketClient.onMessageType('actors', (data) => {
    console.log('Received actors data:', data);
    
    // Server sends actors as an array, but gameSlice expects object storage
    const actorsArray = Array.isArray(data) ? data : data.actors || [];
    
    // Convert each actor to the proper structure and add to game state
    actorsArray.forEach((actorData: any) => {
      // Transform server actor format to client actor format
      const actor = {
        id: actorData.id,
        name: actorData.name,
        type: actorData.type,
        position: actorData.position,
        stats: {
          health: actorData.stats?.health || actorData.health || 100,
          maxHealth: actorData.stats?.maxHealth || actorData.maxHealth || 100,
          mana: actorData.stats?.mana || 50,
          maxMana: actorData.stats?.maxMana || 50,
          strength: actorData.stats?.strength || actorData.strength || 10,
          dexterity: actorData.stats?.dexterity || actorData.dexterity || 10,
          intelligence: actorData.stats?.intelligence || actorData.intelligence || 10,
          constitution: actorData.stats?.constitution || actorData.constitution || 10,
          wisdom: actorData.stats?.wisdom || actorData.wisdom || 10,
          charisma: actorData.stats?.charisma || actorData.charisma || 10
        },
        skills: actorData.skills || [],
        inventory: actorData.inventory || [],
        level: actorData.level || 1,
        experience: actorData.experience || 0,
        nextLevelExperience: actorData.nextLevelExperience || 100
      };
      
      // Dispatch to gameSlice to add the actor
      dispatch({
        type: 'game/addActor',
        payload: actor
      });
      
      console.log(`Added actor ${actor.name} (${actor.id}) to game state`);
    });
    
    // Also dispatch to actorsSlice for compatibility
    dispatch({
      type: ACTORS_RECEIVE,
      payload: actorsArray
    });
  });
  
  websocketClient.onMessageType('actors_data', (data) => {
    dispatch({
      type: ACTORS_RECEIVE,
      payload: data.actors
    });
  });
  
  // Character sheet data
  websocketClient.onMessageType('character_sheet', (data) => {
    dispatch({
      type: SHEET_RECEIVE,
      payload: data
    });
  });
  
  // Turn management
  websocketClient.onMessageType('active_actor', (data) => {
    dispatch({
      type: TURN_SET_ACTIVE_ACTOR,
      payload: data.actorId
    });
  });
  
  websocketClient.onMessageType('available_actions', (data) => {
    dispatch({
      type: TURN_SET_AVAILABLE_ACTIONS,
      payload: data.actions
    });
  });
  
  // Action result
  websocketClient.onMessageType('action_result', (data) => {
    dispatch({
      type: ACTION_RESULT,
      payload: data
    });
  });
  
  // Movement tiles
  websocketClient.onMessageType('movement_tiles', (data) => {
    dispatch({
      type: MOVEMENT_RECEIVE_TILES,
      payload: { tiles: data.tiles }
    });
  });
  
  // Chat messages
  websocketClient.onMessageType('chat_message', (data) => {
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
      console.log('Received chat_message:', data);
    }
    
    // Ensure the message has all required fields for a ChatMessage
    const message = {
      id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`,
      sender: data.sender || 'Unknown',
      content: data.content || '',
      timestamp: data.timestamp || Date.now(),
      type: data.type || 'system'
    };
    
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
      console.log('Formatted chat message for Redux:', message);
    }
    
    // Check if this is a duplicate message
    if (isMessageDuplicate(message)) {
      if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
        console.log('Duplicate message detected, skipping dispatch:', message.id);
      }
      return;
    }
    
    // Add to cache to prevent future duplicates
    cacheMessage(message);
    
    // Add additional debugging
    try {
      // Only dispatch one action to prevent duplication
      // We'll use the primary Redux action creator
      dispatch(messageReceived(message));
      if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
        console.log('Successfully dispatched messageReceived action');
      }
      
      // Don't dispatch the secondary action that was causing duplication
      // dispatch(chatReceiveAction(message));
      // console.log('Successfully dispatched chatReceiveAction');
    } catch (error) {
      console.error('Failed to dispatch chat message:', error);
      
      // Fallback to plain action if the dispatch fails
      try {
        dispatch({
          type: CHAT_RECEIVE,
          payload: message
        });
        if (process.env.NODE_ENV === 'development' && localStorage.getItem('verbose_logging') === 'true') {
          console.log('Successfully dispatched CHAT_RECEIVE action');
        }
      } catch (fallbackError) {
        console.error('Even fallback dispatch failed:', fallbackError);
      }
    }
  });
  
  // Game logs
  websocketClient.onMessageType('game_logs', (data) => {
    dispatch({
      type: LOGS_ADD_ENTRIES,
      payload: data.entries
    });
  });
  
  // Handle different message types based on their 'type' field
  websocketClient.on('message', (message) => {
    try {
      const { type, data } = message;
      
      // Dispatch a generic message received action
      dispatch(socketMessageReceived({ type, data }));
      
      // Handle specific message types using the provided handlers
      if (type && messageHandlers[type]) {
        messageHandlers[type](data, dispatch, getState);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      dispatch(showError(
        'Message Error', 
        'Failed to process server message',
        5000
      ));
    }
  });
};

// Default message handlers
const defaultMessageHandlers: MessageHandlers = {
  // Handle server errors
  server_error: (data, dispatch) => {
    const { message, details, code } = data;
    dispatch(showError(
      message || 'Server Error',
      details || `Error code: ${code}`,
      10000
    ));
  }
};

// Create and export the default socket middleware
export const socketMiddleware = createSocketMiddleware(defaultMessageHandlers);

// Helper function to handle max reconnect failure
const handleMaxReconnectFailure = (dispatch: Dispatch<AnyAction>) => {
  // Max attempts reached, stop trying
  dispatch(reconnectFailed());
  
  // Show detailed error with diagnostics
  const diagnostics = getConnectionDiagnostics();
  dispatch(showError(
    'Connection Failed', 
    `Could not establish connection to the game server. Please check your connection and try again.\n\nDiagnostics: ${diagnostics}`,
    0 // Persistent notification
  ));
}; 