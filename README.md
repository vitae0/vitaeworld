# VitaeWorld | Architecture Lab 04

Playable browser-first 3D procedural interiors project, separate from previous Vitae Hotel tests.

**Live prototype:** https://vitae0.github.io/vitaeworld/

## Architecture selection

A new **Building Architecture** dropdown controls the building family. **Auto** chooses a deterministic family from the world seed; any explicit choice regenerates that family with the same seed.

| Style | Layout | Typical room count |
| --- | --- | ---: |
| **Compact Residence** (`compact`) | Small footprint and short cross circulation | 8 |
| **Central Atrium** (`central`) | Large shared lobby and cross-connected wings | 16 |
| **Urban Grid** (`grid`) | Intersecting corridor grid, repeatable parcels | 18 |
| **Courtyard Loop** (`courtyard`) | Looping routes around an open-air courtyard | 17 |
| **Connected Wings** (`branched`) | Cross-links and lateral wings with secondary loops | 12 |

Room counts reflect the current grammar and may change if its parameters are tuned. Rooms inherit functional definitions from 11 room archetypes; corridors, setbacks, entrances and 45° wall chamfers are generated independently from their furnishings.

The floor plan uses a 25×19 occupancy grid of 1.3m cells. Room splitting validates corridor access and component connectivity; furniture placement validates the actual cell ownership of **the complete furniture footprint**, not simply the room bounding box.

## Furniture orientation, not just position

61 CC0 furniture models use editable **40D function vectors** to decide *what fits a room* and **16D placement vectors** to decide *where it belongs*. Relational constraints pair chairs with tables, seating with screens, bedside lamps with tables, and electronics with desks. Candidate direction is now evaluated on all four cardinal angles for directional centre furniture, with a separate score for looking toward a relevant object.

A new `src/orientation.js` defines the canonical world-facing vector as **-Z**. Imported Kenney GLBs can use another local facing axis, so `src/assets.js` applies a model-native compensation in a child transform, keeping the computed placement yaw, collision footprints and minimap aligned. Per-model correction hooks are intentionally centralized. **The +Z asset-front baseline is an assumption requiring visual validation against the original meshes**, not a claim that every one of the 61 models has been individually audited.

## Try it

Requires Node.js 20.19+ and npm:

```sh
npm install
npm run dev
npm test
npm run build
```

**Desktop:** WASD / arrows move, mouse drag / Capture Mouse to look, Shift sprint, V first/third person, R new seed, Escape release cursor. **Touch:** joystick + drag-to-look + CAM.

## Modules

- `src/topology.js` — five independently selectable architectural grammars, corridor graphs, room division, doorway selection, 45° walls.
- `src/semantics.js` — 40D room and furniture features and 16D spatial preferences.
- `src/placement.js` — candidate positions, actual-room occupancy checks, companion targets, facing constraints and collision checks.
- `src/orientation.js` — yaw and facing conventions plus asset-space compensation.
- `src/layout.js` — deterministic public API `generateLayout(seed, type='auto')`.
- `src/world.js` — Three.js instanced floors, walls, trim and lighting.
- `src/assets.js` — revision-pinned CC0 asset loading, normalization and fallback.
- `src/controls.js`, `src/main.js` — player and UI.
- `tests/layout.test.mjs` — per-style doorway/loop/placement/facing regressions.

More implementation details are in [Architecture](docs/ARCHITECTURE.md) and external licenses in [Asset Registry](ASSETS.md).

## Unfinished areas

The room footprints remain cell-based, with a limited number of true 45° corners. GLB model orientation needs in-browser visual inspection for any asset-native exceptions. This is not a complete navigation mesh or collision physics engine; multi-storey buildings, interaction systems, assets packaged locally, exterior city blocks and multiplayer remain future work.
