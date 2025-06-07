/**
 * Constants for the Phaser game
 */

import { TilemapData, AssetKeys } from './types';

// Tile size in pixels
export const TILE_SIZE = 64;

// Game dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Actor dimensions
export const ACTOR_WIDTH = 32;
export const ACTOR_HEIGHT = 48;

// Movement speed
export const PLAYER_SPEED = 160;
export const NPC_SPEED = 80;
export const ENEMY_SPEED = 120;

// Health bar dimensions
export const HEALTH_BAR_WIDTH = 40;
export const HEALTH_BAR_HEIGHT = 6;
export const HEALTH_BAR_OFFSET_Y = 24;

// Default animation frame rate
export const DEFAULT_FRAME_RATE = 10;

// Map data
export const TILEMAPS: Record<string, TilemapData> = {
  dungeon: {
    key: AssetKeys.TILEMAP_DUNGEON,
    tilesetKey: AssetKeys.TILESET_DUNGEON,
    layers: ['ground', 'obstacles', 'overlay']
  },
  town: {
    key: AssetKeys.TILEMAP_TOWN,
    tilesetKey: AssetKeys.TILESET_TOWN,
    layers: ['ground', 'obstacles', 'overlay']
  }
};

// Animation keys
export const ANIMATIONS = {
  PLAYER: {
    IDLE_DOWN: 'player-idle-down',
    IDLE_UP: 'player-idle-up',
    IDLE_LEFT: 'player-idle-left',
    IDLE_RIGHT: 'player-idle-right',
    WALK_DOWN: 'player-walk-down',
    WALK_UP: 'player-walk-up',
    WALK_LEFT: 'player-walk-left',
    WALK_RIGHT: 'player-walk-right',
  },
  NPC: {
    IDLE_DOWN: 'npc-idle-down',
    WALK_DOWN: 'npc-walk-down',
  },
  ENEMY: {
    IDLE_DOWN: 'enemy-idle-down',
    WALK_DOWN: 'enemy-walk-down',
    ATTACK: 'enemy-attack',
  },
}; 