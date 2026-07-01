import Phaser from 'phaser';
import type { Item, Rarity } from '@data/types';
import { RARITY_COLORS } from '@data/Constants';

export type PickupKind = 'item' | 'gold';

/**
 * A ground pickup (item or gold coin) with a rarity glow. Magnet-snaps
 * to the player when they enter `MAGNET_RANGE`, and is collected on overlap.
 */
export class ItemPickup extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: PickupKind;
  public readonly item: Item | null;
  public readonly goldAmount: number;

  private static readonly MAGNET_RANGE = 32;

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
      this.applyRarityGlow(opts.item.rarity);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCircle(8, 0, 0);

    this.setDepth(8);
  }

  /** Rarity-coloured glow via Phaser 4 filters API. */
  private applyRarityGlow(rarity: Rarity): void {
    const color = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
    try {
      this.enableFilters();
      (this as unknown as { filters: { add: (n: string, o: object) => void } })
        .filters.add('Glow', { color, strength: 2 });
    } catch {
      // Filters unavailable (e.g. WebGL disabled) — tint fallback.
      this.setTint(color);
      this.setTintMode(Phaser.Display.TintModes.MULTIPLY);
    }
  }

  /**
   * Per-frame: if the target is within magnet range, tween toward it.
   * Returns true once collected (caller destroys).
   */
  updateMagnet(target: { x: number; y: number }): boolean {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (dist <= ItemPickup.MAGNET_RANGE) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      body.setVelocity((dx / len) * 200, (dy / len) * 200);
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
    }
    return dist <= 12; // collected when overlapping
  }

  /** Spawn a pickup burst on collection. */
  playPickupBurst(): void {
    if (!this.scene.textures.exists('ember-particle')) return;
    const emitter = this.scene.add.particles(this.x, this.y, 'ember-particle', {
      speed: { min: 30, max: 80 },
      lifespan: 300,
      quantity: 6,
      scale: { start: 1, end: 0 },
      emitting: false,
    });
    emitter.explode(6, this.x, this.y);
    this.scene.time.delayedCall(400, () => emitter.destroy());
  }
}
