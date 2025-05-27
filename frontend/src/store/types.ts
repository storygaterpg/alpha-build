// Map and Tile Types
export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  id: string;
  type: string;
  walkable: boolean;
  description?: string;
  imageUrl?: string;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  startPosition: Position;
}

// Actor Types
export enum ActorType {
  PLAYER = 'player',
  NPC = 'npc',
  ENEMY = 'enemy'
}

export interface Stats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  wisdom: number;
  charisma: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: string;
  quantity: number;
  imageUrl?: string;
  effects?: {
    [key: string]: number;
  };
}

export interface Actor {
  id: string;
  name: string;
  type: ActorType;
  position: Position;
  stats: Stats;
  skills: Skill[];
  inventory: Item[];
  imageUrl?: string;
  level: number;
  experience: number;
  nextLevelExperience: number;
}

// Chat and Log Types
export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  type: 'system' | 'player' | 'npc' | 'enemy';
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: 'info' | 'combat' | 'loot' | 'quest' | 'achievement' | 'error';
}

// Turn and Game State Types
export enum GamePhase {
  EXPLORATION = 'exploration',
  COMBAT = 'combat',
  DIALOGUE = 'dialogue',
  MENU = 'menu'
}

export interface TurnState {
  currentActorId: string | null;
  phase: GamePhase;
  round: number;
  initiative: string[]; // Array of actor IDs in initiative order
}

// Modal Types
export interface ModalState {
  isOpen: boolean;
  actorId: string | null;
}

// Main Game State Type
export interface GameState {
  isLoading: boolean;
  playerName: string;
  currentMapId: string | null;
  maps: { [key: string]: MapData };
  actors: { [key: string]: Actor };
  player: Actor | null;
  chat: {
    messages: ChatMessage[];
    unread: number;
  };
  logs: {
    entries: LogEntry[];
    unread: number;
  };
  turnState: TurnState;
  sheetModal: ModalState;
  error: string | null;
} 