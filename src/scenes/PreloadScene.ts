import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '@data/Constants';
import { TILESETS, TILEMAPS, SPRITES, UI_ASSETS, AUDIO, DATA_FILES } from '@data/AssetRegistry';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENES.PRELOAD });
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Loading bar background
    this.progressBar = this.add.graphics();
    this.progressBar.fillStyle(0x333333, 1);
    this.progressBar.fillRect(cx - 200, cy, 400, 24);

    // Loading bar fill (ember orange)
    this.progressFill = this.add.graphics();

    // Loading text
    this.loadingText = this.add.text(cx, cy + 40, 'Loading...', {
      fontSize: '14px',
      color: '#e8a54b',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Progress listener
    this.load.on('progress', (value: number) => {
      this.progressFill.clear();
      this.progressFill.fillStyle(0xe8a54b, 1);
      this.progressFill.fillRect(cx - 198, cy + 2, 396 * value, 20);
      this.loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressFill.destroy();
      this.loadingText.destroy();
    });

    // ── Load Tilesets ──
    for (const tileset of TILESETS) {
      this.load.image(tileset.key, tileset.path);
    }

    // ── Load Tilemaps ──
    for (const tilemap of TILEMAPS) {
      this.load.tilemapTiledJSON(tilemap.key, tilemap.path);
    }

    // ── Load Sprites ──
    for (const sprite of SPRITES) {
      this.load.spritesheet(sprite.key, sprite.path, {
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight,
      });
    }

    // ── Load UI Assets ──
    for (const ui of UI_ASSETS) {
      this.load.image(ui.key, ui.path);
    }

    // ── Load Audio ──
    for (const audio of AUDIO) {
      if (audio.type === 'music') {
        this.load.audio(audio.key, audio.path);
      } else {
        this.load.audio(audio.key, audio.path);
      }
    }

    // ── Load Data Files ──
    for (const data of DATA_FILES) {
      this.load.json(data.key, data.path);
    }

    // Generate placeholder textures for any missing sprites
    this.generatePlaceholders();
  }

  create(): void {
    this.scene.start(SCENES.MAIN_MENU);
  }

  private generatePlaceholders(): void {
    // Generate placeholder sprites for any that failed to load
    const allSpriteKeys = SPRITES.map(s => s.key);

    // We'll generate a simple colored rectangle placeholder for each sprite
    // that we know might not exist yet. These will be replaced by real assets.
    const placeholderSize = 32;
    const colors: Record<string, number> = {
      'player-idle': 0x4488ff,
      'player-run': 0x4488ff,
      'player-attack': 0x4488ff,
      'player-dodge': 0x4488ff,
      'veil-rat': 0x8844aa,
      'hollow-wolf': 0x666688,
      'mist-wraith': 0x44aaaa,
      'marsh-maw': 0x886644,
      'npc-grandma': 0xcc88aa,
      'npc-smith': 0xaa8844,
      'boss-hollow-king': 0x442266,
    };

    for (const key of allSpriteKeys) {
      const color = colors[key] ?? 0xff00ff;
      if (!this.textures.exists(key)) {
        const gfx = this.add.graphics();
        gfx.fillStyle(color, 1);
        gfx.fillRect(0, 0, placeholderSize, placeholderSize);
        gfx.generateTexture(key, placeholderSize, placeholderSize);
        gfx.destroy();
      }
    }

    // Custom placeholder generation for Sprint 1
    const customPlaceholders = [
      { key: 'placeholder-cottage', width: 64, height: 64, color: 0x6b3e1f },
      { key: 'placeholder-building', width: 64, height: 64, color: 0x6b6b6b },
      { key: 'placeholder-tree', width: 32, height: 32, color: 0x2d5b2d },
      { key: 'placeholder-rock', width: 24, height: 24, color: 0x5b5b5b },
      { key: 'placeholder-grass-tile', width: 16, height: 16, color: 0x4a7c3e },
      { key: 'ember-particle', width: 4, height: 4, color: 0xff8c42 },
      { key: 'coin', width: 16, height: 16, color: 0xffd700 },
      { key: 'sun', width: 24, height: 24, color: 0xffeb3b },
      { key: 'moon', width: 24, height: 24, color: 0xd4d4d4 },
    ];

    for (const item of customPlaceholders) {
      if (!this.textures.exists(item.key)) {
        const gfx = this.add.graphics();
        gfx.fillStyle(item.color, 1);
        gfx.fillRect(0, 0, item.width, item.height);
        gfx.generateTexture(item.key, item.width, item.height);
        gfx.destroy();
      }
    }
  }
}
