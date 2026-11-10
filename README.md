# VitaeWorld | Spatial Architecture Lab 03

Browser-first 3D world experiment, completely independent from earlier Vitae Hotel prototypes.

**Playable GitHub Pages build:** https://vitae0.github.io/vitaeworld/

## What's new in Lab 03

The old oversized, straight-corridor layout is replaced with **16 smaller rooms** (usually about **20–41 m²**) around a genuinely connected multi-loop circulation network:

- Two longitudinal and two transverse corridors with multiple intersections and walkable loops.
- Two side connector corridors, a shared middle lobby, and an inner open-air atrium.
- Compact rooms with **45° chamfered walls**, generated as real angled wall meshes and physics obstacles.
- **40-dimensional functional vectors** for 61 CC0 furniture items and 11 room archetypes.
- A separate **16-dimensional placement vector per item** describing wall, corner, centre, entrance, deep/private zones, daylight, partner-facing, social grouping, and safe clearances.
- Denser, less arbitrary furniture arrangements. Mandatory items establish each space's purpose; relationship rules place desks/chairs, dining sets, sofas/coffee tables, and computers or table lamps on support furniture. The placement score chooses among valid physical positions rather than randomly scattering objects.
- A compact multi-loop minimap, first/third person camera, two temporary stylized CC0 character prototypes, and desktop/mobile controls.

## Run

Requires Node.js 20.19+ and npm:

```bash
npm install
npm run dev
npm test
npm run build
```

**Desktop:** WASD / arrow keys move, mouse drag or Capture Mouse to look, Shift sprint, V toggles first/third person, R generates a new seed, Escape releases the pointer lock. **Touch:** left joystick, drag-to-look, CAM button.

Re-enter the same world seed for a byte-for-byte reproducible world layout and furniture arrangement. Different seeds change zoning, use mix, courtyard/entry details, chamfer positions, material palettes, and the furnishing choices.

## Modules

- `src/semantics.js` — editable 40D functional and 16D positional vectors for the entire furniture catalogue.
- `src/topology.js` — multi-loop hallways, compact room polygons approximated on a grid, actual 45° wall segments, collision geometry and door selection.
- `src/placement.js` — candidate placement, functional compatibility, spatial scores, companion clusters, clearance checks and supports.
- `src/layout.js` — stable public layout API composing architecture and placement.
- `src/world.js` — instanced floors, 3D walls, ceilings, trims and lighting.
- `src/assets.js` — licensed remote GLB cache, material handling and simple fallbacks.
- `src/controls.js` — first/third-person controls and collision-aware motion.
- `src/main.js` — rendering orchestration, minimap and UI.
- `tests/layout.test.mjs` — 61-seed layout, loop, doorway, vector, 45° angle and furniture regressions.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for formulas, constraints, extension points and known limitations. See [ASSETS.md](ASSETS.md) for model licensing and provenance.

## Known limits

This is still a proof of concept, not a finished furnished-home designer. Rooms are rectangular parcels with selected chamfered corners, not full freeform curved polygons. Structural doors are pass-through openings; furniture physics and camera collisions are coarse footprint tests, not a full navmesh. A guaranteed visual quality bar requires browser screenshots/playtesting. We currently fetch pinned CC0 GLBs from public endpoints; future production needs compressed local assets and meshes pooled by type. There are no stairs, multiple storeys, interactions, city streaming, or multiplayer yet.
