import React from 'react';
// Mock Phaser Game constructor to throw an initialization error
jest.mock('../../phaser/game', () => {
  return {
    __esModule: true,
    Game: class {
      constructor(config: any) {
        throw new Error('Test init error');
      }
    }
  };
});
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../../store/slices/gameSlice';
import mapReducer from '../../store/slices/mapSlice';
import MapPanel from '../../components/MapPanel';

describe('MapPanel error overlay', () => {
  it('displays error message and reload button when error present', () => {
    const initialState = {
      ...gameReducer(undefined, { type: '' }),
      error: 'Test error'
    };
    const store = configureStore({
      reducer: { game: gameReducer, map: mapReducer },
      preloadedState: { game: initialState, map: mapReducer(undefined, { type: '' }) }
    });

    render(
      <Provider store={store}>
        <MapPanel />
      </Provider>
    );

    // Check error overlay text from thrown initialization error
    expect(screen.getByText('Game initialization failed: Test init error')).toBeInTheDocument();
    // Reload button is present
    const reloadBtn = screen.getByRole('button', { name: /Reload/i });
    expect(reloadBtn).toBeInTheDocument();
  });
}); 