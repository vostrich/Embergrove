import Phaser from 'phaser';
import type { Enemy } from '@entities/Enemy';

const BAR_WIDTH = 40;
const BAR_HEIGHT = 6;
const FADE_AFTER_MS = 3000;

/**
 * Small HP bar floating above an enemy. Hidden at full HP; fades 3s
 * after the last damage tick. Follows the enemy each frame.
 *
 * Rendered with Graphics so it needs no extra texture asset.
 */
export class EnemyHealthBar {
  private scene: Phaser.Scene;
  private enemy: Enemy;

  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;

  private visible = false;
  private lastDamageSeen = -1;

  constructor(scene: Phaser.Scene, enemy: Enemy) {
    this.scene = scene;
    this.enemy = enemy;

    this.bg = scene.add.graphics().setDepth(20);
    this.fill = scene.add.graphics().setDepth(21);

    this.redraw();
    this.setVisible(false);
  }

  /** Call from the scene each frame. */
  update(time: number): void {
    if (this.enemy.isDead()) {
      this.setVisible(false);
      return;
    }

    // Show/fade based on HP + recency of damage.
    const hpRatio = this.enemy.hp / this.enemy.maxHp;
    const sinceDmg = this.enemy.msSinceDamage(time);

    if (hpRatio >= 1 && sinceDmg > 500) {
      // Full health and no recent damage: hide.
      if (this.visible && sinceDmg > FADE_AFTER_MS) this.setVisible(false);
    } else {
      this.setVisible(true);
    }

    if (this.visible) {
      // Position above enemy head.
      const bx = this.enemy.x - BAR_WIDTH / 2;
      const by = this.enemy.y - this.enemy.height / 2 - 14;
      this.drawAt(bx, by, hpRatio);

      // Fade out if no damage for a while.
      const targetAlpha = sinceDmg > FADE_AFTER_MS
        ? Math.max(0, 1 - (sinceDmg - FADE_AFTER_MS) / 1000)
        : 1;
      this.bg.setAlpha(targetAlpha);
      this.fill.setAlpha(targetAlpha);
    }
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
  }

  private setVisible(v: boolean): void {
    this.visible = v;
    this.bg.setVisible(v);
    this.fill.setVisible(v);
  }

  private redraw(): void {
    this.drawAt(this.enemy.x - BAR_WIDTH / 2, this.enemy.y - 20, this.enemy.hp / this.enemy.maxHp);
  }

  private drawAt(x: number, y: number, ratio: number): void {
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.7);
    this.bg.fillRect(x - 1, y - 1, BAR_WIDTH + 2, BAR_HEIGHT + 2);

    this.fill.clear();
    const clamped = Math.max(0, Math.min(1, ratio));
    const color = clamped > 0.5 ? 0x4caf50 : clamped > 0.25 ? 0xffaa00 : 0xff3333;
    this.fill.fillStyle(color, 1);
    if (clamped > 0) {
      this.fill.fillRect(x, y, BAR_WIDTH * clamped, BAR_HEIGHT);
    }
  }
}
