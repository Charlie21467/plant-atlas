# Plant Atlas sources

## Kew / WCVP / POWO

Primary taxonomy and distribution source:

- https://powo.science.kew.org/about-wcvp
- https://powo.science.kew.org/about
- https://sftp.kew.org/pub/data-repositories/WCVP/

WCVP provides accepted vascular-plant names and native/introduced wild distributions. POWO documents those distributions using TDWG geographical codes at Level 3.

## GBIF / Catalogue of Life Extended Release

- https://techdocs.gbif.org/en/openapi/v1/occurrence
- https://techdocs.gbif.org/en/openapi/v2/species
- https://data-blog.gbif.org/post/catalogue-of-life-taxonomic-backbone/

Plant Atlas uses COL XR for the species-matching step because GBIF changed its default occurrence-taxonomy organization to COL XR in 2026. The checklist key is configured in `scripts/match_gbif.py`.

## Invasive-species evidence

- https://www.cabi.org/isc/
- https://www.cabi.org/projects/invasive-species-data/

CABI describes ISC invasive-species datasheets as expert compiled and peer reviewed. Plant Atlas keeps invasive status separate from WCVP's introduced status.

## WGSRPD geometry

- https://www.tdwg.org/standards/wgsrpd/
- https://github.com/floracodex/wgsrpd-geojson

The runtime map uses Level 3 botanical-country polygons so the WCVP distribution codes can be displayed directly. The clean-room geometry project documents its provenance and CC BY 4.0 release terms in its README.

