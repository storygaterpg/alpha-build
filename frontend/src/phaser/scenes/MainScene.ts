import Phaser from 'phaser';
import { 
  ActorObject, 
  AssetKeys, 
  GameObject, 
  LayerType, 
  ObjectType 
} from '../types';
import { 
  TILE_SIZE, 
  HEALTH_BAR_WIDTH, 
  HEALTH_BAR_HEIGHT, 
  HEALTH_BAR_OFFSET_Y 
} from '../constants';
import { Actor, Position } from '../../store/types';
import { performanceMonitor } from '../../utils/PerformanceMonitor';
import AssetPreloader from '../AssetPreloader';

class MainScene extends Phaser.Scene {
  // Map properties
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private layers: Record<string, Phaser.Tilemaps.TilemapLayer> = {};
  private currentMapKey: string = '';
  
  // Game objects
  private gameObjects: Map<string, GameObject> = new Map();
  private player: ActorObject | null = null;
  
  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  
  // Event callbacks
  private onActorMove: ((actorId: string, position: Position) => void) | null = null;
  
  // Performance monitoring
  private entityCount: number = 0;
  private isDevMode: boolean = false;

  constructor() {
    super({ key: 'MainScene' });
    
    // Check if we're in development mode
    this.isDevMode = process.env.NODE_ENV === 'development';
  }

  preload() {
    // Attempt to load assets from server
    try {
      this.load.setBaseURL('/assets/');
      
      // Load tilemaps
      this.load.tilemapTiledJSON(AssetKeys.TILEMAP_DUNGEON, 'tilemaps/dungeon.json');
      this.load.tilemapTiledJSON(AssetKeys.TILEMAP_TOWN, 'tilemaps/town.json');
      
      // Load tilesets
      this.load.image(AssetKeys.TILESET_DUNGEON, 'images/dungeon_tileset.png');
      this.load.image(AssetKeys.TILESET_TOWN, 'images/town_tileset.png');
      
      // Load sprites
      this.load.spritesheet(AssetKeys.SPRITE_PLAYER, 'sprites/player.png', { 
        frameWidth: 32, 
        frameHeight: 48 
      });
      this.load.spritesheet(AssetKeys.SPRITE_NPC, 'sprites/npc.png', { 
        frameWidth: 32, 
        frameHeight: 48 
      });
      this.load.spritesheet(AssetKeys.SPRITE_ENEMY, 'sprites/enemy.png', { 
        frameWidth: 32, 
        frameHeight: 48 
      });
      
      // Load UI elements
      this.load.image(AssetKeys.UI_HEALTHBAR_BG, 'images/healthbar_bg.png');
      this.load.image(AssetKeys.UI_HEALTHBAR_FILL, 'images/healthbar_fill.png');
    } catch (error) {
      console.error('Error in preload:', error);
    }
  }

  create() {
    // Generate placeholder assets for development
    // This ensures we have fallbacks if the actual assets failed to load
    try {
      AssetPreloader.preloadAllPlaceholders(this);
    } catch (error) {
      console.error('Error creating placeholder assets:', error);
    }
    
    // Setup keyboard input
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    } else {
      console.error('Input or keyboard is not available');
    }
    
    // Create a default map if none is loaded yet
    if (!this.map) {
      this.createDefaultMap();
    }

    // Create animations
    this.createAnimations();
    
    // Set up custom performance panel for entity count
    if (this.isDevMode) {
      try {
        performanceMonitor.addCustomPanel('Entities');
      } catch (error) {
        console.error('Failed to add custom performance panel:', error);
      }
    }
    
    // Log that the scene is ready
    console.log('MainScene created');
  }

  update() {
    // Start performance monitoring for this frame
    if (this.isDevMode) {
      performanceMonitor.begin();
    }
    
    // Update player movement if player exists
    if (this.player && this.player.sprite) {
      this.updatePlayerMovement();
    }
    
    // Update all game objects
    this.gameObjects.forEach((obj) => {
      if (obj.sprite) {
        // Update health bars for actors
        if ('actor' in obj && 'healthBar' in obj) {
          this.updateHealthBar(obj as ActorObject);
        }
      }
    });
    
    // Update entity count for performance monitoring
    if (this.isDevMode) {
      this.entityCount = this.gameObjects.size;
      try {
        performanceMonitor.updateCustomPanel('Entities', this.entityCount);
      } catch (error) {
        console.error('Failed to update custom performance panel:', error);
      }
      performanceMonitor.end();
    }
  }

  /**
   * Set the callback for actor movement
   * @param callback Function to call when an actor moves
   */
  setOnActorMove(callback: (actorId: string, position: Position) => void): void {
    this.onActorMove = callback;
  }

  /**
   * Load a tilemap
   * @param key The key of the tilemap to load
   * @param tilesetKey The key of the tileset to use
   */
  loadMap(key: string, tilesetKey: string): void {
    // Destroy the current map if it exists
    if (this.map) {
      this.map.destroy();
      this.layers = {};
    }
    
    // Create the new map
    this.map = this.make.tilemap({ key });
    const tileset = this.map.addTilesetImage('tileset', tilesetKey);
    
    if (!tileset) {
      console.error(`Failed to load tileset for map ${key}`);
      return;
    }
    
    // Create layers
    const groundLayer = this.map.createLayer('ground', tileset);
    const obstaclesLayer = this.map.createLayer('obstacles', tileset);
    const overlayLayer = this.map.createLayer('overlay', tileset);
    
    if (groundLayer && obstaclesLayer && overlayLayer) {
      this.layers[LayerType.GROUND] = groundLayer;
      this.layers[LayerType.OBSTACLES] = obstaclesLayer;
      this.layers[LayerType.OVERLAY] = overlayLayer;
      
      // Set collision on obstacles layer
      this.layers[LayerType.OBSTACLES].setCollisionByProperty({ collides: true });
      
      // Set the current map key
      this.currentMapKey = key;
      
      // Set world bounds
      this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
      
      // Set camera bounds
      this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
      
      console.log(`Map ${key} loaded`);
    } else {
      console.error(`Failed to create layers for map ${key}`);
    }
  }

  /**
   * Create a default map for testing
   */
  createDefaultMap(): void {
    // Create a simple map data
    const mapData = {
      width: 20,
      height: 15,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      layers: [
        {
          name: 'ground',
          data: Array(20 * 15).fill(1)
        },
        {
          name: 'obstacles',
          data: Array(20 * 15).fill(0)
        },
        {
          name: 'overlay',
          data: Array(20 * 15).fill(0)
        }
      ]
    };
    
    // Create the map
    this.map = this.make.tilemap({
      width: mapData.width,
      height: mapData.height,
      tileWidth: mapData.tileWidth,
      tileHeight: mapData.tileHeight
    });
    
    // Add a placeholder tileset
    const tileset = this.map.addTilesetImage('placeholder', AssetKeys.TILESET_DUNGEON);
    
    if (!tileset) {
      console.error('Failed to create default map tileset');
      return;
    }
    
    // Create layers
    const groundLayer = this.map.createBlankLayer('ground', tileset);
    const obstaclesLayer = this.map.createBlankLayer('obstacles', tileset);
    const overlayLayer = this.map.createBlankLayer('overlay', tileset);
    
    if (groundLayer && obstaclesLayer && overlayLayer) {
      this.layers[LayerType.GROUND] = groundLayer;
      this.layers[LayerType.OBSTACLES] = obstaclesLayer;
      this.layers[LayerType.OVERLAY] = overlayLayer;
      
      // Fill the ground layer with grass tiles
      this.layers[LayerType.GROUND].fill(1);
      
      // Set the current map key
      this.currentMapKey = 'default';
      
      // Add some obstacles around the edges
      for (let x = 0; x < mapData.width; x++) {
        this.layers[LayerType.OBSTACLES].putTileAt(2, x, 0);
        this.layers[LayerType.OBSTACLES].putTileAt(2, x, mapData.height - 1);
      }
      
      for (let y = 0; y < mapData.height; y++) {
        this.layers[LayerType.OBSTACLES].putTileAt(2, 0, y);
        this.layers[LayerType.OBSTACLES].putTileAt(2, mapData.width - 1, y);
      }
      
      // Set collision on obstacles layer
      this.layers[LayerType.OBSTACLES].setCollisionByProperty({ collides: true });
      
      // Set world bounds
      this.physics.world.setBounds(0, 0, mapData.width * mapData.tileWidth, mapData.height * mapData.tileHeight);
      
      // Set camera bounds
      this.cameras.main.setBounds(0, 0, mapData.width * mapData.tileWidth, mapData.height * mapData.tileHeight);
      
      console.log('Default map created');
    } else {
      console.error('Failed to create default map layers');
    }
  }

  /**
   * Add an actor to the scene
   * @param actor The actor data
   * @returns The created actor object
   */
  addActor(actor: Actor): ActorObject | null {
    // Determine which sprite to use based on actor type
    let spriteKey = AssetKeys.SPRITE_PLAYER;
    let objectType = ObjectType.PLAYER;
    
    switch (actor.type) {
      case 'player':
        spriteKey = AssetKeys.SPRITE_PLAYER;
        objectType = ObjectType.PLAYER;
        break;
      case 'npc':
        spriteKey = AssetKeys.SPRITE_NPC;
        objectType = ObjectType.NPC;
        break;
      case 'enemy':
        spriteKey = AssetKeys.SPRITE_ENEMY;
        objectType = ObjectType.ENEMY;
        break;
      default:
        console.error(`Unknown actor type: ${actor.type}`);
        return null;
    }
    
    // Create the sprite
    const sprite = this.physics.add.sprite(
      actor.position.x * TILE_SIZE,
      actor.position.y * TILE_SIZE,
      spriteKey
    );
    
    if (!sprite) {
      console.error(`Failed to create sprite for actor ${actor.id}`);
      return null;
    }
    
    // Set sprite properties
    sprite.setOrigin(0.5, 0.5);
    sprite.setDepth(10);
    
    // Enable physics
    this.physics.world.enable(sprite);
    sprite.body.setCollideWorldBounds(true);
    
    // Add collisions with obstacles if they exist
    if (this.layers[LayerType.OBSTACLES]) {
      this.physics.add.collider(sprite, this.layers[LayerType.OBSTACLES]);
    }
    
    // Create the actor object
    const actorObject: ActorObject = {
      id: actor.id,
      type: objectType,
      sprite,
      position: { ...actor.position },
      actor,
    };
    
    // Create health bar
    actorObject.healthBar = this.createHealthBar(actorObject);
    
    // Create name text
    actorObject.nameText = this.add.text(
      sprite.x,
      sprite.y - 30,
      actor.name,
      { 
        fontSize: '12px', 
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    actorObject.nameText.setOrigin(0.5, 0.5);
    actorObject.nameText.setDepth(20);
    
    // Add to game objects
    this.gameObjects.set(actor.id, actorObject);
    
    // If this is a player, set as the main player
    if (objectType === ObjectType.PLAYER && !this.player) {
      this.player = actorObject;
      
      // Make camera follow the player
      this.cameras.main.startFollow(sprite);
    }
    
    return actorObject;
  }

  /**
   * Update an actor's position
   * @param actorId The ID of the actor to update
   * @param position The new position
   */
  updateActorPosition(actorId: string, position: Position): void {
    const obj = this.gameObjects.get(actorId);
    
    if (obj && obj.sprite) {
      // Update the position
      obj.position = { ...position };
      
      // Move the sprite
      obj.sprite.setPosition(
        position.x * TILE_SIZE,
        position.y * TILE_SIZE
      );
      
      // Update health bar and name text position
      if ('actor' in obj) {
        const actorObj = obj as ActorObject;
        
        if (actorObj.healthBar) {
          actorObj.healthBar.setPosition(
            obj.sprite.x - HEALTH_BAR_WIDTH / 2,
            obj.sprite.y + HEALTH_BAR_OFFSET_Y
          );
        }
        
        if (actorObj.nameText) {
          actorObj.nameText.setPosition(
            obj.sprite.x,
            obj.sprite.y - 30
          );
        }
      }
    }
  }

  /**
   * Remove an actor from the scene
   * @param actorId The ID of the actor to remove
   */
  removeActor(actorId: string): void {
    const obj = this.gameObjects.get(actorId);
    
    if (obj) {
      // Destroy the sprite
      if (obj.sprite) {
        obj.sprite.destroy();
      }
      
      // Destroy health bar and name text if this is an actor
      if ('actor' in obj) {
        const actorObj = obj as ActorObject;
        
        if (actorObj.healthBar) {
          actorObj.healthBar.destroy();
        }
        
        if (actorObj.nameText) {
          actorObj.nameText.destroy();
        }
      }
      
      // Remove from game objects
      this.gameObjects.delete(actorId);
      
      // If this was the player, clear the player reference
      if (this.player && this.player.id === actorId) {
        this.player = null;
      }
    }
  }

  /**
   * Create a health bar for an actor
   * @param actorObj The actor object
   * @returns The health bar graphics object
   */
  private createHealthBar(actorObj: ActorObject): Phaser.GameObjects.Graphics {
    // Create the health bar graphics object
    const healthBar = this.add.graphics();
    healthBar.setDepth(15);
    
    // Position the health bar
    healthBar.setPosition(
      actorObj.sprite!.x - HEALTH_BAR_WIDTH / 2,
      actorObj.sprite!.y + HEALTH_BAR_OFFSET_Y
    );
    
    // Draw the health bar
    this.updateHealthBar(actorObj, healthBar);
    
    return healthBar;
  }

  /**
   * Update a health bar
   * @param actorObj The actor object
   * @param healthBar Optional health bar graphics object
   */
  private updateHealthBar(actorObj: ActorObject, healthBar?: Phaser.GameObjects.Graphics): void {
    // Use the provided health bar or get it from the actor object
    const bar = healthBar || actorObj.healthBar;
    
    if (!bar) return;
    
    // Clear the health bar
    bar.clear();
    
    // Calculate health percentage
    const healthPercentage = actorObj.actor.stats.health / actorObj.actor.stats.maxHealth;
    
    // Draw background
    bar.fillStyle(0x000000, 0.8);
    bar.fillRect(0, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);
    
    // Draw health fill
    if (healthPercentage > 0.6) {
      bar.fillStyle(0x00ff00, 1); // Green
    } else if (healthPercentage > 0.3) {
      bar.fillStyle(0xffff00, 1); // Yellow
    } else {
      bar.fillStyle(0xff0000, 1); // Red
    }
    
    bar.fillRect(1, 1, Math.max(0, (HEALTH_BAR_WIDTH - 2) * healthPercentage), HEALTH_BAR_HEIGHT - 2);
    
    // Position the health bar
    if (actorObj.sprite) {
      bar.setPosition(
        actorObj.sprite.x - HEALTH_BAR_WIDTH / 2,
        actorObj.sprite.y + HEALTH_BAR_OFFSET_Y
      );
    }
  }

  /**
   * Update player movement based on keyboard input
   */
  private updatePlayerMovement(): void {
    if (!this.player || !this.player.sprite) return;
    
    // Get the sprite body
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    
    // Reset velocity
    body.setVelocity(0);
    
    // Movement speed
    const speed = 160;
    
    // Horizontal movement
    if (this.cursors.left.isDown) {
      body.setVelocityX(-speed);
      this.player.sprite.anims.play('player-walk-left', true);
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(speed);
      this.player.sprite.anims.play('player-walk-right', true);
    }
    
    // Vertical movement
    if (this.cursors.up.isDown) {
      body.setVelocityY(-speed);
      
      // Only play the up animation if not moving horizontally
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
        this.player.sprite.anims.play('player-walk-up', true);
      }
    } else if (this.cursors.down.isDown) {
      body.setVelocityY(speed);
      
      // Only play the down animation if not moving horizontally
      if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
        this.player.sprite.anims.play('player-walk-down', true);
      }
    }
    
    // Idle animations
    if (body.velocity.x === 0 && body.velocity.y === 0) {
      // Get the current animation key
      const currentAnim = this.player.sprite.anims.currentAnim;
      
      if (currentAnim) {
        // Set the appropriate idle animation based on the last movement
        if (currentAnim.key === 'player-walk-left') {
          this.player.sprite.anims.play('player-idle-left', true);
        } else if (currentAnim.key === 'player-walk-right') {
          this.player.sprite.anims.play('player-idle-right', true);
        } else if (currentAnim.key === 'player-walk-up') {
          this.player.sprite.anims.play('player-idle-up', true);
        } else if (currentAnim.key === 'player-walk-down') {
          this.player.sprite.anims.play('player-idle-down', true);
        }
      } else {
        // Default to idle down if no animation is playing
        this.player.sprite.anims.play('player-idle-down', true);
      }
    }
    
    // Calculate the new tile position
    const tileX = Math.floor(this.player.sprite.x / TILE_SIZE);
    const tileY = Math.floor(this.player.sprite.y / TILE_SIZE);
    
    // If the position has changed, notify the callback
    if (tileX !== this.player.position.x || tileY !== this.player.position.y) {
      this.player.position.x = tileX;
      this.player.position.y = tileY;
      
      // Notify the callback if it exists
      if (this.onActorMove) {
        this.onActorMove(this.player.id, { x: tileX, y: tileY });
      }
    }
  }

  /**
   * Create animations for sprites
   */
  private createAnimations(): void {
    // Player animations
    
    // Idle animations
    this.anims.create({
      key: 'player-idle-down',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_PLAYER, { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'player-idle-up',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_PLAYER, { start: 9, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'player-idle-left',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_PLAYER, { start: 3, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'player-idle-right',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_PLAYER, { start: 6, end: 6 }),
      frameRate: 10,
      repeat: -1
    });
    
    // Walk animations
    this.anims.create({
      key: 'player-walk-down',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_PLAYER, { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'player-walk-up',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_PLAYER, { start: 9, end: 11 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'player-walk-left',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_PLAYER, { start: 3, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'player-walk-right',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_PLAYER, { start: 6, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
    
    // NPC animations
    this.anims.create({
      key: 'npc-idle-down',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_NPC, { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'npc-walk-down',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_NPC, { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1
    });
    
    // Enemy animations
    this.anims.create({
      key: 'enemy-idle-down',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_ENEMY, { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'enemy-walk-down',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_ENEMY, { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'enemy-attack',
      frames: this.anims.generateFrameNumbers(AssetKeys.SPRITE_ENEMY, { start: 3, end: 5 }),
      frameRate: 10,
      repeat: 0
    });
  }
}

export default MainScene; 