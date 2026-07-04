import { Enemy, EnemyState } from '@entities/Enemy';
import type { EnemyArchetype, PlayerTarget } from '@entities/Enemy';

/** Callback the wraith uses to spawn a veil-bolt projectile. */
export type BoltSpawner = (wraith: MistWraith, target: PlayerTarget) => void;

/**
 * MistWraith — ranged profile.
 * Kites the player at a preferred 140–200px band, firing veil-bolt
 * projectiles with a purple particle trail. Briefly phases (alpha
 * 0.5 → 1.0) during the attack windup.
 */
export class MistWraith extends Enemy {
  static readonly archetype: EnemyArchetype = {
    id: 'mist-wraith',
    name: 'Mist Wraith',
    spriteKey: 'mist-wraith',
    hp: 35,
    attack: 18,
    defense: 0,
    speed: 80,
    xpReward: 30,
    goldMin: 5,
    goldMax: 12,
    detectionRadius: 360,
    attackRange: 200, // max kite range
    attackCooldown: 1600,
    attackDamage: 18,
    profile: 'ranged',
    loot: [
      { itemId: 'ember-shard', chance: 0.8, minQuantity: 1, maxQuantity: 2 },
    ],
  };

  private static readonly MIN_RANGE = 140;
  private static readonly MAX_RANGE = 200;

  private boltSpawner: BoltSpawner | null = null;

  /** Override attack range used by the base distance check via config. */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hooks: {
      onAttackPlayer: (enemy: Enemy, damage: number) => void;
      onDeath: (enemy: Enemy) => void;
    },
    boltSpawner?: BoltSpawner
  ) {
    super(scene, x, y, MistWraith.archetype, hooks);
    if (boltSpawner) this.boltSpawner = boltSpawner;
  }

  setBoltSpawner(spawner: BoltSpawner): void {
    this.boltSpawner = spawner;
  }

  protected runAI(_delta: number, time: number, player: PlayerTarget, dist: number): void {
    if (dist > this.config.detectionRadius) {
      this.setState(EnemyState.Idle);
      this.setVelocity(0, 0);
      return;
    }

    // Kite: if too close, back off; if too far, close in.
    if (dist < MistWraith.MIN_RANGE) {
      this.moveAwayFrom(player.x, player.y);
      this.setState(EnemyState.Chase);
      return;
    }

    // In the firing band (or still approaching it from afar).
    if (dist <= MistWraith.MAX_RANGE) {
      // Stop and fire.
      this.setVelocity(0, 0);
      if (time >= this.nextAttackAt) {
        this.phaseEffect();
        this.tryRangedAttack(time, player);
      }
      return;
    }

    // Too far — approach until within max range.
    this.moveTowards(player.x, player.y);
    this.setState(EnemyState.Chase);
  }

  /** Brief alpha dip to suggest phasing through the veil. */
  private phaseEffect(): void {
    this.setAlpha(0.5);
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.5, to: 1.0 },
      duration: 400,
    });
  }

  private tryRangedAttack(time: number, player: PlayerTarget): void {
    if (time < this.nextAttackAt) return;
    this.nextAttackAt = time + this.config.attackCooldown;
    this.setState(EnemyState.Attack);
    if (this.boltSpawner) {
      // Damage is applied when the bolt connects (spawned by scene),
      // so we don't call onAttackPlayer here.
      this.boltSpawner(this, player);
    } else {
      // Fallback: instant-hit if no bolt system is wired.
      this.onAttackPlayer(this, this.config.attackDamage);
    }
  }
}
