#!/usr/bin/env python3
"""Download and prepare the upstream Plant Atlas data sources.

Production inputs:
- Kew WCVP: taxonomy + distribution backbone.
- Flora Codex WGSRPD GeoJSON: Level 3 botanical-region geometry.

The WGSRPD geometry is split into small GeoJSON shards because Cloudflare
Workers Static Assets has a hard 25 MiB limit per individual asset. The
shards are deliberately kept well below that limit.
"""
from __future__ import annotations

import argparse
import json
import shutil
import ssl
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

WCVP_URL = "https://sftp.kew.org/pub/data-repositories/WCVP/wcvp_dwca.zip"
WGSRPD_URL = (
    "https://github.com/floracodex/wgsrpd-geojson/releases/download/"
    "v1.0.0/wgsrpd-geojson-v1.0.0-combined.zip"
)
USER_AGENT = "PlantAtlasDataPipeline/4.0"

# Keep a generous margin below Cloudflare's 25 MiB per-static-asset limit.
MAX_SHARD_BYTES = 8 * 1024 * 1024


def download(url: str, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_suffix(out.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=300) as response, temp.open("wb") as f:
            total = int(response.headers.get("Content-Length") or 0)
            copied = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
                copied += len(chunk)
                if total and (
                    copied == total
                    or copied // (10 * 1024 * 1024)
                    != (copied - len(chunk)) // (10 * 1024 * 1024)
                ):
                    print(f"  {copied / (1024 * 1024):.0f}/{total / (1024 * 1024):.0f} MB")
        temp.replace(out)
    except Exception:
        temp.unlink(missing_ok=True)
        raise


def verify_wcvp_archive(archive: Path) -> None:
    if not zipfile.is_zipfile(archive):
        raise ValueError(f"Downloaded WCVP file is not a valid ZIP archive: {archive}")
    with zipfile.ZipFile(archive) as z:
        basenames = {Path(name).name.casefold() for name in z.namelist()}
        if not ({"wcvp_names.csv", "wcvp_taxon.csv"} & basenames):
            raise ValueError("WCVP archive is missing wcvp_names.csv/wcvp_taxon.csv")
        if "wcvp_distribution.csv" not in basenames:
            raise ValueError("WCVP archive is missing wcvp_distribution.csv")


def feature_codes(feature: dict) -> list[str]:
    p = feature.get("properties") or {}
    for key in ("LEVEL3_COD", "LEVEL3_COD_", "level3Code", "level3_cod", "code"):
        value = p.get(key)
        if value:
            return [str(value).strip().upper()]
    return []


def write_geojson_shard(out_dir: Path, index: int, features: list[dict]) -> tuple[str, int]:
    payload = {
        "type": "FeatureCollection",
        "features": features,
    }
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    size = len(raw)
    if size > MAX_SHARD_BYTES:
        raise ValueError(
            f"WGSRPD shard {index} is {size / (1024 * 1024):.2f} MiB, "
            f"above the configured {MAX_SHARD_BYTES / (1024 * 1024):.0f} MiB target"
        )
    filename = f"level3-{index:03d}.geojson"
    (out_dir / filename).write_bytes(raw)
    return filename, size


def split_level3_geojson(source: Path, out_dir: Path) -> None:
    """Split level3-all.geojson into independently deployable shards."""
    data = json.loads(source.read_text(encoding="utf-8"))
    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise ValueError("WGSRPD Level 3 file is not a FeatureCollection")

    # Replace any previous generated shards and any old single-file export.
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("level3-*.geojson"):
        old.unlink()
    (out_dir / "index.json").unlink(missing_ok=True)

    legacy = out_dir.parent / "level3.geojson"
    legacy.unlink(missing_ok=True)

    shards: list[dict] = []
    current: list[dict] = []

    for feature in data["features"]:
        candidate = current + [feature]
        candidate_raw = json.dumps(
            {"type": "FeatureCollection", "features": candidate},
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")

        if current and len(candidate_raw) > MAX_SHARD_BYTES:
            filename, size = write_geojson_shard(out_dir, len(shards), current)
            shards.append(
                {
                    "file": filename,
                    "bytes": size,
                    "features": len(current),
                    "codes": sorted({code for f in current for code in feature_codes(f)}),
                }
            )
            current = [feature]
        else:
            current = candidate

    if current:
        filename, size = write_geojson_shard(out_dir, len(shards), current)
        shards.append(
            {
                "file": filename,
                "bytes": size,
                "features": len(current),
                "codes": sorted({code for f in current for code in feature_codes(f)}),
            }
        )

    if not shards:
        raise ValueError("WGSRPD Level 3 file contained no features")

    manifest = {
        "schemaVersion": 1,
        "source": "WGSRPD Level 3 / Flora Codex v1.0.0",
        "sourceUrl": WGSRPD_URL,
        "featureCount": len(data["features"]),
        "shardCount": len(shards),
        "maxShardBytes": MAX_SHARD_BYTES,
        "files": [s["file"] for s in shards],
        "shards": shards,
    }
    # Flatten a code -> shard lookup so the frontend can use this later for
    # selective loading without scanning every geometry shard.
    code_to_shards: dict[str, list[str]] = {}
    for shard in shards:
        for code in shard["codes"]:
            code_to_shards.setdefault(code, []).append(shard["file"])
    manifest["codeToShards"] = code_to_shards

    (out_dir / "index.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    total = sum(s["bytes"] for s in shards)
    print(
        f"Prepared WGSRPD Level 3 geometry: {len(data['features']):,} features, "
        f"{len(shards)} shards, {total / (1024 * 1024):.2f} MiB total"
    )


def extract_level3(archive: Path, destination: Path) -> None:
    """Extract level3-all.geojson, then split it into deployable shards."""
    with zipfile.ZipFile(archive) as z:
        candidates = [
            name
            for name in z.namelist()
            if Path(name).name.lower() == "level3-all.geojson"
        ]
        if not candidates:
            raise FileNotFoundError(
                "WGSRPD release archive does not contain level3-all.geojson"
            )
        member = candidates[0]
        temp_source = archive.parent / "level3-all.geojson.part"
        try:
            with z.open(member) as src, temp_source.open("wb") as dst:
                shutil.copyfileobj(src, dst)
            split_level3_geojson(temp_source, destination)
        finally:
            temp_source.unlink(missing_ok=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="source-downloads")
    ap.add_argument("--map-out", default="data/level3")
    ap.add_argument("--wcvp", action="store_true")
    ap.add_argument("--wgsrpd", action="store_true")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    root = Path(args.dir)
    if args.all or args.wcvp:
        target = root / "wcvp_dwca.zip"
        print("Downloading current WCVP archive from Kew…")
        download(WCVP_URL, target)
        verify_wcvp_archive(target)
        print(f"Saved and verified {target}")

    if args.all or args.wgsrpd:
        archive = root / "wgsrpd-geojson-v1.0.0-combined.zip"
        print("Downloading WGSRPD Level 3 geometry (Flora Codex v1.0.0)…")
        download(WGSRPD_URL, archive)
        if not zipfile.is_zipfile(archive):
            raise ValueError(f"Downloaded WGSRPD file is not a valid ZIP archive: {archive}")
        destination = Path(args.map_out)
        if destination.suffix.casefold() == ".geojson":
            destination = destination.with_suffix("")
        extract_level3(archive, destination)
        print(f"Saved WGSRPD Level 3 shards to {destination}")

    if not (args.all or args.wcvp or args.wgsrpd):
        ap.error("Choose --wcvp, --wgsrpd, or --all")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as exc:
        raise SystemExit(
            f"Download failed with HTTP {exc.code} for {exc.url}. "
            "Check the source URL or your internet connection."
        )
    except urllib.error.URLError as exc:
        raise SystemExit(f"Download failed: {exc.reason}")
