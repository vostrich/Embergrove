import type { EquipmentSlot, Item, Stats } from '@data/types';
import { ItemType } from '@data/types';
import { SaveSystem } from '@systems/SaveSystem';
import { ItemRegistry } from '@systems/ItemRegistry';
import { InventorySystem } from '@systems/InventorySystem';
import { EVENTS } from '@data/Constants';

const EQUIP_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'charm', 'lantern'];

/** Map an item type to its equipment slot, or null if not equippable. */
export function equipSlotForType(type: ItemType): EquipmentSlot | null {
  switch (type) {
    case ItemType.Weapon: return 'weapon';
    case ItemType.Armor: return 'armor';
    case ItemType.Charm: return 'charm';
    case ItemType.Lantern: return 'lantern';
    case ItemType.Accessory: return 'charm'; // legacy accessories → charm
    default: return null;
  }
}

/**
 * Equipment manager. Operates on `SaveSystem.activeSave.player.equipment`.
 * Phaser-free and unit-testable.
 *
 * Equip/unequip shuffle items between the inventory (via InventorySystem) and
 * the four equipment slots, then recalc aggregated stats and broadcast
 * {@link EVENTS.EQUIPMENT_CHANGED}.
 *
 * The aggregated stats = base stats (SaveData.player.stats) + the summed
 * Partial<Stats> from every equipped item. Base stats are never mutated here;
 * the scene reads `getAggregatedStats()` and applies it to the Player entity.
 */
export class EquipmentSystem {
  private static emitter: { emit: (event: string, payload?: unknown) => void } | null = null;

  static setEventEmitter(
    emitter: { emit: (event: string, payload?: unknown) => void } | null
  ): void {
    EquipmentSystem.emitter = emitter;
  }

  private static emitChange(): void {
    EquipmentSystem.emitter?.emit(EVENTS.EQUIPMENT_CHANGED);
  }

  static equipment(): { weapon: string | null; armor: string | null; charm: string | null; lantern: string | null } {
    return SaveSystem.activeSave?.player.equipment ?? {
      weapon: null, armor: null, charm: null, lantern: null,
    };
  }

  /** itemId equipped in `slot`, or null. */
  static getEquippedId(slot: EquipmentSlot): string | null {
    return EquipmentSystem.equipment()[slot] ?? null;
  }

  /** Materialise the item equipped in `slot`, or null. */
  static getEquippedItem(slot: EquipmentSlot): Item | null {
    const id = EquipmentSystem.getEquippedId(slot);
    return id ? ItemRegistry.asItem(id, 1) : null;
  }

  /**
   * Equip `itemId` (taken from the inventory) into `slot`.
   *  - Any currently-equipped item is unequipped back into the bag first
   *    (respecting weight; if it does not fit, the equip is refused).
   *  - Removes one of the item from the inventory.
   * Returns true on success.
   */
  static equip(slot: EquipmentSlot, itemId: string): boolean {
    if (!SaveSystem.activeSave) return false;
    if (!ItemRegistry.has(itemId)) return false;
    if (InventorySystem.count(itemId) <= 0) return false;

    // Refuse if the item's type doesn't belong in this slot.
    const type = ItemRegistry.type(itemId);
    if (type && equipSlotForType(type) !== slot) return false;

    // Unequip whatever is currently in the slot, ensuring room.
    const current = EquipmentSystem.getEquippedId(slot);
    if (current !== null) {
      const putBack = InventorySystem.addItem(current, 1);
      if (putBack.remaining > 0) {
        // Couldn't fit the old item back — roll back and abort.
        InventorySystem.removeItem(current, 1 - putBack.remaining);
        return false;
      }
    }

    // Take one of the new item out of the bag and into the slot.
    const removed = InventorySystem.removeItem(itemId, 1);
    if (!removed.removed) {
      // Roll back the unequip if we couldn't consume the source.
      if (current !== null) {
        InventorySystem.removeItem(current, 1);
        SaveSystem.activeSave.player.equipment[slot] = current;
      }
      return false;
    }

    SaveSystem.activeSave.player.equipment[slot] = itemId;
    EquipmentSystem.emitChange();
    return true;
  }

  /**
   * Move the item in `slot` back into the bag.
   * Returns false if there's nothing equipped or the bag can't accept it.
   */
  static unequip(slot: EquipmentSlot): boolean {
    if (!SaveSystem.activeSave) return false;
    const id = EquipmentSystem.getEquippedId(slot);
    if (id === null) return false;

    const added = InventorySystem.addItem(id, 1);
    if (added.remaining > 0) return false; // weight/full

    SaveSystem.activeSave.player.equipment[slot] = null;
    EquipmentSystem.emitChange();
    return true;
  }

  /**
   * Sum base stats + every equipped item's Partial<Stats>. Does not mutate
   * SaveData. HP/stamina/mana are clamped to their aggregated maxima so a
   * defense/HP-heavy loadout can't leave current > max.
   */
  static getAggregatedStats(): Stats {
    const base = SaveSystem.activeSave?.player.stats;
    if (!base) {
      return {
        hp: 0, maxHp: 0, stamina: 0, maxStamina: 0, mana: 0, maxMana: 0,
        attack: 0, defense: 0, speed: 0, luck: 0,
        level: 1, xp: 0, xpToNext: 0,
      };
    }

    const agg: Stats = { ...base };
    for (const slot of EQUIP_SLOTS) {
      const id = EquipmentSystem.getEquippedId(slot);
      if (!id) continue;
      const partial = ItemRegistry.stats(id);
      for (const key of Object.keys(partial) as (keyof Stats)[]) {
        const v = partial[key];
        if (typeof v === 'number') {
          (agg[key] as number) = (agg[key] as number) + v;
        }
      }
    }

    // Affixes also contribute their stat values.
    for (const slot of EQUIP_SLOTS) {
      const item = EquipmentSystem.getEquippedItem(slot);
      if (!item) continue;
      for (const affix of item.affixes) {
        const key = affix.stat as keyof Stats;
        if (key in agg && typeof agg[key] === 'number') {
          (agg[key] as number) = (agg[key] as number) + affix.value;
        }
      }
    }

    // Clamp current pools to aggregated maxima.
    agg.hp = Math.min(agg.hp, agg.maxHp);
    agg.stamina = Math.min(agg.stamina, agg.maxStamina);
    agg.mana = Math.min(agg.mana, agg.maxMana);
    return agg;
  }
}
