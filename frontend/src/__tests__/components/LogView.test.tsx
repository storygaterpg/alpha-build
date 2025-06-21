import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import gameReducer, { addLogEntry } from '../../store/slices/gameSlice';
import LogView from '../../components/LogView';
import '@testing-library/jest-dom';

// Helper to initialize store with game reducer
const renderWithStore = (ui: React.ReactElement, preloadedState?: any) => {
  // Create a root reducer combining only game slice
  const rootReducer = combineReducers({ game: gameReducer });
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
  });
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>)
  };
};

describe('LogView component', () => {
  beforeEach(() => {
    // clear localStorage before each test
    localStorage.clear();
  });

  it('renders log entries from state', () => {
    const { store: initialStore } = renderWithStore(<LogView />);
    // dispatch two log entries
    initialStore.dispatch(addLogEntry({ id: '1', type: 'combat', message: 'Combat occurred', timestamp: Date.now() }));
    initialStore.dispatch(addLogEntry({ id: '2', type: 'loot', message: 'Loot found', timestamp: Date.now() }));
    // clear previous render
    cleanup();
    // render again with updated state
    renderWithStore(<LogView />, { game: initialStore.getState().game });

    expect(screen.getByText(/\[COMBAT\]/)).toBeInTheDocument();
    expect(screen.getByText(/Loot found/)).toBeInTheDocument();
  });

  it('filters out logs when toggling filter checkbox', () => {
    const { store: initialStore } = renderWithStore(<LogView />);
    // add entries
    initialStore.dispatch(addLogEntry({ id: '1', type: 'combat', message: 'Combat occurred', timestamp: Date.now() }));
    initialStore.dispatch(addLogEntry({ id: '2', type: 'info', message: 'Some info', timestamp: Date.now() }));
    // clear previous render
    cleanup();
    // render again with updated state
    renderWithStore(<LogView />, { game: initialStore.getState().game });

    // open filter dropdown
    const filterButton = screen.getByLabelText('Log filters');
    fireEvent.click(filterButton);
    // uncheck COMBAT
    const combatCheckbox = screen.getByLabelText('COMBAT');
    fireEvent.click(combatCheckbox);

    // combat entry should be gone
    expect(screen.queryByText('Combat occurred')).not.toBeInTheDocument();
    // info entry still present
    expect(screen.getByText('Some info')).toBeInTheDocument();
  });

  it('loads saved filter state and persists changes to localStorage', () => {
    // preset localStorage to disable combat
    const savedFilters = {
      info: true,
      combat: false,
      loot: true,
      quest: true,
      achievement: true,
      error: true
    };
    localStorage.setItem('logFilters', JSON.stringify(savedFilters));

    const { store: initialStore } = renderWithStore(<LogView />);
    // add a combat entry
    initialStore.dispatch(addLogEntry({ id: '1', type: 'combat', message: 'Combat occurred', timestamp: Date.now() }));
    // clear previous render
    cleanup();
    // render again with updated state
    renderWithStore(<LogView />, { game: initialStore.getState().game });

    // Since combat filter is false, entry should not render
    expect(screen.queryByText('Combat occurred')).not.toBeInTheDocument();

    // open dropdown and toggle INFO off
    const filterButton = screen.getByLabelText('Log filters');
    fireEvent.click(filterButton);
    const infoCheckbox = screen.getByLabelText('INFO');
    fireEvent.click(infoCheckbox);

    // verify localStorage updated
    const updated = JSON.parse(localStorage.getItem('logFilters') || '{}');
    expect(updated.info).toBe(false);
  });
}); 