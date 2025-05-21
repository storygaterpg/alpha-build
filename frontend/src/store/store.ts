// src/store/store.ts

import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './gameSlice';

/**
 * Redux store configuration.
 * Combines all slices for global state management.
 */
const store = configureStore({
  reducer: {
    game: gameReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
