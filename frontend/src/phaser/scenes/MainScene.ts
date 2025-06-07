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
  private backgroundImage: Phaser.GameObjects.Image | null = null;
  private gridImage: Phaser.GameObjects.TileSprite | null = null;
  
  // Game objects
  private gameObjects: Map<string, GameObject> = new Map();
  private player: ActorObject | null = null;
  
  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  
  // Camera controls
  private isDragging: boolean = false;
  private dragStartPoint: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private lastPointerPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
  private zoomKeys: any = {};
  private panKeys: any = {};
  private controlsText: Phaser.GameObjects.Text | null = null;
  
  // Camera settings
  private readonly MIN_ZOOM = 0.25;
  private readonly MAX_ZOOM = 4.0;
  private readonly ZOOM_SPEED = 0.05;
  private readonly PAN_SPEED = 200;
  private readonly ZOOM_SMOOTH_FACTOR = 0.1;
  private readonly PAN_SMOOTH_FACTOR = 0.05;
  
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
      
      // Load background images
      this.load.image(AssetKeys.BACKGROUND_FANTASY_MAP, 'images/backgrounds/fantasy_map.svg');
      this.load.image(AssetKeys.BACKGROUND_GRID, 'images/backgrounds/grid_tile.svg');
      this.load.image('test_map_bg', 'maps/test-map2.png');
      
      // Load sprites
      this.load.spritesheet(AssetKeys.SPRITE_PLAYER, 'sprites/characters/player.svg', { 
        frameWidth: 32, 
        frameHeight: 32 
      });
      this.load.spritesheet(AssetKeys.SPRITE_NPC, 'sprites/characters/npc.svg', { 
        frameWidth: 32, 
        frameHeight: 32 
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
      
      // Setup zoom and pan keys
      this.zoomKeys = {
        zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS),
        zoomInAlt: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD), // For keyboards with numpad
        zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS),
        zoomOutAlt: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_SUBTRACT)
      };
      
      this.panKeys = {
        panLeft: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        panRight: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        panUp: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        panDown: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
      };
    } else {
      console.error('Input or keyboard is not available');
    }
    
    // Setup camera controls
    this.setupCameraControls();
    
    // Create controls info UI
    this.createControlsInfo();
    
    // Create a default map if none is loaded yet
    if (!this.map) {
      this.createDefaultMap();
    }

    // Create animations
    this.createAnimations();
    
    // Setup resize handling
    this.setupResizeHandling();
    
    // Set up custom performance panel for entity count
    if (this.isDevMode) {
      try {
        performanceMonitor.addCustomPanel('Entities');
      } catch (error) {
        console.error('Failed to add custom performance panel:', error);
      }
    }
    
    // Log that the scene is ready
    console.log('MainScene created with camera controls');
  }

  /**
   * Setup camera zoom and pan controls
   */
  private setupCameraControls(): void {
    const camera = this.cameras.main;
    
    // Setup mouse wheel zoom
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
      // Use smaller zoom step for mouse wheel for more granular control
      const wheelZoomSpeed = this.ZOOM_SPEED * 0.5; // Even smaller steps for wheel
      this.handleZoom(deltaY > 0 ? -wheelZoomSpeed : wheelZoomSpeed, pointer);
    });
    
    // Setup mouse drag panning
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.primaryDown) {
        this.isDragging = true;
        this.dragStartPoint.set(pointer.x, pointer.y);
        this.lastPointerPosition.set(pointer.x, pointer.y);
        
        // Stop following player when manually panning
        if (camera.deadzone) {
          camera.stopFollow();
        }
      }
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.primaryDown) {
        this.handlePan(
          this.lastPointerPosition.x - pointer.x,
          this.lastPointerPosition.y - pointer.y
        );
        this.lastPointerPosition.set(pointer.x, pointer.y);
      }
    });
    
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.primaryDown) {
        this.isDragging = false;
      }
    });
    
    // Setup touch gestures for mobile
    this.setupTouchControls();
    
    console.log('Camera controls setup complete');
  }
  
  /**
   * Setup touch controls for mobile devices
   */
  private setupTouchControls(): void {
    let initialDistance = 0;
    let initialZoom = 1;
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        // Two fingers down - setup pinch to zoom
        const distance = Phaser.Math.Distance.Between(
          this.input.pointer1.x, this.input.pointer1.y,
          this.input.pointer2.x, this.input.pointer2.y
        );
        initialDistance = distance;
        initialZoom = this.cameras.main.zoom;
      }
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        // Two fingers moving - pinch to zoom
        const distance = Phaser.Math.Distance.Between(
          this.input.pointer1.x, this.input.pointer1.y,
          this.input.pointer2.x, this.input.pointer2.y
        );
        
        if (initialDistance > 0) {
          const scale = distance / initialDistance;
          const newZoom = Phaser.Math.Clamp(
            initialZoom * scale,
            this.MIN_ZOOM,
            this.MAX_ZOOM
          );
          
          // Get center point between fingers
          const centerX = (this.input.pointer1.x + this.input.pointer2.x) / 2;
          const centerY = (this.input.pointer1.y + this.input.pointer2.y) / 2;
          
          this.cameras.main.setZoom(newZoom);
        }
      }
    });
  }
  
  /**
   * Handle zoom functionality
   * @param zoomDelta The amount to zoom (positive = zoom in, negative = zoom out)
   * @param pointer Optional pointer for zoom center point
   */
  private handleZoom(zoomDelta: number, pointer?: Phaser.Input.Pointer): void {
    const camera = this.cameras.main;
    const currentZoom = camera.zoom;
    const newZoom = Phaser.Math.Clamp(
      currentZoom + zoomDelta,
      this.MIN_ZOOM,
      this.MAX_ZOOM
    );
    
    if (newZoom !== currentZoom) {
      if (pointer) {
        // Zoom towards mouse position
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
        
        // Set the new zoom
        camera.setZoom(newZoom);
        
        // Calculate the new world point after zoom
        const newWorldPoint = camera.getWorldPoint(pointer.x, pointer.y);
        
        // Adjust camera position to keep the pointer position stable
        camera.scrollX += (worldPoint.x - newWorldPoint.x);
        camera.scrollY += (worldPoint.y - newWorldPoint.y);
      } else {
        // Zoom towards center of current view - calculate center BEFORE zoom change
        const viewportCenterX = camera.width / 2;
        const viewportCenterY = camera.height / 2;
        const worldCenterPoint = camera.getWorldPoint(viewportCenterX, viewportCenterY);
        
        // Set the new zoom
        camera.setZoom(newZoom);
        
        // Calculate the new world point at the same viewport center
        const newWorldCenterPoint = camera.getWorldPoint(viewportCenterX, viewportCenterY);
        
        // Adjust camera position to keep the center point stable
        camera.scrollX += (worldCenterPoint.x - newWorldCenterPoint.x);
        camera.scrollY += (worldCenterPoint.y - newWorldCenterPoint.y);
      }
      
      // Ensure camera stays within bounds
      this.enforceCameraBounds();
    }
  }
  
  /**
   * Handle pan functionality
   * @param deltaX Horizontal pan amount
   * @param deltaY Vertical pan amount
   */
  private handlePan(deltaX: number, deltaY: number): void {
    const camera = this.cameras.main;
    
    // Apply pan with zoom compensation
    const zoomFactor = 1 / camera.zoom;
    camera.scrollX += deltaX * zoomFactor;
    camera.scrollY += deltaY * zoomFactor;
    
    // Ensure camera stays within bounds
    this.enforceCameraBounds();
  }
  
  /**
   * Ensure camera stays within map bounds
   */
  private enforceCameraBounds(): void {
    const camera = this.cameras.main;
    
    if (camera.getBounds()) {
      const bounds = camera.getBounds();
      const worldView = camera.worldView;
      
      // Clamp camera position to bounds
      if (worldView.x < bounds.x) {
        camera.scrollX = bounds.x;
      } else if (worldView.right > bounds.right) {
        camera.scrollX = bounds.right - worldView.width;
      }
      
      if (worldView.y < bounds.y) {
        camera.scrollY = bounds.y;
      } else if (worldView.bottom > bounds.bottom) {
        camera.scrollY = bounds.bottom - worldView.height;
      }
    }
  }
  
  /**
   * Center camera on a specific position
   * @param x World X coordinate
   * @param y World Y coordinate
   * @param zoom Optional zoom level
   */
  public centerCameraOn(x: number, y: number, zoom?: number): void {
    const camera = this.cameras.main;
    
    if (zoom !== undefined) {
      camera.setZoom(Phaser.Math.Clamp(zoom, this.MIN_ZOOM, this.MAX_ZOOM));
    }
    
    camera.centerOn(x, y);
    this.enforceCameraBounds();
  }
  
  /**
   * Reset camera to default position and zoom
   */
  public resetCamera(): void {
    const camera = this.cameras.main;
    camera.setZoom(1);
    
    if (this.player && this.player.sprite) {
      // Center on player if available
      camera.centerOn(this.player.sprite.x, this.player.sprite.y);
      camera.startFollow(this.player.sprite, true, this.PAN_SMOOTH_FACTOR, this.PAN_SMOOTH_FACTOR);
    } else {
      // Center on map
      const bounds = camera.getBounds();
      if (bounds) {
        camera.centerOn(bounds.centerX, bounds.centerY);
      }
    }
    
    this.enforceCameraBounds();
  }

  update() {
    // Start performance monitoring for this frame
    if (this.isDevMode) {
      performanceMonitor.begin();
    }
    
    // Handle keyboard zoom controls
    this.handleKeyboardZoom();
    
    // Handle keyboard pan controls
    this.handleKeyboardPan();
    
    // Update player movement if player exists and camera is not being manually controlled
    if (this.player && this.player.sprite && !this.isDragging) {
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
   * Handle keyboard zoom controls
   */
  private handleKeyboardZoom(): void {
    if (this.zoomKeys.zoomIn.isDown || this.zoomKeys.zoomInAlt.isDown) {
      this.handleZoom(this.ZOOM_SPEED);
    } else if (this.zoomKeys.zoomOut.isDown || this.zoomKeys.zoomOutAlt.isDown) {
      this.handleZoom(-this.ZOOM_SPEED);
    }
  }
  
  /**
   * Handle keyboard pan controls
   */
  private handleKeyboardPan(): void {
    const camera = this.cameras.main;
    let panX = 0;
    let panY = 0;
    
    if (this.panKeys.panLeft.isDown) {
      panX = -this.PAN_SPEED;
    } else if (this.panKeys.panRight.isDown) {
      panX = this.PAN_SPEED;
    }
    
    if (this.panKeys.panUp.isDown) {
      panY = -this.PAN_SPEED;
    } else if (this.panKeys.panDown.isDown) {
      panY = this.PAN_SPEED;
    }
    
    if (panX !== 0 || panY !== 0) {
      // Stop following player when manually panning
      if (camera.deadzone) {
        camera.stopFollow();
      }
      
      // Apply pan with frame time compensation
      const deltaTime = this.game.loop.delta / 1000; // Convert to seconds
      const zoomFactor = 1 / camera.zoom;
      camera.scrollX += panX * deltaTime * zoomFactor;
      camera.scrollY += panY * deltaTime * zoomFactor;
      
      this.enforceCameraBounds();
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
   * Load a map from map data
   * @param mapData The map data to load
   */
  loadMapFromData(mapData: any): void {
    try {
      console.log('Loading map from data:', mapData);
      
      // Calculate dimensions in pixels
      const mapWidth = mapData.width * TILE_SIZE;
      const mapHeight = mapData.height * TILE_SIZE;
      const gridSize = mapData.gridSize || TILE_SIZE;
      
      // Set background image if available
      if (mapData.backgroundImage) {
        // If it's the test-map2.png, use it directly
        if (mapData.backgroundImage.includes('test-map2.png')) {
          console.log('Using preloaded test map 2 background');
          this.setBackgroundImage('test_map_bg', mapWidth, mapHeight);
        }
        // If it's the old test-map.png, also use test-map2.png
        else if (mapData.backgroundImage.includes('test-map.png')) {
          console.log('Using preloaded test map 2 background (legacy fallback)');
          this.setBackgroundImage('test_map_bg', mapWidth, mapHeight);
        }
        // Else if it's a path to an external image
        else if (mapData.backgroundImage.startsWith('/')) {
          // Use the path directly
          const backgroundKey = 'bg_' + mapData.id;
          
          // Check if the image is already loaded
          if (!this.textures.exists(backgroundKey)) {
            // Load the image first
            this.load.image(backgroundKey, mapData.backgroundImage);
            this.load.once('complete', () => {
              this.setBackgroundImage(backgroundKey, mapWidth, mapHeight);
            });
            this.load.start();
          } else {
            this.setBackgroundImage(backgroundKey, mapWidth, mapHeight);
          }
        } else {
          // Use a predefined key
          this.setBackgroundImage(mapData.backgroundImage, mapWidth, mapHeight);
        }
      } else {
        // Always use test-map2.png as default instead of fantasy-map.svg
        console.log('No background image specified, using test-map2.png as default');
        this.setBackgroundImage('test_map_bg', mapWidth, mapHeight);
      }
      
      // Create grid overlay with high transparency
      this.createGridOverlay(mapWidth, mapHeight, gridSize);
      
      // Destroy existing map if it exists
      if (this.map) {
        this.map.destroy();
        this.layers = {};
      }
      
      // Create a new blank map
      this.map = this.make.tilemap({
        width: mapData.width,
        height: mapData.height,
        tileWidth: TILE_SIZE,
        tileHeight: TILE_SIZE
      });
      
      // Add a placeholder tileset
      const tileset = this.map.addTilesetImage('placeholder', AssetKeys.TILESET_DUNGEON);
      
      if (!tileset) {
        console.error('Failed to create map tileset');
        return;
      }
      
      // Create layers
      const groundLayer = this.map.createBlankLayer('ground', tileset);
      const obstaclesLayer = this.map.createBlankLayer('obstacles', tileset);
      const overlayLayer = this.map.createBlankLayer('overlay', tileset);
      
      if (!groundLayer || !obstaclesLayer || !overlayLayer) {
        console.error('Failed to create map layers');
        return;
      }
      
      this.layers[LayerType.GROUND] = groundLayer;
      this.layers[LayerType.OBSTACLES] = obstaclesLayer;
      this.layers[LayerType.OVERLAY] = overlayLayer;
      
      // Set transparency on all layers to make them very transparent
      groundLayer.setAlpha(0.1);
      obstaclesLayer.setAlpha(0.3);
      overlayLayer.setAlpha(0.2);
      
      // Set collisions
      this.layers[LayerType.OBSTACLES].setCollisionByProperty({ collides: true });
      
      // Process tile data
      if (mapData.tiles) {
        for (let y = 0; y < mapData.height; y++) {
          for (let x = 0; x < mapData.width; x++) {
            const tile = mapData.tiles[y] && mapData.tiles[y][x];
            if (tile) {
              // Ground layer - all tiles are ground
              this.layers[LayerType.GROUND].putTileAt(1, x, y);
              
              // Add obstacles for non-walkable tiles
              if (!tile.walkable) {
                this.layers[LayerType.OBSTACLES].putTileAt(2, x, y);
              }
            }
          }
        }
      }
      
      // Set world and camera bounds
      this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
      this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
      
      // Reset camera to default view
      this.resetCamera();
      
      console.log(`Map loaded with camera controls: ${mapData.name} (${mapData.width}x${mapData.height})`);
    } catch (error) {
      console.error('Error loading map from data:', error);
    }
  }

  /**
   * Set the background image for the map
   * @param key The key of the background image to use
   * @param width Width of the background
   * @param height Height of the background
   */
  setBackgroundImage(key: string, width: number, height: number): void {
    // Clear any existing background
    if (this.backgroundImage) {
      this.backgroundImage.destroy();
      this.backgroundImage = null;
    }
    
    try {
      // Create the background image
      this.backgroundImage = this.add.image(0, 0, key);
      
      // Set the origin to the top-left corner
      this.backgroundImage.setOrigin(0, 0);
      
      // Resize to fit the map dimensions
      if (width && height) {
        this.backgroundImage.displayWidth = width;
        this.backgroundImage.displayHeight = height;
      }
      
      // Move to the back (behind other game objects)
      this.backgroundImage.setDepth(-10);
      
      console.log(`Background image set: ${key}`);
    } catch (error) {
      console.error(`Failed to set background image ${key}:`, error);
    }
  }
  
  /**
   * Create a grid overlay for the map
   * @param width Width of the grid
   * @param height Height of the grid
   * @param cellSize Size of each grid cell
   */
  createGridOverlay(width: number, height: number, cellSize: number = 64): void {
    // Clear any existing grid
    if (this.gridImage) {
      this.gridImage.destroy();
      this.gridImage = null;
    }
    
    try {
      // Use the grid tile as a repeating pattern
      this.gridImage = this.add.tileSprite(0, 0, width, height, AssetKeys.BACKGROUND_GRID);
      this.gridImage.setOrigin(0, 0);
      this.gridImage.setDepth(-5); // Above background but below other objects
      this.gridImage.setAlpha(0.3); // Make grid more transparent
      
      console.log(`Grid overlay created: ${width}x${height}, cell size: ${cellSize}`);
    } catch (error) {
      console.error('Failed to create grid overlay:', error);
    }
  }

  /**
   * Create a default map for testing
   */
  createDefaultMap(): void {
    // Set a background image first - use test-map2.png instead of fantasy-map.svg
    const mapWidth = 20 * TILE_SIZE;
    const mapHeight = 15 * TILE_SIZE;
    this.setBackgroundImage('test_map_bg', mapWidth, mapHeight);
    this.createGridOverlay(mapWidth, mapHeight, TILE_SIZE);
    
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
      
      // Reset camera to default view
      this.resetCamera();
      
      console.log('Default map created with camera controls');
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
      
      // Make camera follow the player with smooth movement
      this.cameras.main.startFollow(sprite, true, this.PAN_SMOOTH_FACTOR, this.PAN_SMOOTH_FACTOR);
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

  /**
   * Create controls information UI
   */
  private createControlsInfo(): void {
    const controlsInfo = [
      'Camera Controls:',
      '• Mouse wheel: Zoom in/out',
      '• Click + drag: Pan map',
      '• +/- keys: Zoom in/out',
      '• WASD keys: Pan map',
      '• Touch: Pinch to zoom, drag to pan'
    ].join('\n');
    
    this.controlsText = this.add.text(10, 10, controlsInfo, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 8, y: 6 }
    });
    this.controlsText.setDepth(1000); // Ensure it's on top
    this.controlsText.setScrollFactor(0); // Keep it fixed to camera
    
    // Auto-hide after 10 seconds
    this.time.delayedCall(10000, () => {
      if (this.controlsText) {
        this.controlsText.setVisible(false);
      }
    });
    
    // Allow toggling with 'H' key
    if (this.input && this.input.keyboard) {
      const helpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
      helpKey.on('down', () => {
        if (this.controlsText) {
          this.controlsText.setVisible(!this.controlsText.visible);
        }
      });
    }
  }

  /**
   * Setup resize handling for responsive canvas
   */
  private setupResizeHandling(): void {
    // Listen for scale manager resize events
    this.scale.on('resize', (gameSize: any) => {
      // Update UI elements that need to stay in fixed positions
      if (this.controlsText) {
        // Controls text stays in top-left corner
        this.controlsText.setPosition(10, 10);
      }
      
      // Update camera bounds if needed
      this.enforceCameraBounds();
      
      console.log(`Game resized to: ${gameSize.width}x${gameSize.height}`);
    });
  }
}

export default MainScene; 