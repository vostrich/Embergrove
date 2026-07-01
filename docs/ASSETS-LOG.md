# Assets Log — Embergrove

All assets used in Embergrove are tracked here. In Sprint 1, no external assets were downloaded; all elements rely on programmatically generated placeholder textures.

## Programmatic Placeholder Textures (Sprint 1)

The following textures are generated programmatically inside `PreloadScene.ts` as fallback placeholders:

| Texture Key | Resolution | Colors | Usage |
| :--- | :--- | :--- | :--- |
| `placeholder-cottage` | 64 × 64 px | Brown (`#6b3e1f` / `0x6b3e1f`) | Interactive Cottage building sprite |
| `placeholder-building` | 64 × 64 px | Grey (`#6b6b6b` / `0x6b6b6b`) | Smithy and Apothecary buildings (silhouetted with MULTIPLY) |
| `placeholder-tree` | 32 × 32 px | Dark Green (`#2d5b2d` / `0x2d5b2d`) | Outer map boundary tree obstacles rendered via `SpriteGPULayer` |
| `placeholder-rock` | 24 × 24 px | Grey (`#5b5b5b` / `0x5b5b5b`) | Outer map boundary rock obstacles rendered via `SpriteGPULayer` |
| `placeholder-grass-tile` | 16 × 16 px | Green (`#4a7c3e` / `0x4a7c3e`) | 2D array tilemap terrain texture |
| `ember-particle` | 4 × 4 px | Orange (`#ff8c42` / `0xff8c42`) | Animated particle emitter in MainMenuScene |
| `coin` | 16 × 16 px | Gold (`#ffd700` / `0xffd700`) | HUD Currency icon |
| `sun` | 24 × 24 px | Yellow (`#ffeb3b` / `0xffeb3b`) | HUD Time icon (Day/Dawn/Dusk phases) |
| `moon` | 24 × 24 px | Light Grey (`#d4d4d4` / `0xd4d4d4`) | HUD Time icon (Night phase) |

*Note: In Sprint 2 and onwards, these keys will gradually be replaced by real asset loaders from `public/assets/`.*

## Sprint 2 Additions

No external assets were downloaded. Additional programmatically generated placeholder textures were added in `PreloadScene.ts`:

| Texture Key | Resolution | Colors | Usage |
| :--- | :--- | :--- | :--- |
| `item-pickup` | 16 × 16 px | Amber (`#e8a54b` / `0xe8a54b`) | Ground loot pickup sprite (ItemPickup entity) |
| `blood-particle` | 4 × 4 px | Dark Red (`#8b0000` / `0x8b0000`) | Enemy hit blood particle burst (HitFeedbackSystem) |

### Existing Sprite Keys Used by Sprint 2 Entities

The following Sprint 1 placeholder textures are reused by the new Player and Enemy entities:

| Texture Key | Sprint 1 Usage | Sprint 2 Additional Usage |
| :--- | :--- | :--- |
| `player-idle` | Registered but unused | Player sprite (Idle state) |
| `player-run` | Registered but unused | Player sprite (Moving state, future animation) |
| `player-attack` | Registered but unused | Player sprite (Attacking state, future animation) |
| `player-dodge` | Registered but unused | Player sprite (Dodging state, future animation) |
| `veil-rat` | Registered but unused | VeilRat enemy entity |
| `hollow-wolf` | Registered but unused | HollowWolf enemy entity (Sprint 3 spawn) |
| `mist-wraith` | Registered but unused | MistWraith enemy entity |
| `ember-particle` | MainMenuScene background | HitFeedbackSystem particle bursts, death particles, pickup burst |
| `coin` | HUD gold icon | ItemPickup gold coin drops |

*Note: Sprite animations (walk/attack/hurt/dead per direction) are not yet implemented — entities render as static placeholder rectangles. Full spritesheet animation support planned for Sprint 3–4.*
