# Embergrove — Agent Operating Manual

## Stack (Immutable)

| Layer       | Technology              | Version |
|-------------|-------------------------|---------|
| Engine      | Phaser                  | 4.2.0   |
| Language    | TypeScript (strict)     | 5.6     |
| Bundler     | Vite                    | 5.4     |
| Unit Tests  | Vitest                  | 2.1     |
| E2E Tests   | Playwright              | 1.48    |
| Node Target | 20+                     | —       |
| Hosting     | Caddy (static)          | —       |

## Phaser 4 Rules (Non-Negotiable)

- ❌ **NO** Phaser 3 patterns: `pipelines`, `preFX`/`postFX`, `BitmapMask`, raw `setTint(0xff0000)`
- ✅ Use `gameObject.addFilter(...)` for ALL visual effects (unified Filter API)
- ✅ Tint: `setTintMode(Phaser.Display.TintModes.MULTIPLY)`
- ✅ Lighting: `sprite.setLighting(true)`
- ✅ Mass sprites → `SpriteGPULayer`; tilemaps → `TilemapGPULayer`
- ✅ Hollow Veil fog → `Stencil` game object

## Path Aliases

```
@scenes/*  → src/scenes/*
@systems/* → src/systems/*
@entities/* → src/entities/*
@data/*    → src/data/*
@ui/*      → src/ui/*
```

## PROSE Framework

All development follows **PROSE** constraints:

- **Plannable** — Every change gets a plan before code. One feature per PR.
- **Reviewable** — Max 400 LOC per file. PRs must be reviewable in one pass.
- **Observable** — Update `docs/LIFECYCLE.md` and `docs/PROMPTS-LOG.md` with every sprint.
- **Safe** — No runtime AI decisions. No telemetry without explicit approval.
- **Evolvable** — Schema versioning in SaveData. Migration path in SaveSystem.

## Lifecycle Gates

1. Before each sprint: update `docs/LIFECYCLE.md` with stage tracker.
2. After each PR: append entry to `docs/PROMPTS-LOG.md`.
3. Asset pipeline changes require re-indexing the asset registry.

## Workflow

- **One feature per PR** — Keep changes atomic.
- **Max 400 LOC/file** — Split large files early.
- **Human-in-the-loop stops**:
  - Any runtime AI (no autonomous decisions in-game)
  - Telemetry or analytics integration
  - Save format changes (requires migration + review)

## Key Files

- `src/data/Constants.ts` — All magic numbers live here.
- `src/data/types.ts` — TypeScript contracts (no `any`).
- `src/data/AssetRegistry.ts` — Declarative asset manifest.
- `src/systems/SaveSystem.ts` — LocalStorage save/load with 3 slots + backup.
- `docs/GDD.md` — Game Design Document.
- `docs/AI-USAGE-POLICY.md` — ISO 42001-lite AI governance.
- `docs/AIIA.md` — AI Impact Assessment.
- `docs/LIFECYCLE.md` — Sprint stage tracker.
- `docs/PROMPTS-LOG.md` — Prompt audit trail.
