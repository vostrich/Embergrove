import Phaser from 'phaser';
import { SCENES } from '@data/Constants';
import { SaveSystem } from '@systems/SaveSystem';
import { DayNightSystem } from '@systems/DayNightSystem';

interface UIBar {
  fill: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
}

export class UIScene extends Phaser.Scene {
  private hpBar!: UIBar;
  private staminaBar!: UIBar;
  private manaBar!: UIBar;
  private xpBar!: UIBar;

  private levelText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private timeIcon!: Phaser.GameObjects.Sprite;

  private debugContainer!: Phaser.GameObjects.Container;
  private debugText!: Phaser.GameObjects.Text;
  private keyF1!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SCENES.UI });
  }

  create(): void {
    // HP Bar: Red with glow
    this.hpBar = this.createBar(20, 20, 200, 20, 0xff3333, 'HP', true);
    // Stamina Bar: Yellow
    this.staminaBar = this.createBar(20, 46, 200, 12, 0xffcc00, 'STAMINA');
    // Mana Bar: Blue
    this.manaBar = this.createBar(20, 62, 200, 12, 0x3399ff, 'MANA');

    // Level Text and XP Bar (150x8)
    this.levelText = this.add.text(20, 80, 'LV 1', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontWeight: 'bold',
    });
    this.xpBar = this.createBar(65, 84, 150, 8, 0x66cc66, 'XP', false, false);

    // Top-right UI
    const rightX = this.scale.width - 20;

    // Gold Text counter
    this.goldText = this.add.text(rightX, 20, '0', {
      fontSize: '16px',
      color: '#ffd700',
      fontFamily: 'monospace',
      fontWeight: 'bold',
    }).setOrigin(1, 0.5);

    // Coin icon
    const coinIcon = this.add.sprite(rightX - 35, 20, 'coin').setOrigin(1, 0.5);

    // Time Icon (sun/moon)
    this.timeIcon = this.add.sprite(coinIcon.x - 30, 20, 'sun').setOrigin(1, 0.5);

    // 6-slot Hotbar
    this.createHotbar();

    // Debug Overlay Container
    this.debugContainer = this.add.container(20, 110);
    this.debugContainer.setVisible(false);

    const debugBg = this.add.graphics();
    debugBg.fillStyle(0x000000, 0.75);
    debugBg.fillRect(0, 0, 220, 95);
    debugBg.lineStyle(1, 0x555555, 1);
    debugBg.strokeRect(0, 0, 220, 95);
    this.debugContainer.add(debugBg);

    this.debugText = this.add.text(10, 10, '', {
      fontSize: '11px',
      color: '#00ff00',
      fontFamily: 'monospace',
    });
    this.debugContainer.add(this.debugText);

    // Key F1 debug overlay
    this.keyF1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
  }

  update(): void {
    // Handle F1 press
    if (Phaser.Input.Keyboard.JustDown(this.keyF1)) {
      this.debugContainer.setVisible(!this.debugContainer.visible);
    }

    // Read Active Save
    const activeSave = SaveSystem.activeSave;
    const stats = activeSave?.player.stats || {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      mana: 50,
      maxMana: 50,
      level: 1,
      xp: 0,
      xpToNext: 100,
    };

    // Update Bars
    this.updateBar(this.hpBar, stats.hp, stats.maxHp, 'HP');
    this.updateBar(this.staminaBar, stats.stamina, stats.maxStamina, 'STAMINA');
    this.updateBar(this.manaBar, stats.mana, stats.maxMana, 'MANA');

    // Update XP and Level
    this.levelText.setText(`LV ${stats.level}`);
    this.updateBar(this.xpBar, stats.xp, stats.xpToNext, 'XP', false);

    // Update Gold (placeholder '0')
    this.goldText.setText('0');

    // Update time icon based on DayNightSystem
    const phase = DayNightSystem.getInstance().getCurrentPhase();
    if (phase === 'night') {
      this.timeIcon.setTexture('moon');
    } else {
      this.timeIcon.setTexture('sun');
    }

    // Update Debug info
    if (this.debugContainer.visible) {
      const fps = Math.round(this.game.loop.actualFps);
      const px = activeSave ? Math.round(activeSave.player.x) : 300;
      const py = activeSave ? Math.round(activeSave.player.y) : 400;

      this.debugText.setText(
        `FPS: ${fps}\n` +
          `Player Pos: (${px}, ${py})\n` +
          `Active Scene: ${SCENES.EMBER_COTTAGE}\n` +
          `Time Cycle Phase: ${phase.toUpperCase()}`
      );
    }
  }

  private createBar(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    label: string,
    isHp: boolean = false,
    showText: boolean = true
  ): UIBar {
    const bg = this.add.graphics();
    bg.fillStyle(0x111111, 0.85);
    bg.lineStyle(1, 0x333333, 1);
    bg.fillRect(x, y, w, h);
    bg.strokeRect(x, y, w, h);

    const fill = this.add.graphics();
    if (isHp) {
      fill.filters.add('Glow', { color: 0xff8c42, strength: 2 });
    }

    const text = this.add.text(x + w / 2, y + h / 2, '', {
      fontSize: `${h - 2 > 12 ? 12 : h - 2}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    text.setVisible(showText);

    return { fill, text, x, y, w, h, color };
  }

  private updateBar(bar: UIBar, current: number, max: number, label: string, showText: boolean = true): void {
    bar.fill.clear();
    const ratio = Math.max(0, Math.min(1, current / max));
    bar.fill.fillStyle(bar.color, 1);
    if (ratio > 0) {
      bar.fill.fillRect(bar.x + 1, bar.y + 1, (bar.w - 2) * ratio, bar.h - 2);
    }
    if (showText) {
      bar.text.setText(`${label}: ${Math.round(current)}/${Math.round(max)}`);
    }
  }

  private createHotbar(): void {
    const size = 48;
    const spacing = 8;
    const startX = this.scale.width / 2 - (6 * size + 5 * spacing) / 2;
    const y = this.scale.height - size - 20;

    for (let i = 0; i < 6; i++) {
      const bx = startX + i * (size + spacing);

      const bg = this.add.graphics();
      bg.fillStyle(0x111111, 0.8);
      bg.lineStyle(2, 0x555555, 1);
      bg.fillRect(bx, y, size, size);
      bg.strokeRect(bx, y, size, size);

      // Subtle border glow to match theme
      bg.filters.add('Glow', { color: 0xff8c42, strength: 1 });

      this.add.text(bx + 4, y + 4, `${i + 1}`, {
        fontSize: '11px',
        color: '#888888',
        fontFamily: 'monospace',
      });
    }
  }
}
