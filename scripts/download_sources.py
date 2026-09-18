#!/usr/bin/env python3
"""Download the upstream data used by the Plant Atlas import pipeline.

The production pipeline uses:
- Kew WCVP as the taxonomy + distribution backbone.
- Flora Codex's CC-BY WGSRPD GeoJSON release for Level 3 geometry.

The WGSRPD URL is pinned to a known release rather than using a broken
"latest/download/level3-all.geojson" asset URL.
"""
from __future__ import annotations

import argparse
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
USER_AGENT = "PlantAtlasDataPipeline/3.0"


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
                if total and (copied == total or copied // (10 * 1024 * 1024) != (copied - len(chunk)) // (10 * 1024 * 1024)):
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


def extract_level3(archive: Path, destination: Path) -> None:
    """Extract the combined WGSRPD Level 3 GeoJSON from the release ZIP."""
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
        destination.parent.mkdir(parents=True, exist_ok=True)
        temp = destination.with_suffix(destination.suffix + ".part")
        with z.open(member) as src, temp.open("wb") as dst:
            shutil.copyfileobj(src, dst)
        temp.replace(destination)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="source-downloads")
    ap.add_argument("--map-out", default="data/level3.geojson")
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
        extract_level3(archive, destination)
        print(f"Saved WGSRPD Level 3 map to {destination}")

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
