# VitaeWorld · Procedural Interiors Lab

Experimental, browser-first 3D world. This repository is **independent of the older Vitae Hotel test**.

The current prototype has six connected room types in a shared building, seed-based assignment, doorway and furniture collision footprints, first-person / third-person cameras, a stylized CC0 GLB avatar, an alternate animated stylized avatar, a top-down minimap, mobile controls, and imported Kenney CC0 GLB furniture. Room geometry is created in Three.js; GLB objects are fetched from revision-pinned public URLs with local fallbacks.

## Run

Requires Node.js 20.19+ and npm:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify layout tests and build:

```bash
npm test
npm run build
npm run preview
```

A Vite build emits `dist/`, which can be deployed to Vercel, Netlify or other static hosting. External character/furniture models require Internet access.

## Controls

**Desktop:** WASD or arrow keys to move; mouse drag or **Capture Mouse** to orbit/look; Shift to sprint; **V** to switch first/third-person; **R** to regenerate; Escape to release pointer lock. In third person the avatar maintains its heading when idle, regardless of camera orbit.

**Mobile:** left joystick moves; drag the main scene to look around; the **CAM** button changes perspective.

Use the seed input and **Generate Interior** to repeat a deterministic room arrangement. **Change Avatar** toggles between licensed stylized placeholder characters; **Change Material Palette** changes room colours.

## Architecture

- `src/layout.js`: reproducible rooms, layouts, walls, prop recipes, collisions.
- `src/world.js`: 3D architectural meshes, material palettes, lighting.
- `src/assets.js`: GLB cache, real model loading, normalisation, fallback assets.
- `src/controls.js`: movement, first/third-person cameras, touch controls.
- `src/main.js`: UI, mini-map, lifecycle and render loop.
- `tests/`: invariant tests.

**Current limitation:** seed variation rearranges six predesigned room recipes on a fixed footprint; this is not yet arbitrary building synthesis. Character locomotion, room subdivision, navigation/physics, new floor plans and street/city generation follow after the interior experiment is stable.

See [ASSETS.md](ASSETS.md) for licensing/provenance and [architecture notes](docs/ARCHITECTURE.md) for the roadmap.