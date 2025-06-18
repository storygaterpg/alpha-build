import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import GridEngine from 'grid-engine';

export interface GameConfig {
  parent: string;
  width?: number;
  height?: number;
}

export class Game {
  private game: Phaser.Game | null = null;

  constructor(config: GameConfig) {
    // Get parent element to determine initial size
    const parentElement = document.getElementById(config.parent);
    const initialWidth = parentElement?.clientWidth || 800;
    const initialHeight = parentElement?.clientHeight || 600;

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: config.parent,
      width: initialWidth,
      height: initialHeight,
      backgroundColor: '#000000',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: process.env.NODE_ENV === 'development',
        },
      },
      scene: [MainScene],
      plugins: {
        scene: [
          { key: 'gridEngine', plugin: GridEngine, mapping: 'gridEngine' }
        ]
      },
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: config.parent,
        expandParent: false,
        fullscreenTarget: config.parent
      },
      render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true
      },
      autoFocus: true
    });

    // Set up resize listener
    this.setupResizeListener();
  }

  private setupResizeListener(): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (this.game && this.game.scale) {
          const { width, height } = entry.contentRect;
          this.game.scale.resize(width, height);
        }
      }
    });

    const parentElement = document.getElementById(this.game?.config.parent as string);
    if (parentElement) {
      resizeObserver.observe(parentElement);
    }
  }

  /**
   * Get the Phaser game instance
   * @returns The Phaser game instance or null
   */
  public getGameInstance(): Phaser.Game | null {
    return this.game;
  }

  /**
   * Get a scene from the game
   * @param key The key of the scene to get
   * @returns The scene or undefined
   */
  public getScene(key: string): Phaser.Scene | undefined {
    return this.game?.scene.getScene(key);
  }

  destroy() {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }
}

export default Game; 