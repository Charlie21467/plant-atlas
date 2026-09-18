#!/usr/bin/env python3
"""Fail when a file that Cloudflare would deploy is too large."""
from __future__ import annotations

import os
import sys
from pathlib import Path

LIMIT = 24 * 1024 * 1024  # 24 MiB safety threshold; Cloudflare allows 25 MiB.
SKIP_DIRS = {".git", "source-downloads", "node_modules", ".venv", "venv"}
SKIP_NAMES = {".DS_Store"}


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    bad: list[tuple[Path, int]] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name in SKIP_NAMES:
                continue
            path = Path(dirpath) / name
            try:
                size = path.stat().st_size
            except OSError:
                continue
            if size > LIMIT:
                bad.append((path.relative_to(root), size))

    if bad:
        print("ERROR: Cloudflare deployment contains oversized assets:")
        for path, size in bad:
            print(f"  {path} -> {size / (1024 * 1024):.2f} MiB")
        print("Each deployed static asset must be below Cloudflare's 25 MiB limit.")
        return 1

    print("Cloudflare asset-size check passed: no asset exceeds 24 MiB.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
