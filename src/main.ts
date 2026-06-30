import Phaser from 'phaser';
import { BootScene } from '@scenes/BootScene';
import { PreloadScene } from '@scenes/PreloadScene';
import { MainMenuScene } from '@scenes/MainMenuScene';
import { EmberCottageScene } from '@scenes/EmberCottageScene';
import { UIScene } from '@scenes/UIScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@data/Constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,

  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,

  pixelArt: true,
  antialias: false,
  roundPixels: true,

  render: {
    alphaStrategy: 'discard' as const,
    stencil: true,
    roundPixels: true,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    EmberCottageScene,
    UIScene,
  ],
};

new Phaser.Game(config);
