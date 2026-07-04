import Phaser from 'phaser';
import { ItemPickup } from '@entities/ItemPickup';
import type { LootDrop, Item, Rarity } from '@data/types';
import { ItemType, Rarity } from '@data/types';
import {
  RARITY_COLORS,
  GLOW_RADIUS_MINOR,
  GLOW_RADIUS_MAJOR,
} from '@data/Constants';

/**
 * Resolves loot rolls and spawns ItemPickup (items + gold) at a death
 * position. Gold ranges are data-driven (passed in from the enemy config),
 * not hardcoded. Rarity-tuned glow + ancestral light beams are applied here.
 *
 * Phaser-free RNG hook for testability: inject a seeded source.
 */
export type LootRandomSource = () => number;

export interface GoldRange {
  min: number;
  max: number;
}

export interface LootSpawnHooks {
  onItemSpawned?: (pickup: ItemPickup) => void;
  onGoldSpawned?: (pickup: ItemPickup) => void;
}

const MAJOR_RARITIES: ReadonlySet<Rarity> = new Set([
  Rarity.Ember,
  Rarity.Veilforged,
  Rarity.Ancestral,
]);

export class LootSystem {
  constructor(
    private scene: Phaser.Scene,
    private hooks: LootSpawnHooks = {}
  ) {}

  /**
   * Roll a loot table and spawn pickups at (x,y). Gold is rolled from the
   * optional `goldRange` (from enemy config); if omitted, no gold drops.
   * Returns the created pickups (items first, then gold).
   */
  dropLoot(
    x: number,
    y: number,
    table: LootDrop[],
    rng: LootRandomSource = Math.random,
    goldRange?: GoldRange
  ): ItemPickup[] {
    const pickups: ItemPickup[] = [];

    // Item rolls
    for (const drop of table) {
      if (rng() < drop.chance) {
        const qty = drop.minQuantity + Math.floor(rng() * (drop.maxQuantity - drop.minQuantity + 1));
        for (let i = 0; i < qty; i++) {
          const item = LootSystem.materialItem(drop.itemId, 1);
          const offsetX = (rng() - 0.5) * 24;
          const offsetY = (rng() - 0.5) * 24;
          const pickup = new ItemPickup(this.scene, x + offsetX, y + offsetY, { kind: 'item', item });
          LootSystem.applyRarityPresentation(this.scene, pickup, item.rarity);
          pickups.push(pickup);
          this.hooks.onItemSpawned?.(pickup);
        }
      }
    }

    // Gold: data-driven range from enemy config.
    if (goldRange) {
      const span = Math.max(0, goldRange.max - goldRange.min);
      const goldCount = goldRange.min + Math.floor(rng() * (span + 1));
      for (let i = 0; i < goldCount; i++) {
        const offsetX = (rng() - 0.5) * 30;
        const offsetY = (rng() - 0.5) * 30;
        const gold = new ItemPickup(this.scene, x + offsetX, y + offsetY, { kind: 'gold', amount: 1 });
        pickups.push(gold);
        this.hooks.onGoldSpawned?.(gold);
      }
    }

    return pickups;
  }

  /**
   * Apply rarity glow radius + (for ember/veilforged/ancestral) a pulse tween.
   * Ancestral drops also get a descending light beam and a legendary sfx.
   * Called for each item pickup so ItemPickup itself stays presentation-light.
   */
  static applyRarityPresentation(scene: Phaser.Scene, pickup: ItemPickup, rarity: Rarity): void {
    const color = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
    const radius = MAJOR_RARITIES.has(rarity) ? GLOW_RADIUS_MAJOR : GLOW_RADIUS_MINOR;

    // Phaser 4 unified filter API. Glow strength scales with rarity tier.
    const strength = MAJOR_RARITIES.has(rarity) ? 3 : 1.5;
    try {
      pickup.enableFilters();
      (pickup as unknown as { filters: { add: (n: string, o: object) => void } })
        .filters.add('Glow', { color, strength });
    } catch {
      // WebGL/filters unavailable — tint fallback (Phaser 4 multiply tint).
      pickup.setTint(color);
    }

    // Major rarities pulse to draw the eye.
    if (MAJOR_RARITIES.has(rarity)) {
      scene.tweens.add({
        targets: pickup,
        scale: { from: 1.0, to: 1.2 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    if (rarity === Rarity.Ancestral) {
      LootSystem.spawnLightBeam(scene, pickup.x, pickup.y, color);
      LootSystem.playLegendarySfx(scene);
    }
    // `radius` reserved for future beam width tuning; documented here.
    void radius;
  }

  /** Thin descending light beam (cylinder graphic) for ancestral drops. */
  private static spawnLightBeam(scene: Phaser.Scene, x: number, y: number, color: number): void {
    const beam = scene.add.graphics();
    beam.fillStyle(color, 0.4);
    beam.fillRect(x - 3, 0, 6, y); // from top of screen to the pickup
    beam.setDepth(7);
    scene.tweens.add({
      targets: beam,
      alpha: { from: 0.4, to: 0 },
      duration: 1400,
      onComplete: () => beam.destroy(),
    });
  }

  private static playLegendarySfx(scene: Phaser.Scene): void {
    try {
      if (scene.sound && scene.sound.get('sfx-legendary-drop')) {
        scene.sound.play('sfx-legendary-drop', { volume: 0.6 });
      }
    } catch {
      /* sfx asset missing — silent placeholder */
    }
  }

  /**
   * Build a minimal material Item for a loot id. Full item definitions
   * live in items.json; here we synthesise a stackable material so the
   * pickup can display + be collected. Rarity is matched to known ids.
   */
  static materialItem(id: string, quantity: number): Item {
    const known: Record<string, { name: string; rarity: Rarity }> = {
      'ember-shard': { name: 'Ember Shard', rarity: Rarity.Ember },
      'healing-salve': { name: 'Healing Salve', rarity: Rarity.Uncommon },
      'iron-ore': { name: 'Iron Ore', rarity: Rarity.Common },
      'moon-herb': { name: 'Moon Herb', rarity: Rarity.Uncommon },
      'veil-essence': { name: 'Veil Essence', rarity: Rarity.Veilforged },
    };
    const meta = known[id] ?? { name: id, rarity: Rarity.Common };
    return {
      id,
      name: meta.name,
      description: '',
      type: ItemType.Material,
      rarity: meta.rarity,
      level: 1,
      stats: {},
      affixes: [],
      effect: null,
      stackable: true,
      quantity,
      maxStack: 99,
      weight: 0.1,
      value: 3,
    };
  }
}
