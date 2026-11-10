# VitaeWorld Lab 02: procedural architecture and semantic interior design

## Design goal

Procedural generation should produce **coherent and surprising architecture**, not six identical boxes with shuffled furniture. The seed selects among constraints, while the constraints encode spatial logic and room purposes.

## 40-dimensional semantic feature space

`src/semantics.js` defines the **40 stable dimensions**:

sleep, lounge, social, dine, cook, hygiene, work, study, creative, play,
media, storage, display, fitness, recovery, nature, technology, illumination,
privacy, openness, warm, cool, premium, industrial, contemporary, playful,
quiet, energy, soft, hard, water, dry, ground, vertical, corner, center,
tall, compact, group, accent.

Every dimension uses an ordinal integer in `[0,3]`: 0 means unrelated; 3 indicates central purpose. We explicitly rate **61 furniture models** and **11 room profiles**. `vector(traits)` expands sparse human-readable annotations to a 40-entry array. Unknown dimensions and out-of-range scores throw immediately.

### Selection scoring

Let `u` be the candidate item's 40-D vector and `v` a room's target vector. We use

```
compatibility(u,v) = (u · v)/(||u||₂ ||v||₂)
furnitureScore = 3.7 × compatibility - roleSaturation - categoryPenalty
```

`roleSaturation` avoids repeated large sofas, duplicate kitchen appliances, etc. We place mandatory essentials first, then rank remaining candidates by semantic score. Randomness is a *small deterministic tie-breaker*, never a replacement for semantic fit.

### Physical and compositional constraints

Each furniture record includes a real footprint `(w,d,h)`, preferred anchor (`wall`, `corner`, or `center`), conceptual role, optional support/companionship and whether it blocks movement. Placements are constrained by:

1. Room-cell occupancy and a 19cm safety margin around the candidate footprint.
2. Clear passage through each 1.58m doorway plus an unobstructed room-entry throat.
3. Furniture AABB separation and an additional 17-19cm buffer (except rugs).
4. Wall or centre placement preferences.
5. Companion proximity: coffee tables prefer sofas; dining chairs prefer dining tables. Small computers and table lamps are directly attached to support furniture and placed at its surface height.

Furniture is never assigned a globally random x/z coordinate. Mandatory functional objects can scale uniformly to 85% or 70% to fit awkward footprints.

## Spatial grammar

`src/layout.js` constructs a 21×15 tile grid, with each tile spanning two metres. It forms a connected corridor that bends, widens into a hub, and branches into two cross-wings. North and south plots are divided into six room zones. Edge setbacks, a curved corridor footprint, alcoves, and occasional enclosed outdoor voids yield non-rectangular rooms. Eleven functional room archetypes are shuffled deterministically across those six zones.

If a proposed room becomes disconnected or too small, it is rejected before any furniture placement. Each room receives exactly one doorway selected from valid room/corridor boundary edges. Walls are emitted from actual tile adjacency, not independent guessed geometry; a doorway is an *actual opening in the collision wall*.

`generateLayout(seed)` returns a fully serializable `{grid,floors,rooms,doors,walls,props,obstacles,spawn,bounds}`. It does not depend on Three.js. `isWalkable` checks both occupancy and player-radius clearance against wall and furniture footprints.

## Renderer and modular boundaries

- `src/semantics.js`: declarative room templates, 40-dimensional vectors and furniture registry.
- `src/layout.js`: pure repeatable floorplan, entrances, furniture placement, basic collisions.
- `src/world.js`: instanced tiles/walls/trim, semantic material colours, doorway light accents, cached GLB furniture.
- `src/assets.js`: version-pinned CC0 models, async loads, scale normalization and fallbacks.
- `src/controls.js`: player motion and camera independence, touch input.
- `src/main.js`: HUD, minimap, scene lifecycle and FPS.
- `tests/layout.test.mjs`: scalar/vector tests, 46 seed regressions, corridor graph connectivity, room essentials and collision checks.

## Optimization policy

InstancedMesh for all common floor/wall/ceiling/trim geometry, reused material buffers, cached model requests, capped device pixel ratio, no per-object realtime lights. Remote GLBs remain the main limitation: long-term convert to meshopt/KTX2, vendor under `public/assets/vendor`, reuse geometry via instancing/merging, add occlusion and LOD.

## Roadmap

**Lab 03:** true curved/chamfered/diagonal walls, variable storeys, stairs, walkable navmeshes, furniture interaction, deterministic semantic grouping (bedside scene, dining clusters, workspace modules), live layout inspector with individual 40-D weights.

**Lab 04:** modular building exteriors, façades, windows/doors, parcel lots, accessibility and performance budgets.

**Lab 05:** a procedural streaming city built from connected buildings and a road graph, then optional multiplayer layers.

No current claim of unrestricted floorplan synthesis or navmesh-certified complete navigation.
