import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveSystem } from '@systems/SaveSystem';
import { xpToLevel, MAX_LEVEL, PLAYER_BASE_HP } from '@data/Constants';

// ── localStorage polyfill for node test env ──────────────
// SaveSystem reads/writes localStorage directly; vitest's `node` env
// does not provide it, so we install an in-memory mock before each test.
function makeMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() { return Object.keys(store).length; },
    clear: () => { store = {}; },
    getItem: (k: string) => (k in store ? store[k] : null),
    key: (i: number) => Object.keys(store)[i] ?? null,
    removeItem: (k: string) => { delete store[k]; },
    setItem: (k: string, v: string) => { store[k] = String(v); },
  };
}

describe('SaveSystem — XP / leveling', () => {
  let storageMock: Storage;

  beforeEach(() => {
    storageMock = makeMemoryStorage();
    vi.stubGlobal('localStorage', storageMock);
    SaveSystem.setSlot(0);
  });

  it('awardXp adds XP without levelling when below threshold', () => {
    const data = SaveSystem.newGameData(0);
    SaveSystem.save(data);
    const levels = SaveSystem.awardXp(50);
    expect(levels).toBe(0);
    expect(SaveSystem.activeSave!.player.stats.xp).toBe(50);
    expect(SaveSystem.activeSave!.player.stats.level).toBe(1);
  });

  it('awardXp triggers a level-up when crossing the threshold', () => {
    const data = SaveSystem.newGameData(0);
    SaveSystem.save(data);
    const threshold = xpToLevel(1); // XP needed for L1→L2
    const levels = SaveSystem.awardXp(threshold);
    expect(levels).toBe(1);
    expect(SaveSystem.activeSave!.player.stats.level).toBe(2);
    // XP resets toward the new threshold.
    expect(SaveSystem.activeSave!.player.stats.xp).toBe(0);
    expect(SaveSystem.activeSave!.player.stats.xpToNext).toBe(xpToLevel(2));
  });

  it('awardXp fires the onLevelUp callback with the new level', () => {
    const data = SaveSystem.newGameData(0);
    SaveSystem.save(data);
    const spy = vi.fn();
    SaveSystem.awardXp(xpToLevel(1), spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(2);
  });

  it('awardXp cascades through multiple level-ups in one call', () => {
    const data = SaveSystem.newGameData(0);
    SaveSystem.save(data);
    // Give enough XP to clear several thresholds at once.
    const bigGrant = xpToLevel(1) + xpToLevel(2) + xpToLevel(3);
    const levels = SaveSystem.awardXp(bigGrant);
    expect(levels).toBe(3);
    expect(SaveSystem.activeSave!.player.stats.level).toBe(4);
  });

  it('awardXp raises max HP/stamina on level-up', () => {
    const data = SaveSystem.newGameData(0);
    SaveSystem.save(data);
    const hpBefore = SaveSystem.activeSave!.player.stats.maxHp;
    SaveSystem.awardXp(xpToLevel(1));
    expect(SaveSystem.activeSave!.player.stats.maxHp).toBeGreaterThan(hpBefore);
    // HP is also refilled.
    expect(SaveSystem.activeSave!.player.stats.hp).toBe(SaveSystem.activeSave!.player.stats.maxHp);
  });

  it('awardXp is a no-op (0 levels) with no active save', () => {
    SaveSystem.activeSave = null;
    expect(SaveSystem.awardXp(1000)).toBe(0);
  });

  it('awardXp caps at MAX_LEVEL and stops awarding', () => {
    const data = SaveSystem.newGameData(0);
    SaveSystem.save(data);
    const stats = SaveSystem.activeSave!.player.stats;
    stats.level = MAX_LEVEL;
    const levels = SaveSystem.awardXp(999999);
    expect(levels).toBe(0);
    expect(stats.level).toBe(MAX_LEVEL);
  });
});

describe('SaveSystem — migration fills missing fields', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMemoryStorage());
    SaveSystem.setSlot(0);
  });

  it('migrates a v0.2 save missing luck and gold', () => {
    // Hand-build a save shaped like Sprint 1 data (no luck, no gold).
    const legacy = {
      schemaVersion: 1,
      slot: 0,
      timestamp: 0,
      playTimeMs: 0,
      player: {
        scene: 'EmberCottageScene',
        x: 300, y: 400,
        direction: 'down',
        stats: {
          hp: 100, maxHp: 100,
          stamina: 80, maxStamina: 80,
          mana: 50, maxMana: 50,
          attack: 5, defense: 2, speed: 160,
          // luck deliberately missing
          level: 1, xp: 0, xpToNext: 100,
        },
        inventory: [],
        // gold deliberately missing
        equipment: { weapon: null, armor: null, accessory: null },
        skills: [],
      },
      quests: [],
      flags: {},
      world: { currentDay: 1, timeOfDay: 0.5 },
    };
    localStorage.setItem('embergrove_save_0', JSON.stringify(legacy));

    const loaded = SaveSystem.load(0)!;
    expect(loaded.player.gold).toBe(0);
    expect(loaded.player.stats.luck).toBe(0);
  });

  it('newGameData includes gold and luck fields', () => {
    const data = SaveSystem.newGameData(0);
    expect(data.player.gold).toBe(0);
    expect(data.player.stats.luck).toBe(0);
    expect(data.player.stats.maxHp).toBe(PLAYER_BASE_HP);
  });
});
