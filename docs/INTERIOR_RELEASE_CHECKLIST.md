# VitaeWorld Interior Release Checklist — Lab 19

Status: **deterministic interior feature pass implemented**.
Automated checks do not substitute for visual browser acceptance.

## Automated release gates

The following must pass before merging to `main`:
- `npm run interiors:certify` for the complete 36-programme,
  two-storey structural audit (strict failure on any defect).
- Full Node test suite (geometry, accessibility, style/seed
  determinism, GLB verification, all-floor rendering).
- Lab 19 finish-plan and quality regression tests across the eight
  architecture grammars, five representative programme categories and
  fourteen design styles.
- Vite production build, with bundled 86/86 CC0 GLBs and existing
  Poly Haven PBR texture manifests.
- Regression that the learned statistical candidate placement score
  remains disabled in runtime furniture placement.
- Check that exterior entrances remain locked, private bathroom
  doors remain opaque, no Windows open in WC/utility rooms, and no
  geometry blocks the original stairwell cutout.

## Human visual acceptance required

Use identical seeds before/after updates and test at least:

1. **Home / Modern**: Two-floor family house with coherent kitchen,
   living space, bedroom, bathroom and uninterrupted ceiling surfaces.
2. **Hotel / Boutique**: Suite numbers, clean bathroom privacy,
   usable furniture and clear elevator/stairwell surroundings.
3. **Restaurant / Sleek**: Dining chairs, table circulation,
   kitchen backsplashes, wall finish, doors and WC access.
4. **Workshop / Rusty**: No awkward tiled household bathroom
   texture outside wet rooms; wall rails and rough materials read as
   deliberate, not missing polygons.
5. **Gallery / Minimal**: Enough empty walls and floor space,
   no excessive clutter or overlapping decorations.
6. **All-story viewing**: Lower and upper floors visible, no duplicated
   slab, no floating upper room, no fake exterior door upstairs.
7. **Day/night**: Manually scrub the 24-hour slider and inspect
   light hierarchy, ceiling fixtures and daylight apertures.
8. **Interactables**: Test E/touch on doors, lights, sink, TV,
   kitchen and storage. Open and close while moving between floors;
   recreate the same seed and confirm remembered state.
9. **Asset loading**: Expand 3D MODEL DURUMU and verify no models
   remain unresolved. Test cached reload and offline behavior.
10. **Mobile controls**: Touch joystick, camera orbit, object-use
    overlay and room navigation near doors/ceilings.

## Performance acceptance required

Record measured FPS, frame pacing and asset failures on at least
one budget Android phone, one midrange mobile device and one
desktop browser for each of Auto/Economy/Balanced/Cinematic.
Economy may hide small decorative dressing and switches off local
practical point lights, but **must never hide structural walls,
floors, doors, accessible room furniture or the other storey**.

Performance targets are provisional and unverified until measured:
desktop 60 FPS target, mobile 30 FPS target. The adaptive-res DPI
algorithm is a fallback, not evidence of hitting those targets.

## Current scope boundary

This interior work is a feature pass for VitaeWorld's two-storey
browser-side procedural architecture generator, **not** a
photorealistic architectural CAD engine, multiplayer persistence,
fully rigged procedural animation system, or a claim that every
physical appliance is realistic and fully functional.

Reopen interior development only for a demonstrable visual issue,
broken interaction, accessibility regression or measured hardware
performance problem. Preserve deterministic seeds and semantic
placement first.
