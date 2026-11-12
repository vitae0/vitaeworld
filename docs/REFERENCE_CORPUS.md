# Interior reference corpus and honest model status

## Source research (2026-11-12)

The procedural grammar now ranks three candidate **topologies**, before
furnishing, with the geometry-only `src/plan-score.js`. This is a deterministic
**rule-based scorer**, not a neural network and not a model trained on images.

Potential training corpora identified:

1. [HouseExpo](https://github.com/TeaganLi/HouseExpo): publicly described
   35,126 2D floor plans; JSON room shapes and circulation are relevant.
   The project's license/provenance must be inspected before downloading or
   deriving a production training set.
2. [CubiCasa5K](https://github.com/CubiCasa/CubiCasa5k): 5,000 annotated
   floor-plan images; **CC BY-NC 4.0 concerns** have been reported by other
   academic users. Do not assume commercial training is permitted.
3. [RPLAN](http://staff.ustc.edu.cn/~fuxm/projects/DeepLayout/):
   around 80k residential plans. Access and redistribution restrictions
   mean we should not copy it into a public game repository.

The present ranker uses explicit constraints:

- Room bounding-box aspect ratio at most **5:3**.
- No diagonal walls, no inaccessible door graph.
- Reasonable room size, compactness, and corridor overhead.
- Fewer walk-through room connections when there is a viable corridor door.

Three topology candidates per seed are compared; only the winning one
is furnished. This is faster and more testable than training a generative
image model on datasets with unresolved usage rights.

## Prerequisites for a future learned ranker

A genuinely trained interior model requires:

1. A dataset legally cleared for **game use and model training**, with
   provenance and split by building to prevent leakage.
2. Polygon graph extraction and common normalized representation:
   room label, bounding polygon, edge doors, passage, fixture placement.
3. Preference labels or a defensible naturalness metric.
4. Train/validation/test splits, held-out benchmark, failure sampling
   for doors, stair landings, and narrow rooms.
5. Quantized inference that will not stall a mobile browser.

No shipped model currently meets those requirements. We deliberately do
not claim that a tiny synthetic self-scored training loop would qualify.

## Current practical alternative

Before committing to an unlicensed training set, the live prototype now
uses quality-checked furniture arrangements and an orientation post-pass
plus optional in-scene directional QA. These changes improve actual
asset placement without pretending that an unsupported neural model has
been trained. Vetted external floorplan training remains a separate,
uncompleted milestone.
