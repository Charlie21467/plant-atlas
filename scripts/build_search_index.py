#!/usr/bin/env python3
"""Build a compact client-side search index from catalog shards."""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path("data/catalog")
INDEX = ROOT / "index.json"
OUT = ROOT / "search-index.json"


def text(v):
    return str(v or "").strip()


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("catalog", nargs="?", default=str(ROOT))
    args = ap.parse_args()
    root = Path(args.catalog)
    index_path = root / "index.json"
    out_path = root / "search-index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    rows = []
    for shard_meta in index.get("shards", []):
        shard = json.loads((root / shard_meta["file"]).read_text(encoding="utf-8"))
        for offset, p in enumerate(shard):
            names = p.get("commonNames") or []
            common = " ".join((n.get("name", "") if isinstance(n, dict) else str(n)) for n in names)
            search_text = " ".join([text(common), text(p.get("scientificName")), text(p.get("family")), text(p.get("genus"))]).lower()
            rows.append({
                "id": p["id"],
                "t": search_text,
                "o": offset,
                "s": shard_meta["file"]
            })
    out_path.write_text(json.dumps({"schemaVersion": 1, "count": len(rows), "species": rows}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Built search index for {len(rows):,} species")


if __name__ == "__main__":
    main()
