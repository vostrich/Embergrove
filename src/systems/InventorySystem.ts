import type { InventoryEntry, Item, EquipmentSlot } from '@data/types';
import { SaveSystem } from '@systems/SaveSystem';
import { ItemRegistry } from '@systems/ItemRegistry';
import {
  INVENTORY_SLOTS,
  BASE_CARRY_WEIGHT,
  CARRY_WEIGHT_PER_LEVEL,
  EVENTS,
} from '@data/Constants';

export interface AddResult {
  added: boolean;
  /** Items that did NOT fit (0 if everything was added). */
  remaining: number;
}

export interface RemoveResult {
  removed: boolean;
  /** How many were actually removed. */
  actualCount: number;
}

/**
 * Slot-indexed inventory manager. Phaser-free and fully unit-testable.
 *
 * Storage lives in `SaveSystem.activeSave.player.inventory` as
 * `InventoryEntry[]` where `slot ∈ [0, INVENTORY_SLOTS-1]`. Item metadata
 * (weight, value, stackability, …) is resolved via {@link ItemRegistry}, so
 * nothing but `{slot, itemId, count}` is persisted.
 *
 * All mutating methods operate directly on the active save and emit
 * `EVENTS.INVENTORY_CHANGE` through the global game events bus when one is
 * attached (see `setEventEmitter`). Tests run without a bus.
 */
export class InventorySystem {
  private static emitter: { emit: (event: string, payload?: unknown) => void } | null = null;

  /** Attach a Phaser event bus so mutations broadcast INVENTORY_CHANGE. */
  static setEventEmitter(
    emitter: { emit: (event: string, payload?: unknown) => void } | null
  ): void {
    InventorySystem.emitter = emitter;
  }

  private static emitChange(): void {
    InventorySystem.emitter?.emit(EVENTS.INVENTORY_CHANGE);
  }

  // ── Lookups ──────────────────────────────────────────────

  /** The raw entry list for the active save (or [] if no save). */
  static entries(): InventoryEntry[] {
    return SaveSystem.activeSave?.player.inventory ?? [];
  }

  /** Entry at a given slot index, or null if empty. */
  static getEntry(slot: number): InventoryEntry | null {
    return InventorySystem.entries().find((e) => e.slot === slot) ?? null;
  }

  /**
   * Materialise the slot's contents as an Item (metadata + count).
   * Returns null for empty or unknown-item slots.
   */
  static getSlot(slot: number): Item | null {
    const entry = InventorySystem.getEntry(slot);
    if (!entry) return null;
    return ItemRegistry.asItem(entry.itemId, entry.count);
  }

  /** First empty slot index, or -1 if the bag is full. */
  static firstEmptySlot(): number {
    const occupied = new Set(InventorySystem.entries().map((e) => e.slot));
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      if (!occupied.has(i)) return i;
    }
    return -1;
  }

  /** Total count of a given itemId across all slots. */
  static count(itemId: string): number {
    return InventorySystem.entries()
      .filter((e) => e.itemId === itemId)
      .reduce((sum, e) => sum + e.count, 0);
  }

  // ── Weight ───────────────────────────────────────────────

  /** Sum of (item.weight * count) across the whole bag. */
  static getTotalWeight(): number {
    return InventorySystem.entries().reduce((sum, e) => {
      return sum + ItemRegistry.weight(e.itemId) * e.count;
    }, 0);
  }

  /** Carry capacity = BASE_CARRY_WEIGHT + level * CARRY_WEIGHT_PER_LEVEL. */
  static getMaxCarryWeight(): number {
    const level = SaveSystem.activeSave?.player.stats.level ?? 1;
    return BASE_CARRY_WEIGHT + level * CARRY_WEIGHT_PER_LEVEL;
  }

  /** Convenience: how much weight can still be added. */
  static getRemainingWeight(): number {
    return Math.max(0, InventorySystem.getMaxCarryWeight() - InventorySystem.getTotalWeight());
  }

  // ── Mutation: add ────────────────────────────────────────

  /**
   * Add `count` of `itemId` to the bag.
   *
   * Strategy: for stackable items, fill existing partial stacks first (respecting
   * maxStack), then spill into empty slots. A weight gate caps how many units
   * actually enter the bag; the rest are reported via `remaining`.
   *
   * Returns `{ added, remaining }`. `added` is true if at least one unit was
   * stored; `remaining` is 0 when everything fit.
   */
  static addItem(itemId: string, count: number): AddResult {
    if (count <= 0) return { added: false, remaining: count };
    const inventory = InventorySystem.entries();
    if (inventory === undefined || !SaveSystem.activeSave) {
      return { added: false, remaining: count };
    }

    const stackable = ItemRegistry.stackable(itemId);
    const maxStack = ItemRegistry.maxStack(itemId);
    const unitWeight = ItemRegistry.weight(itemId);

    let toPlace = count;

    // 1) Top up existing stacks (stackable only).
    if (stackable) {
      for (const entry of inventory) {
        if (toPlace <= 0) break;
        if (entry.itemId !== itemId) continue;
        const room = maxStack - entry.count;
        if (room <= 0) continue;
        const placeable = InventorySystem.weightLimited(room, unitWeight);
        const n = Math.min(placeable, toPlace);
        if (n <= 0) continue;
        entry.count += n;
        toPlace -= n;
      }
    }

    // 2) Spill into empty slots.
    while (toPlace > 0) {
      const slot = InventorySystem.firstEmptySlot();
      if (slot < 0) break; // bag full
      const cap = stackable ? maxStack : 1;
      const placeable = InventorySystem.weightLimited(cap, unitWeight);
      const n = Math.min(placeable, toPlace);
      if (n <= 0) break; // weight gate closed
      inventory.push({ slot, itemId, count: n });
      toPlace -= n;
    }

    const added = toPlace < count;
    if (added) InventorySystem.emitChange();
    return { added, remaining: toPlace };
  }

  /**
   * How many units of weight `unitWeight` we may still add given the cap.
   * Materials with zero weight are never blocked.
   */
  private static weightLimited(capacity: number, unitWeight: number): number {
    if (unitWeight <= 0) return capacity;
    const remainingWeight = InventorySystem.getRemainingWeight();
    return Math.min(capacity, Math.floor(remainingWeight / unitWeight));
  }

  // ── Mutation: remove ─────────────────────────────────────

  /**
   * Remove up to `count` of `itemId`. Decrements from the highest-count
   * matching slot first. If the bag lacks enough, removes nothing and returns
   * `{ removed: false, actualCount: 0 }`. Empty entries are pruned.
   */
  static removeItem(itemId: string, count: number): RemoveResult {
    if (count <= 0) return { removed: false, actualCount: 0 };
    const have = InventorySystem.count(itemId);
    if (have < count) return { removed: false, actualCount: 0 };

    const inventory = InventorySystem.entries();
    let toRemove = count;

    // Sort matching slots by count descending; trim the fattest stacks first.
    const matching = inventory
      .filter((e) => e.itemId === itemId)
      .sort((a, b) => b.count - a.count);

    for (const entry of matching) {
      if (toRemove <= 0) break;
      const n = Math.min(entry.count, toRemove);
      entry.count -= n;
      toRemove -= n;
    }

    // Prune emptied entries in-place.
    const pruned = inventory.filter((e) => e.count > 0);
    if (SaveSystem.activeSave) SaveSystem.activeSave.player.inventory = pruned;

    InventorySystem.emitChange();
    return { removed: true, actualCount: count - toRemove };
  }

  // ── Mutation: move ───────────────────────────────────────

  /**
   * Move a stack from `fromSlot` to `toSlot`.
   *  - If both hold the same stackable itemId: merge up to maxStack.
   *  - Otherwise: swap the two slots' contents.
   *  - Empty target: relocate.
   * No-op (and returns false) if the source is empty or the slots are equal.
   */
  static moveItem(fromSlot: number, toSlot: number): boolean {
    if (fromSlot === toSlot) return false;
    const inventory = InventorySystem.entries();
    const from = inventory.find((e) => e.slot === fromSlot);
    if (!from) return false;
    const to = inventory.find((e) => e.slot === toSlot);

    if (to && to.itemId === from.itemId && ItemRegistry.stackable(from.itemId)) {
      // Merge, respecting maxStack; overflow stays in the source slot.
      const maxStack = ItemRegistry.maxStack(from.itemId);
      const room = maxStack - to.count;
      const n = Math.min(room, from.count);
      to.count += n;
      from.count -= n;
      const pruned = inventory.filter((e) => e.count > 0);
      if (SaveSystem.activeSave) SaveSystem.activeSave.player.inventory = pruned;
    } else {
      // Swap (or relocate into an empty slot).
      from.slot = toSlot;
      if (to) to.slot = fromSlot;
    }

    InventorySystem.emitChange();
    return true;
  }

  // ── Misc ─────────────────────────────────────────────────

  /** Sort the bag by item type, then rarity (high → low). Slot indices compacted. */
  static sort(): void {
    if (!SaveSystem.activeSave) return;
    const inventory = InventorySystem.entries();
    inventory.sort((a, b) => {
      const ta = ItemRegistry.type(a.itemId) ?? '';
      const tb = ItemRegistry.type(b.itemId) ?? '';
      if (ta !== tb) return ta < tb ? -1 : 1;
      const ra = InventorySystem.rarityRank(a.itemId);
      const rb = InventorySystem.rarityRank(b.itemId);
      if (ra !== rb) return rb - ra; // higher rarity first
      return a.itemId < b.itemId ? -1 : 1;
    });
    inventory.forEach((e, i) => { e.slot = i; });
    InventorySystem.emitChange();
  }

  /** Assign/unassign an inventory slot to a hotbar index (0-based). */
  static setHotbarSlot(hotbarIndex: number, slot: number | null): void {
    if (!SaveSystem.activeSave) return;
    const hb = SaveSystem.activeSave.player.hotbar;
    if (hotbarIndex < 0 || hotbarIndex >= hb.length) return;
    hb[hotbarIndex] = slot;
  }

  /** Clear the bag entirely (debug/reset). */
  static clearInventory(): void {
    if (!SaveSystem.activeSave) return;
    SaveSystem.activeSave.player.inventory = [];
    InventorySystem.emitChange();
  }

  private static rarityRank(itemId: string): number {
    const order: Record<string, number> = {
      common: 0, uncommon: 1, ember: 2, veilforged: 3, ancestral: 4,
    };
    return order[ItemRegistry.rarity(itemId)] ?? 0;
  }
}

/** Re-exported so callers can type equipment-slot-aware code. */
export type { EquipmentSlot };
