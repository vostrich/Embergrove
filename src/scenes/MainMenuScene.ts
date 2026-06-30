import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '@data/Constants';
import { SaveSystem } from '@systems/SaveSystem';

export class MainMenuScene extends Phaser.Scene {
  private menuContainer!: Phaser.GameObjects.Container;
  private slotPickerContainer!: Phaser.GameObjects.Container;
  private bgm: any = null;

  constructor() {
    super({ key: SCENES.MAIN_MENU });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Solid dark background
    this.cameras.main.setBackgroundColor('#0a050d');

    // Particle Emitter for animated ember particles (floating upward)
    if (this.textures.exists('ember-particle')) {
      const emitterConfig = {
        x: { min: 0, max: GAME_WIDTH },
        y: GAME_HEIGHT + 10,
        lifespan: 5000,
        speedY: { min: -40, max: -120 },
        speedX: { min: -15, max: 15 },
        scale: { start: 1.5, end: 0 },
        alpha: { start: 0.8, end: 0 },
        frequency: 80,
        quantity: 1,
      };
      this.add.particles(0, 0, 'ember-particle', emitterConfig);
    }

    // Title Text "EMBERGROVE"
    this.add.text(cx, 120, 'EMBERGROVE', {
      fontSize: '64px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      shadow: { color: '#ff8c42', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
    }).setOrigin(0.5);

    // Subtitle "The Hollow Veil"
    this.add.text(cx, 190, 'The Hollow Veil', {
      fontSize: '24px',
      color: '#ff8c42',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Container for the Main Menu buttons
    this.menuContainer = this.add.container(0, 0);

    // Container for the Slot Picker menu
    this.slotPickerContainer = this.add.container(0, 0);
    this.slotPickerContainer.setVisible(false);

    // Check if saves exist
    const saves = SaveSystem.listSaves();
    const hasSaves = saves.some(s => s !== null);

    // Create Main Menu Buttons
    this.createMainMenuButton('New Game', cx, 300, () => this.startNewGame(), true);
    this.createMainMenuButton('Continue', cx, 360, () => this.showSlotPicker(), hasSaves);
    this.createMainMenuButton('Settings', cx, 420, () => {}, false); // Disabled/placeholder
    this.createMainMenuButton('Credits', cx, 480, () => {}, false);  // Disabled/placeholder

    // Create Slot Picker Buttons
    this.buildSlotPicker();

    // Background Music
    try {
      if (this.sound.get('bgm-ember-cottage')) {
        this.bgm = this.sound.get('bgm-ember-cottage');
      } else {
        this.bgm = this.sound.add('bgm-ember-cottage', { loop: true, volume: 0.25 });
      }

      if (this.bgm && !this.bgm.isPlaying) {
        this.bgm.play();
      }
    } catch (e) {
      console.warn('Could not play bgm-ember-cottage: ', e);
    }
  }

  private createMainMenuButton(text: string, x: number, y: number, callback: () => void, enabled: boolean): void {
    const btn = this.add.text(x, y, text, {
      fontSize: '24px',
      color: enabled ? '#ffffff' : '#555555',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      backgroundColor: enabled ? '#1a0d22' : '#141416',
      padding: { x: 20, y: 10 },
      shadow: enabled ? { color: '#ff8c42', fill: true, offsetX: 0, offsetY: 0, blur: 4 } : undefined
    }).setOrigin(0.5);

    if (enabled) {
      btn.setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          btn.setScale(1.1);
          btn.setColor('#ff8c42');
        })
        .on('pointerout', () => {
          btn.setScale(1.0);
          btn.setColor('#ffffff');
        })
        .on('pointerdown', callback);
    }
    this.menuContainer.add(btn);
  }

  private startNewGame(): void {
    // Create new game data on slot 1 (index 1)
    const data = SaveSystem.newGameData(1);
    SaveSystem.save(data);
    this.scene.start(SCENES.EMBER_COTTAGE);
  }

  private showSlotPicker(): void {
    this.menuContainer.setVisible(false);
    this.slotPickerContainer.setVisible(true);
  }

  private hideSlotPicker(): void {
    this.slotPickerContainer.setVisible(false);
    this.menuContainer.setVisible(true);
  }

  private buildSlotPicker(): void {
    const cx = GAME_WIDTH / 2;
    const saves = SaveSystem.listSaves();

    this.slotPickerContainer.add(
      this.add.text(cx, 260, 'Select Save Slot', {
        fontSize: '24px',
        color: '#ff8c42',
        fontFamily: 'monospace',
        fontWeight: 'bold'
      }).setOrigin(0.5)
    );

    for (let i = 0; i < 3; i++) {
      const save = saves[i];
      const slotText = save 
        ? `Slot ${i + 1}: Day ${save.world.currentDay} (${Math.floor(save.playTimeMs / 60000)}m)` 
        : `Slot ${i + 1}: Empty`;
      const enabled = save !== null;

      const slotBtn = this.add.text(cx, 320 + i * 55, slotText, {
        fontSize: '20px',
        color: enabled ? '#ffffff' : '#666666',
        fontFamily: 'monospace',
        backgroundColor: enabled ? '#1a0d22' : '#222222',
        padding: { x: 20, y: 8 },
        fontWeight: 'bold'
      }).setOrigin(0.5);

      if (enabled) {
        slotBtn.setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            slotBtn.setScale(1.05);
            slotBtn.setColor('#ff8c42');
          })
          .on('pointerout', () => {
            slotBtn.setScale(1.0);
            slotBtn.setColor('#ffffff');
          })
          .on('pointerdown', () => {
            SaveSystem.load(i);
            this.scene.start(SCENES.EMBER_COTTAGE);
          });
      }
      this.slotPickerContainer.add(slotBtn);
    }

    // Back Button
    const backBtn = this.add.text(cx, 510, 'Back', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333333',
      padding: { x: 16, y: 6 },
      fontWeight: 'bold'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setScale(1.1))
      .on('pointerout', () => backBtn.setScale(1.0))
      .on('pointerdown', () => this.hideSlotPicker());
    this.slotPickerContainer.add(backBtn);
  }
}
