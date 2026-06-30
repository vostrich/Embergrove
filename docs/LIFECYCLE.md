# Lifecycle Tracker — Embergrove

## Stage Tracker

| Stage          | Status    | Branch | Version  | Date       |
|----------------|-----------|--------|----------|------------|
| Sprint 0       | Complete  | dev    | v0.1.0   | 2026-06-30 |
| Sprint 1       | Complete  | dev    | v0.2.0   | 2026-06-30 |
| Sprint 2       | Planned   | —      | —        | TBD        |
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

## Release Ledger

| Version          | Tag                 | Branch | Date       | Notes                    |
|------------------|---------------------|--------|------------|--------------------------|
| v0.1.0-bootstrap | v0.1.0-bootstrap    | dev    | 2026-06-30 | Initial project scaffold |
| v0.2.0-sprint1   | v0.2.0-sprint1      | dev    | 2026-06-30 | Sprint 1 Cottage Scene   |
