// ─── Display ───────────────────────────────────────────────
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 16;

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
export const SAVE_SCHEMA_VERSION = 1;
export const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export const SAVE_SLOTS = 3;

// ─── Rarity Colors ───────────────────────────────────────
export const RARITY_COLORS: Record<string, number> = {
  common: 0xc0c0c0,
  uncommon: 0x4caf50,
  ember: 0xe8a54b,
  veilforged: 0x9c27b0,
  ancestral: 0xffd700,
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
  PLAYER_DODGE: 'player:dodge',
  PLAYER_DAMAGE: 'player:damage',
  PLAYER_DEATH: 'player:death',
  PLAYER_HEAL: 'player:heal',
  PLAYER_LEVEL_UP: 'player:levelUp',
  ENEMY_DAMAGE: 'enemy:damage',
  ENEMY_DEATH: 'enemy:death',
  QUEST_UPDATE: 'quest:update',
  QUEST_COMPLETE: 'quest:complete',
  INVENTORY_CHANGE: 'inventory:change',
  TIME_CHANGE: 'world:timeChange',
  SAVE_GAME: 'save:game',
  LOAD_GAME: 'save:load',
  SCENE_TRANSITION: 'scene:transition',
} as const;
