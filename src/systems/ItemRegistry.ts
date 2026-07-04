import type { Item, ItemType, Rarity, Stats } from '@data/types';

/**
 * Central itemId → Item metadata registry. Phaser-free so it is fully
 * unit-testable in node.
 *
 * Populated from `items.json` at scene boot via `init(this.cache.json.get(...))`,
 * and manually in unit tests. All other systems (InventorySystem,
 * EquipmentSystem, LootSystem, UI) resolve item metadata through here so there
 * is a single source of truth and no Item objects are duplicated in save data.
 */
export class ItemRegistry {
  private static items: Map<string, Item> = new Map();
  private static initialised = false;

  /** Populate the registry from a parsed items.json payload. Idempotent. */
  static init(items: Item[]): void {
    ItemRegistry.items.clear();
    for (const item of items) {
      ItemRegistry.items.set(item.id, item);
    }
    ItemRegistry.initialised = true;
  }

  /** True once init() has been called with a payload. */
  static isInitialised(): boolean {
    return ItemRegistry.initialised;
  }

  /** Clear the registry (used by tests / debug resets). */
  static reset(): void {
    ItemRegistry.items.clear();
    ItemRegistry.initialised = false;
  }

  /** Full Item metadata, or null if the id is unknown. */
  static get(id: string): Item | null {
    return ItemRegistry.items.get(id) ?? null;
  }

  /** Convenience: returns true if the id is registered. */
  static has(id: string): boolean {
    return ItemRegistry.items.has(id);
  }

  static weight(id: string): number {
    return ItemRegistry.items.get(id)?.weight ?? 0;
  }

  static value(id: string): number {
    return ItemRegistry.items.get(id)?.value ?? 0;
  }

  static stackable(id: string): boolean {
    return ItemRegistry.items.get(id)?.stackable ?? false;
  }

  static maxStack(id: string): number {
    return ItemRegistry.items.get(id)?.maxStack ?? 1;
  }

  static rarity(id: string): Rarity {
    return ItemRegistry.items.get(id)?.rarity ?? 'common' as Rarity;
  }

  static type(id: string): ItemType | null {
    return ItemRegistry.items.get(id)?.type ?? null;
  }

  static name(id: string): string {
    return ItemRegistry.items.get(id)?.name ?? id;
  }

  static description(id: string): string {
    return ItemRegistry.items.get(id)?.description ?? '';
  }

  /** Partial stat block contributed by an item (attack/defense/etc). */
  static stats(id: string): Partial<Stats> {
    return ItemRegistry.items.get(id)?.stats ?? {};
  }

  /**
   * Resolve a slot entry into a concrete Item view with the slot's count
   * applied. Returns null for empty/unknown items. The returned object is a
   * shallow copy; mutating it does not affect the registry.
   */
  static asItem(itemId: string, count: number): Item | null {
    const base = ItemRegistry.items.get(itemId);
    if (!base) return null;
    return { ...base, affixes: [...base.affixes], quantity: count };
  }
}
