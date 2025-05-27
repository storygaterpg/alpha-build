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
  // Tilemaps
  TILEMAP_DUNGEON = 'tilemap_dungeon',
  TILEMAP_TOWN = 'tilemap_town',
  TILEMAP_FOREST = 'tilemap_forest',
  
  // Tilesets
  TILESET_DUNGEON = 'tileset_dungeon',
  TILESET_TOWN = 'tileset_town',
  TILESET_FOREST = 'tileset_forest',
  
  // Sprites
  SPRITE_PLAYER = 'sprite_player',
  SPRITE_NPC = 'sprite_npc',
  SPRITE_ENEMY = 'sprite_enemy',
  SPRITE_ITEM = 'sprite_item',
  
  // UI
  UI_HEALTHBAR_BG = 'ui_healthbar_bg',
  UI_HEALTHBAR_FILL = 'ui_healthbar_fill',
}

// Map data interface
export interface TilemapData {
  key: string;
  tilesetKey: string;
  file: string;
  tileWidth: number;
  tileHeight: number;
}

// Animation data interface
export interface AnimationData {
  key: string;
  frames: number[];
  frameRate: number;
  repeat: number;
} 