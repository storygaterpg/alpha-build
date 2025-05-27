import Phaser from 'phaser';
import { AssetKeys } from './types';

/**
 * AssetPreloader
 * 
 * A utility class that generates placeholder assets for development
 * when actual assets aren't available.
 */
export class AssetPreloader {
  /**
   * Create a placeholder tileset image
   * @param scene The Phaser scene
   * @param key The key to store the texture under
   * @param color The base color for the tileset
   */
  static createPlaceholderTileset(scene: Phaser.Scene, key: string, color: number = 0x3498db): void {
    // Create a 128x128 canvas with 4x4 tiles (32x32 each)
    const graphics = scene.make.graphics({ x: 0, y: 0 });
    
    // Draw the base color
    graphics.fillStyle(color);
    graphics.fillRect(0, 0, 128, 128);
    
    // Draw grid lines
    graphics.lineStyle(1, 0x000000, 0.3);
    
    // Vertical lines
    for (let x = 32; x < 128; x += 32) {
      graphics.beginPath();
      graphics.moveTo(x, 0);
      graphics.lineTo(x, 128);
      graphics.closePath();
      graphics.strokePath();
    }
    
    // Horizontal lines
    for (let y = 32; y < 128; y += 32) {
      graphics.beginPath();
      graphics.moveTo(0, y);
      graphics.lineTo(128, y);
      graphics.closePath();
      graphics.strokePath();
    }
    
    // Add some tile variations
    // Tile 1: Empty/Floor (already has the base color)
    
    // Tile 2: Wall/obstacle
    graphics.fillStyle(0x2c3e50);
    graphics.fillRect(32, 0, 32, 32);
    
    // Tile 3: Special
    graphics.fillStyle(0xe74c3c);
    graphics.fillRect(64, 0, 32, 32);
    
    // Tile 4: Water
    graphics.fillStyle(0x3498db);
    graphics.fillRect(96, 0, 32, 32);
    
    // Add some pattern to each tile
    graphics.fillStyle(0xffffff, 0.1);
    graphics.fillRect(4, 4, 24, 24);
    graphics.fillRect(36, 4, 24, 24);
    graphics.fillRect(68, 4, 24, 24);
    graphics.fillRect(100, 4, 24, 24);
    
    // Generate the texture
    graphics.generateTexture(key, 128, 128);
    graphics.destroy();
  }
  
  /**
   * Create a placeholder sprite sheet
   * @param scene The Phaser scene
   * @param key The key to store the texture under
   * @param color The base color for the sprite
   */
  static createPlaceholderSpritesheet(scene: Phaser.Scene, key: string, color: number = 0x27ae60): void {
    // Create a spritesheet with 4 frames (32x48 each)
    const width = 128; // 4 frames
    const height = 48;
    const frameWidth = 32;
    
    const graphics = scene.make.graphics({ x: 0, y: 0 });
    
    // Draw the base color for each frame
    graphics.fillStyle(color);
    
    // Draw 4 frames
    for (let i = 0; i < 4; i++) {
      // Base shape for character
      const x = i * frameWidth;
      graphics.fillRect(x, 0, frameWidth, height);
      
      // Add some details to differentiate frames
      graphics.fillStyle(0x000000, 0.2);
      
      // Different pattern for each frame to simulate animation
      switch (i) {
        case 0: // Frame 1: Standing
          graphics.fillRect(x + 8, 38, 16, 10);
          break;
        case 1: // Frame 2: Walking 1
          graphics.fillRect(x + 12, 38, 16, 10);
          break;
        case 2: // Frame 3: Standing (duplicate of 1 for testing)
          graphics.fillRect(x + 8, 38, 16, 10);
          break;
        case 3: // Frame 4: Walking 2
          graphics.fillRect(x + 4, 38, 16, 10);
          break;
      }
      
      // Add character head
      graphics.fillStyle(0xecf0f1);
      graphics.fillCircle(x + 16, 12, 8);
      
      // Add character body
      graphics.fillStyle(0xecf0f1, 0.8);
      graphics.fillRect(x + 10, 20, 12, 18);
    }
    
    // Generate the texture
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
  
  /**
   * Create a placeholder UI image
   * @param scene The Phaser scene
   * @param key The key to store the texture under
   * @param width The width of the image
   * @param height The height of the image
   * @param color The color of the image
   */
  static createPlaceholderUI(scene: Phaser.Scene, key: string, width: number, height: number, color: number): void {
    const graphics = scene.make.graphics({ x: 0, y: 0 });
    
    // Draw the base shape
    graphics.fillStyle(color);
    graphics.fillRect(0, 0, width, height);
    
    // Add a border
    graphics.lineStyle(1, 0x000000, 0.5);
    graphics.strokeRect(0, 0, width, height);
    
    // Generate the texture
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
  
  /**
   * Preload all placeholder assets
   * @param scene The Phaser scene
   */
  static preloadAllPlaceholders(scene: Phaser.Scene): void {
    // Create tileset placeholders
    this.createPlaceholderTileset(scene, AssetKeys.TILESET_DUNGEON, 0x34495e);
    this.createPlaceholderTileset(scene, AssetKeys.TILESET_TOWN, 0x2ecc71);
    
    // Create spritesheet placeholders
    this.createPlaceholderSpritesheet(scene, AssetKeys.SPRITE_PLAYER, 0x3498db);
    this.createPlaceholderSpritesheet(scene, AssetKeys.SPRITE_NPC, 0xe67e22);
    this.createPlaceholderSpritesheet(scene, AssetKeys.SPRITE_ENEMY, 0xe74c3c);
    
    // Create UI placeholders
    this.createPlaceholderUI(scene, AssetKeys.UI_HEALTHBAR_BG, 64, 8, 0x7f8c8d);
    this.createPlaceholderUI(scene, AssetKeys.UI_HEALTHBAR_FILL, 62, 6, 0xe74c3c);
    
    console.log('Placeholder assets created');
  }
}

export default AssetPreloader; 