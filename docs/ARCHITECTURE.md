# Architecture: interiors first, city later

## Current dependency graph

- `src/layout.js` — pure deterministic layout function, room recipes and 2D collision footprints. No WebGL.
- `src/assets.js` — pinned CC0 GLB manifest, cached GLTF loading, scale normalization, stylized avatar, fallback props.
- `src/world.js` — Three.js scene assembly from layout data (floors, architecture, door frames, furnishings and light), reusable material palettes, GPU disposal.
- `src/controls.js` — collision-aware first/third-person movement; camera orbit remains independent from an idle avatar; touch joystick and drag camera.
- `src/main.js` — app bootstrap, HUD, regeneration, minimap and render loop.
- `tests/layout.test.mjs` — deterministic layout, six doorway clearances, furniture footprint bounds.

## World generation contract

`generateLayout(seed)` returns serializable `{rooms,doors,walls,props,obstacles,spawn,bounds}`.

`rooms`: six room cells (3x2) with a central corridor. Types are shuffled by a deterministic PRNG. `props` are room-local predefined compositions applied to room cells. Every room opens onto a four-metre hallway with a physically unobstructed 2.3m doorway. `obstacles` are world-space 2D AABBs reused by the player movement system. This is **constraint-based placement inside fixed rooms**, not yet a general floor-plan synthesizer.

Re-generation keeps a stable, testable layout for the same seed. Palette changes do not change geometry. Replacing `recipe()` data or introducing new tiles does not require editing controller logic.

## Phase plan

1. **Interior lab (implemented prototype):** six connected spaces, prop catalogue, basic flat floor collisions, avatar view switching, keyboard/touch movement, seeded deterministic generation.
2. **Modular building kit:** introduce variable room shape/size, doors, windows, floor/ceiling mesh tiles and real physical bathroom subdivisions. Solve adjacency graph & circulation paths before adding props. Add object placement clearance solver and robust capsule physics (Rapier preferred).
3. **Multiple storeys:** stairs, elevators, portals, floor occlusion, navigation meshes and streaming.
4. **Street blocks:** parcel lots, facade kit, entrances, level of detail and interior streaming.
5. **City:** district grammar, road graph, world streaming, multiplayer hooks, baked occlusion and asset pooling.

## Web performance policy

- No per-prop lights or shadows. Shared GLB promises prevent duplicate network requests.
- Third-person view hides ceilings and checks camera-wall collisions to reduce clipping.
- GPU pixel ratio is capped, and frame deltas are clamped.
- Future: vendor packed GLBs, meshopt/Draco, instancing common props, render-on-demand for static scenes, physics spatial index, LOD and mobile quality presets.
- `buildWorld().dispose()` disposes owned procedural geometry/materials but preserves cached vendor GLB buffers for re-use.

## Honest prototype limitations

- The six rooms currently occupy a **fixed grid** and use hand-designed furniture patterns selected by seed; not arbitrary generated architecture.
- Only shallow footstep/room obstacles, no staircase, jumping, doors, multiplayer or server state.
- CC0 GLB models are fetched from remote GitHub; a network failure shows geometric furniture placeholders.
- Avatar animation falls back to subtle rig movement; complete walk/run animation and two gender-specific optimized bases still need integration.
- Runtime and visual smoke testing require browser and network access. This commit includes unit tests for layout invariants, not a claim that all visual issues have been eliminated.
