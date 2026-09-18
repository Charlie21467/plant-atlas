#!/usr/bin/env python3
"""Import up to N accepted WCVP species into a static Plant Atlas catalog.

WCVP is the authoritative taxonomy/distribution input. The importer never
turns an introduced distribution into an invasive classification.
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
import tempfile
import zipfile
from datetime import date
from pathlib import Path


def norm(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def clean_key(value: object) -> str:
    return str(value).strip().casefold() if value is not None else ""


def find_member(z: zipfile.ZipFile, exact: str) -> str:
    wanted = exact.casefold()
    for name in z.namelist():
        if Path(name).name.casefold() == wanted:
            return name
    raise FileNotFoundError(f"{exact} not found in WCVP archive")


def get_field(row: dict[object, object], *names: str) -> str | None:
    """Read a field safely even when malformed CSV rows contain extra columns.

    Python's DictReader uses None as the key for extra values. The previous
    importer called .lower() on every key, which crashed on such rows.
    """
    values = {
        clean_key(key): value
        for key, value in row.items()
        if key is not None
    }
    for name in names:
        key = clean_key(name)
        if key in values:
            return norm(values[key])
    return None


def truthy(value: str | None) -> bool:
    return clean_key(value) in {"1", "true", "yes", "y", "t"}


def existing_names() -> set[str]:
    path = Path("data/plants.json")
    if not path.exists():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return set()
    if not isinstance(data, list):
        return set()
    return {
        str(p.get("scientificName") or p.get("scientific") or "").strip().casefold()
        for p in data
        if isinstance(p, dict) and (p.get("scientificName") or p.get("scientific"))
    }


def detect_delimiter(path: Path) -> str:
    """Detect the delimiter used by a WCVP tabular file.

    Current WCVP releases use pipe-delimited files, while some older/local
    exports use comma-delimited CSV. Inspecting the first non-empty line keeps
    the importer compatible with both forms.
    """
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        for line in f:
            if line.strip():
                return "|" if line.count("|") > line.count(",") else ","
    raise ValueError(f"Empty WCVP file: {path}")


def dict_rows(path: Path):
    """Yield rows safely for both current pipe-delimited and CSV exports."""
    delimiter = detect_delimiter(path)
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        # Current WCVP is pipe-delimited. quotechar='\0' prevents embedded
        # literal quotation marks in taxon text from being treated as quoting.
        kwargs = {"delimiter": delimiter}
        if delimiter == "|":
            kwargs["quoting"] = csv.QUOTE_NONE
        reader = csv.DictReader(f, **kwargs)
        for row in reader:
            # DictReader stores any extra CSV fields under a None key. Drop it
            # rather than allowing one malformed row to abort a 10,000-species
            # import. Named columns remain intact.
            row.pop(None, None)
            yield row


def scientific_name_from_row(row: dict[object, object]) -> str | None:
    """Return WCVP's canonical taxon name, with a safe legacy fallback."""
    direct = get_field(row, "taxon_name")
    if direct:
        return direct

    genus = get_field(row, "genus")
    species = get_field(row, "species")
    if genus and species:
        return f"{genus} {species}".strip()
    return genus or species


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", required=True)
    ap.add_argument("--out", default="data/catalog")
    ap.add_argument("--limit", type=int, default=10000)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--shard-size", type=int, default=500)
    args = ap.parse_args()

    if args.limit <= 0:
        raise SystemExit("--limit must be positive")
    if args.offset < 0:
        raise SystemExit("--offset cannot be negative")
    if args.shard_size <= 0:
        raise SystemExit("--shard-size must be positive")

    src = Path(args.zip)
    if not src.exists():
        raise SystemExit(f"WCVP archive not found: {src}")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="plant-atlas-wcvp-"))
    previous_names = existing_names()

    try:
        with zipfile.ZipFile(src) as z:
            names_member = None
            for candidate in ("wcvp_names.csv", "wcvp_taxon.csv"):
                try:
                    names_member = find_member(z, candidate)
                    break
                except FileNotFoundError:
                    continue
            if names_member is None:
                raise FileNotFoundError(
                    "Neither wcvp_names.csv nor wcvp_taxon.csv was found in the WCVP archive"
                )

            dist_member = find_member(z, "wcvp_distribution.csv")
            z.extract(names_member, work)
            z.extract(dist_member, work)
            names_path = work / names_member
            dist_path = work / dist_member

        # Compact distribution lookup keyed by plant_name_id.
        dists: dict[str, dict[str, set[str]]] = {}
        for row in dict_rows(dist_path):
            plant_id = get_field(row, "plant_name_id")
            code = get_field(row, "area_code_l3", "LEVEL3_COD", "area_code")
            if not plant_id or not code:
                continue

            bucket = dists.setdefault(
                plant_id,
                {"native": set(), "introduced": set(), "extinct": set(), "doubtful": set()},
            )

            # Keep categories mutually exclusive in this order. These fields
            # describe WCVP's distribution record; none is inferred to be invasive.
            if truthy(get_field(row, "introduced")):
                bucket["introduced"].add(code)
            elif truthy(get_field(row, "extinct")):
                bucket["extinct"].add(code)
            elif truthy(get_field(row, "location_doubtful")):
                bucket["doubtful"].add(code)
            else:
                bucket["native"].add(code)

        records: list[dict] = []
        seen_names: set[str] = set()
        eligible_seen = 0
        selected = 0

        for row in dict_rows(names_path):
            rank = clean_key(get_field(row, "taxon_rank"))
            status = clean_key(get_field(row, "taxon_status"))
            plant_id = get_field(row, "plant_name_id") or ""
            accepted_id = get_field(row, "accepted_plant_name_id")

            # WCVP releases have used both explicit taxon_status values and the
            # accepted_plant_name_id relationship. Accept either strong signal:
            # an explicit Accepted row, or a self-linked accepted plant_name_id.
            is_accepted = status == "accepted" or bool(
                plant_id and accepted_id and clean_key(accepted_id) == clean_key(plant_id)
            )
            if rank != "species" or not is_accepted:
                continue

            taxon_name = scientific_name_from_row(row)
            if not taxon_name:
                continue

            key = clean_key(taxon_name)
            if key in seen_names or key in previous_names:
                continue
            seen_names.add(key)

            if eligible_seen < args.offset:
                eligible_seen += 1
                continue
            if selected >= args.limit:
                break

            eligible_seen += 1
            selected += 1

            dist = dists.get(
                plant_id,
                {"native": set(), "introduced": set(), "extinct": set(), "doubtful": set()},
            )

            powo_id = get_field(row, "powo_id")
            record = {
                "id": f"wcvp-{plant_id}",
                "scientificName": taxon_name,
                "scientificNameAuthorship": get_field(row, "taxon_authors"),
                "family": get_field(row, "family"),
                "genus": get_field(row, "genus"),
                "rank": "SPECIES",
                "taxonomicStatus": "Accepted",
                "wcvp": {
                    "plantNameId": plant_id,
                    "ipniId": get_field(row, "ipni_id"),
                    "powoId": powo_id,
                    "powoUrl": f"https://powo.science.kew.org/taxon/{powo_id}" if powo_id else None,
                },
                "commonNames": [],
                "distribution": {name: sorted(values) for name, values in dist.items()},
                "invasive": [],
                "gbif": {"taxonKey": None, "matchType": None, "matchedName": None},
                "sources": [
                    {
                        "provider": "Royal Botanic Gardens, Kew",
                        "type": "taxonomy",
                        "url": "https://powo.science.kew.org/about-wcvp",
                        "accessed": str(date.today()),
                    },
                    {
                        "provider": "World Checklist of Vascular Plants",
                        "type": "native_distribution",
                        "url": "https://powo.science.kew.org/about-wcvp",
                        "accessed": str(date.today()),
                    },
                ],
            }
            records.append(record)

        # Clean old generated output so a fresh import cannot leave stale shards.
        for old in out.glob("species-*.json"):
            old.unlink()
        for old in (out / "index.json", out / "search-index.json"):
            old.unlink(missing_ok=True)

        shards = []
        index_rows = []
        for i in range(0, len(records), args.shard_size):
            shard = records[i : i + args.shard_size]
            filename = f"species-{i // args.shard_size:04d}.json"
            (out / filename).write_text(
                json.dumps(shard, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            shards.append(
                {
                    "file": filename,
                    "count": len(shard),
                    "first": i,
                    "last": i + len(shard) - 1,
                }
            )
            for offset, record in enumerate(shard):
                index_rows.append(
                    {
                        "id": record["id"],
                        "scientificName": record["scientificName"],
                        "family": record.get("family"),
                        "shard": filename,
                        "offset": offset,
                    }
                )

        (out / "index.json").write_text(
            json.dumps(
                {
                    "schemaVersion": 2,
                    "generated": str(date.today()),
                    "source": "WCVP / Plants of the World Online",
                    "count": len(records),
                    "shards": shards,
                    "species": index_rows,
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        print(f"Imported {len(records):,} WCVP accepted species into {out}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
