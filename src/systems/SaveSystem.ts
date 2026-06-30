import type { SaveData, Item, Direction, Stats, Quest, SkillTree } from '@data/types';
import { ItemType, Rarity, QuestStatus } from '@data/types';
import {
  SAVE_KEY_PREFIX,
  SAVE_SCHEMA_VERSION,
  SAVE_SLOTS,
  PLAYER_BASE_HP,
  PLAYER_BASE_STAMINA,
  PLAYER_BASE_MANA,
  SCENES,
  xpToLevel,
} from '@data/Constants';

export class SaveSystem {
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
  }

  // ── Load ─────────────────────────────────────────────────

  static load(slot?: number): SaveData | null {
    const s = slot ?? SaveSystem.currentSlot;
    const key = SaveSystem.storageKey(s);
    const raw = localStorage.getItem(key);

    if (raw === null) return null;

    const data = JSON.parse(raw) as SaveData;
    SaveSystem.currentSlot = s;
    return SaveSystem.migrate(data);
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
    return {
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
        inventory: [
          SaveSystem.createItem('rusted-blade'),
          SaveSystem.createItem('ember-lantern'),
        ],
        equipment: {
          weapon: 'rusted-blade',
          armor: null,
          accessory: null,
        },
        skills: [],
      },
      quests: [],
      flags: {},
      world: {
        currentDay: 1,
        timeOfDay: 0.5,
      },
    };
  }

  // ── Migration ───────────────────────────────────────────

  static migrate(data: SaveData): SaveData {
    const current = SAVE_SCHEMA_VERSION;
    if (data.schemaVersion >= current) return data;

    // Future migrations go here, e.g.:
    // if (data.schemaVersion < 2) { apply v2 migrations; }
    // if (data.schemaVersion < 3) { apply v3 migrations; }

    data.schemaVersion = current;
    return data;
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
      level: 1,
      xp: 0,
      xpToNext: xpToLevel(1),
    };
  }

  private static createItem(id: string): Item {
    const templates: Record<string, Item> = {
      'rusted-blade': {
        id: 'rusted-blade',
        name: 'Rusted Blade',
        description: 'A worn blade, still sharp enough to cut veil-rats.',
        type: ItemType.Weapon,
        rarity: Rarity.Common,
        level: 1,
        stats: { attack: 3 },
        affixes: [],
        effect: null,
        stackable: false,
        quantity: 1,
        maxStack: 1,
      },
      'ember-lantern': {
        id: 'ember-lantern',
        name: 'Ember Lantern',
        description: 'A small lantern that burns with a faint ember glow. Keeps the mist at bay.',
        type: ItemType.Accessory,
        rarity: Rarity.Uncommon,
        level: 1,
        stats: { defense: 1 },
        affixes: [],
        effect: null,
        stackable: false,
        quantity: 1,
        maxStack: 1,
      },
    };

    const template = templates[id];
    if (!template) {
      throw new Error(`Unknown starting item template: ${id}`);
    }

    return { ...template, affixes: [...template.affixes] };
  }
}
