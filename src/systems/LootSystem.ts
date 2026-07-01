import Phaser from 'phaser';
import { ItemPickup } from '@entities/ItemPickup';
import type { LootDrop, Item } from '@data/types';
import { ItemType, Rarity } from '@data/types';

/**
 * Resolves loot rolls and spawns ItemPickup (items + gold) at a death
 * position. Gold always drops 1–3 coins; item drops follow each
 * LootDrop chance.
 *
 * Phaser-free RNG hook for testability: inject a seeded source.
 */
export type LootRandomSource = () => number;

export interface LootSpawnHooks {
  onItemSpawned?: (pickup: ItemPickup) => void;
  onGoldSpawned?: (pickup: ItemPickup) => void;
}

export class LootSystem {
  constructor(
    private scene: Phaser.Scene,
    private hooks: LootSpawnHooks = {}
  ) {}

  /**
   * Roll a loot table and spawn pickups at (x,y).
   * Returns the created pickups (items first, then gold).
   */
  dropLoot(x: number, y: number, table: LootDrop[], rng: LootRandomSource = Math.random): ItemPickup[] {
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
          pickups.push(pickup);
          this.hooks.onItemSpawned?.(pickup);
        }
      }
    }

    // Always drop 1–3 gold coins.
    const goldCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < goldCount; i++) {
      const offsetX = (rng() - 0.5) * 30;
      const offsetY = (rng() - 0.5) * 30;
      const gold = new ItemPickup(this.scene, x + offsetX, y + offsetY, { kind: 'gold', amount: 1 });
      pickups.push(gold);
      this.hooks.onGoldSpawned?.(gold);
    }

    return pickups;
  }

  /**
   * Build a minimal material Item for a loot id. Full item definitions
   * live in items.json (Sprint 3 inventory); here we synthesise a
   * stackable material so the pickup can display + be collected.
   */
  static materialItem(id: string, quantity: number): Item {
    const known: Record<string, { name: string; rarity: Rarity }> = {
      'ember-shard': { name: 'Ember Shard', rarity: Rarity.Ember },
      'healing-salve': { name: 'Healing Salve', rarity: Rarity.Uncommon },
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
    };
  }
}
