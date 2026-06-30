import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '@data/Constants';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MAIN_MENU });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.text(cx, cy - 60, 'EMBERGROVE', {
      fontSize: '48px',
      color: '#e8a54b',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, cy, 'The Hollow Veil', {
      fontSize: '20px',
      color: '#c0c0c0',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 60, 'Press ENTER to start', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start(SCENES.EMBER_COTTAGE);
    });
  }
}
