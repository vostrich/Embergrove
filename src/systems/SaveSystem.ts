import type { SaveData, Stats, Quest, SkillTree, InventoryEntry } from '@data/types';
import { Direction, QuestStatus } from '@data/types';
import {
  SAVE_KEY_PREFIX,
  SAVE_SCHEMA_VERSION,
  SAVE_SLOTS,
  PLAYER_BASE_HP,
  PLAYER_BASE_STAMINA,
  PLAYER_BASE_MANA,
  HOTBAR_SLOTS,
  SCENES,
  xpToLevel,
  MAX_LEVEL,
} from '@data/Constants';

export class SaveSystem {
  public static activeSave: SaveData | null = null;
  private static currentSlot: number = 0;

  // ── Slot Management ──────────────────────────────────────

  static setSlot(slot: number): void {
    if (slot < 0 || slot >= SAVE_SLOTS) {
      throw new Error(`Invalid save slot: ${slot}. Must be 0–${SAVE_SLOTS - 1}`);
    }
    SaveSystem.currentSlot = slot;
  }

  static getSlot(): number {
    return SaveSystem.currentSlot;
  }

  // ── Save ─────────────────────────────────────────────────

  static save(data: SaveData): void {
    const key = SaveSystem.storageKey(data.slot);

    // Backup before write
    const existing = localStorage.getItem(key);
    if (existing !== null) {
      localStorage.setItem(`${key}.bak`, existing);
    }

    data.timestamp = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
    SaveSystem.activeSave = data;
  }

  // ── Load ─────────────────────────────────────────────────

  static load(slot?: number): SaveData | null {
    const s = slot ?? SaveSystem.currentSlot;
    const key = SaveSystem.storageKey(s);
    const raw = localStorage.getItem(key);

    if (raw === null) return null;

    const data = JSON.parse(raw) as SaveData;
    SaveSystem.currentSlot = s;
    const migrated = SaveSystem.migrate(data);
    SaveSystem.activeSave = migrated;
    return migrated;
  }

  // ── Load Backup ─────────────────────────────────────────

  static loadBackup(slot?: number): SaveData | null {
    const s = slot ?? SaveSystem.currentSlot;
    const key = `${SaveSystem.storageKey(s)}.bak`;
    const raw = localStorage.getItem(key);

    if (raw === null) return null;

    const data = JSON.parse(raw) as SaveData;
    return SaveSystem.migrate(data);
  }

  // ── Delete ──────────────────────────────────────────────

  static deleteSlot(slot?: number): void {
    const s = slot ?? SaveSystem.currentSlot;
    const key = SaveSystem.storageKey(s);
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}.bak`);
  }

  // ── List Saves ──────────────────────────────────────────

  static listSaves(): (SaveData | null)[] {
    const saves: (SaveData | null)[] = [];
    for (let i = 0; i < SAVE_SLOTS; i++) {
      saves.push(SaveSystem.load(i));
    }
    return saves;
  }

  // ── New Game ────────────────────────────────────────────

  static newGameData(slot: number): SaveData {
    const data: SaveData = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      slot,
      timestamp: Date.now(),
      playTimeMs: 0,
      player: {
        scene: SCENES.EMBER_COTTAGE,
        x: 200,
        y: 400,
        direction: Direction.Down,
        stats: SaveSystem.createStartingStats(),
        // Starting gear is equipped, not duplicated in the bag. The bag
        // holds a couple of starter consumables in slots 0–1.
        inventory: [
          { slot: 0, itemId: 'healing-salve', count: 3 },
        ],
        gold: 0,
        equipment: {
          weapon: 'rusted-blade',
          armor: null,
          charm: null,
          lantern: 'ember-lantern',
        },
        hotbar: [0, null, null, null, null, null],
        skills: [],
      },
      quests: [],
      flags: {},
      world: {
        currentDay: 1,
        timeOfDay: 0.5,
      },
    };
    SaveSystem.activeSave = data;
    return data;
  }

  // ── XP / Leveling ───────────────────────────────────────

  /**
   * Award XP to the active save's player. Handles level-up cascades.
   * Returns the number of level-ups gained (0 if none).
   *
   * Sprint 2 stub: increments level and emits PLAYER_LEVEL_UP via the
   * callback, but does not award skill points (Sprint 5).
   */
  static awardXp(
    amount: number,
    onLevelUp?: (newLevel: number) => void
  ): number {
    if (!SaveSystem.activeSave) return 0;
    const stats = SaveSystem.activeSave.player.stats;
    if (stats.level >= MAX_LEVEL) {
      stats.xp = stats.xpToNext;
      return 0;
    }

    stats.xp += amount;
    let levelsGained = 0;

    while (stats.xp >= stats.xpToNext && stats.level < MAX_LEVEL) {
      stats.xp -= stats.xpToNext;
      stats.level += 1;
      stats.xpToNext = xpToLevel(stats.level);
      levelsGained += 1;
      // Small stat bump per level (stub; full progression in Sprint 5).
      stats.maxHp += 10;
      stats.hp = stats.maxHp;
      stats.maxStamina += 5;
      stats.stamina = stats.maxStamina;
    }

    if (levelsGained > 0 && onLevelUp) {
      onLevelUp(stats.level);
    }
    return levelsGained;
  }

  // ── Migration ───────────────────────────────────────────

  static migrate(data: SaveData): SaveData {
    const current = SAVE_SCHEMA_VERSION;

    // Field-level guards (apply regardless of schemaVersion so that
    // partially-migrated or hand-edited saves stay valid):
    if (data.player) {
      if (data.player.gold === undefined) data.player.gold = 0;
      if (data.player.stats) {
        if (data.player.stats.luck === undefined) data.player.stats.luck = 0;
      }
    }

    if (data.schemaVersion >= current) {
      // Still ensure v2 shape is present even on already-v2 saves.
      SaveSystem.ensureV2Shape(data);
      return data;
    }

    // ── v1 → v2 migration ──
    // 1. inventory: Item[] → InventoryEntry[] (slot-indexed).
    // 2. equipment: weapon/armor/accessory → weapon/armor/charm/lantern.
    // 3. hotbar: add (length 6, all null).
    if (data.schemaVersion < 2) {
      SaveSystem.migrateV1ToV2(data);
    }

    // Future schema migrations go here, e.g.:
    // if (data.schemaVersion < 3) { apply v3 migrations; }

    data.schemaVersion = current;
    return data;
  }

  /**
   * v1 → v2: convert legacy Item[] inventory to slot-indexed entries, split
   * the old accessory equipment slot into charm/lantern, and add a hotbar.
   * Idempotent — safe to call on partially-migrated data.
   */
  private static migrateV1ToV2(data: SaveData): void {
    const p = data.player as SaveData['player'] & {
      inventory?: unknown;
      equipment?: Record<string, string | null> & { accessory?: string | null };
      hotbar?: (number | null)[];
    };

    // Inventory: accept either legacy Item[] or already-slot-indexed entries.
    if (Array.isArray(p.inventory)) {
      const looksLikeItems = p.inventory.every(
        (e) => e !== null && typeof e === 'object' && 'id' in (e as object)
      );
      if (looksLikeItems) {
        // Legacy Item[] → compact into InventoryEntry[] by slot index.
        const entries: InventoryEntry[] = [];
        (p.inventory as Array<{ id: string; quantity?: number; stackable?: boolean }>)
          .forEach((item, index) => {
            const count = item.quantity ?? 1;
            // Stack stackable items together; otherwise occupy a new slot.
            if (item.stackable) {
              const existing = entries.find((e) => e.itemId === item.id);
              if (existing) {
                existing.count += count;
                return;
              }
            }
            entries.push({ slot: index, itemId: item.id, count });
          });
        // Re-compact slot indices to be contiguous starting at 0.
        entries.forEach((e, i) => { e.slot = i; });
        p.inventory = entries;
      }
      // else: already InventoryEntry[] — leave as-is.
    } else {
      p.inventory = [];
    }

    // Equipment: split legacy `accessory` into charm/lantern.
    const eq = p.equipment ?? { weapon: null, armor: null, charm: null, lantern: null };
    const legacyAccessory = eq.accessory ?? null;
    delete eq.accessory;
    if (legacyAccessory === 'ember-lantern') {
      eq.lantern = legacyAccessory;
    } else if (legacyAccessory) {
      eq.charm = legacyAccessory;
    }
    if (eq.weapon === undefined) eq.weapon = null;
    if (eq.armor === undefined) eq.armor = null;
    if (eq.charm === undefined) eq.charm = null;
    if (eq.lantern === undefined) eq.lantern = null;
    p.equipment = {
      weapon: eq.weapon,
      armor: eq.armor,
      charm: eq.charm,
      lantern: eq.lantern,
    };

    // Hotbar: add if missing.
    if (!Array.isArray(p.hotbar)) {
      p.hotbar = new Array(HOTBAR_SLOTS).fill(null);
    }
  }

  /** Ensure v2 fields exist even on saves that report schemaVersion ≥ 2. */
  private static ensureV2Shape(data: SaveData): void {
    const p = data.player as SaveData['player'] & {
      equipment?: Record<string, string | null> & { accessory?: string | null };
    };
    if (p.equipment && 'accessory' in p.equipment && !('charm' in p.equipment)) {
      // A v1-shaped equipment block slipped through; normalise.
      SaveSystem.migrateV1ToV2(data);
    }
    if (!Array.isArray((data.player as { hotbar?: unknown }).hotbar)) {
      (data.player as { hotbar: (number | null)[] }).hotbar =
        new Array(HOTBAR_SLOTS).fill(null);
    }
  }

  // ── Internal Helpers ────────────────────────────────────

  private static storageKey(slot: number): string {
    return `${SAVE_KEY_PREFIX}${slot}`;
  }

  private static createStartingStats(): Stats {
    return {
      hp: PLAYER_BASE_HP,
      maxHp: PLAYER_BASE_HP,
      stamina: PLAYER_BASE_STAMINA,
      maxStamina: PLAYER_BASE_STAMINA,
      mana: PLAYER_BASE_MANA,
      maxMana: PLAYER_BASE_MANA,
      attack: 5,
      defense: 2,
      speed: 160,
      luck: 0,
      level: 1,
      xp: 0,
      xpToNext: xpToLevel(1),
    };
  }
}
