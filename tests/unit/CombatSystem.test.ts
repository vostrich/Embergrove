import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '@systems/CombatSystem';
import { AttackType } from '@data/types';
import type { Combatant, Weapon } from '@data/types';
import {
  LIGHT_ATTACK_DAMAGE,
  HEAVY_ATTACK_DAMAGE,
  CRIT_BASE_PERCENT,
  CRIT_MULTIPLIER,
  KNOCKBACK_DURATION_MS,
} from '@data/Constants';

// ── Helpers ───────────────────────────────────────────────
function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return { attack: 10, defense: 0, luck: 0, speed: 100, x: 0, y: 0, ...overrides };
}

const FISTS: Weapon = { id: 'fists', attackMult: 1.0, attackFlat: 0 };
const BIG_WEAPON: Weapon = { id: 'big', attackMult: 2.0, attackFlat: 5 };

/** Deterministic seeded RNG (linear congruential) for crit tests. */
function seededRng(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe('CombatSystem.resolveAttack — damage formula', () => {
  beforeEach(() => {
    CombatSystem.setRandomSource(Math.random);
    CombatSystem.setKnockbackExecutor(null);
  });

  it('applies weapon multiplier + flat + type bonus at 0 defense', () => {
    const a = makeCombatant({ attack: 10 });
    const d = makeCombatant({ defense: 0, luck: 0 });
    // Force non-crit.
    CombatSystem.setRandomSource(() => 0.99);

    const result = CombatSystem.resolveAttack(a, d, AttackType.Light, FISTS);
    // baseDmg = 10*1 + 0 + LIGHT_ATTACK_DAMAGE = 10 + 10 = 20
    expect(result.damage).toBe(10 + LIGHT_ATTACK_DAMAGE);
    expect(result.isCrit).toBe(false);
  });

  it('heavy attack adds the heavy damage bonus', () => {
    const a = makeCombatant({ attack: 10 });
    const d = makeCombatant({ defense: 0, luck: 0 });
    CombatSystem.setRandomSource(() => 0.99);

    const result = CombatSystem.resolveAttack(a, d, AttackType.Heavy, FISTS);
    expect(result.damage).toBe(10 + HEAVY_ATTACK_DAMAGE);
  });

  it('applies weapon attackMult and attackFlat', () => {
    const a = makeCombatant({ attack: 10 });
    const d = makeCombatant({ defense: 0 });
    CombatSystem.setRandomSource(() => 0.99);
    // baseDmg = 10*2 + 5 + LIGHT = 25 + 10 = 35
    const result = CombatSystem.resolveAttack(a, d, AttackType.Light, BIG_WEAPON);
    expect(result.damage).toBe(35);
  });

  it('reduces damage by defense/100 fraction (defense 50 → ~half)', () => {
    const a = makeCombatant({ attack: 10 });
    const d = makeCombatant({ defense: 50 });
    CombatSystem.setRandomSource(() => 0.99);
    // base 20, defenseMult 0.5 → 10
    const result = CombatSystem.resolveAttack(a, d, AttackType.Light, FISTS);
    expect(result.damage).toBe(10);
  });

  it('clamps defense multiplier to a 0.05 floor (defense ≥ 100)', () => {
    const a = makeCombatant({ attack: 10 });
    const d = makeCombatant({ defense: 100 });
    CombatSystem.setRandomSource(() => 0.99);
    const result = CombatSystem.resolveAttack(a, d, AttackType.Light, FISTS);
    // base 20 * 0.05 = 1 (floor of 1.0)
    expect(result.damage).toBe(1);
  });

  it('never deals less than 1 damage', () => {
    const a = makeCombatant({ attack: 0 });
    const d = makeCombatant({ defense: 95 });
    CombatSystem.setRandomSource(() => 0.99);
    // base = 0*1 + 0 + 10 = 10, defenseMult 0.05 → 0.5 → floor 0 → max(1,0) = 1
    const result = CombatSystem.resolveAttack(a, d, AttackType.Light, FISTS);
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it('isCrit is true when rng < crit chance', () => {
    const a = makeCombatant({ luck: 5 }); // crit chance = (5+5)/100 = 0.10
    const d = makeCombatant({ defense: 0 });
    CombatSystem.setRandomSource(() => 0.05); // < 0.10 → crit
    const result = CombatSystem.resolveAttack(a, d, AttackType.Light, FISTS);
    expect(result.isCrit).toBe(true);
    // base 20 * 1.0 * CRIT_MULTIPLIER = 40
    expect(result.damage).toBe(Math.floor((10 + LIGHT_ATTACK_DAMAGE) * CRIT_MULTIPLIER));
  });

  it('isCrit is false when rng ≥ crit chance', () => {
    const a = makeCombatant({ luck: 5 });
    const d = makeCombatant({ defense: 0 });
    CombatSystem.setRandomSource(() => 0.5); // ≥ 0.10 → no crit
    const result = CombatSystem.resolveAttack(a, d, AttackType.Light, FISTS);
    expect(result.isCrit).toBe(false);
  });
});

describe('CombatSystem — crit randomness with seeded RNG', () => {
  beforeEach(() => {
    CombatSystem.setKnockbackExecutor(null);
  });

  it('crit probability converges to expected rate over many rolls', () => {
    const luck = 45; // crit chance = (45+5)/100 = 0.50
    const a = makeCombatant({ luck });
    const d = makeCombatant({ defense: 0 });
    CombatSystem.setRandomSource(seededRng(42));

    let crits = 0;
    const rolls = 2000;
    for (let i = 0; i < rolls; i++) {
      const r = CombatSystem.resolveAttack(a, d, AttackType.Light, FISTS);
      if (r.isCrit) crits++;
    }
    const rate = crits / rolls;
    // Expect ~0.50 within a generous tolerance.
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.55);
  });

  it('zero-luck combatant crits at base rate only', () => {
    const a = makeCombatant({ luck: 0 });
    const d = makeCombatant({ defense: 0 });
    CombatSystem.setRandomSource(seededRng(7));

    let crits = 0;
    const rolls = 2000;
    for (let i = 0; i < rolls; i++) {
      if (CombatSystem.resolveAttack(a, d, AttackType.Light, FISTS).isCrit) crits++;
    }
    const rate = crits / rolls;
    const expected = CRIT_BASE_PERCENT / 100; // 0.05
    expect(rate).toBeGreaterThan(expected - 0.03);
    expect(rate).toBeLessThan(expected + 0.03);
  });
});

describe('CombatSystem.applyKnockback — direction math', () => {
  it('does nothing when no executor is registered', () => {
    CombatSystem.setKnockbackExecutor(null);
    const target = makeCombatant({ x: 100, y: 100 });
    expect(() => CombatSystem.applyKnockback(target, { x: 0, y: 0 }, 50)).not.toThrow();
    // Position unchanged (no executor mutated it).
    expect(target.x).toBe(100);
  });

  it('computes destination away from the source (rightward source → rightward push)', () => {
    let captured: { tx: number; ty: number } | null = null;
    CombatSystem.setKnockbackExecutor({
      apply(target, fromX, fromY, _force) {
        captured = { tx: fromX, ty: fromY };
        // Simulate moving the target.
        target.x = fromX;
        target.y = fromY;
      },
    });

    const target = makeCombatant({ x: 200, y: 200 });
    const source = { x: 100, y: 200 }; // source to the left
    CombatSystem.applyKnockback(target, source, 150);

    // Destination should be to the right of target (away from source).
    expect(captured).not.toBeNull();
    expect(captured!.tx).toBeGreaterThan(200);
  });

  it('pushes target directly away along the y-axis when source is above', () => {
    let captured: { tx: number; ty: number } | null = null;
    CombatSystem.setKnockbackExecutor({
      apply(_t, fromX, fromY, _force) {
        captured = { tx: fromX, ty: fromY };
      },
    });
    const target = makeCombatant({ x: 100, y: 100 });
    CombatSystem.applyKnockback(target, { x: 100, y: 0 }, 150);
    expect(captured).not.toBeNull();
    expect(captured!.ty).toBeGreaterThan(100); // pushed down (away)
    expect(captured!.tx).toBeCloseTo(100, 5); // no horizontal drift
  });

  it('falls back to pushing up when source and target overlap exactly', () => {
    let captured: { tx: number; ty: number } | null = null;
    CombatSystem.setKnockbackExecutor({
      apply(_t, fromX, fromY, _force) {
        captured = { tx: fromX, ty: fromY };
      },
    });
    const target = makeCombatant({ x: 50, y: 50 });
    CombatSystem.applyKnockback(target, { x: 50, y: 50 }, 100);
    expect(captured).not.toBeNull();
    expect(captured!.ty).toBeLessThan(50); // pushed up
    expect(captured!.tx).toBeCloseTo(50, 5);
  });

  it('uses the configured knockback duration constant', () => {
    expect(CombatSystem.getKnockbackDurationMs()).toBe(KNOCKBACK_DURATION_MS);
  });
});

describe('CombatSystem — i-frame + parry helpers', () => {
  it('isInIframes returns true before the expiry timestamp', () => {
    expect(CombatSystem.isInIframes({ invulnerableUntil: 1000 }, 500)).toBe(true);
  });
  it('isInIframes returns false at/after the expiry timestamp', () => {
    expect(CombatSystem.isInIframes({ invulnerableUntil: 1000 }, 1000)).toBe(false);
    expect(CombatSystem.isInIframes({ invulnerableUntil: 1000 }, 2000)).toBe(false);
  });
  it('isInIframes returns false when undefined', () => {
    expect(CombatSystem.isInIframes({}, 500)).toBe(false);
  });
  it('triggerParry always parries and deals no damage', () => {
    const r = CombatSystem.triggerParry();
    expect(r.parried).toBe(true);
    expect(r.damage).toBe(0);
  });
});

describe('CombatSystem — pure helper functions', () => {
  it('computeCritChance = (luck + base) / 100', () => {
    expect(CombatSystem.computeCritChance(0)).toBe(CRIT_BASE_PERCENT / 100);
    expect(CombatSystem.computeCritChance(95)).toBe((95 + CRIT_BASE_PERCENT) / 100);
  });
  it('computeDefenseMultiplier clamps to [0.05, 1]', () => {
    expect(CombatSystem.computeDefenseMultiplier(0)).toBe(1);
    expect(CombatSystem.computeDefenseMultiplier(50)).toBe(0.5);
    expect(CombatSystem.computeDefenseMultiplier(100)).toBe(0.05);
    expect(CombatSystem.computeDefenseMultiplier(200)).toBe(0.05); // clamped
  });
});
