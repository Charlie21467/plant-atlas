#!/usr/bin/env python3
"""Validate the generated Plant Atlas catalog."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path("data/catalog")
REQUIRED_TOP = {"id", "scientificName", "family", "rank", "taxonomicStatus", "distribution", "sources", "gbif"}
DIST_KEYS = {"native", "introduced", "extinct", "doubtful"}


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("catalog", nargs="?", default=str(ROOT))
    args = ap.parse_args()
    root = Path(args.catalog)
    idx = json.loads((root / "index.json").read_text(encoding="utf-8"))
    seen = set()
    total = 0
    errors = []
    for shard in idx.get("shards", []):
        data = json.loads((root / shard["file"]).read_text(encoding="utf-8"))
        for p in data:
            total += 1
            missing = REQUIRED_TOP - p.keys()
            if missing: errors.append(f"{p.get('id')}: missing {sorted(missing)}")
            if p.get("id") in seen: errors.append(f"duplicate id: {p.get('id')}")
            seen.add(p.get("id"))
            if p.get("rank") != "SPECIES": errors.append(f"{p.get('id')}: not SPECIES")
            if p.get("taxonomicStatus") != "Accepted": errors.append(f"{p.get('id')}: not accepted")
            d = p.get("distribution", {})
            if not DIST_KEYS.issubset(d.keys()): errors.append(f"{p.get('id')}: incomplete distribution keys")
            inv = p.get("invasive", [])
            for item in inv:
                if not isinstance(item, dict) or not item.get("sourceUrl"):
                    errors.append(f"{p.get('id')}: invasive record missing sourceUrl")
    if errors:
        for e in errors[:50]: print("ERROR", e)
        raise SystemExit(f"Validation failed: {len(errors)} error(s)")
    print(f"Validated {total:,} species with no schema errors")


if __name__ == "__main__":
    main()
