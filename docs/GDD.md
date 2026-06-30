# Embergrove: The Hollow Veil — Game Design Document

## Pitch

A 2D top-down action-RPG set in a world where a supernatural fog called the **Hollow Veil** is slowly consuming everything. You play as the last ember-bearer — a person who can wield a dying ember to push back the mist, fight veil-twisted creatures, and rebuild what was lost.

## Genre

Top-down Action RPG with survival and settlement-building elements.

## Core Loop

1. **Explore** — Navigate mist-covered regions using your ember lantern.
2. **Fight** — Real-time combat with light/heavy attacks, dodge, and parry.
3. **Gather** — Collect ember-shards, materials, and loot from enemies.
4. **Rebuild** — Return to safe zones to upgrade equipment and restore structures.
5. **Uncover** — Progress the story across 7 chapters to reveal the origin of the Hollow Veil.

## Story Outline — 7 Chapters

### Ch. 1: Ember Cottage
Awaken in your grandmother's cottage. The mist has crept closer overnight. Grandma Elara gives you a rusted blade and an ember lantern. First quest: deliver her letter to the old smithy.

### Ch. 2: The Old Road
Navigate the overgrown path to the smithy. Encounter veil-rats and hollow wolves. Meet Marrow, the displaced smith. Learn the basics of ember crafting.

### Ch. 3: Mist Hollow
The first major dungeon. Mist wraiths ambush from the fog. Find the source of a local mist pocket and seal it with ember magic.

### Ch. 4: The Forgotten Village
Discover a village frozen in time by the Veil. Free trapped NPCs, rebuild the forge, and unlock the skill tree.

### Ch. 5: The Marsh
Treacherous swampland with marsh maws and environmental hazards. Recover the ember core from a sunken temple.

### Ch. 6: The Hollow King's Domain
The Veil is thickest here. Elite enemies, complex puzzles, and the truth about the ember-bearers.

### Ch. 7: The Last Ember
Final confrontation. Use everything you've gathered to push back the Veil once and for all — or succumb to it.

## Key Systems

- **Combat**: Light/heavy attacks, dodge roll with i-frames, parry with stun window.
- **Day/Night Cycle**: 20-minute day. Enemies grow stronger at night; some only appear in darkness.
- **Skill Tree**: Branching paths for combat, survival, and ember magic.
- **Equipment**: Weapons, armor, accessories with rarity tiers and affixes.
- **Quest System**: Story quests + optional exploration quests.
- **Save System**: 3 save slots with auto-backup and schema migration.
- **Hollow Veil Fog**: Stencil-based fog that limits visibility and forces exploration.
- **Settlement Rebuilding**: Restore structures to unlock new services.

## Rarity Tiers

| Tier        | Color   | Description                              |
|-------------|---------|------------------------------------------|
| Common      | Silver  | Basic items, no special properties       |
| Uncommon    | Green   | Slight stat bonuses                      |
| Ember       | Orange  | Ember-infused, glow effects              |
| Veilforged  | Purple  | Forged in the Veil, unique affixes      |
| Ancestral   | Gold    | Legendary relics from before the Veil    |

## Out of Scope (v1.0)

- Multiplayer / co-op
- Procedural generation
- Mobile touch controls
- In-game purchases or monetization
- Modding API
- Voice acting (text-only dialogue)

## Target Platform

- Web (desktop browsers, Chrome/Firefox/Edge)
- Deployed at embergrove.ainyubi.com
