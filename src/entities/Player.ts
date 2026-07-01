import Phaser from 'phaser';
import { Direction } from '@data/types';
import { AttackType } from '@data/types';
import type { Weapon, Combatant } from '@data/types';
import {
  PLAYER_SPEED,
  PLAYER_DODGE_SPEED,
  DODGE_DURATION_MS,
  IFRAME_DURATION_MS,
  DODGE_COOLDOWN_MS,
  DODGE_STAMINA_COST,
  PARRY_STAMINA_COST,
  HEAVY_ATTACK_STAMINA_COST,
  STAMINA_REGEN_PER_SEC,
  LIGHT_ATTACK_COOLDOWN_MS,
  HEAVY_ATTACK_COOLDOWN_MS,
  PARRY_WINDOW_MS,
  PARRY_STUN_MS,
  ATTACK_LIGHT_LOCK_MS,
  ATTACK_HEAVY_LOCK_MS,
  HURT_LOCK_MS,
  PLAYER_ATTACK_RANGE,
  LANTERN_RADIUS_DAY,
  LANTERN_RADIUS_NIGHT,
  POSITION_SAVE_INTERVAL_MS,
  EVENTS,
} from '@data/Constants';

/**
 * Player finite-state machine. Only one combat/movement state is active
 * at a time; lower-priority states are interrupted by higher ones
 * (e.g. HURT interrupts ATTACKING_LIGHT).
 */
export enum PlayerState {
  Idle = 'IDLE',
  Moving = 'MOVING',
  Dodging = 'DODGING',
  AttackingLight = 'ATTACKING_LIGHT',
  AttackingHeavy = 'ATTACKING_HEAVY',
  Parrying = 'PARRYING',
  Hurt = 'HURT',
  Dead = 'DEAD',
}

/**
 * Lightweight read-only view of the input state, captured each frame.
 * Kept as an interface so the Player is testable without a real keyboard.
 */
export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Callback the Player uses to report attack initiations to the scene. */
export interface PlayerCombatHooks {
  onLightAttack: (player: Player) => void;
  onHeavyAttack: (player: Player) => void;
  onParry: (player: Player) => void;
}

const DEFAULT_WEAPON: Weapon = {
  id: 'rusted-blade',
  attackMult: 1.0,
  attackFlat: 0,
};

/**
 * The controllable player entity. Owns its state machine, stamina, and
 * facing direction. Combat *resolution* is delegated to CombatSystem via
 * the scene; the Player only initiates attacks and reports them.
 */
export class Player extends Phaser.Physics.Arcade.Sprite implements Combatant {
  public state: PlayerState = PlayerState.Idle;
  public direction: Direction = Direction.Down;

  // Combat-facing fields (also satisfy Combatant)
  public attack = 5;
  public defense = 2;
  public luck = 0;
  public speed = PLAYER_SPEED;

  public stamina = 80;
  public maxStamina = 80;
  public invulnerableUntil = 0;

  public weapon: Weapon = DEFAULT_WEAPON;

  // Timing trackers (ms timestamps)
  private dodgeUntil = 0;
  private dodgeCooldownUntil = 0;
  private lightAttackCooldownUntil = 0;
  private heavyAttackCooldownUntil = 0;
  private parryUntil = 0;
  private stateLockUntil = 0; // movement/attack lock window
  private lastStaminaConsumeTime = 0;

  private lastPositionSave = 0;

  // Lantern
  private lantern: Phaser.GameObjects.Light | null = null;
  private lanternRadius = LANTERN_RADIUS_DAY;

  private hooks: PlayerCombatHooks | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 20);
    body.setOffset(6, 4);

    this.setDepth(10);
  }

  setCombatHooks(hooks: PlayerCombatHooks): void {
    this.hooks = hooks;
  }

  setStats(stats: {
    attack: number; defense: number; luck: number; speed: number;
    stamina: number; maxStamina: number;
  }): void {
    this.attack = stats.attack;
    this.defense = stats.defense;
    this.luck = stats.luck;
    this.speed = stats.speed;
    this.stamina = stats.stamina;
    this.maxStamina = stats.maxStamina;
  }

  /** Attach (or re-attach) the ember-lantern point light. */
  enableLantern(): void {
    if (this.lantern) return;
    this.setLighting(true);
    this.lantern = this.scene.lights.addLight(this.x, this.y, this.lanternRadius, 0xff8c42, 0.8);
  }

  /** Set lantern radius based on the current day/night phase. */
  setLanternForPhase(phase: 'dawn' | 'day' | 'dusk' | 'night'): void {
    this.lanternRadius = phase === 'night' ? LANTERN_RADIUS_NIGHT : LANTERN_RADIUS_DAY;
    if (this.lantern) this.lantern.setRadius(this.lanternRadius);
  }

  /**
   * Per-frame update. `input` is the movement vector; combat actions are
   * triggered via discrete methods (tryDodge/tryLightAttack/...) which the
   * scene wires to keyboard/mouse events.
   */
  update(time: number, delta: number, input: PlayerInput): void {
    if (this.state === PlayerState.Dead) {
      this.setVelocity(0, 0);
      return;
    }

    this.updateFacing(input);
    this.regenStamina(delta);

    const locked = time < this.stateLockUntil;
    const dodging = time < this.dodgeUntil;

    if (dodging) {
      // Dodge velocity is set once at initiation; keep it.
    } else if (this.state === PlayerState.Dodging) {
      this.transitionTo(PlayerState.Idle, time);
    } else if (locked) {
      this.setVelocity(0, 0);
    } else {
      this.applyMovement(input);
    }

    // Parry window expiry
    if (this.state === PlayerState.Parrying && time >= this.parryUntil) {
      this.transitionTo(PlayerState.Idle, time);
    }

    // Sync lantern
    if (this.lantern) {
      this.lantern.setPosition(this.x, this.y);
    }

    // Periodic position save
    if (time - this.lastPositionSave > POSITION_SAVE_INTERVAL_MS) {
      this.lastPositionSave = time;
      this.scene.events.emit(EVENTS.PLAYER_MOVE, { x: this.x, y: this.y });
    }
  }

  private applyMovement(input: PlayerInput): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    if (vx === 0 && vy === 0) {
      body.setVelocity(0, 0);
      if (this.state === PlayerState.Moving) {
        this.transitionTo(PlayerState.Idle, this.scene.time.now);
      }
      return;
    }

    // Normalize diagonal
    const len = Math.hypot(vx, vy);
    vx = (vx / len) * this.speed;
    vy = (vy / len) * this.speed;
    body.setVelocity(vx, vy);

    if (this.state === PlayerState.Idle) {
      this.transitionTo(PlayerState.Moving, this.scene.time.now);
    }
  }

  private updateFacing(input: PlayerInput): void {
    // Prefer horizontal facing for attack alignment; keep last if none.
    if (input.left) this.direction = Direction.Left;
    else if (input.right) this.direction = Direction.Right;
    else if (input.up) this.direction = Direction.Up;
    else if (input.down) this.direction = Direction.Down;
  }

  private regenStamina(delta: number): void {
    const now = this.scene.time.now;
    // Pause regen briefly after spending stamina, and during dodge.
    if (this.state === PlayerState.Dodging) return;
    if (now - this.lastStaminaConsumeTime < 300) return;
    this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN_PER_SEC * (delta / 1000));
  }

  private spendStamina(amount: number): boolean {
    if (this.stamina < amount) return false;
    this.stamina -= amount;
    this.lastStaminaConsumeTime = this.scene.time.now;
    return true;
  }

  // ── Combat actions (discrete, scene-wired) ───────────────

  tryDodge(time: number): boolean {
    if (this.state === PlayerState.Dead || this.state === PlayerState.Hurt) return false;
    if (time < this.dodgeCooldownUntil) return false;
    if (!this.spendStamina(DODGE_STAMINA_COST)) return false;

    // Direction of current input, else facing.
    const dir = this.dodgeDirection();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(dir.x * PLAYER_DODGE_SPEED, dir.y * PLAYER_DODGE_SPEED);

    this.dodgeUntil = time + DODGE_DURATION_MS;
    this.dodgeCooldownUntil = time + DODGE_COOLDOWN_MS;
    this.invulnerableUntil = time + IFRAME_DURATION_MS;
    this.stateLockUntil = this.dodgeUntil;
    this.transitionTo(PlayerState.Dodging, time);
    this.scene.events.emit(EVENTS.PLAYER_DODGE, { x: this.x, y: this.y });
    return true;
  }

  tryLightAttack(time: number): boolean {
    if (this.state === PlayerState.Dead || this.state === PlayerState.Hurt) return false;
    if (time < this.lightAttackCooldownUntil) return false;
    if (time < this.stateLockUntil) return false;

    this.lightAttackCooldownUntil = time + LIGHT_ATTACK_COOLDOWN_MS;
    this.stateLockUntil = time + ATTACK_LIGHT_LOCK_MS;
    this.transitionTo(PlayerState.AttackingLight, time);
    this.scene.events.emit(EVENTS.PLAYER_ATTACK_LIGHT, {
      x: this.x, y: this.y, direction: this.direction, range: PLAYER_ATTACK_RANGE,
    });
    this.hooks?.onLightAttack(this);
    return true;
  }

  tryHeavyAttack(time: number): boolean {
    if (this.state === PlayerState.Dead || this.state === PlayerState.Hurt) return false;
    if (time < this.heavyAttackCooldownUntil) return false;
    if (time < this.stateLockUntil) return false;
    if (!this.spendStamina(HEAVY_ATTACK_STAMINA_COST)) return false;

    this.heavyAttackCooldownUntil = time + HEAVY_ATTACK_COOLDOWN_MS;
    this.stateLockUntil = time + ATTACK_HEAVY_LOCK_MS;
    this.transitionTo(PlayerState.AttackingHeavy, time);
    this.scene.events.emit(EVENTS.PLAYER_ATTACK_HEAVY, {
      x: this.x, y: this.y, direction: this.direction, range: PLAYER_ATTACK_RANGE,
    });
    this.hooks?.onHeavyAttack(this);
    return true;
  }

  tryParry(time: number): boolean {
    if (this.state === PlayerState.Dead || this.state === PlayerState.Hurt) return false;
    if (time < this.stateLockUntil) return false;
    if (!this.spendStamina(PARRY_STAMINA_COST)) return false;

    this.parryUntil = time + PARRY_WINDOW_MS;
    this.stateLockUntil = this.parryUntil;
    this.transitionTo(PlayerState.Parrying, time);
    this.scene.events.emit(EVENTS.PLAYER_PARRY, {
      x: this.x, y: this.y, direction: this.direction, stunMs: PARRY_STUN_MS,
    });
    this.hooks?.onParry(this);
    return true;
  }

  /**
   * Called when the player is hit by an enemy attack.
   * Returns true if damage was actually applied (i.e. not in i-frames).
   */
  takeDamage(time: number, rawDamage: number): boolean {
    if (this.state === PlayerState.Dead) return false;
    if (time < this.invulnerableUntil) return false;

    this.scene.events.emit(EVENTS.PLAYER_DAMAGE, { x: this.x, y: this.y, damage: rawDamage });
    this.invulnerableUntil = time + IFRAME_DURATION_MS;
    this.stateLockUntil = time + HURT_LOCK_MS;
    this.transitionTo(PlayerState.Hurt, time);
    return true;
  }

  die(): void {
    this.transitionTo(PlayerState.Dead, this.scene.time.now);
    this.setVelocity(0, 0);
    this.scene.events.emit(EVENTS.PLAYER_DEATH, { x: this.x, y: this.y });
  }

  isDead(): boolean {
    return this.state === PlayerState.Dead;
  }

  /** Unit vector for the current dodge direction. */
  private dodgeDirection(): { x: number; y: number } {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      return { x: vx / len, y: vy / len };
    }
    switch (this.direction) {
      case Direction.Up: return { x: 0, y: -1 };
      case Direction.Down: return { x: 0, y: 1 };
      case Direction.Left: return { x: -1, y: 0 };
      case Direction.Right: return { x: 1, y: 0 };
    }
  }

  private transitionTo(state: PlayerState, _time: number): void {
    this.state = state;
  }

  /** Facing-derived attack origin point (the "blade tip"). */
  getAttackOrigin(): { x: number; y: number } {
    const offset = PLAYER_ATTACK_RANGE * 0.6;
    switch (this.direction) {
      case Direction.Up: return { x: this.x, y: this.y - offset };
      case Direction.Down: return { x: this.x, y: this.y + offset };
      case Direction.Left: return { x: this.x - offset, y: this.y };
      case Direction.Right: return { x: this.x + offset, y: this.y };
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.lantern) {
      this.scene.lights.removeLight(this.lantern);
      this.lantern = null;
    }
    super.destroy(fromScene);
  }
}
