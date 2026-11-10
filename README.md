# VitaeWorld | Semantic Architecture Lab 02

**A browser-first 3D world prototype** with reproducible, deliberately varied interiors. This repository is independent of the earlier Vitae Hotel tests.

**Live site (GitHub Pages, when Pages is enabled):** https://vitae0.github.io/vitaeworld/

## What's implemented

- A procedural **serpentine corridor** with varying turns, a widened hub, side branches, architectural recesses and small courtyard voids.
- Six connected rooms chosen from **11 manually designed archetypes**, with variable irregular footprints, sizes and facade setbacks. The room types are no longer confined to six fixed boxes.
- A **40-dimensional, hand-scored semantic feature vector for each of 61 CC0 furniture models**. Each room type has its own independent 40-D target profile.
- Deterministic room selection and placement. Required items establish a usable core; optional props are scored for semantic similarity, role diversity and spatial compatibility. Wall and centre anchors, real bounding footprints, door clearance, non-overlap and furniture companions constrain the result.
- Furnishings come from Kenney CC0 GLBs. Two CC0 stylized character prototypes, keyboard and touch controls, first/third person camera, and an accurate room-shape minimap.
- Instanced floors, ceilings, walls and trim for lower 3D draw-call overhead.
- Regression tests across 46 seeds for connectivity, room essentials and collisions.

This is **constraint-guided procedural generation**, not a trained generative neural network. Seed randomness chooses among valid options, never replaces furniture compatibility rules.

## Run locally

Node.js 20.19+ and npm:

```bash
npm install
npm run dev
npm test
npm run build
```

**Desktop:** WASD or arrows to move; mouse drag / Capture Mouse to look; Shift sprint; V first/third person; R regenerate; Escape release pointer lock. **Mobile:** left joystick, swipe to look and CAM to switch view.

Enter an arbitrary seed and press **Generate Interior**. The same seed regenerates the same building, irrespective of device or order of previous seeds.

## How to change the design without AI

The key data file is [`src/semantics.js`](src/semantics.js). To change a room's personality, edit the `traits` map in `ROOM_TYPES`. To change how an item is used, edit its record in `FURNITURE`:

```js
// A lounge chair is not just "a random chair".
asset('loungechair',0.98,0.99,0.98,'corner','chair',
  {lounge:3,recovery:2,soft:2,quiet:2})
```

`src/layout.js` handles floor plans, scoring, room connectivity, wall generation, candidate placements and collisions. `src/world.js` only renders the resulting layout. `src/assets.js` handles GLB loading/caching. No hardcoded positions are required to add another room theme. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for exact algorithms.

## Caveats / next milestones

- Irregular geometry is currently built from a two-metre occupancy grid, not freeform polygon or curved walls.
- The building is a single storey. Doors are open structural gaps; no moving door physics or stairs.
- Paths around furniture are validated at door entries and by collision footprints, but full object-level navmesh verification is a future upgrade.
- Semantic vectors are human-authored heuristics: their dimensions and values can be adjusted and need playtesting.
- Assets are currently fetched from pinned public CC0 GLB sources. Self-hosted, precompressed meshes are a later production step.
- The 3D browser interaction still needs visual testing across real devices even when automated builds pass.

## Licensing

See [`ASSETS.md`](ASSETS.md) for external models and CC0 provenance.
