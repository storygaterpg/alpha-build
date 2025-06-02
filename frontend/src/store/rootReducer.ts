import { combineReducers } from '@reduxjs/toolkit';
import gameReducer from './slices/gameSlice';
import settingsReducer from './slices/settingsSlice';
import socketReducer from './slices/socketSlice';
import chatReducer from './slices/chatSlice';
import mapReducer from './slices/mapSlice';
import actorsReducer from './slices/actorsSlice';
import logsReducer from './slices/logsSlice';
import turnReducer from './slices/turnSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';
import connectionReducer from './slices/connectionSlice';

const rootReducer = combineReducers({
  game: gameReducer,
  settings: settingsReducer,
  socket: socketReducer,
  chat: chatReducer,
  map: mapReducer,
  actors: actorsReducer,
  logs: logsReducer,
  turn: turnReducer,
  notifications: notificationReducer,
  ui: uiReducer,
  connection: connectionReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer; 