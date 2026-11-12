#!/usr/bin/env python3
"""Train a tiny conditional Gaussian mixture on external CC BY 4.0 room layouts.

Dataset: https://huggingface.co/datasets/OldDelorean/FloorplanQA-Layouts
Only bedroom/living_room/kitchen SYNTHETIC rooms (600 each) are eligible.
200 HSSD-derived records are deliberately excluded, avoiding uncertain
upstream asset rights. Fitted parameters, NOT source layouts, ship to players.

Python 3.11+ standard library, no external ML dependency.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import pathlib
import random
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request

DATASET = "OldDelorean/FloorplanQA-Layouts"
API = "https://datasets-server.huggingface.co"
SOURCE = "https://huggingface.co/datasets/" + DATASET
ALLOWED = {"bedroom", "living_room", "kitchen"}
MIN_GROUP = 28
TRAIN_PERCENT = 80

# One semantic role is shared by several GLB variants, so the learned
# probability remains usable as the asset catalogue grows.
ALIASES = {
    "bed": "bed", "double_bed": "bed", "single_bed": "bed",
    "nightstand": "sidetable", "bedside_table": "sidetable",
    "sofa": "sofa", "couch": "sofa", "loveseat": "sofa",
    "coffee_table": "coffee", "center_table": "coffee",
    "television": "screen", "tv": "screen", "tv_stand": "screen",
    "armchair": "chair", "chair": "chair", "accent_chair": "chair",
    "wardrobe": "storage", "closet": "storage", "cabinet": "storage",
    "bookshelf": "storage", "bookshelves": "storage",
    "fridge": "coldStorage", "refrigerator": "coldStorage",
    "stove": "cooking", "oven": "cooking", "range": "cooking",
    "sink": "sink", "kitchen_sink": "sink",
    "dining_table": "diningTable", "table": "diningTable",
    "counter": "counter", "kitchen_counter": "counter",
    "stool": "diningChair", "bar_stool": "diningChair",
    "plant": "plant", "potted_plant": "plant",
    "desk": "desk", "work_desk": "desk",
}
# Label matching is intentionally conservative. No external embeddings,
# NLP model or guessed furniture semantics are needed.
def canonical(label: str) -> str | None:
    key = str(label).strip().lower().replace(" ", "_").replace("-", "_")
    return ALIASES.get(key)


def fetch_json(url: str, attempts: int = 4) -> dict:
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={
                "User-Agent": "VitaeWorld-CCBY4-Research-Importer/1.0",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError,
                json.JSONDecodeError) as exc:
            if attempt + 1 == attempts:
                raise RuntimeError("Dataset fetch failed: " + url) from exc
            time.sleep(2 ** attempt)
    raise AssertionError("unreachable")


def fetch_rows(limit: int, strict: bool) -> tuple[list[dict], str, str]:
    query = urllib.parse.urlencode({"dataset": DATASET})
    splits = fetch_json(API + "/splits?" + query).get("splits", [])
    train_splits = [s for s in splits if s.get("split") == "train"]
    if not train_splits:
        raise RuntimeError("No published train split for " + DATASET)
    config = next((s.get("config") for s in train_splits
                   if s.get("config") == "default"), train_splits[0]["config"])
    # The Hugging Face /splits schema does not guarantee a num_rows
    # member. The dataset's published card currently lists 2,000 records.
    # Verify the actual 20 fetched pages and their row counts below.
    reported = next((s.get("num_rows") or s.get("num_examples")
                     for s in train_splits if s.get("config") == config), None)
    total = int(reported) if reported is not None else 2000
    if total < 1000 or total > 2500:
        raise RuntimeError("Unexpected dataset size: " + str(total))
    num = min(limit, total)
    all_rows: list[dict] = []
    for offset in range(0, num, 100):
        page = API + "/rows?" + urllib.parse.urlencode({
            "dataset": DATASET, "config": config, "split": "train",
            "offset": offset, "length": min(100, num - offset),
        })
        data = fetch_json(page)
        chunk = data.get("rows", [])
        if len(chunk) != min(100, num - offset):
            raise RuntimeError(f"Incomplete page at offset={offset}")
        all_rows.extend(v.get("row", {}) for v in chunk)
        if offset % 500 == 0:
            print(f"Downloaded {len(all_rows)}/{num} online room records", flush=True)
    if strict and num != total:
        raise RuntimeError("Strict mode requires complete dataset")
    revision = "unknown"
    try:
        revision = fetch_json("https://huggingface.co/api/datasets/" +
                              DATASET).get("sha", "unknown")
    except RuntimeError:
        pass
    return all_rows, config, revision


def bbox(points: list[dict]) -> tuple[float, float, float, float] | None:
    if not isinstance(points, list) or len(points) < 3:
        return None
    try:
        xs = [float(p["x"]) for p in points]
        ys = [float(p["y"]) for p in points]
    except (KeyError, TypeError, ValueError):
        return None
    if not all(math.isfinite(v) for v in xs + ys):
        return None
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    if x1 - x0 < 1 or y1 - y0 < 1 or x1 - x0 > 60 or y1 - y0 > 60:
        return None
    return (x0, y0, x1, y1)


def observations(rows: list[dict]) -> tuple[dict[str, list], dict]:
    grouped = collections.defaultdict(list)
    tally = collections.Counter()
    seen_plan = set()
    for i, room in enumerate(rows):
        kind = str(room.get("room_type", "")).strip().lower().replace(" ", "_")
        if kind not in ALLOWED:
            tally["excluded_non_synthetic"] += 1
            continue
        bound = bbox(room.get("room_boundary") or room.get("boundary"))
        if bound is None:
            tally["invalid_boundary"] += 1
            continue
        minx, miny, maxx, maxy = bound
        objects = room.get("objects") or []
        room_key = f'{kind}:{room.get("layout_id", i)}'
        if room_key in seen_plan:
            raise RuntimeError(f"Duplicate room ID: {room_key}")
        seen_plan.add(room_key)
        split = int(hashlib.sha256(("vitae-floorplanqa-v1:" + room_key)
                .encode()).hexdigest()[:8], 16) % 100
        subset = "train" if split < TRAIN_PERCENT else "test"
        tally["rooms_" + subset] += 1
        for obj in objects:
            role = canonical(obj.get("label", ""))
            if role is None:
                tally["unmapped_objects"] += 1
                continue
            bounds = bbox(obj.get("points") or obj.get("polygon"))
            if not bounds:
                # Object polygons can be small (lamps etc), so the room
                # min-size rule must not be applied to objects.
                pts = obj.get("points") or obj.get("polygon") or []
                try:
                    xs = [float(p["x"]) for p in pts]
                    ys = [float(p["y"]) for p in pts]
                    bounds = (min(xs), min(ys), max(xs), max(ys))
                except (ValueError, TypeError, KeyError):
                    tally["invalid_object"] += 1
                    continue
            bx0, by0, bx1, by1 = bounds
            x = ((bx0 + bx1) / 2 - minx) / (maxx - minx)
            y = ((by0 + by1) / 2 - miny) / (maxy - miny)
            if not (-.05 <= x <= 1.05 and -.05 <= y <= 1.05):
                tally["outside_object"] += 1
                continue
            grouped[kind + "|" + role].append((subset,
                (max(0.001, min(.999, x)), max(.001, min(.999, y)))))
            tally["objects_" + subset] += 1
    return grouped, dict(tally)


def logmix(x, mixture):
    vals = []
    for c in mixture:
        v = max(0.008, c["var"][0]), max(0.008, c["var"][1])
        mu = c["mu"]
        vals.append(math.log(max(1e-8, c["weight"])) -
                    math.log(2 * math.pi) -
                    .5 * math.log(v[0] * v[1]) -
                    .5 * (((x[0] - mu[0]) ** 2) / v[0] +
                          ((x[1] - mu[1]) ** 2) / v[1]))
    best = max(vals)
    return best + math.log(sum(math.exp(v - best) for v in vals))


def fit_gaussians(data, k=3, iterations=36):
    n = len(data)
    k = min(k, max(1, n // 22))
    ordered = sorted(data, key=lambda p: p[0] + p[1] * 1.618)
    mixture = [{"weight": 1 / k, "mu": [
        ordered[min(n - 1, int((j + .5) * n / k))][0],
        ordered[min(n - 1, int((j + .5) * n / k))][1]],
        "var": [.065, .065]} for j in range(k)]
    for _ in range(iterations):
        sums = [[0., 0., 0., 0., 0.] for _ in mixture]
        for p in data:
            scores = [logmix(p, [c]) for c in mixture]
            high = max(scores)
            normal = [math.exp(s - high) for s in scores]
            total = sum(normal)
            for i, r in enumerate(normal):
                w = r / total
                for j, v in enumerate([1., p[0], p[1], p[0]**2, p[1]**2]):
                    sums[i][j] += w * v
        for i, row in enumerate(sums):
            effective = row[0]
            if effective < 1:
                continue
            means = [row[1] / effective, row[2] / effective]
            variances = [max(.012, min(.22, row[3] / effective - means[0]**2)),
                         max(.012, min(.22, row[4] / effective - means[1]**2))]
            mixture[i] = {"weight": max(.001, effective / n),
                          "mu": means, "var": variances}
        norm = sum(c["weight"] for c in mixture)
        for c in mixture:
            c["weight"] /= norm
    return [{k: [round(x, 6) for x in v] if isinstance(v, list)
             else round(v, 6) for k, v in c.items()} for c in mixture]


def train(rows):
    groups, tally = observations(rows)
    model_groups, test_scores = {}, []
    for key, records in sorted(groups.items()):
        train_set = [x for subset, x in records if subset == "train"]
        test_set = [x for subset, x in records if subset == "test"]
        if len(train_set) < MIN_GROUP or len(test_set) < 5:
            continue
        mixture = fit_gaussians(train_set)
        score = statistics.mean(logmix(x, mixture) for x in test_set)
        model_groups[key] = {"train_count": len(train_set),
                             "test_count": len(test_set),
                             "components": mixture,
                             "heldout_log_density": round(score, 4)}
        test_scores.extend(logmix(x, mixture) for x in test_set)
    if not model_groups or len(test_scores) < 100:
        raise RuntimeError("Too few usable external layout samples for training")
    avg = statistics.mean(test_scores)
    report = {
        "rooms": tally,
        "groups": len(model_groups),
        "heldout_objects": len(test_scores),
        "heldout_mean_log_density": round(avg, 5),
        "uniform_mean_log_density": 0.0,
        "evaluation": "held-out 20% of distinct rooms (not individual objects)",
        "mixture_components": 3,
        "min_group_training_size": MIN_GROUP,
    }
    return model_groups, report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default="model/layout-priors.json")
    ap.add_argument("--metrics", default="model/layout-metrics.json")
    ap.add_argument("--limit", type=int, default=2000)
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()
    rows, config, revision = fetch_rows(args.limit, args.strict)
    groups, metrics = train(rows)
    output = {
        "version": 1,
        "trained": True,
        "dataset": DATASET,
        "dataset_revision": revision,
        "license": "CC BY 4.0",
        "citation": "Rodionov et al., FloorplanQA, ICML 2026",
        "training_subset": "synthetic bedroom/living_room/kitchen only; HSSD excluded",
        "normalized_features": ["centroid_x", "centroid_y"],
        "group_count": len(groups),
        "groups": groups,
    }
    out = pathlib.Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, sort_keys=True, separators=(",", ":")) + "\n",
                   encoding="utf8")
    meta = pathlib.Path(args.metrics)
    meta.parent.mkdir(parents=True, exist_ok=True)
    meta.write_text(json.dumps({
        "dataset": DATASET,
        "dataset_revision": revision,
        "source_config": config,
        "source_records": len(rows),
        **metrics,
    }, indent=2, sort_keys=True) + "\n", encoding="utf8")
    print("Trained:", len(groups), "conditional spatial mixtures", flush=True)
    print("ROOMS:", metrics["rooms"], flush=True)
    print("HOLDOUT:", metrics["heldout_objects"], "mean log-density",
          metrics["heldout_mean_log_density"], flush=True)
    print("MODEL:", out, "METRICS:", meta, flush=True)


if __name__ == "__main__":
    main()
