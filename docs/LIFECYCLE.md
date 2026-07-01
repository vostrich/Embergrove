# Lifecycle Tracker — Embergrove

## Stage Tracker

| Stage          | Status    | Branch | Version  | Date       |
|----------------|-----------|--------|----------|------------|
| Sprint 0       | Complete  | dev    | v0.1.0   | 2026-06-30 |
| Sprint 1       | Complete  | dev    | v0.2.0   | 2026-06-30 |
| Sprint 2       | Complete  | dev    | v0.3.0   | 2026-07-01 |
| Sprint 3       | Planned   | —      | —        | TBD        |
| Alpha Release  | Planned   | main   | v0.5.0   | TBD        |
| Beta Release   | Planned   | main   | v0.9.0   | TBD        |
| v1.0 Release   | Planned   | main   | v1.0.0   | TBD        |

## Sprint 0 Summary

- **Scope**: Project bootstrap — scaffolding, config, types, save system, docs.
- **Outcome**: Full project structure with Phaser 4 + TypeScript + Vite.
- **Files Created**: See bootstrap commit for full list.
- **Issues**: None.

## Sprint 1 Summary

- **Scope**: Cottage Scene, Day/Night system, Main Menu, Pause menu, UI HUD, placeholder assets.
- **Outcome**: Fully interactive environment with active save session state, camera overlay filters, stenciled fog, collidable physics zone layers, and UI HUD overlays.
- **Files Created/Modified**: src/scenes/EmberCottageScene.ts, src/systems/DayNightSystem.ts, src/scenes/MainMenuScene.ts, src/scenes/PauseScene.ts, src/scenes/UIScene.ts, src/main.ts, src/scenes/PreloadScene.ts.
- **Issues**: None.

## Sprint 2 Summary

- **Scope**: Player entity with state machine, CombatSystem (damage formula + knockback + parry), Enemy base class with 3 archetypes (VeilRat, HollowWolf, MistWraith), EnemySpawner with respawn + night scaling, HitFeedbackSystem (damage numbers, shake, particles), LootSystem + ItemPickup with magnet pickup, EnemyHealthBar, SaveSystem.awardXp level-up stub, unit tests.
- **Outcome**: Full combat loop — player can move, dodge, attack (light/heavy), parry; enemies chase/attack/kite; loot drops; XP awards on kill; hit feedback plays. Sprint 1 cottage scene fully preserved.
- **Files Created/Modified**: src/entities/Player.ts, src/entities/Enemy.ts, src/entities/EnemyHealthBar.ts, src/entities/ItemPickup.ts, src/entities/enemies/VeilRat.ts, src/entities/enemies/HollowWolf.ts, src/entities/enemies/MistWraith.ts, src/systems/CombatSystem.ts, src/systems/EnemySpawner.ts, src/systems/HitFeedbackSystem.ts, src/systems/LootSystem.ts, src/systems/SaveSystem.ts, src/data/Constants.ts, src/data/types.ts, src/scenes/EmberCottageScene.ts, src/scenes/PreloadScene.ts, tests/unit/CombatSystem.test.ts, tests/unit/SaveSystem.test.ts, docs/LIFECYCLE.md, docs/PROMPTS-LOG.md, docs/AIIA.md, docs/ASSETS-LOG.md.
- **Issues**: None.

## Release Ledger

| Version          | Tag                 | Branch | Date       | Notes                    |
|------------------|---------------------|--------|------------|--------------------------|
| v0.1.0-bootstrap | v0.1.0-bootstrap    | dev    | 2026-06-30 | Initial project scaffold |
| v0.2.0-sprint1   | v0.2.0-sprint1      | dev    | 2026-06-30 | Sprint 1 Cottage Scene   |
| v0.3.0-combat    | v0.3.0-combat       | dev    | 2026-07-01 | Sprint 2 Combat System  |
