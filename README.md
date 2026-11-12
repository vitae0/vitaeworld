# VitaeWorld | Architecture Lab 07

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

## Lab 07 — First-class corridors and connected storeys

The playable prototype now calls `generateBuilding(seed,style,2)` instead of
building only one floor. The original `generateLayout` remains available as a
standalone *single-floor* grammar (and for existing regression tests).

### 1. Corridors are rooms

`src/circulation.js` partitions the connected public circulation network
into actual `Room` records with unique floor-local IDs, `corridor`, `lobby`
and `landing` semantic room types, occupied cells, floor index, area,
decorations and a visual identity. Corridor floors reference those room IDs
directly in the minimap and scene. The old `grid===0` routing mask remains
intact for the doorway and wall solver, while `zoneGrid` is the canonical
room lookup used by the HUD and decoration engine. No walls are erected
between two adjacent passage zones.

Circulation rooms get wall art, sconces, shelves and lightweight runner
rugs. Their walking zones contain **no solid floor furniture**, and door/
stair approaches cannot receive rugs.

### 2. Two storeys with real stairs

`src/building.js` creates two furnished, independently seeded storeys
using the same architectural family and connected corridor backbone.
`src/stairs.js` selects a seven-cell straight hallway flight with safe
approaches, reserves a matching shaft, and supplies a continuous ramp
height field. `src/stair-visuals.js` draws twenty treads plus side rails.

The lower ceiling and upper floor are cut at the flight. Player movement
uses the ramp ground height and floor-specific collision masks, so walking
forward genuinely climbs to the next level and walking back descends.
The player starts on the lower landing; the HUD and minimap automatically
switch floor when climbing. Keyboard and touch joystick use the same logic.

A one-storey building is still supported through
`generateBuilding(seed,style,1)`. More than two floors require a future
stacked or alternate-flight stairwell design; they are intentionally not
silently generated on top of the same flight.

`tests/building.test.mjs` covers hallway room IDs and semantics, shaft
holes, landing access, and continuous ascent/descent for every architecture
style. Actual browser visual inspection of imported assets and mobile frame
times is still separate from geometric unit tests.

## Interior character pass (Lab 06)

**Scope remains the interior generator.** This version aims for smaller, more
believable rooms with a coherent, lived-in visual language rather than bigger
empty exhibition halls.

- The grid cell size is now **1.26 m** (previously 1.30 m), so the same
  floorplan uses approximately 6% less floor area; compact and wing layouts
  also attempt smaller connected parcels. Splits require at least ten cells
  per side, preventing unusable closets from being assigned large furniture.
- A seeded **building-wide design language** ties the colours and accents of
  neighbouring rooms together. Individual rooms occasionally vary it.
- `src/decor.js` generates wall-mounted artwork, shelves and sconces,
  plus small tabletop objects (books, candles, vases, dishes, pencils and
  plants). Wall anchors avoid door throats and cut corners. Surface objects
  must fit their actual parents and pass height-aware collision checks.
- `src/decor-visuals.js` renders all procedural decorations in **four
  instanced draw-call batches**, without fetching extra decorative GLB files.
- Furniture physics remain distinct from dressing: decorations do not
  mysteriously block passage. `layout.decorations`, `room.decorMood` and
  `room.decorationCount` are inspectable results.
- The material palettes and scene lighting are warmer and less fluorescent.
  The object counter includes both 3D furniture assets and decorations.

Use `npm test` to run the existing layout/nav checks plus
`tests/decor.test.mjs` for support, doorway, geometry and determinism
regressions. Visual composition and downloaded mesh orientation still need
browser-based inspection before claiming photorealism.

## Interior quality pass (Lab 05)

The current scope is **interiors only**: it generates walkable building floorplans
and furnishes their rooms. It does not stream a city or generate an exterior world.

- **Room-specific furnishing:** optional objects obey a room-role allowlist; a
  generic style affinity cannot populate a bathroom with unrelated electronics.
- **Real volumes:** non-rug 3D furniture and accessories cannot overlap, even
  when an accessory has no physics collider. Flat rugs may sit beneath furniture.
- **Supported accessories:** monitors, lamps, mirrors and small tabletop objects
  are checked against the **rotated dimensions** of their actual support, room
  ownership and other objects. Their vertical placement is above the support,
  not intersecting it.
- **Walkable composition:** a fast, coarse navigation grid guides furniture
  placement. A 4×4-per-cell grid checks each completed room; optional floor
  objects are removed if they create inaccessible pockets. A room-level
  `accessibility` ratio and a `qualityReport` are returned with the layout.
- **Architectural composition:** wide room functions prefer suitable parcels;
  narrow lounges place seating/screens toward end walls and hooked studio rooms
  keep workstations away from corridor chokepoints.
- **Determinism:** the same seed + building style yields the same interior.

`src/interior-quality.js` has standalone geometry/navigation checks, with
regressions in `tests/interior-quality.test.mjs`. The validation is conservative
2D/height-box approximation; inspecting actual GLB silhouettes and shadows
still requires a browser/asset audit.

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
