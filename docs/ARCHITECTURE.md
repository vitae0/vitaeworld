# VitaeWorld Lab 04: multi-grammar architecture and explicit facing

## 1. Architecture families

All five families are selected by the `BUILDING_TYPES` registry in `src/topology.js`. Inputs to `generateLayout(seed,type)` are pure and deterministic.

- **compact:** x=4..20, z=3..15, one horizontal and one vertical 2-cell corridor. Small footprint, eight compact rooms.
- **central:** large x=1..23, z=1..17 footprint, main cross and a widened central lobby. Additional secondary routes across the lobby.
- **grid:** full 25×19 footprint with two vertical and two horizontal 2-cell corridors, generating regularly subdivided bays.
- **courtyard:** grid connections with the central bay opened into a walkable gallery ringing a genuine exterior void.
- **branched:** central east/west corridor with two connected lateral side wings and cross-links.

The generator starts with the *circulation* graph, not with randomly sized rooms. Connected components of leftover interior space are divided recursively only when both new components remain connected, both have direct access to the hallway, and a minimum occupancy constraint is satisfied. Every room has an actual door aperture on a valid hallway edge. `bevelCorners` trims eligible orthogonal corners and replaces the wall sections with true 45° meshes and collision segments, keeping doorways intact.

## 2. Furniture type and position are separate

Each Kenney-derived model has a human-authored 40D function vector `f` and a separately authored 16D spatial vector `p`. Function matching: `cosine(furnitureVector, roomVector)`. Spatial matching: `cosine(locationVector, features(room, candidate, objects, door))`.

Location features encode perimeter, corner, centre, entrance, room depth, daylight, privacy, left/right, focal relationships, grouping, clearance, quiet/public, view direction and surface preference.

Candidates are sampled around walls, centre locations and existing objects they are meant to accompany. Directional objects now receive all four cardinal yaw options on centre positions (previously most were given yaw=0 automatically). Semantic direction and partner direction are incorporated into an additive facing score. For example, a desk chair should face its desk; a screen should face the seating group.

The physical rotation of a GLB model is a separate transformation from the logical rotation. `orientation.js` treats canonical world-facing as **-Z**, implements yaw-to-target and cardinal aiming, and supplies an editable asset-specific GLB yaw compensation applied inside the model wrapper. This makes it possible to correct a mesh's local front without rewriting room placement or collision logic. The pack-wide front assumption must be visually validated, and any exceptions recorded as per-model overrides.

## 3. True room-footprint collision checks

Earlier irregular rooms could have an L-shaped set of cells but an enclosing rectangular `xMin/xMax/zMin/zMax`. A prop might have fit the rectangle while actually landing inside an adjacent hallway or room.

The new `fits` check samples the **entire oriented AABB** of every proposed furniture item, including corners, and rejects any part falling into cells not owned by that room. Corner chamfers, door-throat buffers, proximity to solid furniture and surface-parent constraints are separately enforced. Child props on desks and tables also check their offset's actual cell ownership, falling back to the parent's centre if necessary.

These checks are deliberately conservative: some otherwise attractive arrangements will be rejected before they can break navigation or render through a wall.

## 4. Scene/UI and optimization

`src/world.js` transforms architecture outputs into instanced floors, walls, ceiling tiles, trims and accent lighting. The minimap and wall physics use the same topology. `src/main.js` exposes an Auto/Compact/Central/Grid/Courtyard/Wings dropdown, and reports the actual style on the HUD.

Rendering keeps the existing device-pixel-ratio caps, shared GLB model cache and few realtime lights. Repeated geometry is instanced; future work includes merged static room props, downloaded/optimized local GLBs, LOD and robust avatar physics.

## 5. Validation and limitations

`tests/layout.test.mjs` verifies deterministic generation, all five explicitly chosen architectural styles and automatically selected styles, non-disconnected hallways, open doors, 45° geometry, actual room ownership of props, mandatory furniture and non-overlap of solid furniture. Test coverage does **not** replace a screenshot-based browser review, especially for decorative facings, camera sightlines, animation loops and meshes with unusual local axes.

Next improvements should focus on per-asset rotation calibration, a spatial composition inspector, larger scale structural grammar variants, stairs and multiple floors, and streaming this architecture into city parcels.
