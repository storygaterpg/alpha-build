/**
 * Types for the Phaser game
 */

import Phaser from 'phaser';
import { Actor, Position } from '../store/types';

// Game object types
export enum ObjectType {
  PLAYER = 'player',
  NPC = 'npc',
  ENEMY = 'enemy',
  WARRIOR = 'warrior',
  ROB = 'rob',
  ITEM = 'item',
  OBSTACLE = 'obstacle',
}

// Game object interface
export interface GameObject {
  id: string;
  type: ObjectType;
  sprite: Phaser.GameObjects.Sprite | null;
  position: Position;
}

// Actor game object interface
export interface ActorObject extends GameObject {
  actor: Actor;
  healthBar?: Phaser.GameObjects.Graphics;
  nameText?: Phaser.GameObjects.Text;
}

// Tilemap layer types
export enum LayerType {
  GROUND = 'ground',
  OBSTACLES = 'obstacles',
  OVERLAY = 'overlay',
}

// Asset keys
export enum AssetKeys {
  // Maps
  TILEMAP_DUNGEON = 'tilemap_dungeon',
  TILEMAP_TOWN = 'tilemap_town',
  
  // Tilesets
  TILESET_DUNGEON = 'tileset_dungeon',
  TILESET_TOWN = 'tileset_town',
  
  // Sprites
  SPRITE_PLAYER = 'sprite_player',
  SPRITE_NPC = 'sprite_npc',
  SPRITE_ENEMY = 'sprite_enemy',
  SPRITE_WARRIOR = 'sprite_warrior',
  SPRITE_ROB = 'sprite_rob',
  
  // UI
  UI_HEALTHBAR_BG = 'ui_healthbar_bg',
  UI_HEALTHBAR_FILL = 'ui_healthbar_fill',
  
  // Backgrounds
  BACKGROUND_FANTASY_MAP = 'background_fantasy_map',
  BACKGROUND_GRID = 'background_grid'
}

// Map data interface
export interface TilemapData {
  key: string;
  tilesetKey: string;
  layers: string[];
}

export interface MapBackgroundData {
  key: string;
  path: string;
  width: number;
  height: number;
}

// Animation data interface
export interface AnimationData {
  key: string;
  frames: number[];
  frameRate: number;
  repeat: number;
} 