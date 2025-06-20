import Phaser from 'phaser';
import { 
  ActorObject, 
  AssetKeys, 
  GameObject, 
  LayerType, 
  ObjectType 
} from '../types';
import { TILE_SIZE } from '../constants';
import { Actor, Position, ActorType } from '../../store/types';
import { performanceMonitor } from '../../utils/PerformanceMonitor';
import AssetPreloader from '../AssetPreloader';
import GridEngine, { Direction } from 'grid-engine';
import { Subscription } from 'rxjs';

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
  private readonly ZOOM_SPEED = 0.01;
  private readonly PAN_SPEED = 200;
  private readonly ZOOM_SMOOTH_FACTOR = 0.1;
  private readonly PAN_SMOOTH_FACTOR = 0.05;
  
  // Event callbacks
  private onActorMove: ((actorId: string, position: Position) => void) | null = null;
  // Movement control flag
  private movementEnabled: boolean = false;
  // Highlight rectangles for movement path
  private highlightRects: Phaser.GameObjects.Rectangle[] = [];
  
  // Performance monitoring
  private entityCount: number = 0;
  private isDevMode: boolean = false;
  // Grid Engine plugin instance (added for TypeScript)
  private gridEngine!: any;
  // Subscription to grid-engine positionChanged events
  private posSub?: Subscription;
  // Last known tile position for fallback fallback detection
  private lastTilePos?: Position;

  constructor() {
    super({ key: 'MainScene' });
    
    // Check if we're in development mode
    this.isDevMode = process.env.NODE_ENV === 'development';
  }

  preload() {
    console.log('🎮 MAIN SCENE PRELOAD STARTED');
    
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
      
      // Load sprites with logging
      console.log('🎨 Loading test and existing character sprites...');
      // Test character sprites
      this.load.image('Nheme', 'sprites/characters/Nheme.png');
      this.load.image('Nil', 'sprites/characters/Nil.png');
      this.load.image('Seraphine', 'sprites/characters/Seraphine.png');
      this.load.image('Torre', 'sprites/characters/Torre.png');
      // Existing enemy and Rob sprites
      this.load.spritesheet(AssetKeys.SPRITE_ENEMY, 'sprites/enemy.png', { 
        frameWidth: 32, 
        frameHeight: 48 
      });
      this.load.image(AssetKeys.SPRITE_ROB, 'sprites/characters/Rob.png');
      
      // Add load event listeners for debugging
      this.load.on('filecomplete', (key: string) => {
        console.log(`✅ Asset loaded: ${key}`);
      });
      
      this.load.on('loaderror', (file: any) => {
        console.error(`❌ Failed to load asset: ${file.key} from ${file.url}`);
      });
      
      this.load.on('complete', () => {
        console.log('🎮 ALL ASSETS LOADED SUCCESSFULLY');
        // List all loaded textures
        console.log('Available textures:', Object.keys(this.textures.list));
      });
      
    } catch (error) {
      console.error('❌ Error in preload:', error);
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

    // Initialize GridEngine with all actors
    const obstacleLayer = this.layers[LayerType.OBSTACLES];
    if (!this.map || !obstacleLayer) {
      console.warn('Cannot initialize GridEngine: missing map or obstacleLayer');
    } else {
      const characters = this.getActorIds().map(id => {
        const actorObj = this.getActor(id)!;
        return {
          id,
          sprite: actorObj.sprite!,
          startPosition: { x: actorObj.position.x, y: actorObj.position.y }
        };
      });
      // Pass the tilemap as the first argument per Grid Engine API
      this.gridEngine.create(this.map, {
        characters,
        collision: { colliders: [obstacleLayer] },
        grid: { tileWidth: TILE_SIZE, tileHeight: TILE_SIZE },
        numberOfDirections: 8
      });
      // Subscribe to tile-enter events for step counting, if available
      try {
        if (this.gridEngine && typeof this.gridEngine.positionChanged === 'function') {
          this.posSub = this.gridEngine.positionChanged()
            .subscribe(({ charId, enterTile }: { charId: string; enterTile: Position }) => {
              // Highlight the tile entered
              this.highlightTile(enterTile.x, enterTile.y);
              // Forward event to React for step-counting and path state
              if (this.onActorMove) {
                this.onActorMove(charId, enterTile);
              }
            });
          // Clean up on shutdown
          this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.posSub?.unsubscribe();
          });
        } else {
          console.warn('GridEngine.positionChanged not available, skipping step subscription');
        }
      } catch (error) {
        console.warn('Failed to subscribe to GridEngine positionChanged:', error);
      }
    }

    // Click-to-move: click a tile to move there when in move-mode
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.movementEnabled || !this.player || !this.map) return;
      // snap to floor to get integer tile coords
      const tile = this.map.worldToTileXY(pointer.worldX, pointer.worldY, true);
      if (!tile) return;
      this.gridEngine.moveTo(this.player.id, { x: tile.x, y: tile.y });
    });

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
      // Use very small zoom step for mouse wheel for ultra-granular control
      const wheelZoomSpeed = 0.005; // 0.5% zoom steps for very fine control
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
    camera.setZoom(0.7); // Start zoomed out to show more of the map
    
    // Always center on map center to show all actors, not just player
    const bounds = camera.getBounds();
    if (bounds) {
      camera.centerOn(bounds.centerX, bounds.centerY);
    } else {
      // Fallback: center on middle of a typical map
      camera.centerOn(7.5 * TILE_SIZE, 7.5 * TILE_SIZE);
    }
    
    // Don't automatically follow the player initially so we can see all actors
    // Camera will follow player when they start moving
    
    this.enforceCameraBounds();
  }

  update() {
    console.log('[MainScene] update loop, movementEnabled:', this.movementEnabled, 'isDragging:', this.isDragging);
    
    // Start performance monitoring for this frame
    if (this.isDevMode) {
      performanceMonitor.begin();
    }
    
    // Handle keyboard zoom controls
    this.handleKeyboardZoom();
    
    // Handle keyboard pan controls
    this.handleKeyboardPan();
    
    // Arrow-key movement when in move-mode
    if (this.movementEnabled && this.player) {
      // Diagonal detection first
      let dir: Direction | undefined;
      if (this.cursors.left.isDown && this.cursors.up.isDown) {
        dir = Direction.UP_LEFT;
      } else if (this.cursors.left.isDown && this.cursors.down.isDown) {
        dir = Direction.DOWN_LEFT;
      } else if (this.cursors.right.isDown && this.cursors.up.isDown) {
        dir = Direction.UP_RIGHT;
      } else if (this.cursors.right.isDown && this.cursors.down.isDown) {
        dir = Direction.DOWN_RIGHT;
      } else if (this.cursors.left.isDown) {
        dir = Direction.LEFT;
      } else if (this.cursors.right.isDown) {
        dir = Direction.RIGHT;
      } else if (this.cursors.up.isDown) {
        dir = Direction.UP;
      } else if (this.cursors.down.isDown) {
        dir = Direction.DOWN;
      }
      if (dir) {
        this.gridEngine.move(this.player.id, dir);
      }
    }
    
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

    // Fallback: detect tile entry via polling
    if (this.movementEnabled && this.player && typeof this.gridEngine.getPosition === 'function') {
      const curPos = this.gridEngine.getPosition(this.player.id);
      if (curPos && (!this.lastTilePos || curPos.x !== this.lastTilePos.x || curPos.y !== this.lastTilePos.y)) {
        this.lastTilePos = curPos;
        // Mark the new tile in the scene
        this.highlightTile(curPos.x, curPos.y);
        // Also notify React for step-counting and path state
        if (this.onActorMove) {
          this.onActorMove(this.player.id, curPos);
        }
      }
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
    console.log('[MainScene] setOnActorMove registered callback');
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

      // Only overlay a grid, no tile layers or backgrounds
      this.createGridOverlay(mapWidth, mapHeight, gridSize);

      // Set world and camera bounds to grid dimensions
      this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
      this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

      // Reset camera to default view
      this.resetCamera();

      console.log(`Map grid displayed: ${mapData.name} (${mapData.width}x${mapData.height})`);
    } catch (error) {
      console.error('Error loading map grid from data:', error);
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
      
      // Add test actors for demonstration
      const defaultStats = { health: 1, maxHealth: 1, mana: 0, maxMana: 0, strength: 0, dexterity: 0, intelligence: 0, constitution: 0, wisdom: 0, charisma: 0 };
      const testActors: Actor[] = [
        { id: 'test-nheme', name: 'Nheme', type: ActorType.NPC, position: { x: 2, y: 2 }, stats: defaultStats, skills: [], inventory: [], level: 1, experience: 0, nextLevelExperience: 100 },
        { id: 'test-nil', name: 'Nil', type: ActorType.NPC, position: { x: 4, y: 2 }, stats: defaultStats, skills: [], inventory: [], level: 1, experience: 0, nextLevelExperience: 100 },
        { id: 'test-rob', name: 'Rob', type: ActorType.ROB, position: { x: 6, y: 2 }, stats: defaultStats, skills: [], inventory: [], level: 1, experience: 0, nextLevelExperience: 100 },
        { id: 'test-seraphine', name: 'Seraphine', type: ActorType.NPC, position: { x: 8, y: 2 }, stats: defaultStats, skills: [], inventory: [], level: 1, experience: 0, nextLevelExperience: 100 },
        { id: 'test-torre', name: 'Torre', type: ActorType.NPC, position: { x: 10, y: 2 }, stats: defaultStats, skills: [], inventory: [], level: 1, experience: 0, nextLevelExperience: 100 }
      ];
      testActors.forEach(actor => {
        try {
          this.addActor(actor);
          console.log(`✅ Test actor ${actor.name} added`);
        } catch (error) {
          console.error(`❌ Failed to add test actor ${actor.name}:`, error);
        }
      });
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
    console.log(`🏃‍♂️ ADDING ACTOR: ${actor.name} (${actor.id}) of type ${actor.type}`);
    console.log('Actor data:', actor);
    
    // Determine which sprite to use based on actor type
    let spriteKey: string = AssetKeys.SPRITE_PLAYER;
    let objectType = ObjectType.PLAYER;
    
    switch (actor.type) {
      case 'player':
        spriteKey = AssetKeys.SPRITE_PLAYER;
        objectType = ObjectType.PLAYER;
        break;
      case 'npc':
        // Use actor.name key if loaded (e.g. 'Nil', 'Nheme'), otherwise fallback to default NPC sprite
        if (this.textures.exists(actor.name)) {
          spriteKey = actor.name;
        } else {
          spriteKey = AssetKeys.SPRITE_NPC;
        }
        objectType = ObjectType.NPC;
        break;
      case 'enemy':
        spriteKey = AssetKeys.SPRITE_ENEMY;
        objectType = ObjectType.ENEMY;
        break;
      case 'warrior':
        spriteKey = AssetKeys.SPRITE_WARRIOR;
        objectType = ObjectType.WARRIOR;
        break;
      case 'rob':
        spriteKey = AssetKeys.SPRITE_ROB;
        objectType = ObjectType.ROB;
        break;
      default:
        console.error(`❌ Unknown actor type: ${actor.type}`);
        return null;
    }
    
    // Check if texture exists
    if (!this.textures.exists(spriteKey)) {
      console.error(`❌ TEXTURE NOT FOUND: ${spriteKey}`);
      console.log('Available textures:', Object.keys(this.textures.list));
      return null;
    } else {
      console.log(`✅ Texture found: ${spriteKey}`);
    }
    
    // Calculate world position
    const worldX = actor.position.x * TILE_SIZE + TILE_SIZE / 2;
    const worldY = actor.position.y * TILE_SIZE + TILE_SIZE / 2;
    console.log(`🌍 World position: (${worldX}, ${worldY}) from tile (${actor.position.x}, ${actor.position.y})`);
    
    // Create the sprite
    const sprite = this.physics.add.sprite(worldX, worldY, spriteKey);
    
    if (!sprite) {
      console.error(`❌ FAILED TO CREATE SPRITE for actor ${actor.id}`);
      return null;
    }
    
    console.log(`✅ Sprite created successfully for ${actor.name}`);
    
    // Set sprite properties
    sprite.setOrigin(0.5, 0.5);
    sprite.setDepth(1000); // Dramatically higher depth to ensure sprites are absolutely on top
    
    // Ensure consistent sprite size (some images like Rob.png might be very large)
    sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
    
    console.log(`📏 Sprite size set to: ${TILE_SIZE}x${TILE_SIZE}`);
    console.log(`🎯 Sprite depth set to: ${sprite.depth}`);
    console.log(`👁️ Sprite visibility: ${sprite.visible}, alpha: ${sprite.alpha}`);
    
    // Enable physics
    this.physics.world.enable(sprite);
    sprite.body.setCollideWorldBounds(true);
    
    // Debug logging to verify sprite creation
    console.log(`📍 Final sprite position: (${sprite.x}, ${sprite.y})`);
    console.log(`📦 Sprite bounds: width=${sprite.displayWidth}, height=${sprite.displayHeight}`);
    console.log(`🏷️ Sprite texture key: ${sprite.texture?.key}`);
    
    // Extra logging for Rob specifically
    if (actor.type === 'rob') {
      console.log(`🎯 ROB SPRITE CREATED!`);
      console.log(`Rob sprite details:`, {
        visible: sprite.visible,
        alpha: sprite.alpha,
        scaleX: sprite.scaleX,
        scaleY: sprite.scaleY,
        texture: sprite.texture?.key,
        displayWidth: sprite.displayWidth,
        displayHeight: sprite.displayHeight,
        depth: sprite.depth,
        x: sprite.x,
        y: sprite.y
      });
      
      // Force maximum visibility for Rob
      sprite.setVisible(true);
      sprite.setAlpha(1.0);
      sprite.setDepth(2000); // Even higher depth for Rob specifically
      
      // Add a colored border around Rob for debugging
      const robBorder = this.add.graphics();
      robBorder.lineStyle(3, 0xFF0000, 1); // Red border
      robBorder.strokeRect(sprite.x - TILE_SIZE/2 - 2, sprite.y - TILE_SIZE/2 - 2, TILE_SIZE + 4, TILE_SIZE + 4);
      robBorder.setDepth(1999); // Just below Rob
      
      console.log(`🎯 ROB ENHANCED WITH RED BORDER AT POSITION (${sprite.x}, ${sprite.y})`);
    }
    
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
    actorObject.nameText.setDepth(2000); // Even higher depth for text
    
    // Add to game objects
    this.gameObjects.set(actor.id, actorObject);
    
    // Set initial animation based on actor type
    switch (actor.type) {
      case 'player':
        // Player uses static image, no animation needed
        break;
      case 'npc':
        // NPC uses static image, no animation needed
        break;
      case 'enemy':
        sprite.anims.play('enemy-idle-down', true);
        break;
      case 'warrior':
        // Warrior uses static image, no animation needed
        break;
      case 'rob':
        // Rob uses static image, no animation needed
        break;
    }
    
    // If this is Rob, always set as the main player; else if a player and none set yet
    if (objectType === ObjectType.ROB) {
      this.player = actorObject;
      // Make camera follow Rob with smooth movement
      this.cameras.main.startFollow(sprite, true, this.PAN_SMOOTH_FACTOR, this.PAN_SMOOTH_FACTOR);
    } else if (objectType === ObjectType.PLAYER && !this.player) {
      this.player = actorObject;
      // Make camera follow the player with smooth movement
      this.cameras.main.startFollow(sprite, true, this.PAN_SMOOTH_FACTOR, this.PAN_SMOOTH_FACTOR);
    }
    
    // Skip server-supplied Rob actor; only allow test-rob
    if (objectType === ObjectType.ROB && actor.id !== 'test-rob') {
      console.log(`Skipping server Rob actor: ${actor.id}`);
      return null;
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
        position.x * TILE_SIZE + TILE_SIZE / 2,
        position.y * TILE_SIZE + TILE_SIZE / 2
      );
      
      // Update health bar and name text position
      if ('actor' in obj) {
        const actorObj = obj as ActorObject;
        
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
   * Teleport an actor to a new tile, updating GridEngine and sprite position
   */
  public teleportActor(actorId: string, position: Position): void {
    // Try to update GridEngine internal position
    if (this.gridEngine && typeof this.gridEngine.setPosition === 'function') {
      try {
        this.gridEngine.setPosition(actorId, position);
      } catch (error) {
        console.warn('Failed to set GridEngine position for actor', actorId, error);
      }
    }
    // Update sprite position
    this.updateActorPosition(actorId, position);
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
   * Check if an actor exists in the scene
   * @param actorId The ID of the actor to check
   * @returns True if the actor exists, false otherwise
   */
  public hasActor(actorId: string): boolean {
    return this.gameObjects.has(actorId);
  }

  /**
   * Get all actor IDs currently in the scene
   * @returns Array of actor IDs
   */
  public getActorIds(): string[] {
    return Array.from(this.gameObjects.keys());
  }

  /**
   * Get an actor object by ID
   * @param actorId The ID of the actor
   * @returns The actor object or null if not found
   */
  public getActor(actorId: string): ActorObject | null {
    const obj = this.gameObjects.get(actorId);
    return obj && 'actor' in obj ? (obj as ActorObject) : null;
  }

  /**
   * Get the ID of the current player character
   * @returns The current player's actor ID or undefined
   */
  public getPlayerId(): string | undefined {
    return this.player?.id;
  }

  /**
   * Create animations for sprites
   */
  private createAnimations(): void {
    // Only create animations for sprites that are loaded as spritesheets
    
    // Enemy animations (still a spritesheet)
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

  /**
   * Highlight a specific tile position with a translucent rectangle
   */
  private highlightTile(x: number, y: number): void {
    const worldX = x * TILE_SIZE + TILE_SIZE / 2;
    const worldY = y * TILE_SIZE + TILE_SIZE / 2;
    const rect = this.add.rectangle(
      worldX,
      worldY,
      TILE_SIZE,
      TILE_SIZE,
      0x28b463,
      0.3
    );
    rect.setOrigin(0.5);
    rect.setDepth(900);
    this.highlightRects.push(rect);
  }

  /**
   * Clear all highlighted path rectangles
   */
  private clearHighlights(): void {
    this.highlightRects.forEach(rect => rect.destroy());
    this.highlightRects = [];
  }

  /**
   * Enable or disable actor movement via keyboard
   */
  public setMovementEnabled(enabled: boolean): void {
    console.log('[MainScene] setMovementEnabled:', enabled);
    this.movementEnabled = enabled;
    if (enabled) {
      if (this.gridEngine && typeof this.gridEngine.getPosition === 'function' && this.player) {
        this.lastTilePos = this.gridEngine.getPosition(this.player.id);
      }
    } else {
      this.clearHighlights();
      this.lastTilePos = undefined;
    }
  }
}

export default MainScene;
