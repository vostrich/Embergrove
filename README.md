# 🔥 Embergrove: The Hollow Veil

A 2D top-down action-RPG set in a world consumed by supernatural fog.
Built with Phaser 4, TypeScript, and Vite.

## Stack

| Technology | Version | Purpose          |
|------------|---------|------------------|
| Phaser     | 4.2.0   | Game engine      |
| TypeScript | 5.6     | Language (strict) |
| Vite       | 5.4     | Bundler          |
| Vitest     | 2.1     | Unit tests       |
| Playwright | 1.48    | E2E tests        |

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command       | Description                   |
|---------------|-------------------------------|
| `npm run dev`     | Start dev server (port 5173) |
| `npm run build`   | Type-check + production build |
| `npm run preview` | Preview production build      |
| `npm test`        | Run unit tests                |
| `npm run test:e2e`| Run E2E tests with Playwright  |

## Project Structure

```
src/
├── main.ts              # Phaser game config + entry point
├── data/
│   ├── Constants.ts      # All magic numbers and config
│   ├── types.ts          # TypeScript type contracts
│   └── AssetRegistry.ts  # Declarative asset manifest
├── scenes/
│   ├── BootScene.ts      # Boot → Preload transition
│   ├── PreloadScene.ts   # Asset loading with progress bar
│   ├── MainMenuScene.ts   # Title screen
│   ├── EmberCottageScene.ts # Starting area
│   └── UIScene.ts        # HUD overlay
└── systems/
    └── SaveSystem.ts     # 3-slot save + backup recovery
```

## Documentation

- [Game Design Document](docs/GDD.md)
- [AI Usage Policy (ISO 42001-lite)](docs/AI-USAGE-POLICY.md)
- [AI Impact Assessment](docs/AIIA.md)
- [Lifecycle Tracker](docs/LIFECYCLE.md)
- [Prompts Audit Log](docs/PROMPTS-LOG.md)

## Credits

- **Engine**: [Phaser 4 "Giedi"](https://phaser.io)
- **Built with**: GLM-5.2
- **License**: MIT
