import type { Combatant, AttackResult, Weapon } from '@data/types';
import { AttackType } from '@data/types';
import {
  CRIT_BASE_PERCENT,
  CRIT_MULTIPLIER,
  LIGHT_ATTACK_DAMAGE,
  HEAVY_ATTACK_DAMAGE,
  KNOCKBACK_DURATION_MS,
} from '@data/Constants';

/**
 * Injectable random source. Defaults to Math.random but can be seeded
 * in unit tests for deterministic crit-roll verification.
 */
export type RandomSource = () => number;

/**
 * Knockback executor. Decouples CombatSystem from Phaser tweens so it
 * remains unit-testable. The scene supplies an implementation that
 * tweens the target away from the source over KNOCKBACK_DURATION_MS.
 */
export interface KnockbackExecutor {
  apply(target: Combatant & { x: number; y: number }, fromX: number, fromY: number, force: number): void;
}

/**
 * Static combat resolver. Phaser-free so it is fully unit-testable in node.
 *
 * Damage formula:
 *   baseDmg    = attacker.attack * weapon.attackMult + weapon.attackFlat
 *   defenseMult = 1 - clamp(defender.defense / 100, 0, 0.95)
 *   critChance  = (attacker.luck + CRIT_BASE_PERCENT) / 100
 *   isCrit      = rng() < critChance
 *   finalDmg    = max(1, floor(baseDmg * defenseMult * (isCrit ? CRIT_MULTIPLIER : 1)))
 */
export class CombatSystem {
  private static rng: RandomSource = Math.random;
  private static knockbackExecutor: KnockbackExecutor | null = null;

  /** Inject a (possibly seeded) random source. Returns the previous one. */
  static setRandomSource(rng: RandomSource): RandomSource {
    const prev = CombatSystem.rng;
    CombatSystem.rng = rng;
    return prev;
  }

  /** Inject the scene-side knockback executor. */
  static setKnockbackExecutor(executor: KnockbackExecutor | null): void {
    CombatSystem.knockbackExecutor = executor;
  }

  /**
   * Resolve a single attack between two combatants.
   * Pure function of (attacker, defender, type, weapon, rng) — no side effects.
   */
  static resolveAttack(
    attacker: Combatant,
    defender: Combatant,
    type: AttackType,
    weapon: Weapon
  ): AttackResult {
    const baseDmg = CombatSystem.computeBaseDamage(attacker, type, weapon);

    const defenseMult = CombatSystem.computeDefenseMultiplier(defender.defense);

    const critChance = CombatSystem.computeCritChance(attacker.luck);
    const isCrit = CombatSystem.rng() < critChance;
    const critMult = isCrit ? CRIT_MULTIPLIER : 1.0;

    const finalDmg = Math.max(1, Math.floor(baseDmg * defenseMult * critMult));

    return { damage: finalDmg, isCrit, isDodged: false };
  }

  /** Base damage before defense/crit, factoring in the weapon and attack type. */
  static computeBaseDamage(
    attacker: Pick<Combatant, 'attack'>,
    type: AttackType,
    weapon: Weapon
  ): number {
    const typeBonus = type === AttackType.Heavy ? HEAVY_ATTACK_DAMAGE : LIGHT_ATTACK_DAMAGE;
    return attacker.attack * weapon.attackMult + weapon.attackFlat + typeBonus;
  }

  /**
   * Defense multiplier clamped to [0.05, 1] so defense can never fully
   * nullify damage nor push it above 100%.
   */
  static computeDefenseMultiplier(defense: number): number {
    const raw = 1 - defense / 100;
    return Math.min(1, Math.max(0.05, raw));
  }

  /** Crit probability as a 0–1 fraction. */
  static computeCritChance(luck: number): number {
    return (luck + CRIT_BASE_PERCENT) / 100;
  }

  /**
   * Knock the target away from the source. Direction math is computed here
   * (unit vector away from source) and handed to the injected executor.
   * No-op if no executor is registered (e.g. in unit tests).
   */
  static applyKnockback(
    target: Combatant & { x: number; y: number },
    source: { x: number; y: number },
    force: number
  ): void {
    const executor = CombatSystem.knockbackExecutor;
    if (!executor) return;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.hypot(dx, dy);

    // If overlapping exactly, push upward by default.
    const nx = len === 0 ? 0 : dx / len;
    const ny = len === 0 ? -1 : dy / len;

    executor.apply(
      target,
      target.x + nx * force,
      target.y + ny * force,
      force
    );
  }

  /** Duration used by the executor; exposed for tests/assertions. */
  static getKnockbackDurationMs(): number {
    return KNOCKBACK_DURATION_MS;
  }

  /**
   * Parry resolution. On success the enemy is stunned (handled by caller
   * via the returned flag) and the player takes no damage.
   */
  static triggerParry(): { parried: true; damage: number } {
    return { parried: true, damage: 0 };
  }

  /**
   * i-frame check. A combatant is in i-frames if its `invulnerableUntil`
   * timestamp is in the future relative to `now`.
   */
  static isInIframes(target: { invulnerableUntil?: number }, now: number): boolean {
    return target.invulnerableUntil !== undefined && now < target.invulnerableUntil;
  }
}
