#!/usr/bin/env python3
"""
Convert runways CSV to JSON indexed by ICAO code.
Each airport has an array of runways with compact field names.
"""

import csv
import json
import sys
from pathlib import Path

INPUT_FILE = Path.home() / "Downloads" / "runways.csv"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "runways.json"

# Surface abbreviations to reduce size
SURFACE_MAP = {
    "ASPH": "A",
    "ASPH-G": "AG",
    "CONC": "C",
    "CONC-G": "CG",
    "TURF": "T",
    "TURF-G": "TG",
    "TURF-F": "TF",
    "GRAVEL": "G",
    "GRVL": "G",
    "GVL": "G",
    "GRASS": "GR",
    "DIRT": "D",
    "WATER": "W",
    "SAND": "S",
    "MATS": "M",
}


def parse_float(val: str) -> float | None:
    """Parse float, return None if empty."""
    if not val or val.strip() == "":
        return None
    try:
        return float(val)
    except ValueError:
        return None


def parse_int(val: str) -> int | None:
    """Parse int, return None if empty."""
    if not val or val.strip() == "":
        return None
    try:
        return int(float(val))
    except ValueError:
        return None


def abbrev_surface(surface: str) -> str:
    """Abbreviate surface type."""
    s = surface.upper().strip()
    return SURFACE_MAP.get(s, s[:3] if s else "")


def build_runway_end(row: dict, prefix: str) -> dict | None:
    """Build runway end dict from CSV row."""
    ident = row.get(f"{prefix}_ident", "").strip()
    if not ident:
        return None

    end = {"id": ident}

    lat = parse_float(row.get(f"{prefix}_latitude_deg", ""))
    lon = parse_float(row.get(f"{prefix}_longitude_deg", ""))
    if lat is not None:
        end["lat"] = round(lat, 6)
    if lon is not None:
        end["lon"] = round(lon, 6)

    elev = parse_int(row.get(f"{prefix}_elevation_ft", ""))
    if elev is not None:
        end["elev"] = elev

    hdg = parse_float(row.get(f"{prefix}_heading_degT", ""))
    if hdg is not None:
        end["hdg"] = round(hdg, 1)

    dt = parse_int(row.get(f"{prefix}_displaced_threshold_ft", ""))
    if dt is not None and dt > 0:
        end["dt"] = dt

    return end


def main():
    if not INPUT_FILE.exists():
        print(f"Error: {INPUT_FILE} not found")
        sys.exit(1)

    runways_by_icao: dict[str, list] = {}

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            icao = row.get("airport_ident", "").strip()
            if not icao:
                continue

            runway = {}

            # Length and width
            length = parse_int(row.get("length_ft", ""))
            width = parse_int(row.get("width_ft", ""))
            if length:
                runway["l"] = length
            if width:
                runway["w"] = width

            # Surface
            surface = row.get("surface", "").strip()
            if surface:
                runway["s"] = abbrev_surface(surface)

            # Lighted and closed
            lighted = row.get("lighted", "0")
            closed = row.get("closed", "0")
            if lighted == "1":
                runway["lit"] = 1
            if closed == "1":
                runway["cls"] = 1

            # Runway ends
            le = build_runway_end(row, "le")
            he = build_runway_end(row, "he")
            if le:
                runway["le"] = le
            if he:
                runway["he"] = he

            # Only add if we have at least one end
            if le or he:
                if icao not in runways_by_icao:
                    runways_by_icao[icao] = []
                runways_by_icao[icao].append(runway)

    # Sort by ICAO
    sorted_data = dict(sorted(runways_by_icao.items()))

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted_data, f, separators=(",", ":"))

    # Stats
    total_airports = len(sorted_data)
    total_runways = sum(len(v) for v in sorted_data.values())
    size_kb = OUTPUT_FILE.stat().st_size / 1024

    print(f"Done! {total_airports} airports, {total_runways} runways")
    print(f"Output: {OUTPUT_FILE} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
