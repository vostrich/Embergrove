import type { Recipe, CraftingStation } from '@data/types';
import { InventorySystem } from '@systems/InventorySystem';
import { SaveSystem } from '@systems/SaveSystem';

/**
 * Crafting data + validation layer. Phaser-free and unit-testable.
 *
 * The full crafting UI, timer, and progress bar arrive in Sprint 6. For Sprint 3
 * this system only loads recipes and answers "can the player craft this?"
 * against inventory + level + station. {@link craft} is a stub that logs.
 */
export class CraftingSystem {
  private static recipes: Map<string, Recipe> = new Map();
  private static initialised = false;

  /** Populate the recipe registry from a parsed recipes.json payload. */
  static init(recipes: Recipe[]): void {
    CraftingSystem.recipes.clear();
    for (const recipe of recipes) {
      CraftingSystem.recipes.set(recipe.id, recipe);
    }
    CraftingSystem.initialised = true;
  }

  static isInitialised(): boolean {
    return CraftingSystem.initialised;
  }

  static reset(): void {
    CraftingSystem.recipes.clear();
    CraftingSystem.initialised = false;
  }

  static get(recipeId: string): Recipe | null {
    return CraftingSystem.recipes.get(recipeId) ?? null;
  }

  static all(): Recipe[] {
    return Array.from(CraftingSystem.recipes.values());
  }

  /**
   * Recipes offered at `station` whose required level the player has reached.
   * Does NOT check ingredient availability (use {@link canCraft} for that).
   */
  static getAvailableRecipes(station: CraftingStation, playerLevel?: number): Recipe[] {
    const level = playerLevel ?? SaveSystem.activeSave?.player.stats.level ?? 1;
    return CraftingSystem.all().filter(
      (r) => r.station === station && level >= r.requiredLevel
    );
  }

  /**
   * True if the player can craft `recipeId` right now: the recipe exists, its
   * station matches, the player meets the level requirement, and the bag holds
   * every ingredient in the required quantity.
   */
  static canCraft(
    recipeId: string,
    playerLevel?: number,
    station?: CraftingStation
  ): boolean {
    const recipe = CraftingSystem.get(recipeId);
    if (!recipe) return false;
    if (station !== undefined && recipe.station !== station) return false;

    const level = playerLevel ?? SaveSystem.activeSave?.player.stats.level ?? 1;
    if (level < recipe.requiredLevel) return false;

    return recipe.ingredients.every(
      (ing) => InventorySystem.count(ing.itemId) >= ing.count
    );
  }

  /**
   * Stub. The real craft (consume ingredients, spawn output, progress timer)
   * ships in Sprint 6 alongside the crafting UI. For now it only validates and
   * logs so the wiring is observable.
   */
  static craft(recipeId: string): boolean {
    if (!CraftingSystem.canCraft(recipeId)) {
      console.warn(`[Crafting] Cannot craft "${recipeId}" — missing requirements.`);
      return false;
    }
    const recipe = CraftingSystem.get(recipeId);
    console.log(
      `[Crafting] "${recipe?.outputId}" queued — crafting UI coming Sprint 6.`
    );
    return true;
  }
}
