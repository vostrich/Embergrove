import Phaser from 'phaser';
import { SCENES } from '@data/Constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  preload(): void {
    // Minimal boot — PreloadScene handles actual asset loading
  }

  create(): void {
    this.scene.start(SCENES.PRELOAD);
  }
}
