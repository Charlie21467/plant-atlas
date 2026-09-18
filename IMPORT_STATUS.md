# Import status

This project contains the **pipeline for generating the 10,000-species Plant Atlas catalog**. The generated WCVP/GBIF catalog is intentionally not bundled in this ZIP because it is built from live upstream data when you run the importer.

The previous Windows importer had two failure points:

1. The WGSRPD download used a retired GitHub `latest/download/level3-all.geojson` URL and returned HTTP 404.
2. The WCVP CSV importer assumed every CSV row had exactly the same number of columns. A row with extra CSV fields creates a `None` key in Python's `csv.DictReader`, which caused the old importer to fail on `None.lower()`.

This build fixes both problems and changes the Windows batch flow so it **stops at the first failed step, reports the failure, and always pauses before closing**.

## Sources used by the import

- WCVP: current Kew archive at `https://sftp.kew.org/pub/data-repositories/WCVP/wcvp_dwca.zip`
- WGSRPD Level 3 geometry: Flora Codex `wgsrpd-geojson` release v1.0.0, combined archive
- GBIF: species matching using the COL XR checklist configured in `scripts/match_gbif.py`
- Curated invasive records: `data/sources/invasive.csv`

Run `import_10000.bat` from the project root on Windows. The script itself pauses when the process succeeds or fails, so the output can be copied directly from the console.
