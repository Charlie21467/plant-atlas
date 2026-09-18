# Plant Atlas data pipeline

Plant Atlas separates six concepts so the map never silently turns an observation into an invasive-range claim:

- **Taxonomy** — Kew WCVP / Plants of the World Online (POWO).
- **Native + introduced distribution** — WCVP / POWO botanical-country (TDWG Level 3) distribution.
- **Observed occurrences** — GBIF, queried on demand after a plant has been matched to the current Catalogue of Life Extended Release (COL XR) taxonomy.
- **Invasive status** — explicit records in `data/sources/invasive.csv`, each with a source URL. There is no automatic "introduced = invasive" rule.
- **Geometry** — WGSRPD Level 3 GeoJSON for the botanical-country polygons used by WCVP/POWO.
- **Validation** — schema checks, uniqueness checks, accepted-species checks, and a required source URL for every invasive classification.

## 10,000-species import

Run from the project root:

Windows:

```bat
import_10000.bat
```

The Windows script stops at the first failed stage and always pauses at the end so you can copy any error output.

macOS/Linux:

```bash
./import_10000.sh
```

The pipeline will:

1. Download the current WCVP Darwin Core Archive from Kew.
2. Download the pinned Flora Codex WGSRPD Level 3 geometry release into `data/level3.geojson`.
   The importer automatically handles both current pipe-delimited WCVP tables and older comma-delimited exports, and derives the scientific name from WCVP `taxon_name` or the genus/species fields when necessary.
3. Select the first 10,000 accepted records at taxon rank Species, excluding the small prototype catalog where a scientific name already exists.
4. Write the catalog as 500-record shards under `data/catalog/`.
5. Match those 10,000 scientific names to GBIF's COL XR checklist.
6. Build a compact search index.
7. Validate the generated catalog.

The importer uses the live upstream archive when the command is run. This build does **not** pretend that a 10,000-species dataset is embedded when the upstream 84 MB archive could not be retrieved in the build environment.

## Static website behavior

The frontend loads only the small catalog index and search index at startup. When a user selects a species, it fetches exactly one shard and caches it. This keeps the site suitable for Cloudflare Pages/Workers Static Assets.

The Occurrence Records layer uses GBIF's occurrence-search API on demand. It is limited to 300 returned records per selected species; the frontend does not download or commit a global occurrence archive.

## Incremental batches

To import a later batch, change the importer offset. For example:

```bash
python3 scripts/import_wcvp.py \
  --zip source-downloads/wcvp_dwca.zip \
  --limit 10000 \
  --offset 10000
```

Then run:

```bash
python3 scripts/match_gbif.py --max 10000 --delay 0.2
python3 scripts/build_search_index.py
python3 scripts/validate_catalog.py
```

For a truly incremental production database, store the WCVP plant-name ID as the stable record ID and merge new WCVP releases rather than replacing the whole catalog.

## Invasive data

Add only explicit, source-backed records to:

```text
data/sources/invasive.csv
```

Schema:

```csv
scientific_name,tdwg_code,source,source_url,evidence
Hemerocallis fulva,USA,Iowa State University,https://example.org,Source explicitly describes the species as invasive/aggressive in the region.
```

CABI's Invasive Species Compendium is a useful global source for expert-reviewed invasive-species information, but Plant Atlas should store source links/claims rather than republish copyrighted datasheet text.

## Geometry note

The WCVP distribution fields use TDWG Level 3 botanical-country codes. The production download script uses the Flora Codex `wgsrpd-geojson` v1.0.0 release for Level 3 geometry. The release page provides a combined archive containing the Level 3 GeoJSON. That project states that its geometry is independently derived from Natural Earth and that its geographic assignments follow the published WGSRPD standard; its generated data are released under CC BY 4.0.

## Optional common-name enrichment

WCVP is primarily a scientific-name/taxonomy and distribution backbone. For English/common-name search, run the optional GBIF vernacular-name enrichment after GBIF matching:

```bash
python3 scripts/enrich_common_names.py --catalog data/catalog --max 10000 --delay 0.2
python3 scripts/build_search_index.py data/catalog
python3 scripts/validate_catalog.py data/catalog
```

GBIF documents `/v1/species/{usageKey}/vernacularNames` as the vernacular-name endpoint. Common names are retained as a separate GBIF-sourced field and never replace the WCVP scientific name.
