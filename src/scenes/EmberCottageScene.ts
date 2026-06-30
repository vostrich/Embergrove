import Phaser from 'phaser';
import { SCENES, TILE_SIZE } from '@data/Constants';
import { SaveSystem } from '@systems/SaveSystem';
import { DayNightSystem } from '@systems/DayNightSystem';

export class EmberCottageScene extends Phaser.Scene {
  public player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;

  private cottage!: Phaser.GameObjects.Sprite;
  private tintOverlay!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENES.EMBER_COTTAGE });
  }

  create(): void {
    // Initialize Day/Night system time from save
    DayNightSystem.getInstance().initFromSave();

    const mapWidth = 40;
    const mapHeight = 25;
    const pixelWidth = mapWidth * TILE_SIZE; // 40 * 32 = 1280
    const pixelHeight = mapHeight * TILE_SIZE; // 25 * 32 = 800

    // Set background color to dawn ambience
    this.cameras.main.setBackgroundColor(0xffd1a3);

    // ── Generate Tilemap Base Layer ──
    const mapData: number[][] = [];
    for (let y = 0; y < mapHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < mapWidth; x++) {
        row.push(0); // 0 corresponds to grass tile in tileset
      }
      mapData.push(row);
    }

    const map = this.make.tilemap({
      data: mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const tileset = map.addTilesetImage('placeholder-grass-tile', 'placeholder-grass-tile');

    let baseLayer;
    try {
      // 5th param is 'gpu' (boolean) for TilemapGPULayer in Phaser 4
      baseLayer = map.createLayer(0, tileset!, 0, 0, true);
    } catch (err) {
      console.warn('TilemapGPULayer creation failed, falling back to standard layer:', err);
      baseLayer = map.createLayer(0, tileset!, 0, 0);
    }

    // ── Create Player Placeholder (Rectangle) ──
    this.player = this.add.rectangle(300, 400, 32, 32, 0xff8c42);
    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCollideWorldBounds(true);

    // ── Cottage Building ──
    this.cottage = this.add.sprite(200, 200, 'placeholder-cottage');
    this.cottage.setInteractive({ useHandCursor: true });

    // "HOME BASE" text above cottage
    this.add.text(200, 150, 'HOME BASE', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontWeight: 'bold',
    }).setOrigin(0.5);

    // ── Silhouettes ──
    const smithy = this.add.sprite(450, 350, 'placeholder-building');
    smithy.setTint(0x444444);
    smithy.setTintMode(Phaser.Display.TintModes.MULTIPLY);

    const apothecary = this.add.sprite(750, 350, 'placeholder-building');
    apothecary.setTint(0x444444);
    apothecary.setTintMode(Phaser.Display.TintModes.MULTIPLY);

    // ── Stenciled Fog (y > 500) ──
    const fogStencil = new Phaser.GameObjects.Stencil(this);
    this.add.existing(fogStencil);

    // Draw the mask area where fog is visible (south area)
    const stencilShape = this.add.graphics();
    stencilShape.fillStyle(0xffffff, 1.0);
    stencilShape.fillRect(0, 500, pixelWidth, pixelHeight - 500);
    fogStencil.add(stencilShape);

    // Fog overlay graphics
    const fogOverlay = this.add.graphics();
    fogOverlay.fillStyle(0x2c1a3d, 0.65); // Hollow Veil dark purple fog
    fogOverlay.fillRect(0, 500, pixelWidth, pixelHeight - 500);
    this.add.existing(fogOverlay);

    // Apply stencil mask
    fogOverlay.enableFilters();
    (fogOverlay as any).filters.internal.addMask(fogStencil);

    // ── Trees and Rocks around Borders ──
    const treeCoords = [
      { x: 80, y: 100 },
      { x: 1200, y: 100 },
      { x: 120, y: 700 },
      { x: 1160, y: 700 },
      { x: 600, y: 80 },
      { x: 80, y: 450 },
      { x: 1220, y: 450 },
      { x: 900, y: 120 },
    ];

    const rockCoords = [
      { x: 350, y: 90 },
      { x: 1020, y: 110 },
      { x: 160, y: 580 },
      { x: 1100, y: 580 },
      { x: 80, y: 280 },
      { x: 1200, y: 280 },
    ];

    // Render trees with SpriteGPULayer
    try {
      const treeLayer = this.add.spriteGPULayer('placeholder-tree', 8);
      const treeMember = { frame: 'placeholder-tree', x: 0, y: 0 };
      for (const coord of treeCoords) {
        treeMember.x = coord.x;
        treeMember.y = coord.y;
        treeLayer.addMember(treeMember);
      }
    } catch (err) {
      console.warn('SpriteGPULayer for trees failed, falling back to sprites:', err);
      for (const coord of treeCoords) {
        this.add.sprite(coord.x, coord.y, 'placeholder-tree');
      }
    }

    // Render rocks with SpriteGPULayer
    try {
      const rockLayer = this.add.spriteGPULayer('placeholder-rock', 6);
      const rockMember = { frame: 'placeholder-rock', x: 0, y: 0 };
      for (const coord of rockCoords) {
        rockMember.x = coord.x;
        rockMember.y = coord.y;
        rockLayer.addMember(rockMember);
      }
    } catch (err) {
      console.warn('SpriteGPULayer for rocks failed, falling back to sprites:', err);
      for (const coord of rockCoords) {
        this.add.sprite(coord.x, coord.y, 'placeholder-rock');
      }
    }

    // Create collidable physics zones at coordinates
    const obstacles = this.physics.add.staticGroup();

    for (const coord of treeCoords) {
      const zone = this.add.zone(coord.x, coord.y, 32, 32);
      this.physics.add.existing(zone, true);
      obstacles.add(zone);
    }

    for (const coord of rockCoords) {
      const zone = this.add.zone(coord.x, coord.y, 24, 24);
      this.physics.add.existing(zone, true);
      obstacles.add(zone);
    }

    this.physics.add.collider(this.player, obstacles);

    // ── Camera setup ──
    this.cameras.main.setBounds(0, 0, pixelWidth, pixelHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(200, 200);

    // ── Controls setup ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Launch overlay HUD Parallel
    this.scene.launch(SCENES.UI);

    // ── Custom Camera Tint overlay workaround ──
    this.tintOverlay = this.add.graphics();
    this.tintOverlay.setScrollFactor(0);
    this.tintOverlay.setDepth(1000); // Draw on top of game objects, but below HUD parallel scene

    (this.cameras.main as any).setTint = (color: number, alpha: number) => {
      this.tintOverlay.clear();
      if (alpha > 0) {
        this.tintOverlay.fillStyle(color, alpha);
        this.tintOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
      }
    };
  }

  update(time: number, delta: number): void {
    const speed = 160;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocity(0);

    // Horizontal movement
    if (this.cursors.left.isDown || this.keyA.isDown) {
      playerBody.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      playerBody.setVelocityX(speed);
    }

    // Vertical movement
    if (this.cursors.up.isDown || this.keyW.isDown) {
      playerBody.setVelocityY(-speed);
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      playerBody.setVelocityY(speed);
    }

    // Normalize speed diagonally
    if (playerBody.velocity.x !== 0 && playerBody.velocity.y !== 0) {
      playerBody.velocity.normalize().scale(speed);
    }

    // Sync player position to active save for HUD/debug
    if (SaveSystem.activeSave) {
      SaveSystem.activeSave.player.x = this.player.x;
      SaveSystem.activeSave.player.y = this.player.y;
    }

    // Update Day/Night System
    DayNightSystem.getInstance().update(delta, this.cameras.main, this);

    // Cottage Interaction Range Check
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cottage.x, this.cottage.y);
    if (dist < 80) {
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
        this.showPopup('Enter cottage — coming soon');
      }
    }

    // Pause key toggle
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.scene.pause();
      this.scene.launch('PauseScene');
    }
  }

  private showPopup(message: string): void {
    const popup = this.add.text(this.player.x, this.player.y - 45, message, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#1a0d22',
      padding: { x: 10, y: 6 },
      fontFamily: 'monospace',
      fontWeight: 'bold',
      shadow: { color: '#ff8c42', fill: true, offsetX: 0, offsetY: 0, blur: 4 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: popup.y - 30,
      alpha: 0,
      duration: 1800,
      onComplete: () => popup.destroy(),
    });
  }
}
