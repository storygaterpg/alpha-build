import Phaser from 'phaser';
import MainScene from './scenes/MainScene';

export interface GameConfig {
  parent: string;
  width: number;
  height: number;
}

export class Game {
  private game: Phaser.Game | null = null;

  constructor(config: GameConfig) {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: config.parent,
      width: config.width,
      height: config.height,
      backgroundColor: '#000000',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: process.env.NODE_ENV === 'development',
        },
      },
      scene: [MainScene],
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });
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