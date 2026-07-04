import Phaser from 'phaser';
import { Enemy, EnemyState } from '@entities/Enemy';
import type { EnemyArchetype, PlayerTarget } from '@entities/Enemy';

/**
 * Callback that counts allied pack members within `radius` of the wolf
 * (excluding self). Supplied by the scene/spawner.
 */
export type PackCounter = (wolf: HollowWolf, radius: number) => number;

/**
 * HollowWolf — pack profile.
 * Stronger when allied wolves are nearby (+20% damage per pack member
 * within 200px). If alone and below 30% HP, it retreats. Uses a
 * knockback attack.
 */
export class HollowWolf extends Enemy {
  static readonly archetype: EnemyArchetype = {
    id: 'hollow-wolf',
    name: 'Hollow Wolf',
    spriteKey: 'hollow-wolf',
    hp: 55,
    attack: 14,
    defense: 4,
    speed: 95,
    xpReward: 22,
    goldMin: 3,
    goldMax: 8,
    detectionRadius: 280,
    attackRange: 36,
    attackCooldown: 1200,
    attackDamage: 14,
    profile: 'pack',
    loot: [
      { itemId: 'ember-shard', chance: 0.6, minQuantity: 1, maxQuantity: 2 },
      { itemId: 'healing-salve', chance: 0.15, minQuantity: 1, maxQuantity: 1 },
    ],
  };

  private static readonly PACK_RADIUS = 200;
  private static readonly RETREAT_HP_FRACTION = 0.3;
  private static readonly KNOCKBACK_FORCE = 150;

  private packCounter: PackCounter | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hooks: {
      onAttackPlayer: (enemy: Enemy, damage: number) => void;
      onDeath: (enemy: Enemy) => void;
    }
  ) {
    super(scene, x, y, HollowWolf.archetype, hooks);
  }

  setPackCounter(counter: PackCounter): void {
    this.packCounter = counter;
  }

  protected runAI(_delta: number, time: number, player: PlayerTarget, dist: number): void {
    const packSize = this.packCounter ? this.packCounter(this, HollowWolf.PACK_RADIUS) : 0;
    const alone = packSize === 0;

    // Retreat when alone and low.
    if (alone && this.hp / this.maxHp < HollowWolf.RETREAT_HP_FRACTION) {
      this.moveAwayFrom(player.x, player.y);
      this.setState(EnemyState.Chase); // still "engaged" but retreating
      return;
    }

    if (dist > this.config.detectionRadius) {
      this.setState(EnemyState.Idle);
      this.setVelocity(0, 0);
      return;
    }

    if (dist <= this.config.attackRange) {
      this.setVelocity(0, 0);
      // Pack bonus: +20% per ally (excluding self).
      const damage = Math.round(this.config.attackDamage * (1 + 0.2 * packSize));
      if (this.tryAttack(time, player, damage)) {
        // Knockback is a property of the hit; the scene reads the wolf's
        // knockback force via getKnockbackForce() when resolving the hit.
        this.scene.events.emit('enemy:knockbackHit', {
          source: this, target: player, force: HollowWolf.KNOCKBACK_FORCE,
        });
      }
      return;
    }

    this.moveTowards(player.x, player.y);
    this.setState(EnemyState.Chase);
  }

  getKnockbackForce(): number {
    return HollowWolf.KNOCKBACK_FORCE;
  }
}
