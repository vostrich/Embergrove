// ─── Direction ────────────────────────────────────────────
export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

// ─── Rarity ───────────────────────────────────────────────
export enum Rarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Ember = 'ember',
  Veilforged = 'veilforged',
  Ancestral = 'ancestral',
}

// ─── ItemType ─────────────────────────────────────────────
export enum ItemType {
  Weapon = 'weapon',
  Armor = 'armor',
  Accessory = 'accessory', // legacy; kept for migration only
  Charm = 'charm',
  Lantern = 'lantern',
  Consumable = 'consumable',
  Material = 'material',
  Quest = 'quest',
}

/** Equipment slot keys — mirrors EquipmentSlots field names. */
export type EquipmentSlot = 'weapon' | 'armor' | 'charm' | 'lantern';

// ─── EnemyType ────────────────────────────────────────────
export enum EnemyType {
  Normal = 'normal',
  Elite = 'elite',
  Boss = 'boss',
}

// ─── SkillTree ────────────────────────────────────────────
export interface SkillTree {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  currentLevel: number;
  prerequisites: string[];
  unlocked: boolean;
}

// ─── QuestStatus ───────────────────────────────────────────
export enum QuestStatus {
  Locked = 'locked',
  Active = 'active',
  Completed = 'completed',
  Failed = 'failed',
}

// ─── Stats ─────────────────────────────────────────────────
export interface Stats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number; // influences crit chance; full effect in Sprint 5 skill trees
  level: number;
  xp: number;
  xpToNext: number;
}

// ─── Combatant ────────────────────────────────────────────
// Minimal contract that CombatSystem needs from anything that can fight.
// Implemented by Player and Enemy.
export interface Combatant {
  attack: number;
  defense: number;
  luck: number;
  speed: number;
  x: number;
  y: number;
}

// ─── AttackType ───────────────────────────────────────────
export enum AttackType {
  Light = 'light',
  Heavy = 'heavy',
}

// ─── Weapon ───────────────────────────────────────────────
export interface Weapon {
  id: string;
  attackMult: number; // multiplier applied to attacker.attack
  attackFlat: number; // flat bonus added after multiplier
}

// ─── AttackResult ─────────────────────────────────────────
export interface AttackResult {
  damage: number;
  isCrit: boolean;
  isDodged: boolean;
}

// ─── Affix ────────────────────────────────────────────────
export interface Affix {
  id: string;
  name: string;
  stat: string;
  value: number;
}

// ─── ItemEffect ──────────────────────────────────────────
export interface ItemEffect {
  type: 'heal_hp' | 'heal_stamina' | 'heal_mana' | 'buff_attack' | 'buff_defense';
  value: number;
  durationMs: number;
}

// ─── Item ─────────────────────────────────────────────────
export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  level: number;
  stats: Partial<Stats>;
  affixes: Affix[];
  effect: ItemEffect | null;
  stackable: boolean;
  quantity: number;
  maxStack: number;
  weight: number; // kg per unit; used by InventorySystem weight gate
  value: number; // base gold value; shown in tooltip
}

// ─── InventoryEntry ───────────────────────────────────────
// Slot-indexed inventory record. `slot` ∈ [0, INVENTORY_SLOTS-1].
// Item metadata is resolved via ItemRegistry.get(itemId).
export interface InventoryEntry {
  slot: number;
  itemId: string;
  count: number;
}

// ─── EquipmentSlots ───────────────────────────────────────
export interface EquipmentSlots {
  weapon: string | null;
  armor: string | null;
  charm: string | null;
  lantern: string | null;
}

// ─── QuestObjective ────────────────────────────────────────
export interface QuestObjective {
  id: string;
  description: string;
  type: 'kill' | 'collect' | 'talk' | 'reach' | 'use';
  targetId: string;
  targetName: string;
  requiredCount: number;
  currentCount: number;
  completed: boolean;
}

// ─── QuestReward ──────────────────────────────────────────
export interface QuestReward {
  xp: number;
  items: string[];
}

// ─── Quest ─────────────────────────────────────────────────
export interface Quest {
  id: string;
  name: string;
  description: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  reward: QuestReward;
  prerequisiteQuests: string[];
}

// ─── DialogueChoice ───────────────────────────────────────
export interface DialogueChoice {
  text: string;
  nextNodeId: string;
  condition?: string;
  action?: DialogueAction;
}

// ─── DialogueAction ──────────────────────────────────────
export interface DialogueAction {
  type: 'give_item' | 'remove_item' | 'start_quest' | 'complete_quest' | 'teleport';
  targetId: string;
  quantity?: number;
}

// ─── DialogueNode ────────────────────────────────────────
export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  choices: DialogueChoice[];
}

// ─── LootDrop ────────────────────────────────────────────
export interface LootDrop {
  itemId: string;
  chance: number;        // 0.0 – 1.0
  minQuantity: number;
  maxQuantity: number;
}

// ─── EnemyConfig ─────────────────────────────────────────
export interface EnemyConfig {
  id: string;
  name: string;
  type: EnemyType;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  xpReward: number;
  goldMin: number; // inclusive gold drop range (data-driven, replaces hardcoded)
  goldMax: number;
  loot: LootDrop[];
  spriteKey: string;
  behavior: 'chase' | 'patrol' | 'stationary' | 'ambush';
  aggroRange: number;
  deaggroRange: number;
  attacks: EnemyAttack[];
}

// ─── EnemyAttack ──────────────────────────────────────────
export interface EnemyAttack {
  id: string;
  name: string;
  damage: number;
  range: number;
  cooldownMs: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
}

// ─── Recipe (crafting) ─────────────────────────────────────
export type CraftingStation = 'apothecary' | 'smithy';

export interface RecipeIngredient {
  itemId: string;
  count: number;
}

export interface Recipe {
  id: string;
  outputId: string;
  outputCount: number;
  station: CraftingStation;
  ingredients: RecipeIngredient[];
  craftTimeMs: number;
  requiredLevel: number;
}

// ─── SaveData ─────────────────────────────────────────────
export interface SaveData {
  schemaVersion: number;
  slot: number;
  timestamp: number;
  playTimeMs: number;
  player: {
    scene: string;
    x: number;
    y: number;
    direction: Direction;
    stats: Stats;
    inventory: InventoryEntry[]; // slot-indexed; metadata via ItemRegistry
    gold: number;
    equipment: EquipmentSlots;
    hotbar: (number | null)[]; // 6 inventory-slot refs (or null)
    skills: SkillTree[];
  };
  quests: Quest[];
  flags: Record<string, boolean>;
  world: {
    currentDay: number;
    timeOfDay: number;
  };
}
