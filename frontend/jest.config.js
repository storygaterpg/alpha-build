// ==== jest.config.js ==== 
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1'
    },
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest'
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  };
  
  // ==== src/setupTests.ts ==== 
  import '@testing-library/jest-dom';
  
  // ==== src/store/__tests__/gameSlice.test.ts ==== 
  import gameReducer, { setMapData, addChatMessage, clearLogs, setActors } from '../gameSlice';
  import { MapData, ChatMessage, Actor } from '../gameSlice';
  
  describe('gameSlice reducer', () => {
    const initialState = gameReducer(undefined, { type: '' });
  
    it('should handle initial state', () => {
      expect(initialState.mapData).toBeNull();
      expect(initialState.chat).toEqual([]);
      expect(initialState.logs).toEqual([]);
      expect(initialState.actors).toEqual([]);
    });
  
    it('should handle setMapData', () => {
      const map: MapData = { width: 2, height: 2, tiles: [0,1,2,3] };
      const nextState = gameReducer(initialState, setMapData(map));
      expect(nextState.mapData).toEqual(map);
    });
  
    it('should handle addChatMessage', () => {
      const msg: ChatMessage = { sender: 'Player', text: 'Hello' };
      const nextState = gameReducer(initialState, addChatMessage(msg));
      expect(nextState.chat).toHaveLength(1);
      expect(nextState.chat[0]).toEqual(msg);
    });
  
    it('should handle clearLogs', () => {
      const stateWithLogs = {...initialState, logs: ['log1', 'log2']};
      const nextState = gameReducer(stateWithLogs, clearLogs());
      expect(nextState.logs).toEqual([]);
    });
  
    it('should handle setActors', () => {
      const actors: Actor[] = [ { id: '1', name: 'Goblin', x:0, y:0, sprite:'0', hp:10, maxHp:10 } ];
      const nextState = gameReducer(initialState, setActors(actors));
      expect(nextState.actors).toEqual(actors);
    });
  });
  