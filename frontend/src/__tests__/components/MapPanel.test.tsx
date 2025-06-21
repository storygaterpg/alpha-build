// Stub CSS imports
jest.mock('../../styles/phaser.css', () => ({}), { virtual: true });
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../../store/slices/gameSlice';
import mapReducer, { requestMovementTiles, receiveMovementTiles, clearHighlightedTiles } from '../../store/slices/mapSlice';
import MapPanel from '../../components/MapPanel';

// Mock PhaserGame and MainScene
jest.mock('../../phaser/game', () => {
  const jestObj = jest;
  class FakeScene {
    events = { once: jestObj.fn((evt, cb) => cb()) };
    setMovementEnabled = jestObj.fn();
    setOnActorMove = jestObj.fn();
    findPath = jestObj.fn((start, end) => [{ x: end.x, y: end.y }]);
    showPath = jestObj.fn();
    getActor = jestObj.fn((id) => ({ position: { x: 1, y: 2 } }));
    getActorIds = jestObj.fn(() => ['actor-1']);
    getPlayerId = jestObj.fn(() => 'actor-1');
    teleportActor = jestObj.fn();
    updateActorPosition = jestObj.fn();
  }
  class FakeGame {
    scene = new FakeScene();
    constructor(config: any) {}
    getScene(key: string) { return this.scene; }
    getGameInstance() { return { scale: { refresh: jestObj.fn() } }; }
    destroy() {}
  }
  return { __esModule: true, Game: FakeGame };
});

describe('MapPanel integration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Create Redux store with game and map slices
    store = configureStore({ reducer: { game: gameReducer, map: mapReducer } });
    // Spy on dispatch
    jest.spyOn(store, 'dispatch');
    // Stub window.alert for Shorten Path
    window.alert = jest.fn();

    render(
      <Provider store={store}>
        <MapPanel />
      </Provider>
    );
  });

  it('handles Move button: enables movement and dispatches movement tile actions', async () => {
    const moveBtn = screen.getByRole('button', { name: /Move/i });
    // First click: enter move mode
    fireEvent.click(moveBtn);
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(requestMovementTiles({ actorId: 'actor-1' }));
      expect(store.dispatch).toHaveBeenCalledWith(receiveMovementTiles({ tiles: [{ x: 1, y: 2 }] }));
    });
    // Second click: optimize path
    fireEvent.click(moveBtn);
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(clearHighlightedTiles());
      expect(store.dispatch).toHaveBeenCalledWith(
        receiveMovementTiles({ tiles: [{ x: 1, y: 2 }, { x: 1, y: 2 }] })
      );
    });
  });

  it('handles Clear button: disables movement and resets path', async () => {
    // Enter move mode first to establish startPosition
    const moveBtn = screen.getByRole('button', { name: /Move/i });
    fireEvent.click(moveBtn);
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(requestMovementTiles({ actorId: 'actor-1' }));
      expect(store.dispatch).toHaveBeenCalledWith(receiveMovementTiles({ tiles: [{ x: 1, y: 2 }] }));
    });
    // Now clear the movement to reset
    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(clearHighlightedTiles());
      expect(store.dispatch).toHaveBeenCalledWith(
        receiveMovementTiles({ tiles: [{ x: 1, y: 2 }] })
      );
    });
  });
}); 