import Phaser from 'phaser';
import { Direction } from '@data/types';
import type { Combatant, LootDrop } from '@data/types';
import { EVENTS, PARRY_STUN_MS } from '@data/Constants';

/**
 * Enemy finite-state machine. The base class runs a generic
 * detect → chase → attack loop; subclasses override the AI step.
 */
export enum EnemyState {
  Idle = 'IDLE',
  Patrol = 'PATROL',
  Chase = 'CHASE',
  Attack = 'ATTACK',
  Stunned = 'STUNNED',
  Hurt = 'HURT',
  Dead = 'DEAD',
}

/** AI profile tag; subclasses select behaviour on construction. */
export type AIProfile = 'aggressive' | 'pack' | 'ranged' | 'boss';

/** Static stats/config for an enemy archetype. */
export interface EnemyArchetype {
  id: string;
  name: string;
  spriteKey: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  xpReward: number;
  goldMin: number; // inclusive gold drop range (data-driven)
  goldMax: number;
  detectionRadius: number;
  attackRange: number;
  attackCooldown: number; // ms
  attackDamage: number;
  profile: AIProfile;
  loot: LootDrop[];
}

/** Reference to the player target. Decoupled so tests don't need Phaser. */
export interface PlayerTarget {
  x: number;
  y: number;
  isDead: boolean;
}

/**
 * Base enemy. Subclasses implement `runAI(delta, time, player)` to express
 * their profile (charge, pack, kite). The base handles state transitions,
 * HP, hurt/stun timers, and death.
 */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite implements Combatant {
  public state: EnemyState = EnemyState.Idle;
  public direction: Direction = Direction.Down;

  public hp: number;
  public maxHp: number;
  public attack: number;
  public defense: number;
  public speed: number;
  public luck = 0;
  public invulnerableUntil = 0;

  public readonly config: EnemyArchetype;
  public readonly xpReward: number;
  public readonly goldMin: number;
  public readonly goldMax: number;
  public readonly lootTable: LootDrop[];

  protected target: PlayerTarget | null = null;

  // Timing
  private stunUntil = 0;
  private hurtUntil = 0;
  private nextAttackAt = 0;
  private lastDamageTime = 0;

  // Hooks into scene-level systems (combat resolution, loot, feedback).
  protected onAttackPlayer: (enemy: Enemy, damage: number) => void;
  protected onDeath: (enemy: Enemy) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyArchetype,
    hooks: {
      onAttackPlayer: (enemy: Enemy, damage: number) => void;
      onDeath: (enemy: Enemy) => void;
    }
  ) {
    super(scene, x, y, config.spriteKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    this.config = config;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.attack = config.attack;
    this.defense = config.defense;
    this.speed = config.speed;
    this.xpReward = config.xpReward;
    this.goldMin = config.goldMin;
    this.goldMax = config.goldMax;
    this.lootTable = config.loot;
    this.onAttackPlayer = hooks.onAttackPlayer;
    this.onDeath = hooks.onDeath;

    this.setDepth(5);
  }

  setTarget(target: PlayerTarget | null): void {
    this.target = target;
  }

  update(delta: number, time: number): void {
    if (this.state === EnemyState.Dead) return;

    if (time < this.stunUntil) {
      this.setState(EnemyState.Stunned);
      this.setVelocity(0, 0);
      return;
    }
    if (this.state === EnemyState.Stunned && time >= this.stunUntil) {
      this.setState(EnemyState.Idle);
    }

    if (time < this.hurtUntil) {
      // brief stagger; no AI this frame
      return;
    }
    if (this.state === EnemyState.Hurt) {
      this.setState(EnemyState.Chase);
    }

    // Generic state machine driven by distance to target.
    const player = this.target;
    if (!player || player.isDead) {
      this.setState(EnemyState.Idle);
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Delegate profile-specific movement + attack timing to subclass.
    this.runAI(delta, time, player, dist);

    // Face the player.
    this.direction = this.faceTowards(player.x, player.y);
  }

  /** Subclass behaviour. Receives pre-computed distance to player. */
  protected abstract runAI(
    delta: number,
    time: number,
    player: PlayerTarget,
    distToPlayer: number
  ): void;

  /** Returns true if the enemy performed an attack this call. */
  protected tryAttack(time: number, player: PlayerTarget, damageOverride?: number): boolean {
    if (time < this.nextAttackAt) return false;
    this.nextAttackAt = time + this.config.attackCooldown;
    this.setState(EnemyState.Attack);
    const dmg = damageOverride ?? this.config.attackDamage;
    this.onAttackPlayer(this, dmg);
    return true;
  }

  /** Move toward a point at this enemy's speed. */
  protected moveTowards(tx: number, ty: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) {
      body.setVelocity(0, 0);
      return;
    }
    body.setVelocity((dx / len) * this.speed, (dy / len) * this.speed);
  }

  /** Move away from a point (used by kiting/retreat). */
  protected moveAwayFrom(tx: number, ty: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.x - tx;
    const dy = this.y - ty;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) {
      body.setVelocity(0, 0);
      return;
    }
    body.setVelocity((dx / len) * this.speed, (dy / len) * this.speed);
  }

  protected faceTowards(tx: number, ty: number): Direction {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx >= 0 ? Direction.Right : Direction.Left;
    }
    return dy >= 0 ? Direction.Down : Direction.Up;
  }

  protected setState(s: EnemyState): void {
    this.state = s;
  }

  // ── Damage intake ────────────────────────────────────────

  /**
   * Apply incoming damage. Returns the actual damage dealt (0 if
   * i-framed or dead). Caller (scene) decides via CombatSystem first.
   */
  takeDamage(time: number, amount: number, isCrit: boolean): number {
    if (this.state === EnemyState.Dead) return 0;
    if (time < this.invulnerableUntil) return 0;

    const dmg = Math.max(1, Math.floor(amount));
    this.hp = Math.max(0, this.hp - dmg);
    this.lastDamageTime = time;

    this.scene.events.emit(EVENTS.ENEMY_DAMAGE, {
      x: this.x, y: this.y, damage: dmg, isCrit, enemyId: this.config.id,
    });

    if (this.hp <= 0) {
      this.die(time);
      return dmg;
    }

    // Brief stagger on hit.
    this.hurtUntil = time + 200;
    this.setState(EnemyState.Hurt);
    return dmg;
  }

  /** Stun the enemy (e.g. from a successful parry). */
  stun(time: number, durationMs = PARRY_STUN_MS): void {
    if (this.state === EnemyState.Dead) return;
    this.stunUntil = time + durationMs;
    this.setState(EnemyState.Stunned);
    this.setVelocity(0, 0);
  }

  /** Time since last damage (ms). Used by health-bar fade. */
  msSinceDamage(time: number): number {
    return time - this.lastDamageTime;
  }

  protected die(time: number): void {
    this.hp = 0;
    this.setState(EnemyState.Dead);
    this.setVelocity(0, 0);
    this.scene.events.emit(EVENTS.ENEMY_DEFEATED, {
      x: this.x, y: this.y, xp: this.xpReward, enemyId: this.config.id,
    });
    this.onDeath(this);
  }

  isDead(): boolean {
    return this.state === EnemyState.Dead;
  }
}
