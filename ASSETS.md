# CC0 3D asset registry

All currently referenced external meshes were chosen for **explicit CC0 1.0** licensing, including commercial use. Code-generated geometry has no external artwork dependency.

| Family | Creator | Runtime source | License | Purpose |
|---|---|---|---|---|
| Furniture Kit (140 models) | Kenney | [official asset](https://kenney.nl/assets/furniture-kit), [optimized GLB mirror](https://github.com/Hidencod/tge-assets) | CC0 1.0 | Room props: beds, sofas, bathrooms, appliances, desks, plants |
| Universal Base Characters, Standard, Superhero Male | Quaternius | [official asset](https://quaternius.com/packs/universalbasecharacters.html), [GLB conversion provenance](https://github.com/programasweights/avatar/blob/main/ASSETS.md) | CC0 1.0 | Stylized third-person avatar prototype |
| KayKit Adventurers, free tier | Kay Lousberg / KayKit | [official source](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), [optimized game conversion](https://github.com/sion-rgb/tactical-slash/blob/main/THIRD_PARTY_ASSETS.md) | CC0 1.0 | Alternate stylized avatar prototype |
| Building Kit | Kenney | [official asset](https://kenney-assets.itch.io/building-kit) | CC0 1.0 | Proposed next milestone: more wall/door/window mesh variety |
| Modular Sci-Fi MEGAKIT, Standard | Quaternius | [official asset](https://quaternius.com/packs/modularscifimegakit.html) | CC0 1.0 | Proposed next milestone: procedural sci-fi interiors, not yet imported |

Runtime GLB URLs are revision-pinned in `src/assets.js`. The two current avatar models are **not** yet a complete male/female character customization system. The character-source conversion is temporary. See project roadmap.

## Constraints and provenance

- Do **not** assume an upload to Poly Pizza, Sketchfab or a random aggregation site automatically grants CC0. The primary author's licensing page is the reference.
- Do **not** import other artists' copyright-restricted models, marketplace items without redistribution rights or models ripped from commercial games.
- Original pack screenshots, brand identity and author trademarks are not covered by the model's CC0 dedication.
- The first lab loads models directly from pinned raw GitHub URLs for fast iteration. This is a dependency on third-party hosting; production should download, compress and vendor models under `public/assets/vendor` with this manifest and SHA-256 records.
- Some GLB conversions may differ in dimensions or materials from official pack exports. Use `src/assets.js`'s bounding-box scaling and keep the procedural fallback visible when a request fails.

**Licensing verification date:** 2026-11-10.

## First-party runtime texture pipeline

Four surface families use **Poly Haven CC0 materials** during GitHub Pages
builds: White Plaster 02, Wood Planks, Tiled Floor 001 and Fabric Pattern 05.
See `scripts/sync-textures.mjs`, which uses the official
[Poly Haven API](https://api.polyhaven.com) to resolve **1K JPEG**
diffuse, OpenGL normal and roughness maps, validates each download, computes
SHA-256 checksums and records URLs in `public/textures/sources.json`.

- Run `npm run textures:sync` before `npm run build`; deployment and
  validation workflows run this automatically.
- Missing downloads fall back to four locally generated patterned textures.
  The game therefore still works offline and when the API/CDN is unreachable.
- Files downloaded during CI are included in the built site, but are not
  checked into the source Git repository.
- Poly Haven grants all source maps under CC0 1.0. Use of its public API is
  credited as requested by its API terms: **Powered by Poly Haven**.
- Keep the complete manifest for traceable provenance and asset hashes.

## Lab 10 catalogue expansion and actual fixture lighting

- Added **20 more furniture names from the Kenney Furniture Kit**,
  bringing the active semantic furniture catalogue to **81 unique models**.
  All were checked against `Hidencod/tge-assets/catalog.json` at
  `3ddcc695adbba9fb918cf31b7c139b3f95b76910`, the exact same
  commit used by `src/assets.js`.
- Additional wall / ceiling fixture models, also in that pinned catalogue:
  `lampwall`, `lampsquareceiling` and `ceilingfan`, all from
  Kenney's CC0 Furniture Kit.
- `src/fixture-specs.js` contains the model selector. `src/fixture-assets.js`
  uses cached GLB source geometry and instancing for repeated lights, so
  a separate GLB is **not downloaded for every lamp**.
- Procedurally generated lighting remains visible when an asset cannot
  be downloaded or parsed, including when offline. Some fixture categories
  remain deliberately procedural because the pack does not contain their
  actual silhouettes.
- Native GLB forward orientation remains a separate visual-review item.
  Companion-facing corrections never claim to infer a mesh's anatomical
  or functional forward direction from an axis-aligned bounding box.

## Lab 13 additional verified CC0 Poly Haven materials

The six additional assets and their attribution/source pages:
- [Laminate Floor 02](https://polyhaven.com/a/laminate_floor_02)
- [Marble Tiles](https://polyhaven.com/a/marble_tiles)
- [Terracotta Floor Tiles](https://polyhaven.com/a/terracotta_floor_tiles)
- [Brick Wall 07](https://polyhaven.com/a/brick_wall_07)
- [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall)
- [Concrete Floor](https://polyhaven.com/a/concrete_floor)

All six are published under **CC0** by Poly Haven. The online
`scripts/sync-textures.mjs` script runs in GitHub Pages/CI and records
which 1K maps were successfully fetched. An asset missing from the
manifest is replaced by a deterministic local procedural texture; no
blank floor is generated.

The active programme affects room-type assignment and finish family.
External doors use opaque finishes for dwellings and glass in shop
types, but remain **non-operational** in every programme.
