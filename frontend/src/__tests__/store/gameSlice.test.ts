import gameReducer, { toggleLogFilter, setLogFilters } from '../../store/slices/gameSlice';

describe('gameSlice logs filter reducers', () => {
  it('should return the initial state with all filters enabled', () => {
    const initialState = gameReducer(undefined, { type: '' });
    expect(initialState.logs.filters).toEqual({
      info: true,
      combat: true,
      loot: true,
      quest: true,
      achievement: true,
      error: true
    });
  });

  it('should toggle a single log filter', () => {
    const initialState = gameReducer(undefined, { type: '' });
    const nextState = gameReducer(initialState, toggleLogFilter('combat'));
    // combat was true, should now be false
    expect(nextState.logs.filters.combat).toBe(false);
    // other filters remain unchanged
    Object.entries(initialState.logs.filters).forEach(([type, enabled]) => {
      if (type !== 'combat') {
        const key = type as keyof typeof initialState.logs.filters;
        expect(nextState.logs.filters[key]).toBe(enabled);
      }
    });
  });

  it('should set multiple filters at once', () => {
    const initialState = gameReducer(undefined, { type: '' });
    const newFilters = {
      info: false,
      combat: false,
      loot: false,
      quest: false,
      achievement: false,
      error: false
    };
    const nextState = gameReducer(initialState, setLogFilters(newFilters));
    expect(nextState.logs.filters).toEqual(newFilters);
  });
}); 