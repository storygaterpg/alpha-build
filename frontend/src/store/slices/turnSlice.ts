import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  TURN_SET_ACTIVE_ACTOR, 
  TURN_SET_AVAILABLE_ACTIONS, 
  ACTION_REQUEST_MOVE, 
  ACTION_REQUEST_ATTACK,
  ACTION_REQUEST_END_TURN,
  ACTION_RESULT
} from '../actionTypes';

// Available action types
export type ActionType = 'move' | 'attack' | 'cast' | 'use' | 'dash' | 'disengage' | 'dodge' | 'help' | 'hide' | 'ready' | 'end';

// Action result interface
export interface ActionResult {
  type: ActionType;
  actorId: string;
  success: boolean;
  message: string;
  affectedActors: {
    id: string;
    changes: {
      hp?: number;
      position?: { x: number; y: number };
      conditions?: string[];
    }
  }[];
}

// Turn state interface
export interface TurnState {
  round: number;
  activeActorId: string | null;
  initiative: {
    actorId: string;
    initiative: number;
  }[];
  availableActions: ActionType[];
  isPlayerTurn: boolean;
  isCombatActive: boolean;
  pendingAction: ActionType | null;
  pendingTarget: { x: number; y: number } | string | null;
  lastActionResult: ActionResult | null;
}

const initialState: TurnState = {
  round: 1,
  activeActorId: null,
  initiative: [],
  availableActions: [],
  isPlayerTurn: false,
  isCombatActive: false,
  pendingAction: null,
  pendingTarget: null,
  lastActionResult: null
};

const turnSlice = createSlice({
  name: 'turn',
  initialState,
  reducers: {
    // Set the currently active actor
    setActiveActor: (state, action: PayloadAction<string>) => {
      state.activeActorId = action.payload;
      // Determine if it's the player's turn
      state.isPlayerTurn = action.payload === 'player-id'; // Replace with actual player ID check
    },
    
    // Set available actions for the current actor
    setAvailableActions: (state, action: PayloadAction<ActionType[]>) => {
      state.availableActions = action.payload;
    },
    
    // Start combat
    startCombat: (state, action: PayloadAction<{ initiative: { actorId: string; initiative: number }[] }>) => {
      state.isCombatActive = true;
      state.round = 1;
      state.initiative = action.payload.initiative.sort((a, b) => b.initiative - a.initiative);
      state.activeActorId = state.initiative[0]?.actorId || null;
      state.isPlayerTurn = state.activeActorId === 'player-id'; // Replace with actual player ID check
    },
    
    // End combat
    endCombat: (state) => {
      state.isCombatActive = false;
      state.round = 1;
      state.initiative = [];
      state.activeActorId = null;
      state.availableActions = [];
      state.isPlayerTurn = false;
      state.pendingAction = null;
      state.pendingTarget = null;
      state.lastActionResult = null;
    },
    
    // Set pending action
    setPendingAction: (state, action: PayloadAction<ActionType>) => {
      state.pendingAction = action.payload;
      state.pendingTarget = null;
    },
    
    // Set pending target
    setPendingTarget: (state, action: PayloadAction<{ x: number; y: number } | string>) => {
      state.pendingTarget = action.payload;
    },
    
    // Clear pending action
    clearPendingAction: (state) => {
      state.pendingAction = null;
      state.pendingTarget = null;
    },
    
    // Process action result
    processActionResult: (state, action: PayloadAction<ActionResult>) => {
      state.lastActionResult = action.payload;
      state.pendingAction = null;
      state.pendingTarget = null;
    },
    
    // Move to next turn
    nextTurn: (state) => {
      // Find the current actor's index
      const currentIndex = state.initiative.findIndex(i => i.actorId === state.activeActorId);
      
      // If at the end of the initiative order, start a new round
      if (currentIndex === state.initiative.length - 1 || currentIndex === -1) {
        state.round += 1;
        state.activeActorId = state.initiative[0]?.actorId || null;
      } else {
        // Otherwise, move to the next actor
        state.activeActorId = state.initiative[currentIndex + 1]?.actorId || null;
      }
      
      state.isPlayerTurn = state.activeActorId === 'player-id'; // Replace with actual player ID check
      state.pendingAction = null;
      state.pendingTarget = null;
    }
  }
});

// Export actions
export const {
  setActiveActor,
  setAvailableActions,
  startCombat,
  endCombat,
  setPendingAction,
  setPendingTarget,
  clearPendingAction,
  processActionResult,
  nextTurn
} = turnSlice.actions;

// Thunk actions
export const requestMoveAction = (actorId: string) => ({
  type: ACTION_REQUEST_MOVE,
  payload: { actorId }
});

export const requestAttackAction = (actorId: string) => ({
  type: ACTION_REQUEST_ATTACK,
  payload: { actorId }
});

export const requestEndTurn = () => ({
  type: ACTION_REQUEST_END_TURN
});

export default turnSlice.reducer; 