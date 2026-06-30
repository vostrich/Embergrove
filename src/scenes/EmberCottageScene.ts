import Phaser from 'phaser';
import { SCENES } from '@data/Constants';

export class EmberCottageScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.EMBER_COTTAGE });
  }

  create(): void {
    // Placeholder scene — Sprint 1 will add tilemap, player, and camera

    this.add.text(400, 300, 'Ember Cottage — Sprint 1', {
      fontSize: '16px',
      color: '#e8a54b',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }
}
