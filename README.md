# VitaeWorld | Architecture Lab 11

Playable browser-first 3D procedural interiors project, separate from previous Vitae Hotel tests.

**Live prototype:** https://vitae0.github.io/vitaeworld/

## Lab 11 — Externally trained room-layout placement model

**Actual training complete.** We downloaded the CC BY 4.0
[FloorplanQA-Layouts](https://huggingface.co/datasets/OldDelorean/FloorplanQA-Layouts)
repository at revision `9ffb74c1c158104fa302baea8e18087d31906bcd`,
sparse-checking out only **1,800 synthetic bedroom, living-room and kitchen
JSON plans**. No HSSD-derived layouts were trained on, and no source
images/JSON layouts are shipped to players.

The dependency-free Python trainer `scripts/train-layout-priors.py`
fitted **16 conditional 2D Gaussian mixtures** for common room/object
categories: 1,447 training rooms, 353 held-out rooms, 6,359 training
objects, and 1,521 held-out objects. Held-out mean log density is
**+0.07492** compared with 0 for a uniform unit-square baseline. This
is modest evidence of predictive structure, **not** a player-preference
study or proof of superior aesthetic layout.

`model/layout-priors.json` is the checked-in trained parameter file,
`model/layout-metrics.json` reports the holdout results, and
`src/learned-layout.js` applies only a bounded **-0.22 to +0.24**
candidate-placement bias. All existing door, obstacle, boundary,
accessibility, and 5:3 room rules remain authoritative.

The first model learns **where furniture tends to go within a room**.
It does not generate building graphs, infer 3D meshes or predict correct
furniture front directions. The V0.2–V0.4 active development priorities
are documented in [ROADMAP](docs/ROADMAP_V02_V04.md).

## Architecture selection

A new **Building Architecture** dropdown controls the building family. **Auto** chooses a deterministic family from the world seed; any explicit choice regenerates that family with the same seed.

| Style | Layout | Typical room count |
| --- | --- | ---: |
| **Compact Residence** (`compact`) | Small footprint and short cross circulation | 8 |
| **Central Atrium** (`central`) | Large shared lobby and cross-connected wings | 16 |
| **Urban Grid** (`grid`) | Intersecting corridor grid, repeatable parcels | 18 |
| **Courtyard Loop** (`courtyard`) | Looping routes around an open-air courtyard | 17 |
| **Connected Wings** (`branched`) | Cross-links and orthogonal compact wing parcels | 8 |

Room counts reflect the current grammar and may change if its parameters are tuned. Rooms inherit functional definitions from 11 room archetypes; corridors, setbacks, entrances and orthogonal wall partitions are generated independently from their furnishings.

The floor plan uses a 25×19 occupancy grid of 1.26m cells. Room splitting validates corridor access and component connectivity; furniture placement validates the actual cell ownership of **the complete furniture footprint**, not simply the room bounding box.

## Furniture orientation, not just position

81 CC0 furniture models use editable **40D function vectors** to decide *what fits a room* and **16D placement vectors** to decide *where it belongs*. Relational constraints pair chairs with tables, seating with screens, bedside lamps with tables, and electronics with desks. Candidate direction is now evaluated on all four cardinal angles for directional centre furniture, with a separate score for looking toward a relevant object.

A new `src/orientation.js` defines the canonical world-facing vector as **-Z**. Imported Kenney GLBs can use another local facing axis, so `src/assets.js` applies a model-native compensation in a child transform, keeping the computed placement yaw, collision footprints and minimap aligned. Per-model correction hooks are intentionally centralized. **The +Z asset-front baseline is an assumption requiring visual validation against the original meshes**, not a claim that every one of the 61 models has been individually audited.

## Lab 10 — Actual CC0 fixture meshes and furniture-direction QA

The scene now uses **20 additional real Kenney furniture variants**, such
as alternate sofas/chairs, benches, storage, sinks, kitchen appliances,
coffee tables, a doormat and updated stools. The source catalog at the
**exact revision already pinned in `src/assets.js`** contains all 81
referenced furniture models; no asset names are guessed.

Three more verified Kenney models drive wall/ceiling lighting:
`lampwall`, `lampsquareceiling` and `ceilingfan`.
`src/fixture-assets.js` groups identical fixtures into actual
`THREE.InstancedMesh` draw calls, caches GLBs and preserves the previous
procedural lamps whenever a fetch fails. Large custom chandeliers,
track lights and pendant designs retain procedural geometry rather
than being falsely identified as one of these GLBs.

**Final facing pass:** `src/orientation-pass.js` finds nearest semantic
partners (sofa/TV, dining chair/table, desk chair/desk) and considers
cardinal rotations after all furniture has been placed. A change is
accepted *only* when the entire rotated rectangle stays inside its
room, neither connecting door is obstructed, other meshes do not
intersect, and navigability remains at least 0.82. The per-layout
`orientationReport` captures which models improved.

**Manual visual QA:** open
`https://vitae0.github.io/vitaeworld/?qaFacing=1` to show direction
arrows in the actual 3D scene. Green indicates a prop whose direction
was corrected toward a semantic partner; amber indicates other
directional models that should be visually audited against their GLB
front axis. This debug overlay is opt-in and costs no draw calls in
normal gameplay.

`tests/asset-composition.test.mjs` checks the new catalogue, fixture
selection and post-placement collision/navigation invariants. Tests
cannot establish each artist's native GLB front without actual mesh
visual inspection.

## Lab 09 — Orthogonal interiors and complete visual-material passes

**Strict geometry:** New room subdivision enforces an axis-aligned
bounding-box **long side / short side <= 5:3** in each private room.
The old 45-degree beveled wall generator has been removed completely.
An acyclic room-to-corridor door graph provides access when a compact
sub-room does not touch the main corridor directly; every connecting
door's two approaches remain clear. The branched architecture has been
redesigned to remove long 2-cell-wide slots and fake closet strings.

**Material pipeline:** 1K CC0 diffuse, normal and roughness textures
from Poly Haven are downloaded via `npm run textures:sync` during
GitHub Pages and CI builds, with SHA-256 manifest, size checks and
provenance. Four families cover plaster, timber, ceramic and fabric.
A lightweight local CanvasTexture procedural fallback means the browser
does not show blank surfaces when the API cannot be reached. Wet rooms
use tile; residential and circulation surfaces get wood; rug and kilim
meshes share a fabric family. Source GLBs retain their own native
materials.

**Architectural decoration:** Instance-batched baseboards, crown molding,
chair rails, artworks/posters, wall sconces, ceiling fixtures, track
lights, hanging chandeliers, pendants and area rugs. Fixture meshes are
emissive, not dozens of expensive real-time point lights. Surface
details respect door access; floor textiles never add collision solids.

**Floorplan selection:** `src/plan-score.js` selects the best among three
topological candidates using transparent geometric and circulation
criteria, *before* expensive furniture generation. This is a
rule-based baseline, not an externally trained neural model; vetted
dataset options and restrictions are in
`docs/REFERENCE_CORPUS.md`.

**Mobile:** Lower texture resolution, repeated tile instancing, capped
pixel ratio, floor culling outside the active storey and no separate
dynamic per-fixture lights reduce unnecessary work. Real-device
performance still requires manual profiling.

## Lab 08 — Collapsible UI and mobile touch feel

- Two persistent top-bar buttons independently open/close the generation
  settings and floor-plan panels on desktop. On screens 800px or narrower,
  both panels start closed and opening one closes the other so the 3D
  viewport stays available. The panels have keyboard-accessible close
  controls, return focus after closing, and respond to Escape.
- Mobile overlays respect the viewport height and stay above the virtual
  joystick rather than covering it. This is a pure UI change and does
  not change the procedural building data.
- Drag-to-look sensitivity on touch starts at **2.2×** the desktop
  pointer sensitivity, adjustable from **1.0× to 4.0×** in the settings
  panel. The virtual movement joystick reaches full input about 18%
  sooner. Mouse and keyboard controls retain their earlier feel.
- `src/ui-panels.js` contains framework-independent state handling.
  `tests/ui-panels.test.mjs` covers mobile exclusivity, desktop
  independence, aria-expanded and keyboard dismissal.

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

- `src/topology.js` — five independently selectable architectural grammars, corridor graphs, 5:3 room division and orthogonal doorways.
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

The footprints remain grid-based and the collision system is not a complete rigid-body physics engine. Two connected storeys are playable; deeper stair stacks, interaction systems, fully local bundled assets, the exterior city, network multiplayer and actual-browser visual QA remain future work.
