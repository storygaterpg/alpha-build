import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import rootReducer, { RootState } from './rootReducer';
import { socketMiddleware } from './middleware/socketMiddleware'

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'your/non-serializable/action',
          'socket/connect',
          'socket/connected',
          'socket/disconnect',
          'socket/disconnected',
          'socket/messageReceived',
          'connection/online',
          'connection/offline',
          'map/request',
          'map/receive',
          'actors/request',
          'actors/receive',
          'sheet/request',
          'sheet/receive',
          'turn/setActiveActor',
          'turn/setAvailableActions',
          'action/requestMove',
          'action/requestAttack',
          'action/requestEndTurn',
          'action/result',
          'movement/requestTiles',
          'movement/receiveTiles',
          'chat/sendInCharacter',
          'chat/sendOutOfCharacter',
          'chat/receive',
          'logs/addEntries',
          'logs/clear',
          'notification/showError',
          'notification/clearError',
          'ui/showCharacterSheet',
          'ui/hideCharacterSheet',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates', 'socket.lastMessage'],
      },
    }).concat(socketMiddleware),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type { RootState };
export type AppDispatch = typeof store.dispatch

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

