// Connection
export const CONNECTION_ONLINE = 'connection/online';
export const CONNECTION_OFFLINE = 'connection/offline';

// Map Data
export const MAP_REQUEST = 'map/request';
export const MAP_RECEIVE = 'map/receive';

// Actors & Sheets
export const ACTORS_REQUEST = 'actors/request';
export const ACTORS_RECEIVE = 'actors/receive';
export const SHEET_REQUEST = 'sheet/request';
export const SHEET_RECEIVE = 'sheet/receive';

// Turn & Actions
export const TURN_SET_ACTIVE_ACTOR = 'turn/setActiveActor';
export const TURN_SET_AVAILABLE_ACTIONS = 'turn/setAvailableActions';
export const ACTION_REQUEST_MOVE = 'action/requestMove';
export const ACTION_REQUEST_ATTACK = 'action/requestAttack';
export const ACTION_REQUEST_END_TURN = 'action/requestEndTurn';
export const ACTION_RESULT = 'action/result';

// Movement & Overlays
export const MOVEMENT_REQUEST_TILES = 'movement/requestTiles';
export const MOVEMENT_RECEIVE_TILES = 'movement/receiveTiles';

// Chat
export const CHAT_SEND_IN_CHARACTER = 'chat/sendInCharacter';
export const CHAT_SEND_OUT_OF_CHARACTER = 'chat/sendOutOfCharacter';
export const CHAT_RECEIVE = 'chat/receive';

// Logs
export const LOGS_ADD_ENTRIES = 'logs/addEntries';
export const LOGS_CLEAR = 'logs/clear';

// Notifications
export const NOTIFICATION_SHOW_ERROR = 'notification/showError';
export const NOTIFICATION_CLEAR_ERROR = 'notification/clearError';

// UI State
export const UI_SHOW_CHARACTER_SHEET = 'ui/showCharacterSheet';
export const UI_HIDE_CHARACTER_SHEET = 'ui/hideCharacterSheet'; 