#!/usr/bin/env python3
"""Match Plant Atlas scientific names to GBIF's current COL XR taxonomy."""
from __future__ import annotations
import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

COL_XR_CHECKLIST = "7ddf754f-d193-4cc9-b351-99906754a03b"


def query(name: str, retries: int = 4) -> dict:
    params = urllib.parse.urlencode({"scientificName": name, "checklistKey": COL_XR_CHECKLIST})
    url = f"https://api.gbif.org/v2/species/match?{params}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "PlantAtlasDataPipeline/2.0"})
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    return {}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", default="data/catalog")
    ap.add_argument("--delay", type=float, default=0.2)
    ap.add_argument("--max", type=int, default=10000)
    args = ap.parse_args()
    root = Path(args.catalog)
    index_path = root / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))

    shards = {s["file"]: s for s in index.get("shards", [])}
    processed = 0
    for shard_name, meta in shards.items():
        path = root / shard_name
        data = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for p in data:
            if processed >= args.max:
                break
            if p.get("gbif", {}).get("taxonKey") is not None:
                processed += 1
                continue
            result = query(p.get("scientificName", ""))
            p["gbif"] = {
                "taxonKey": result.get("usageKey") or result.get("taxonKey"),
                "matchType": result.get("matchType"),
                "matchedName": result.get("scientificName")
            }
            changed = True
            processed += 1
            time.sleep(max(0.0, args.delay))
        if changed:
            path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        if processed >= args.max:
            break

    index["gbifChecklistKey"] = COL_XR_CHECKLIST
    index_path.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    print(f"GBIF matching processed {processed:,} species using COL XR checklist {COL_XR_CHECKLIST}")


if __name__ == "__main__":
    main()
