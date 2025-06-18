import Phaser from 'phaser';
import { AssetKeys } from './types';
import { TILE_SIZE } from './constants';

/**
 * AssetPreloader class
 * 
 * Utility class to create placeholder assets for development/testing
 * when real assets fail to load
 */
class AssetPreloader {
  /**
   * Create all placeholder assets
   * @param scene The scene to add the assets to
   */
  static preloadAllPlaceholders(scene: Phaser.Scene): void {
    this.createPlaceholderTileset(scene, AssetKeys.TILESET_DUNGEON);
    this.createPlaceholderTileset(scene, AssetKeys.TILESET_TOWN);
    this.createPlaceholderBackground(scene, AssetKeys.BACKGROUND_FANTASY_MAP);
    this.createPlaceholderGrid(scene, AssetKeys.BACKGROUND_GRID);
    this.createPlaceholderCharacter(scene, AssetKeys.SPRITE_PLAYER, '#4287f5');
    this.createPlaceholderCharacter(scene, AssetKeys.SPRITE_NPC, '#28a745');
    this.createPlaceholderCharacter(scene, AssetKeys.SPRITE_ENEMY, '#dc3545');
  }

  /**
   * Create a placeholder tileset
   * @param scene The scene to add the tileset to
   * @param key The key to use for the tileset
   */
  static createPlaceholderTileset(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;

    const tileSize = TILE_SIZE;
    const canvas = scene.textures.createCanvas(key, tileSize * 4, tileSize * 4);
    if (!canvas) {
      console.error(`Failed to create canvas for ${key}`);
      return;
    }
    const ctx = canvas.context;

    // Create a 4x4 tileset with transparent tiles and visible borders
    const colors = [
      'rgba(0,0,0,0)', // Transparent
      'rgba(0,0,0,0.1)', // Very light gray (obstacles)
      'rgba(0,0,0,0)', // Transparent
      'rgba(0,0,0,0)', // Transparent
    ];

    // Fill the canvas with transparent tiles
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const index = y * 4 + x;
        const color = colors[index % colors.length];
        
        // Clear area first to ensure transparency
        ctx.clearRect(x * tileSize, y * tileSize, tileSize, tileSize);
        
        // Draw colored square (mostly transparent)
        ctx.fillStyle = color;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        
        // Draw border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        
        // Only draw index for debugging in development mode
        if (process.env.NODE_ENV === 'development') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(index.toString(), x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
        }
      }
    }

    canvas.refresh();
  }

  /**
   * Create a placeholder background
   * @param scene The scene to add the background to
   * @param key The key to use for the background
   */
  static createPlaceholderBackground(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;

    const width = 1024;
    const height = 768;
    const canvas = scene.textures.createCanvas(key, width, height);
    if (!canvas) {
      console.error(`Failed to create canvas for ${key}`);
      return;
    }
    const ctx = canvas.context;

    // Create a transparent background instead of a patterned one
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);
    
    // Add a very subtle grid for debugging if needed
    if (process.env.NODE_ENV === 'development') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // Draw horizontal lines
      for (let y = 0; y <= height; y += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Draw vertical lines
      for (let x = 0; x <= width; x += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Text label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Placeholder Background', width / 2, 50);
    }

    canvas.refresh();
  }

  /**
   * Create a placeholder grid tile
   * @param scene The scene to add the grid to
   * @param key The key to use for the grid
   */
  static createPlaceholderGrid(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;

    const size = TILE_SIZE;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) {
      console.error(`Failed to create canvas for ${key}`);
      return;
    }
    const ctx = canvas.context;

    // Draw a transparent background with grid lines
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, size, size);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    
    // Draw top and left edges
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size);
    ctx.stroke();

    canvas.refresh();
  }

  /**
   * Create a placeholder character sprite
   * @param scene The scene to add the character to
   * @param key The key to use for the character
   * @param color The color to use for the character
   */
  static createPlaceholderCharacter(scene: Phaser.Scene, key: string, color: string): void {
    if (scene.textures.exists(key)) return;

    const width = 32;
    const height = 32;
    const framesX = 3;
    const framesY = 4;
    const canvas = scene.textures.createCanvas(key, width * framesX, height * framesY);
    if (!canvas) {
      console.error(`Failed to create canvas for ${key}`);
      return;
    }
    const ctx = canvas.context;

    // Create frames for animation (4 directions x 3 frames each)
    for (let y = 0; y < framesY; y++) {
      for (let x = 0; x < framesX; x++) {
        // Clear frame area
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(x * width, y * height, width, height);
        
        // Draw character body
        ctx.fillStyle = color;
        
        // Head (circle)
        ctx.beginPath();
        ctx.arc(x * width + width / 2, y * height + height / 3, height / 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Body (rectangle)
        ctx.fillRect(
          x * width + width / 3, 
          y * height + height / 2, 
          width / 3, 
          height / 3
        );
        
        // Animation offset based on frame
        const offsetX = (x % 3) - 1;
        
        // Legs
        ctx.fillRect(
          x * width + width / 3 - 2 + offsetX, 
          y * height + height / 2 + height / 3, 
          width / 6, 
          height / 6
        );
        ctx.fillRect(
          x * width + width / 3 + width / 6 + 2 - offsetX, 
          y * height + height / 2 + height / 3, 
          width / 6, 
          height / 6
        );
        
        // Eyes
        ctx.fillStyle = '#000000';
        
        // Different eyes based on direction
        switch (y) {
          case 0: // Down
            ctx.fillRect(x * width + width / 2 - 5, y * height + height / 3 - 2, 2, 2);
            ctx.fillRect(x * width + width / 2 + 3, y * height + height / 3 - 2, 2, 2);
            break;
          case 1: // Left
            ctx.fillRect(x * width + width / 2 - 6, y * height + height / 3 - 2, 2, 2);
            break;
          case 2: // Right
            ctx.fillRect(x * width + width / 2 + 4, y * height + height / 3 - 2, 2, 2);
            break;
          case 3: // Up
            ctx.fillRect(x * width + width / 2 - 5, y * height + height / 3 - 2, 2, 2);
            ctx.fillRect(x * width + width / 2 + 3, y * height + height / 3 - 2, 2, 2);
            break;
        }
      }
    }

    canvas.refresh();
  }

  /**
   * Create a placeholder UI element
   * @param scene The scene to add the UI element to
   * @param key The key to use for the UI element
   * @param color The color to use for the UI element
   */
  static createPlaceholderUI(scene: Phaser.Scene, key: string, color: string): void {
    if (scene.textures.exists(key)) return;

    const width = 64;
    const height = 16;
    const canvas = scene.textures.createCanvas(key, width, height);
    if (!canvas) {
      console.error(`Failed to create canvas for ${key}`);
      return;
    }
    const ctx = canvas.context;

    // Draw a simple UI element
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Draw border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    canvas.refresh();
  }
}

export default AssetPreloader; 