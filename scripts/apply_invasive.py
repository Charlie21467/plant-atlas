#!/usr/bin/env python3
"""Apply explicitly sourced invasive statuses from a curator CSV.

No invasive label is inferred from GBIF observations or WCVP introduced status.
"""
from __future__ import annotations
import argparse, csv, json
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", default="data/catalog")
    ap.add_argument("--csv", default="data/sources/invasive.csv")
    args = ap.parse_args()
    root = Path(args.catalog)
    rows_by_name = {}
    for shard in json.loads((root / "index.json").read_text(encoding="utf-8"))["shards"]:
        path = root / shard["file"]
        rows = json.loads(path.read_text(encoding="utf-8"))
        for row in rows:
            rows_by_name.setdefault(row["scientificName"].strip().lower(), []).append((path, rows, row))

    applied = 0
    with Path(args.csv).open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            name = (r.get("scientific_name") or "").strip()
            tdwg = (r.get("tdwg_code") or "").strip()
            source_url = (r.get("source_url") or "").strip()
            if not name or not tdwg or not source_url:
                continue
            record = {
                "tdwgCode": tdwg,
                "source": (r.get("source") or "").strip(),
                "sourceUrl": source_url,
                "evidence": (r.get("evidence") or "").strip(),
            }
            for path, rows, obj in rows_by_name.get(name.lower(), []):
                invasive = obj.setdefault("invasive", [])
                if record not in invasive:
                    invasive.append(record)
                    applied += 1
                path.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Applied {applied:,} new invasive records")


if __name__ == "__main__":
    main()
