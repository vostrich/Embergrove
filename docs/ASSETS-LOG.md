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
