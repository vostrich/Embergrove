import Phaser from 'phaser';
import { SCENES } from '@data/Constants';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.UI });
  }

  create(): void {
    // Placeholder UI scene — Sprint 1 will add HP/Stamina/Mana bars, minimap, etc.
  }
}
