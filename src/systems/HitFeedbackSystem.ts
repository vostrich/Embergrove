import Phaser from 'phaser';

/** Categorises a hit for choosing shake intensity + damage-number style. */
export type HitKind = 'light' | 'heavy' | 'critical' | 'player';

interface ShakeSpec { duration: number; intensity: number; }

const SHAKE: Record<HitKind, ShakeSpec> = {
  light:    { duration: 80,  intensity: 0.003 },
  heavy:    { duration: 150, intensity: 0.008 },
  critical: { duration: 200, intensity: 0.012 },
  player:   { duration: 150, intensity: 0.008 },
};

const COLOR_BLOOD = 0x8b0000;
const COLOR_EMBER = 0xff8c42;

/**
 * Centralised hit feedback: floating damage numbers, screen shake,
 * particle bursts, target flash, and SFX. Each effect degrades
 * gracefully if its asset/texture is missing.
 */
export class HitFeedbackSystem {
  constructor(private scene: Phaser.Scene) {}

  /**
   * Play the full feedback bundle at a hit point.
   * @param x,y        world coords of the hit
   * @param damage     numeric damage dealt
   * @param kind       hit category
   * @param target     optional sprite to flash white
   * @param hitPlayer  if true, particles are ember-orange (player bled)
   */
  playHit(opts: {
    x: number; y: number; damage: number; kind: HitKind;
    target?: Phaser.GameObjects.Sprite; hitPlayer?: boolean;
  }): void {
    const { x, y, damage, kind, target, hitPlayer = false } = opts;

    this.spawnDamageNumber(x, y, damage, kind);
    this.shake(kind);
    this.spawnParticles(x, y, hitPlayer ? COLOR_EMBER : COLOR_BLOOD);
    if (target) this.flashTarget(target);
    this.playSfx(kind);
  }

  /** Float a damage number up from the hit point. */
  private spawnDamageNumber(x: number, y: number, damage: number, kind: HitKind): void {
    const isCrit = kind === 'critical';
    const isPlayer = kind === 'player';

    const label = isCrit ? `CRIT! ${damage}` : `${damage}`;
    const color = isPlayer ? '#ff5555' : isCrit ? '#ffd700' : '#ffffff';

    const text = this.scene.add.text(x, y - 12, label, {
      fontSize: isCrit ? '20px' : '14px',
      color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.5, to: 1.0 },
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private shake(kind: HitKind): void {
    const spec = SHAKE[kind];
    this.scene.cameras.main.shake(spec.duration, spec.intensity);
  }

  /** 8-particle burst via ParticleEmitter explode zone. */
  private spawnParticles(x: number, y: number, color: number): void {
    const textureKey = color === COLOR_EMBER ? 'ember-particle' : 'ember-particle';
    if (!this.scene.textures.exists(textureKey)) return;

    const tintedKey = `__hitParticle_${color}`;
    if (!this.scene.textures.exists(tintedKey)) {
      // Clone the ember particle and tint it via a graphics texture.
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, 0, 4, 4);
      gfx.generateTexture(tintedKey, 4, 4);
      gfx.destroy();
    }

    const emitter = this.scene.add.particles(x, y, tintedKey, {
      speed: { min: 40, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 400,
      quantity: 8,
      emitting: false,
    });
    emitter.explode(8, x, y);
    // Auto-destroy after particles expire.
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  /** Brief white fill flash on the struck target. */
  private flashTarget(target: Phaser.GameObjects.Sprite): void {
    const prevTint = target.tintTopLeft;
    target.setTint(0xffffff, 0xffffff, 0xffffff, 0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (target.active) target.setTint(prevTint);
    });
  }

  /** Play SFX if loaded; silent otherwise. */
  private playSfx(kind: HitKind): void {
    const key = kind === 'critical' ? 'sfx-hit' : kind === 'player' ? 'sfx-hit' : 'sfx-swing';
    try {
      if (this.scene.sound.get(key)) {
        this.scene.sound.play(key, { volume: 0.5 });
      }
    } catch {
      // Asset missing — silent placeholder, per spec.
    }
  }
}
