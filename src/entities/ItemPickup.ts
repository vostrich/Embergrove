import Phaser from 'phaser';
import type { Item } from '@data/types';

export type PickupKind = 'item' | 'gold';

/**
 * A ground pickup (item or gold coin) with a rarity glow. Magnet-snaps
 * to the player when they enter `MAGNET_RANGE`; collection is animated via a
 * 200ms tween toward the player, a particle burst, a pickup sfx, and a
 * floating label. Rarity glow is applied by LootSystem (presentation lives
 * there so ItemPickup stays focused on movement + collection).
 */
export class ItemPickup extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: PickupKind;
  public readonly item: Item | null;
  public readonly goldAmount: number;

  private static readonly MAGNET_RANGE = 32;
  private static readonly COLLECT_RANGE = 12;
  private static readonly COLLECT_TWEEN_MS = 200;

  private collecting = false;
  private collected = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: { kind: 'item'; item: Item } | { kind: 'gold'; amount: number }
  ) {
    const texture = opts.kind === 'gold' ? 'coin' : 'item-pickup';
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.kind = opts.kind;
    if (opts.kind === 'gold') {
      this.goldAmount = opts.amount;
      this.item = null;
    } else {
      this.item = opts.item;
      this.goldAmount = 0;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCircle(8, 0, 0);

    this.setDepth(8);
  }

  /**
   * Per-frame: if the target is within magnet range, begin a one-shot collect
   * tween. Returns true once the collection animation has finished (caller
   * then applies the pickup effect and destroys the sprite).
   */
  updateMagnet(target: { x: number; y: number }): boolean {
    if (this.collected) return true;
    if (this.collecting) return false;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (dist > ItemPickup.MAGNET_RANGE) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      return false;
    }

    // Within collect range — skip the tween and collect immediately.
    if (dist <= ItemPickup.COLLECT_RANGE) {
      this.collected = true;
      return true;
    }

    // Start the magnet tween toward the player.
    this.collecting = true;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this,
      x: target.x,
      y: target.y,
      duration: ItemPickup.COLLECT_TWEEN_MS,
      ease: 'Quad.in',
      onComplete: () => {
        this.collecting = false;
        this.collected = true;
      },
    });
    return false;
  }

  /** Returns true once the collect tween has resolved. */
  isCollected(): boolean {
    return this.collected;
  }

  /** Spawn a 4-particle burst on collection. */
  playPickupBurst(): void {
    if (!this.scene.textures.exists('ember-particle')) return;
    const emitter = this.scene.add.particles(this.x, this.y, 'ember-particle', {
      speed: { min: 30, max: 80 },
      lifespan: 300,
      quantity: 4,
      scale: { start: 1, end: 0 },
      emitting: false,
    });
    emitter.explode(4, this.x, this.y);
    this.scene.time.delayedCall(400, () => emitter.destroy());
  }

  /** Play the pickup sfx (silent if the asset is missing). */
  playPickupSfx(): void {
    try {
      if (this.scene.sound && this.scene.sound.get('sfx-pickup')) {
        this.scene.sound.play('sfx-pickup', { volume: 0.4 });
      }
    } catch {
      /* sfx asset missing — silent placeholder */
    }
  }

  /** Floating "+N <name>" label above the collector. */
  spawnFloatingLabel(text: string, color = '#ffd700'): void {
    const label = this.scene.add.text(this.x, this.y - 20, text, {
      fontSize: '13px',
      color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 28,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }
}

