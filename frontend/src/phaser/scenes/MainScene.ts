// src/phaser/scenes/MainScene.ts

import Phaser from 'phaser';
import PerformanceMonitor from '../../utils/PerformanceMonitor';
import wsClient from '../../network/WebSocketClient';
import { TileData, Actor } from '../../store/gameSlice';

/**
 * Main Phaser scene for tactical grid rendering, actor management,
 * movement/attack overlays, health bars, and input handling.
 */
export default class MainScene extends Phaser.Scene {
  private actorSprites: Record<string, Phaser.GameObjects.Sprite> = {};
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private healthBarGraphics!: Phaser.GameObjects.Graphics;
  private currentAction: string | null = null;

  constructor() {
    super({ key: 'MainScene' });
  }

  /**
   * Initialize WebSocket event listeners to drive this scene.
   * Must be called after Phaser boot.
   */
  public initWebSocket(client: typeof wsClient) {
    client.on('mapData', this.loadMap.bind(this));
    client.on('actors', (actors: Actor[]) => {
      this.placeActors(actors);
      this.drawHealthBars(actors);
    });
    client.on('movementOverlay', this.showMovementOverlay.bind(this));
    client.on('actionResult', () => {
      // Clear overlay once action completes
      this.overlayGraphics.clear();
    });
    client.on('requestAction', ({ action }: { action: string }) => {
      this.currentAction = action;
      this.disableActionInput();
      if (action === 'Move') this.enableMoveInput();
      else if (action === 'Attack') this.enableAttackInput();
      else if (action === 'End Turn') client.send('endTurn', {});
    });
  }

  preload() {
    // Load tileset and token spritesheet
    this.load.image('tiles', 'assets/tiles.png');
    this.load.spritesheet('tokens', 'assets/tokens.png', {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  create() {
    // Set up graphics layers
    this.overlayGraphics = this.add.graphics();
    this.healthBarGraphics = this.add.graphics();

    // Request initial state from server
    wsClient.send('requestMap', {});
    wsClient.send('requestActors', {});
  }

  /**
   * Update loop called each frame. Wraps rendering in performance monitor.
   */
  update(time: number, delta: number) {
    PerformanceMonitor.beginFrame();

    // Future: animations or highlights could go here

    PerformanceMonitor.endFrame();
  }

  /*** Private Helpers ***/

  /**
   * Build or update the tilemap based on server data.
   */
  private loadMap(data: { width: number; height: number; tiles: number[] }) {
    // Destroy any existing layer
    const existingLayer = this.children.getByName('tilemap-layer');
    if (existingLayer) {
      (existingLayer as Phaser.Tilemaps.DynamicTilemapLayer).destroy();
    }

    const rows = this.chunkArray(data.tiles, data.width);
    const map = this.make.tilemap({
      data: rows,
      tileWidth: 32,
      tileHeight: 32
    });
    map.addTilesetImage('tiles');
    const layer = map.createLayer(0, 'tiles', 0, 0);
    layer.name = 'tilemap-layer';

    // Constrain camera to map bounds
    this.cameras.main.setBounds(0, 0, data.width * 32, data.height * 32);
  }

  /**
   * Place actor sprites on the map and enable clicking for info.
   */
  private placeActors(actors: Actor[]) {
    // Clear previous sprites
    Object.values(this.actorSprites).forEach(s => s.destroy());
    this.actorSprites = {};

    actors.forEach(a => {
      const sprite = this.add.sprite(
        a.x * 32 + 16,
        a.y * 32 + 16,
        'tokens',
        parseInt(a.sprite, 10)
      );
      sprite.setData('id', a.id);
      // Clicking a token outside of an action shows its sheet
      sprite.setInteractive().once('pointerdown', () => {
        wsClient.send('requestSheet', { actorId: a.id });
      });
      this.actorSprites[a.id] = sprite;
    });
  }

  /**
   * Draw health bars above each actor token.
   */
  private drawHealthBars(actors: Actor[]) {
    this.healthBarGraphics.clear();
    actors.forEach(a => {
      const x = a.x * 32;
      const y = a.y * 32;
      const percent = Phaser.Math.Clamp(a.hp / a.maxHp, 0, 1);

      // Background (missing health)
      this.healthBarGraphics.fillStyle(0x550000);
      this.healthBarGraphics.fillRect(x, y - 6, 32, 4);

      // Foreground (current health)
      this.healthBarGraphics.fillStyle(0xff0000);
      this.healthBarGraphics.fillRect(x, y - 6, 32 * percent, 4);
    });
  }

  /**
   * Highlight reachable tiles for movement or attack.
   */
  private showMovementOverlay(tiles: TileData[]) {
    this.overlayGraphics.clear();
    this.overlayGraphics.fillStyle(0x00ff00, 0.3);
    tiles.forEach(t => {
      this.overlayGraphics.fillRect(t.x * 32, t.y * 32, 32, 32);
    });
  }

  /**
   * Enable a one-time click to send a Move command.
   */
  private enableMoveInput() {
    this.input.once('pointerup', (pointer: Phaser.Input.Pointer) => {
      const tileX = Math.floor(pointer.x / 32);
      const tileY = Math.floor(pointer.y / 32);
      wsClient.send('move', { x: tileX, y: tileY });
      this.disableActionInput();
    });
  }

  /**
   * Enable clicking on tokens to send an Attack command.
   */
  private enableAttackInput() {
    Object.values(this.actorSprites).forEach(sprite => {
      sprite.setInteractive().once('pointerdown', () => {
        const targetId = sprite.getData('id') as string;
        wsClient.send('attack', { targetId });
        this.disableActionInput();
      });
    });
  }

  /**
   * Disable interactive input on all actor sprites.
   */
  private disableActionInput() {
    Object.values(this.actorSprites).forEach(sprite => {
      sprite.disableInteractive();
    });
  }

  /**
   * Utility to split a flat array into rows for the tilemap.
   */
  private chunkArray(arr: number[], size: number): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
}
