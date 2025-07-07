import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MAP_REQUEST, MAP_RECEIVE, MOVEMENT_REQUEST_TILES, MOVEMENT_RECEIVE_TILES } from '../actionTypes';

// Define tile types
export type TileType = 'floor' | 'wall' | 'door' | 'water' | 'lava' | 'trap' | 'obstacle';

// Define a map tile
export interface MapTile {
  x: number;
  y: number;
  type: TileType;
  passable: boolean;
  revealed: boolean;
  visible: boolean;
}

// Define the map state
export interface MapState {
  width: number;
  height: number;
  tiles: MapTile[];
  loading: boolean;
  error: string | null;
  highlightedTiles: { x: number; y: number }[];
}

const initialState: MapState = {
  width: 0,
  height: 0,
  tiles: [],
  loading: false,
  error: null,
  highlightedTiles: []
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    // Map loading states
    requestMap: (state) => {
      state.loading = true;
      state.error = null;
    },
    
    receiveMap: (state, action: PayloadAction<{ width: number; height: number; tiles: MapTile[] }>) => {
      state.width = action.payload.width;
      state.height = action.payload.height;
      state.tiles = action.payload.tiles;
      state.loading = false;
    },
    
    mapLoadError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    
    // Movement highlight
    requestMovementTiles: (state, action: PayloadAction<{ actorId: string }>) => {
      // This just prepares the state for highlighting
      state.highlightedTiles = [];
    },
    
    receiveMovementTiles: (state, action: PayloadAction<{ tiles: { x: number; y: number }[] }>) => {
      state.highlightedTiles = action.payload.tiles;
    },
    
    clearHighlightedTiles: (state) => {
      state.highlightedTiles = [];
    },
    
    // Reveal/hide tiles (for fog of war)
    updateTileVisibility: (state, action: PayloadAction<{ x: number; y: number; visible: boolean; revealed: boolean }>) => {
      const { x, y, visible, revealed } = action.payload;
      const tileIndex = state.tiles.findIndex(tile => tile.x === x && tile.y === y);
      
      if (tileIndex >= 0) {
        state.tiles[tileIndex].visible = visible;
        if (revealed) {
          state.tiles[tileIndex].revealed = revealed;
        }
      }
    },
    
    // Update multiple tiles at once
    updateTiles: (state, action: PayloadAction<MapTile[]>) => {
      action.payload.forEach(updatedTile => {
        const tileIndex = state.tiles.findIndex(tile => 
          tile.x === updatedTile.x && tile.y === updatedTile.y
        );
        
        if (tileIndex >= 0) {
          state.tiles[tileIndex] = {...state.tiles[tileIndex], ...updatedTile};
        }
      });
    }
  }
});

// Export actions
export const {
  requestMap,
  receiveMap,
  mapLoadError,
  requestMovementTiles,
  receiveMovementTiles,
  clearHighlightedTiles,
  updateTileVisibility,
  updateTiles
} = mapSlice.actions;

// Thunk actions to request map data
export const requestMapData = () => ({
  type: MAP_REQUEST
});

export const requestMovementHighlight = (actorId: string) => ({
  type: MOVEMENT_REQUEST_TILES,
  payload: { actorId }
});

export default mapSlice.reducer; 