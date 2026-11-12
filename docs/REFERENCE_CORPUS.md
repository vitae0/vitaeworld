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

A **small trained conditional furniture-position model** is now shipped,
see the V0.3 section below. A complete neural floor-graph generator and
independent aesthetic-quality evaluation still do not exist.

## Current practical alternative

Before committing to an unlicensed training set, the live prototype now
uses quality-checked furniture arrangements and an orientation post-pass
plus optional in-scene directional QA. These changes supplement an externally trained conditional spatial model.
Whole-building generative training is still a separate, unfinished milestone.

## V0.3: Actual downloaded training data, reproducible conditional model

The first trainable corpus is [FloorplanQA-Layouts](https://huggingface.co/datasets/OldDelorean/FloorplanQA-Layouts).
It is published under **CC BY 4.0** by Rodionov, Eldesokey, Birsak,
Femiani, Ghanem and Wonka (FloorplanQA, ICML 2026).

The dataset has 2,000 structured room layouts. Only the **1,800 synthetic
bedrooms, kitchens and living rooms** are eligible for the first
training run; the other 200 HSSD-derived samples are *explicitly excluded*
pending any additional upstream asset review. There is no redistribution
of individual original layout JSONs or images in our game.

- Downloader: the GitHub training workflow sparse-clones the Hugging Face
  dataset repository at a recorded commit and checks out only the three
  synthetic `layouts/{bedroom,kitchen,living_room}` directories. The
  trainer also supports the documented viewer `/rows` API, but the direct
  Git source is more reproducible and avoids sporadic API 503 responses.
- Model: three-component diagonal **Gaussian mixture** fitted by
  expectation-maximization in plain Python. Conditioned on
  `room category | furniture role`, predicting normalized relative
  object centroid `x,z`.
- Train/test split: deterministic SHA-256 room ID hash (80/20).
  No object from a held-out room enters the corresponding train subset.
- Artifact: `model/layout-priors.json`; report:
  `model/layout-metrics.json`; updated from the training workflow.
- Runtime: `src/learned-layout.js` gives a bounded bonus of at most
  +0.24/-0.22 to legal candidate positions. Existing room boundaries,
  doorway clearance, collision avoidance and navigation conditions
  remain stronger.
- This is genuinely **trained statistical machine learning**,
  not an image-generating model or a full conditional neural architect.
  It learns preferred placement zones, **not** window styles, room
  connectivity or exact orientation of imported GLBs.
- Original-data provenance:
  https://huggingface.co/datasets/OldDelorean/FloorplanQA-Layouts
- API documentation:
  https://huggingface.co/docs/dataset-viewer/quick_start

To reproduce: `python3 scripts/train-layout-priors.py --strict` from
the repository root with network access. The `train-layout-priors`
GitHub Actions job performs the same calculation, commits the compact
model/metrics files to its feature branch and publishes a CI log.
Only that model and attribution ship to the browser.

### Completed first fit: measured results

- Dataset revision: `9ffb74c1c158104fa302baea8e18087d31906bcd`
- Eligible room plans: **1,800**, synthetic only, CC BY 4.0.
- Train/test: **1,447 / 353 distinct rooms** (SHA-256 keyed split).
- Observed mapped furniture: **6,359 / 1,521 train/test items**.
- Trained mixture groups: **16**.
- Held-out average log density: **+0.07492** on the normalized unit
  square, versus zero for a uniform distribution.
- 11,800 other object labels were not yet mapped into canonical roles;
  this is a deliberate initial coverage limit.
- `model/layout-priors.json` and `model/layout-metrics.json` are
  checked-in outputs from the actual external training run.
- Reproduction (internet needed):

  ```sh
  git clone --depth 1 --sparse https://huggingface.co/datasets/OldDelorean/FloorplanQA-Layouts /tmp/floorplanqa
  git -C /tmp/floorplanqa sparse-checkout set layouts/bedroom layouts/kitchen layouts/living_room
  python3 scripts/train-layout-priors.py --strict --local-root /tmp/floorplanqa
  ```

The metric measures statistical fit for source-layout object positions.
It is **not** a measured improvement in gameplay, player preference or
photorealism. Stronger claims require a controlled blind comparison.

## Lab 15 gameplay model status

The FloorplanQA statistical prior is genuine data-trained work and
its files and held-out metrics remain archived for comparison. However,
**the actual game no longer applies its candidate-placement score**.
Production furnishing once again uses only the older semantic and
geometric rules, now strengthened with a tall-furniture/window
occlusion constraint. Do not describe the trained model as active in
the live game as of Lab 15.
