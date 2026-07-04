import Phaser from 'phaser';
import { Enemy, EnemyState } from '@entities/Enemy';
import type { EnemyArchetype, PlayerTarget } from '@entities/Enemy';

/**
 * VeilRat — aggressive profile.
 * Direct-charge melee enemy: beelines for the player and bites at close range.
 * Fast and weak; drops ember-shards ~35%.
 */
export class VeilRat extends Enemy {
  static readonly archetype: EnemyArchetype = {
    id: 'veil-rat',
    name: 'Veil Rat',
    spriteKey: 'veil-rat',
    hp: 20,
    attack: 6,
    defense: 0,
    speed: 110,
    xpReward: 8,
    goldMin: 1,
    goldMax: 3,
    detectionRadius: 220,
    attackRange: 24,
    attackCooldown: 900,
    attackDamage: 6,
    profile: 'aggressive',
    loot: [
      { itemId: 'ember-shard', chance: 0.35, minQuantity: 1, maxQuantity: 1 },
    ],
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hooks: {
      onAttackPlayer: (enemy: Enemy, damage: number) => void;
      onDeath: (enemy: Enemy) => void;
    }
  ) {
    super(scene, x, y, VeilRat.archetype, hooks);
  }

  protected runAI(_delta: number, time: number, player: PlayerTarget, dist: number): void {
    if (dist > this.config.detectionRadius) {
      this.setState(EnemyState.Idle);
      this.setVelocity(0, 0);
      return;
    }

    if (dist <= this.config.attackRange) {
      this.setVelocity(0, 0);
      this.tryAttack(time, player);
      return;
    }

    // Charge directly at the player.
    this.moveTowards(player.x, player.y);
    this.setState(EnemyState.Chase);
  }
}

