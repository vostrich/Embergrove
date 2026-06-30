interface AssetEntry {
  key: string;
  path: string;
}

interface SpriteEntry extends AssetEntry {
  frameWidth: number;
  frameHeight: number;
}

interface AudioEntry extends AssetEntry {
  type: 'music' | 'sfx';
}

interface DataEntry {
  key: string;
  path: string;
}

// ─── Tilesets ─────────────────────────────────────────────
export const TILESETS: AssetEntry[] = [
  { key: 'grass-tileset', path: 'assets/tilesets/grass.png' },
  { key: 'cottage-tileset', path: 'assets/tilesets/cottage.png' },
];

// ─── Tilemaps ─────────────────────────────────────────────
export const TILEMAPS: AssetEntry[] = [
  { key: 'ember-cottage-map', path: 'assets/tilemaps/ember-cottage.json' },
];

// ─── Sprites ─────────────────────────────────────────────
export const SPRITES: SpriteEntry[] = [
  // Player
  { key: 'player-idle', path: 'assets/sprites/player-idle.png', frameWidth: 16, frameHeight: 24 },
  { key: 'player-run', path: 'assets/sprites/player-run.png', frameWidth: 16, frameHeight: 24 },
  { key: 'player-attack', path: 'assets/sprites/player-attack.png', frameWidth: 16, frameHeight: 24 },
  { key: 'player-dodge', path: 'assets/sprites/player-dodge.png', frameWidth: 16, frameHeight: 24 },

  // Enemies
  { key: 'veil-rat', path: 'assets/sprites/enemies/veil-rat.png', frameWidth: 16, frameHeight: 16 },
  { key: 'hollow-wolf', path: 'assets/sprites/enemies/hollow-wolf.png', frameWidth: 24, frameHeight: 24 },
  { key: 'mist-wraith', path: 'assets/sprites/enemies/mist-wraith.png', frameWidth: 24, frameHeight: 32 },
  { key: 'marsh-maw', path: 'assets/sprites/enemies/marsh-maw.png', frameWidth: 32, frameHeight: 32 },

  // NPCs
  { key: 'npc-grandma', path: 'assets/sprites/npcs/grandma.png', frameWidth: 16, frameHeight: 24 },
  { key: 'npc-smith', path: 'assets/sprites/npcs/smith.png', frameWidth: 16, frameHeight: 24 },

  // Bosses
  { key: 'boss-hollow-king', path: 'assets/sprites/bosses/hollow-king.png', frameWidth: 48, frameHeight: 48 },
];

// ─── UI Assets ───────────────────────────────────────────
export const UI_ASSETS: AssetEntry[] = [
  { key: 'hp-bar-frame', path: 'assets/ui/hp-bar-frame.png' },
  { key: 'hp-bar-fill', path: 'assets/ui/hp-bar-fill.png' },
  { key: 'stamina-bar-fill', path: 'assets/ui/stamina-bar-fill.png' },
  { key: 'mana-bar-fill', path: 'assets/ui/mana-bar-fill.png' },
  { key: 'dialogue-box', path: 'assets/ui/dialogue-box.png' },
  { key: 'inventory-slot', path: 'assets/ui/inventory-slot.png' },
  { key: 'ember-icon', path: 'assets/ui/ember-icon.png' },
];

// ─── Audio ────────────────────────────────────────────────
export const AUDIO: AudioEntry[] = [
  // Music
  { key: 'bgm-ember-cottage', path: 'assets/audio/music/ember-cottage.mp3', type: 'music' },
  { key: 'bgm-combat', path: 'assets/audio/music/combat.mp3', type: 'music' },

  // SFX
  { key: 'sfx-swing', path: 'assets/audio/sfx/swing.wav', type: 'sfx' },
  { key: 'sfx-hit', path: 'assets/audio/sfx/hit.wav', type: 'sfx' },
  { key: 'sfx-dodge', path: 'assets/audio/sfx/dodge.wav', type: 'sfx' },
  { key: 'sfx-pickup', path: 'assets/audio/sfx/pickup.wav', type: 'sfx' },
  { key: 'sfx-levelup', path: 'assets/audio/sfx/levelup.wav', type: 'sfx' },
];

// ─── Data Files ───────────────────────────────────────────
export const DATA_FILES: DataEntry[] = [
  { key: 'items-data', path: 'assets/data/items.json' },
  { key: 'enemies-data', path: 'assets/data/enemies.json' },
  { key: 'quests-data', path: 'assets/data/quests.json' },
];
