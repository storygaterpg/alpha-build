import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ACTORS_REQUEST, ACTORS_RECEIVE, SHEET_REQUEST, SHEET_RECEIVE } from '../actionTypes';

// Basic actor interface
export interface Actor {
  id: string;
  name: string;
  type: 'pc' | 'npc' | 'monster';
  position: { x: number; y: number };
  hp: number;
  maxHp: number;
  initiative: number;
  conditions: string[];
  portraitUrl?: string;
}

// Character sheet interface
export interface CharacterSheet {
  id: string;
  name: string;
  class: string;
  level: number;
  race: string;
  background: string;
  alignment: string;
  experience: number;
  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  skills: Record<string, number>;
  proficiencies: string[];
  equipment: string[];
  spells: string[];
  features: string[];
  description: string;
  // Additional character details as needed
}

// Actor state interface
export interface ActorsState {
  actors: Actor[];
  activeActorId: string | null;
  selectedActorId: string | null;
  loadingActors: boolean;
  characterSheets: Record<string, CharacterSheet>;
  loadingSheet: boolean;
  error: string | null;
}

const initialState: ActorsState = {
  actors: [],
  activeActorId: null,
  selectedActorId: null,
  loadingActors: false,
  characterSheets: {},
  loadingSheet: false,
  error: null
};

const actorsSlice = createSlice({
  name: 'actors',
  initialState,
  reducers: {
    // Actor loading states
    requestActors: (state) => {
      state.loadingActors = true;
      state.error = null;
    },
    
    receiveActors: (state, action: PayloadAction<Actor[]>) => {
      state.actors = action.payload;
      state.loadingActors = false;
    },
    
    // Character sheet loading
    requestCharacterSheet: (state, action: PayloadAction<string>) => {
      state.loadingSheet = true;
      state.error = null;
    },
    
    receiveCharacterSheet: (state, action: PayloadAction<CharacterSheet>) => {
      state.characterSheets[action.payload.id] = action.payload;
      state.loadingSheet = false;
    },
    
    // Error handling
    setActorsError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loadingActors = false;
      state.loadingSheet = false;
    },
    
    // Actor selection and active state
    setActiveActor: (state, action: PayloadAction<string>) => {
      state.activeActorId = action.payload;
    },
    
    selectActor: (state, action: PayloadAction<string | null>) => {
      state.selectedActorId = action.payload;
    },
    
    // Update actor state
    updateActor: (state, action: PayloadAction<Partial<Actor> & { id: string }>) => {
      const index = state.actors.findIndex(actor => actor.id === action.payload.id);
      if (index >= 0) {
        state.actors[index] = { ...state.actors[index], ...action.payload };
      }
    },
    
    // Update multiple actors at once
    updateActors: (state, action: PayloadAction<(Partial<Actor> & { id: string })[]>) => {
      action.payload.forEach(actorUpdate => {
        const index = state.actors.findIndex(actor => actor.id === actorUpdate.id);
        if (index >= 0) {
          state.actors[index] = { ...state.actors[index], ...actorUpdate };
        }
      });
    },
    
    // Add a new actor
    addActor: (state, action: PayloadAction<Actor>) => {
      state.actors.push(action.payload);
    },
    
    // Remove an actor
    removeActor: (state, action: PayloadAction<string>) => {
      state.actors = state.actors.filter(actor => actor.id !== action.payload);
    }
  }
});

// Export actions
export const {
  requestActors,
  receiveActors,
  requestCharacterSheet,
  receiveCharacterSheet,
  setActorsError,
  setActiveActor,
  selectActor,
  updateActor,
  updateActors,
  addActor,
  removeActor
} = actorsSlice.actions;

// Thunk actions
export const requestAllActors = () => ({
  type: ACTORS_REQUEST
});

export const requestActorSheet = (actorId: string) => ({
  type: SHEET_REQUEST,
  payload: { actorId }
});

export default actorsSlice.reducer; 