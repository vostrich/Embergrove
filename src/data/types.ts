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
  Accessory = 'accessory',
  Consumable = 'consumable',
  Material = 'material',
  Quest = 'quest',
}

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
  level: number;
  xp: number;
  xpToNext: number;
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
    inventory: Item[];
    equipment: {
      weapon: string | null;
      armor: string | null;
      accessory: string | null;
    };
    skills: SkillTree[];
  };
  quests: Quest[];
  flags: Record<string, boolean>;
  world: {
    currentDay: number;
    timeOfDay: number;
  };
}
