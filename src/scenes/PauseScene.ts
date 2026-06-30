import Phaser from 'phaser';
import { SCENES } from '@data/Constants';
import { SaveSystem } from '@systems/SaveSystem';

export class PauseScene extends Phaser.Scene {
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private menuContainer!: Phaser.GameObjects.Container;
  private confirmContainer!: Phaser.GameObjects.Container;
  private saveIndicatorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Semi-transparent overlay
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
      .setOrigin(0, 0);

    // "PAUSED" Title Text
    this.add.text(cx, 150, 'PAUSED', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontWeight: 'bold',
    }).setOrigin(0.5);

    // Menu Container
    this.menuContainer = this.add.container(0, 0);
    
    // Confirmation Container (hidden initially)
    this.confirmContainer = this.add.container(0, 0);
    this.confirmContainer.setVisible(false);

    // ── Build Main Pause Menu ──
    const buttons = [
      { text: 'Resume', y: 260, click: () => this.resumeGame() },
      { text: 'Save Game', y: 320, click: () => this.saveGame() },
      { text: 'Settings', y: 380, click: () => {} }, // placeholder
      { text: 'Main Menu', y: 440, click: () => this.showConfirmation() },
    ];

    for (const btnInfo of buttons) {
      const enabled = btnInfo.text !== 'Settings'; // Enable all except settings placeholder
      const btn = this.add.text(cx, btnInfo.y, btnInfo.text, {
        fontSize: '24px',
        color: enabled ? '#ffffff' : '#555555',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        backgroundColor: enabled ? '#111111' : '#222222',
        padding: { x: 24, y: 10 }
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
          .on('pointerdown', btnInfo.click);
      }
      this.menuContainer.add(btn);
    }

    // Save success indicator text
    this.saveIndicatorText = this.add.text(cx, 510, '', {
      fontSize: '18px',
      color: '#4caf50',
      fontFamily: 'monospace',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    this.menuContainer.add(this.saveIndicatorText);

    // ── Build Confirmation Menu ──
    const promptText = this.add.text(cx, 280, 'Quit to Main Menu?\nUnsaved progress will be lost.', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    this.confirmContainer.add(promptText);

    const yesBtn = this.add.text(cx - 100, 370, 'YES', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#cc3333',
      padding: { x: 24, y: 10 },
      fontWeight: 'bold'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => yesBtn.setScale(1.1))
      .on('pointerout', () => yesBtn.setScale(1.0))
      .on('pointerdown', () => this.quitToMainMenu());
    this.confirmContainer.add(yesBtn);

    const noBtn = this.add.text(cx + 100, 370, 'NO', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333333',
      padding: { x: 24, y: 10 },
      fontWeight: 'bold'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => noBtn.setScale(1.1))
      .on('pointerout', () => noBtn.setScale(1.0))
      .on('pointerdown', () => this.hideConfirmation());
    this.confirmContainer.add(noBtn);

    // Keyboard ESC toggle
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.resumeGame();
    }
  }

  private resumeGame(): void {
    this.scene.resume(SCENES.EMBER_COTTAGE);
    this.scene.stop();
  }

  private saveGame(): void {
    if (SaveSystem.activeSave) {
      SaveSystem.save(SaveSystem.activeSave);
      this.saveIndicatorText.setText('Game Saved Successfully!');
      this.tweens.add({
        targets: this.saveIndicatorText,
        alpha: { start: 1, end: 0 },
        duration: 2000,
        delay: 1000,
        onComplete: () => {
          this.saveIndicatorText.setText('');
          this.saveIndicatorText.setAlpha(1);
        }
      });
    } else {
      this.saveIndicatorText.setText('Error: No Active Save Found');
      this.saveIndicatorText.setColor('#ff3333');
    }
  }

  private showConfirmation(): void {
    this.menuContainer.setVisible(false);
    this.confirmContainer.setVisible(true);
  }

  private hideConfirmation(): void {
    this.confirmContainer.setVisible(false);
    this.menuContainer.setVisible(true);
  }

  private quitToMainMenu(): void {
    this.scene.stop(SCENES.EMBER_COTTAGE);
    this.scene.stop(SCENES.UI);
    this.scene.start(SCENES.MAIN_MENU);
  }
}
