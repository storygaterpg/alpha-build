// src/store/gameSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/** Types for various parts of game state */
export interface TileData {
  x: number;
  y: number;
  id: number;
}

export interface MapData {
  width: number;
  height: number;
  tiles: number[];
}

export interface ChatMessage {
  sender: string;
  text: string;
  imageUrl?: string;
}

export interface Actor {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
  hp: number;
  maxHp: number;
}

export interface CharacterSheet {
  id: string;
  name: string;
  stats: { [key: string]: number };
  skills: { [key: string]: number };
  hp: number;
  maxHp: number;
}

/** Full slice of the game state */
interface GameState {
  playerId: string;
  mapData: MapData | null;
  movementOverlay: TileData[];
  chat: ChatMessage[];
  actors: Actor[];
  activeActorId: string | null;
  availableActions: string[];
  logs: string[];
  sheetVisible: boolean;
  sheetData: CharacterSheet | null;
}

/** Initial values for game state */
const initialState: GameState = {
  playerId: '',
  mapData: null,
  movementOverlay: [],
  chat: [],
  actors: [],
  activeActorId: null,
  availableActions: [],
  logs: [],
  sheetVisible: false,
  sheetData: null
};

/** Redux slice for game logic */
const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    /** Set the local player’s identifier */
    setPlayerId(state, action: PayloadAction<string>) {
      state.playerId = action.payload;
    },
    /** Update map data from server */
    setMapData(state, action: PayloadAction<MapData>) {
      state.mapData = action.payload;
    },
    /** Highlight reachable/moveable tiles */
    setMovementOverlay(state, action: PayloadAction<TileData[]>) {
      state.movementOverlay = action.payload;
    },
    /** Add a chat message (player or AI) */
    addChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.chat.push(action.payload);
    },
    /** Replace current actors list */
    setActors(state, action: PayloadAction<Actor[]>) {
      state.actors = action.payload;
    },
    /** Mark which actor’s turn it is */
    setActiveActor(state, action: PayloadAction<string>) {
      state.activeActorId = action.payload;
    },
    /** Update the list of actions available this turn */
    setAvailableActions(state, action: PayloadAction<string[]>) {
      state.availableActions = action.payload;
    },
    /** Append engine logs (e.g., combat narration) */
    addLogEntries(state, action: PayloadAction<string[]>) {
      state.logs.push(...action.payload);
    },
    /** Clear all log entries */
    clearLogs(state) {
      state.logs = [];
    },
    /** Show a character (or enemy) sheet modal */
    showSheet(state, action: PayloadAction<CharacterSheet>) {
      state.sheetData = action.payload;
      state.sheetVisible = true;
    },
    /** Hide the sheet modal */
    hideSheet(state) {
      state.sheetVisible = false;
      state.sheetData = null;
    }
  }
});

export const {
  setPlayerId,
  setMapData,
  setMovementOverlay,
  addChatMessage,
  setActors,
  setActiveActor,
  setAvailableActions,
  addLogEntries,
  clearLogs,
  showSheet,
  hideSheet
} = gameSlice.actions;

export default gameSlice.reducer;
