# Lab 03: topology, spatial vectors and dense object groups

## Design principle

A useful procedural interior is not "place a random object in a random empty cell". It is a cascade of **architectural grammar → room functions → semantic furniture → spatial location → physical clearance → correct orientation and relationship**. Every stage has independent code and can be changed without a generative AI model.

## 1. Multi-loop building topology

`src/topology.js` owns a fixed-footprint 25 × 19-cell grid at 1.3 metres per cell. Two 2-cell-wide north/south axes intersect two 2-cell-wide east/west axes. Side passages link these main axes in two extra places, and the central shared lobby wraps an open-air courtyard. The resulting circulation graph contains several genuine cycles, so players have alternative routes instead of one long hallway.

The eight remaining region bays are subdivided into compact room parcels, for 16 room IDs. Each receives an accessible doorway on a real corridor edge. Room functional types are independently seeded and chosen from 11 archetypes, with repeats allowed. Room sizes are typically 20–41 m². A deterministic rejection/check stage validates circulation connectivity. The output includes occupancy grid, wall segments, doors, room rectangles, floor tiles, spawn, and a full set of navigation blockers.

### Diagonal wall geometry

`bevelCorners()` finds convex room corners bordering two exposed wall edges, trims both adjacent straight wall segments by a cut distance, and inserts a **diagonal wall segment at exactly 45°**. The renderer transforms the resulting segment around the Y axis; movement checks point-to-segment distance on the same angled obstacle. A door is never shortened to create a bevel. We currently bevel some corners, not all edges, to avoid noisy or overly jagged architectural silhouettes.

## 2. 40D semantic + 16D placement vectors

`src/semantics.js` describes 61 CC0 objects and 11 room archetypes using a human-authored functional vector `f ∈ [0,3]^40`, for sleep, work, cooking, social interaction, material style, etc.

Each furniture item *also* has a location vector `p ∈ [0,3]^16` with these stable dimensions:

```text
perimeter  corner   central  entry
deep       daylight privacy  left
right      focal    cluster  clearance
quiet      public   view     surface
```

Role defaults are explicitly authored and each model inherits them, optionally overriding its own scores. All vectors are directly inspectable and editable. This is a rule-based design grammar, not a pretrained embedding model.

Functional compatibility uses cosine similarity:

`S_function(a,r) = cosine(a.functionVector,r.targetVector)`

Candidates are scored using room-relative geometry (distance from walls, corners, entrance, room centre, outdoor façade), partner proximity, grouping and current orientation:

`S_location(a,x) = cosine(a.locationVector,features(x,room,objects,door))`

The placement objective uses

`3.1*S_location + 1.45*partnerFit + groupBonus + anchorBonus + tinyDeterministicTieBreak`

Functional similarity selects *which* objects to consider; spatial preference selects *where* each model fits. Larger weights can be adjusted in `src/placement.js`.

## 3. Relationship-aware furniture placement

1. Guarantee mandatory use-defining furniture, scaling evenly (not stretching) to 90%, 80%, 70% or 60% only when necessary.
2. Sample wall/corner and centre candidates, and additional positions near existing companion pieces.
3. Reject any candidate that breaches room footprint, a diagonal wall chamfer, door throat, or another solid object with a safe margin. Rugs may underlay furniture.
4. Evaluate the 16D location vector, partner distance and orientation. A chair aims toward its table; sofas prefer wall edges and face into the room; screens prefer walls opposite seating.
5. Parent small computer accessories and bedside table lamps to desk/table surfaces, preventing floating devices.
6. Fill remaining space with a ranked, diversified mix of furniture, compact accessories, plants, lighting and floor décor until the room density target or safe-placement limit is reached.

The architecture assigns model-space dimensions independently from rotated collision footprints, so a 90° chair turn does not corrupt its physical footprint.

## 4. Performance

The scene still uses WebGL/Three.js and Vite. Floors, roofs, wall segments and trims render through shared instanced geometry. Walls, doors and diagonal physics come from the same generated topology, so a decorative angled wall cannot become a collision-only or visual-only obstacle. Asset requests are cached and revision-pinned. Pixels and realtime lights are budgeted.

## 5. Limitations and next upgrades

- **Geometry:** chamfered rectangular parcels and tiled corridors; true curved or polygon-clipped room floors are not yet implemented.
- **Navmesh:** graph-level hall and doorway connectivity is tested, but the full clearance graph around every item, and full capsule physics, are not yet certified.
- **Aesthetics:** semantic weights are hand-authored hypotheses. They should be tuned from screenshots and actual playtesting, not assumed visually perfect.
- **Furniture:** we use existing CC0 models, not custom design meshes or fine-grained LOD. Live GLB requests need local vendoring and compression.
- **Next milestones:** visual scene inspector, furniture clustering with explicit facing/spacing constraints, curved walls and varying ceiling heights, doors and interactive props, stairs and multi-storey circulation, then procedural external city blocks.
