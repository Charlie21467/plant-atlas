#!/usr/bin/env python3
"""Optionally add English vernacular names from GBIF to catalog records.

Run after match_gbif.py. This is an enrichment layer only; WCVP remains the
taxonomic/distribution authority. The endpoint is documented by GBIF.
"""
from __future__ import annotations
import argparse, json, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path


def fetch_names(key: str) -> list[dict]:
    url = f"https://api.gbif.org/v1/species/{urllib.parse.quote(str(key), safe='')}/vernacularNames"
    req = urllib.request.Request(url, headers={"User-Agent": "PlantAtlasDataPipeline/2.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        payload = json.load(r)
    out=[]
    for item in payload.get("results", []):
        name = (item.get("vernacularName") or "").strip()
        lang = (item.get("language") or "").lower()
        if name and (lang in ("en", "eng", "") or item.get("preferred") is True):
            out.append({"name": name, "language": item.get("language"), "source": "GBIF"})
    seen=set(); dedup=[]
    for x in out:
        k=(x["name"].lower(), x.get("language"))
        if k not in seen:
            seen.add(k); dedup.append(x)
    return dedup[:20]


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--catalog",default="data/catalog")
    ap.add_argument("--max",type=int,default=10000)
    ap.add_argument("--delay",type=float,default=0.2)
    args=ap.parse_args()
    root=Path(args.catalog); processed=0; enriched=0
    idx=json.loads((root/"index.json").read_text(encoding="utf-8"))
    for shard_meta in idx["shards"]:
        path=root/shard_meta["file"]; rows=json.loads(path.read_text(encoding="utf-8")); changed=False
        for p in rows:
            if processed >= args.max: break
            key=p.get("gbif",{}).get("taxonKey")
            if not key:
                processed += 1; continue
            current=p.get("commonNames") or []
            if current:
                processed += 1; continue
            try:
                names=fetch_names(str(key))
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
                print(f"GBIF vernacular-name lookup failed for {p.get('scientificName')}: {e}")
                processed += 1; time.sleep(args.delay); continue
            if names:
                p["commonNames"]=names; changed=True; enriched += 1
            processed += 1; time.sleep(max(0,args.delay))
        if changed:
            path.write_text(json.dumps(rows,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
        if processed >= args.max: break
    print(f"Enriched {enriched:,} species with at least one GBIF vernacular name")

if __name__ == "__main__": main()
