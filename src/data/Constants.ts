// ─── Display ───────────────────────────────────────────────
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 32;

// ─── Player Movement ──────────────────────────────────────
export const PLAYER_SPEED = 160;
export const PLAYER_DODGE_SPEED = 400;
export const DODGE_DURATION_MS = 200;
export const IFRAME_DURATION_MS = 400;
export const DODGE_COOLDOWN_MS = 800;
export const DODGE_STAMINA_COST = 15;

// ─── Player Base Stats ────────────────────────────────────
export const PLAYER_BASE_HP = 100;
export const PLAYER_BASE_STAMINA = 80;
export const PLAYER_BASE_MANA = 50;
export const HP_REGEN_PER_SEC = 0.5;
export const STAMINA_REGEN_PER_SEC = 8;
export const MANA_REGEN_PER_SEC = 2;

// ─── Player Ability Costs ─────────────────────────────────
export const DODGE_STAMINA_COST_FINAL = 15;
export const PARRY_STAMINA_COST = 10;
export const HEAVY_ATTACK_STAMINA_COST = 20;
export const SKILL_MANA_COST = 25;

// ─── Combat ───────────────────────────────────────────────
export const LIGHT_ATTACK_DAMAGE = 10;
export const HEAVY_ATTACK_DAMAGE = 25;
export const LIGHT_ATTACK_COOLDOWN_MS = 300;
export const HEAVY_ATTACK_COOLDOWN_MS = 700;
export const PARRY_WINDOW_MS = 200;
export const PARRY_STUN_MS = 1500;

// ─── Combat Resolution ───────────────────────────────────
export const CRIT_BASE_PERCENT = 5; // base crit chance contribution from luck=0
export const CRIT_MULTIPLIER = 2.0;
export const PLAYER_ATTACK_RANGE = 48; // melee reach in front of player
export const ATTACK_LIGHT_LOCK_MS = 250; // movement lock during light attack
export const ATTACK_HEAVY_LOCK_MS = 450; // movement lock during heavy attack
export const HURT_LOCK_MS = 250; // brief stagger lock after taking damage
export const KNOCKBACK_DURATION_MS = 150;

// ─── Player Lantern ──────────────────────────────────────
export const LANTERN_RADIUS_DAY = 120;
export const LANTERN_RADIUS_NIGHT = 80;

// ─── Persistence ─────────────────────────────────────────
export const POSITION_SAVE_INTERVAL_MS = 5000;

// ─── Leveling ─────────────────────────────────────────────
export const MAX_LEVEL = 30;
export const XP_BASE = 100;
export const XP_MULTIPLIER = 1.35;

export function xpToLevel(level: number): number {
  return Math.floor(XP_BASE * Math.pow(XP_MULTIPLIER, level - 1));
}

// ─── Day / Night Cycle ───────────────────────────────────
export const DAY_LENGTH_MS = 20 * 60 * 1000; // 20 minutes

export const TIME_OF_DAY = {
  DAWN_START: 0,
  DAY_START: 0.2,
  DUSK_START: 0.75,
  NIGHT_START: 0.85,
} as const;

// ─── Save System ──────────────────────────────────────────
export const SAVE_KEY_PREFIX = 'embergrove_save_';
export const SAVE_SCHEMA_VERSION = 2; // v2: slot-indexed inventory + 4 equipment slots
export const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const SAVE_SLOTS = 3;

// ─── Inventory ────────────────────────────────────────────
export const INVENTORY_COLS = 6;
export const INVENTORY_ROWS = 4;
export const INVENTORY_SLOTS = INVENTORY_COLS * INVENTORY_ROWS; // 24
export const HOTBAR_SLOTS = 6;
export const BASE_CARRY_WEIGHT = 50; // kg at level 1
export const CARRY_WEIGHT_PER_LEVEL = 2; // +2 kg per player level

// ─── Crafting Stations ───────────────────────────────────
export const CRAFTING_STATIONS = {
  APOTHECARY: 'apothecary',
  SMITHY: 'smithy',
} as const;

// ─── Loot Glow Radii ─────────────────────────────────────
export const GLOW_RADIUS_MINOR = 8; // common / uncommon
export const GLOW_RADIUS_MAJOR = 12; // ember / veilforged / ancestral

// ─── Rarity Colors ───────────────────────────────────────
export const RARITY_COLORS: Record<string, number> = {
  common: 0xc0c0c0,
  uncommon: 0x4caf50,
  ember: 0xe8a54b,
  veilforged: 0x9c27b0,
  ancestral: 0xffd700,
};

/** Rarity ordering for sort (low → high). */
export const RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  ember: 2,
  veilforged: 3,
  ancestral: 4,
};

/** Item type → equipment slot mapping (null = not equippable). */
export const TYPE_TO_EQUIP_SLOT: Record<string, string | null> = {
  weapon: 'weapon',
  armor: 'armor',
  charm: 'charm',
  lantern: 'lantern',
  accessory: 'charm', // legacy accessories map to charm slot
};

// ─── Scene Keys ──────────────────────────────────────────
export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MAIN_MENU: 'MainMenuScene',
  EMBER_COTTAGE: 'EmberCottageScene',
  UI: 'UIScene',
} as const;

// ─── Event Keys ──────────────────────────────────────────
export const EVENTS = {
  PLAYER_MOVE: 'player:move',
  PLAYER_ATTACK: 'player:attack',
  PLAYER_ATTACK_LIGHT: 'player:attack:light',
  PLAYER_ATTACK_HEAVY: 'player:attack:heavy',
  PLAYER_DODGE: 'player:dodge',
  PLAYER_PARRY: 'player:parry',
  PLAYER_DAMAGE: 'player:damage',
  PLAYER_DEATH: 'player:death',
  PLAYER_HEAL: 'player:heal',
  PLAYER_LEVEL_UP: 'player:levelUp',
  PLAYER_XP_GAIN: 'player:xpGain',
  ATTACK_RESOLVED: 'combat:attackResolved',
  PARRY_SUCCESS: 'combat:parrySuccess',
  ENEMY_DAMAGE: 'enemy:damage',
  ENEMY_DEATH: 'enemy:death',
  ENEMY_DEFEATED: 'enemy:defeated',
  ENEMY_SPAWN: 'enemy:spawn',
  ITEM_PICKUP: 'item:pickup',
  GOLD_PICKUP: 'gold:pickup',
  QUEST_UPDATE: 'quest:update',
  QUEST_COMPLETE: 'quest:complete',
  INVENTORY_CHANGE: 'inventory:change',
  EQUIPMENT_CHANGED: 'equipment:changed',
  TIME_CHANGE: 'world:timeChange',
  SAVE_GAME: 'save:game',
  LOAD_GAME: 'save:load',
  SCENE_TRANSITION: 'scene:transition',
} as const;
