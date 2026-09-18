#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "================================================"
echo "Plant Atlas - 10,000 species data import"
echo "================================================"
echo

command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3 was not found."; exit 1; }
mkdir -p source-downloads

python3 scripts/download_sources.py --all --dir source-downloads --map-out data/level3
python3 scripts/import_wcvp.py --zip source-downloads/wcvp_dwca.zip --limit 10000 --out data/catalog
test -f data/catalog/index.json
python3 scripts/match_gbif.py --catalog data/catalog --max 10000 --delay 0.2
python3 scripts/apply_invasive.py --catalog data/catalog --csv data/sources/invasive.csv
python3 scripts/build_search_index.py data/catalog
python3 scripts/validate_catalog.py data/catalog

echo
echo "Plant Atlas 10,000-species import completed."

python scripts/check_cloudflare_assets.py || exit 1
