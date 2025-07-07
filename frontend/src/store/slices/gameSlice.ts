import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid'
import { 
  GameState, 
  MapData, 
  Actor, 
  Position, 
  ChatMessage, 
  LogEntry, 
  GamePhase,
  ActorType,
  Stats,
  Item,
  Skill
} from '../types'

// Create default player stats
const defaultStats: Stats = {
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  strength: 10,
  dexterity: 10,
  intelligence: 10,
  constitution: 10,
  wisdom: 10,
  charisma: 10
}

const initialState: GameState = {
  isLoading: false,
  playerName: '',
  currentMapId: null,
  maps: {},
  actors: {},
  player: null,
  chat: {
    messages: [],
    unread: 0
  },
  logs: {
    entries: [],
    unread: 0,
    filters: {
      info: true,
      combat: true,
      loot: true,
      quest: true,
      achievement: true,
      error: true
    }
  },
  turnState: {
    currentActorId: null,
    phase: GamePhase.EXPLORATION,
    round: 0,
    initiative: []
  },
  sheetModal: {
    isOpen: false,
    actorId: null
  },
  error: null
}

// Helper function to add log entries within reducers
function createLogEntry(message: string, type: LogEntry['type']): LogEntry {
  return {
    id: uuidv4(),
    message,
    timestamp: Date.now(),
    type
  }
}

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    
    // Player name
    setPlayerName: (state, action: PayloadAction<string>) => {
      state.playerName = action.payload
      
      // If we have a player object, update its name too
      if (state.player) {
        state.player.name = action.payload
        state.actors[state.player.id].name = action.payload
      }
    },
    
    // Map management
    setCurrentMap: (state, action: PayloadAction<string>) => {
      state.currentMapId = action.payload
    },
    
    addMap: (state, action: PayloadAction<MapData>) => {
      state.maps[action.payload.id] = action.payload
    },
    
    updateMap: (state, action: PayloadAction<MapData>) => {
      if (state.maps[action.payload.id]) {
        state.maps[action.payload.id] = action.payload
      }
    },
    
    // Actor management
    addActor: (state, action: PayloadAction<Actor>) => {
      state.actors[action.payload.id] = action.payload
    },
    
    updateActor: (state, action: PayloadAction<{ id: string, updates: Partial<Actor> }>) => {
      const { id, updates } = action.payload
      if (state.actors[id]) {
        state.actors[id] = { ...state.actors[id], ...updates }
        
        // If this is the player, update the player reference too
        if (state.player && state.player.id === id) {
          state.player = state.actors[id]
        }
      }
    },
    
    removeActor: (state, action: PayloadAction<string>) => {
      const id = action.payload
      if (state.actors[id]) {
        delete state.actors[id]
        
        // If this was the player, set player to null
        if (state.player && state.player.id === id) {
          state.player = null
        }
        
        // Remove from initiative if present
        state.turnState.initiative = state.turnState.initiative.filter(actorId => actorId !== id)
        
        // If this was the current actor, move to the next one
        if (state.turnState.currentActorId === id) {
          const index = state.turnState.initiative.indexOf(id)
          if (index >= 0 && state.turnState.initiative.length > 0) {
            const nextIndex = index % state.turnState.initiative.length
            state.turnState.currentActorId = state.turnState.initiative[nextIndex]
          } else {
            state.turnState.currentActorId = null
          }
        }
      }
    },
    
    // Player specific actions
    createPlayer: (state, action: PayloadAction<string>) => {
      const playerId = uuidv4()
      const playerName = action.payload || 'Player'
      
      const newPlayer: Actor = {
        id: playerId,
        name: playerName,
        type: ActorType.PLAYER,
        position: { x: 0, y: 0 },
        stats: { ...defaultStats },
        skills: [],
        inventory: [],
        level: 1,
        experience: 0,
        nextLevelExperience: 100
      }
      
      state.player = newPlayer
      state.actors[playerId] = newPlayer
      state.playerName = playerName
    },
    
    moveActor: (state, action: PayloadAction<{ actorId: string, position: Position }>) => {
      const { actorId, position } = action.payload
      if (state.actors[actorId]) {
        state.actors[actorId].position = position
        
        // Update player reference if needed
        if (state.player && state.player.id === actorId) {
          state.player.position = position
        }
      }
    },
    
    // Inventory management
    addItemToActor: (state, action: PayloadAction<{ actorId: string, item: Item }>) => {
      const { actorId, item } = action.payload
      if (state.actors[actorId]) {
        // Check if actor already has this item
        const existingItemIndex = state.actors[actorId].inventory.findIndex(i => i.id === item.id)
        
        if (existingItemIndex >= 0) {
          // Increase quantity
          state.actors[actorId].inventory[existingItemIndex].quantity += item.quantity
        } else {
          // Add new item
          state.actors[actorId].inventory.push(item)
        }
        
        // Update player reference if needed
        if (state.player && state.player.id === actorId) {
          state.player.inventory = state.actors[actorId].inventory
        }
        
        // Add log entry
        const actorName = state.actors[actorId].name
        const logEntry = createLogEntry(
          `${actorName} received ${item.quantity} ${item.name}`,
          'loot'
        )
        state.logs.entries.push(logEntry)
        state.logs.unread += 1
      }
    },
    
    removeItemFromActor: (state, action: PayloadAction<{ actorId: string, itemId: string, quantity: number }>) => {
      const { actorId, itemId, quantity } = action.payload
      if (state.actors[actorId]) {
        const itemIndex = state.actors[actorId].inventory.findIndex(i => i.id === itemId)
        
        if (itemIndex >= 0) {
          const currentQuantity = state.actors[actorId].inventory[itemIndex].quantity
          const itemName = state.actors[actorId].inventory[itemIndex].name
          
          if (currentQuantity <= quantity) {
            // Remove the item entirely
            state.actors[actorId].inventory.splice(itemIndex, 1)
          } else {
            // Reduce quantity
            state.actors[actorId].inventory[itemIndex].quantity -= quantity
          }
          
          // Update player reference if needed
          if (state.player && state.player.id === actorId) {
            state.player.inventory = state.actors[actorId].inventory
          }
          
          // Add log entry
          const actorName = state.actors[actorId].name
          const logEntry = createLogEntry(
            `${actorName} lost ${quantity} ${itemName}`,
            'loot'
          )
          state.logs.entries.push(logEntry)
          state.logs.unread += 1
        }
      }
    },
    
    // Skill management
    addSkillToActor: (state, action: PayloadAction<{ actorId: string, skill: Skill }>) => {
      const { actorId, skill } = action.payload
      if (state.actors[actorId]) {
        const existingSkillIndex = state.actors[actorId].skills.findIndex(s => s.id === skill.id)
        
        if (existingSkillIndex >= 0) {
          // Update existing skill
          state.actors[actorId].skills[existingSkillIndex] = skill
        } else {
          // Add new skill
          state.actors[actorId].skills.push(skill)
        }
        
        // Update player reference if needed
        if (state.player && state.player.id === actorId) {
          state.player.skills = state.actors[actorId].skills
        }
      }
    },
    
    // Chat management
    addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.chat.messages.push(action.payload)
      state.chat.unread += 1
    },
    
    clearChatUnread: (state) => {
      state.chat.unread = 0
    },
    
    // Log management
    addLogEntry: (state, action: PayloadAction<LogEntry>) => {
      state.logs.entries.push(action.payload)
      state.logs.unread += 1
    },
    
    clearLogUnread: (state) => {
      state.logs.unread = 0
    },
    
    // Filter management
    toggleLogFilter: (state, action: PayloadAction<LogEntry['type']>) => {
      const type = action.payload;
      state.logs.filters[type] = !state.logs.filters[type];
    },
    
    setLogFilters: (state, action: PayloadAction<Record<LogEntry['type'], boolean>>) => {
      state.logs.filters = action.payload;
    },
    
    // Turn management
    setGamePhase: (state, action: PayloadAction<GamePhase>) => {
      state.turnState.phase = action.payload
      
      // Reset initiative and round if leaving combat
      if (action.payload !== GamePhase.COMBAT) {
        state.turnState.initiative = []
        state.turnState.round = 0
        state.turnState.currentActorId = state.player ? state.player.id : null
      }
    },
    
    startCombat: (state, action: PayloadAction<string[]>) => {
      // action.payload is an array of actor IDs to include in combat
      state.turnState.phase = GamePhase.COMBAT
      state.turnState.initiative = action.payload
      state.turnState.round = 1
      
      // Set current actor to the first in initiative
      if (state.turnState.initiative.length > 0) {
        state.turnState.currentActorId = state.turnState.initiative[0]
      }
      
      // Add log entry
      const logEntry = createLogEntry('Combat has started!', 'combat')
      state.logs.entries.push(logEntry)
      state.logs.unread += 1
    },
    
    nextTurn: (state) => {
      if (state.turnState.phase === GamePhase.COMBAT && state.turnState.initiative.length > 0) {
        const currentIndex = state.turnState.initiative.findIndex(id => id === state.turnState.currentActorId)
        const nextIndex = (currentIndex + 1) % state.turnState.initiative.length
        
        // If we've gone through all actors, increment the round
        if (nextIndex === 0) {
          state.turnState.round += 1
          
          // Add log entry for new round
          const roundLogEntry = createLogEntry(
            `Round ${state.turnState.round} begins!`,
            'combat'
          )
          state.logs.entries.push(roundLogEntry)
          state.logs.unread += 1
        }
        
        state.turnState.currentActorId = state.turnState.initiative[nextIndex]
        
        // Add log entry for whose turn it is
        if (state.actors[state.turnState.currentActorId]) {
          const actorName = state.actors[state.turnState.currentActorId].name
          const turnLogEntry = createLogEntry(
            `It's ${actorName}'s turn!`,
            'combat'
          )
          state.logs.entries.push(turnLogEntry)
          state.logs.unread += 1
        }
      }
    },
    
    // Modal management
    openCharacterSheet: (state, action: PayloadAction<string>) => {
      state.sheetModal = {
        isOpen: true,
        actorId: action.payload
      }
    },
    
    closeCharacterSheet: (state) => {
      state.sheetModal = {
        isOpen: false,
        actorId: null
      }
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  }
})

export const {
  setLoading,
  setPlayerName,
  setCurrentMap,
  addMap,
  updateMap,
  addActor,
  updateActor,
  removeActor,
  createPlayer,
  moveActor,
  addItemToActor,
  removeItemFromActor,
  addSkillToActor,
  addChatMessage,
  clearChatUnread,
  addLogEntry,
  clearLogUnread,
  toggleLogFilter,
  setLogFilters,
  setGamePhase,
  startCombat,
  nextTurn,
  openCharacterSheet,
  closeCharacterSheet,
  setError
} = gameSlice.actions

export default gameSlice.reducer 