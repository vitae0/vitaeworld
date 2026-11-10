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
