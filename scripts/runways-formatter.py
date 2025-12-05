#!/usr/bin/env python3
"""
Convert runways CSV to JSON indexed by ICAO code.
Each airport has an array of runways with compact field names.

Surface categories:
- PG: Pavement Good (asphalt, concrete, etc. in good condition)
- PP: Pavement Poor (PSP, deteriorated pavement)
- GG: Grass Good (turf, grass in good condition)
- GF: Grass Fair (irregular turf, sod)
- GV: Gravel
- DT: Dirt/Earth/Clay/Soil
- SD: Sand
- WT: Water
- null: Unknown/Unidentified
"""

import csv
import json
import sys
from pathlib import Path

INPUT_FILE = Path.home() / "Downloads" / "runways.csv"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "runways.json"

# Map raw surface codes to standardized categories
# PG = Pavement Good, PP = Pavement Poor, GG = Grass Good, GF = Grass Fair
# GV = Gravel, DT = Dirt, SD = Sand, WT = Water
SURFACE_CATEGORIES = {
    # Pavement Good - asphalt, concrete, etc.
    "A": "PG", "ASP": "PG", "ASF": "PG", "ASPH": "PG", "ASPH-G": "PG",
    "C": "PG", "CON": "PG", "CONC": "PG", "CONC-G": "PG", "CG": "PG",
    "TAR": "PG", "BIT": "PG", "MAC": "PG", "PAV": "PG",
    "AG": "PG", "CCN": "PG", "PFC": "PG", "PEM": "PG",
    "APS": "PG", "ASB": "PG", "C0N": "PG",  # typo for CON
    "BRI": "PG", "LIM": "PG", "B": "PG",  # brick, limestone
    "OON": "PG",  # typo for CON
    "PAD": "PG", "PAD/CON": "PG",  # helipad on concrete
    "ASPHALT": "PG", "CONCRETE": "PG", "BLACKTOP": "PG",
    "BLA": "PG",  # blacktop
    "'ASPHALT'": "PG", "'CONCRETE'": "PG",  # quoted versions
    "'AS": "PG", "'CO": "PG",  # truncated quoted versions
    "RAI": "PP",  # raised deck

    # Pavement Poor - PSP mats, old/deteriorated, rooftop
    "PSP": "PP", "M": "PP", "MAT": "PP", "MET": "PP", "ALU": "PP",
    "OIL": "PP", "STE": "PP", "PER": "PP",
    "ROO": "PP", "DEC": "PP", "NEO": "PP",  # rooftop, deck, neoprene
    "OLD": "PP", "ROU": "PP",  # old, rough
    "?ST": "PP",  # ?STEEL?
    "PCN": "PP",  # PCN typically indicates paved but may be older

    # Grass Good - well-maintained turf
    "T": "GG", "TUR": "GG", "TG": "GG", "TURF": "GG", "TURF-G": "GG",
    "GR": "GG", "GRS": "GG", "GRA": "GG", "GRASS": "GG",
    "G": "GG",  # Generic grass
    "TRT": "GG", "ERB": "GG", "HER": "GG",  # Spanish "hierba"
    "PAD/GRASS": "GG",  # helipad on grass

    # Grass Fair - irregular or poor turf
    "TF": "GF", "TURF-F": "GF", "SOD": "GF", "SOF": "GF",

    # Gravel
    "GRE": "GV", "GRV": "GV", "GRR": "GV", "GRVL": "GV", "GVL": "GV",
    "STO": "GV", "ROC": "GV", "COR": "GV", "PIE": "GV", "PIC": "GV",
    "PIÇ": "GV", "CRU": "GV", "LOO": "GV", "ROL": "GV",
    "ZAH": "GV", "OLI": "GV", "PAC": "GV",  # zahorra, oligravel, packed
    "YEL": "GV", "BRO": "GV", "RED": "GV",  # colored gravel (yellow, brown, red)
    "B/G": "GV",  # brick/gravel mix

    # Dirt / Earth / Clay / Soil
    "D": "DT", "DIR": "DT", "DIRT": "DT",
    "EAR": "DT", "SOI": "DT", "CLA": "DT", "SHA": "DT", "VOL": "DT",
    "TER": "DT", "NAT": "DT", "COM": "DT", "UNP": "DT",
    "MUR": "DT", "LOA": "DT", "HAR": "DT",
    "EER": "DT",  # typo for earth
    "SIL": "DT",  # silt
    "LAT": "DT",  # laterite (iron-rich soil)
    "U": "DT", "UNS": "DT", "UNSEALED": "DT",  # unpaved/unsealed
    "NOT": "DT",  # "NOT PAVED"

    # Sand
    "S": "SD", "SAN": "SD", "SAND": "SD",

    # Water / Ice
    "W": "WT", "WAT": "WT", "WATER": "WT",
    "SEA": "WT", "LAK": "WT", "MAR": "WT",
    "ICE": "WT", "BLU": "WT",  # ice, blue ice
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


def categorize_surface(surface: str) -> str | None:
    """Categorize surface type into standard categories.
    Returns None if surface cannot be identified."""
    s = surface.upper().strip()
    if not s:
        return None

    # Direct match
    if s in SURFACE_CATEGORIES:
        return SURFACE_CATEGORIES[s]

    # Try first 3 characters
    if len(s) >= 3 and s[:3] in SURFACE_CATEGORIES:
        return SURFACE_CATEGORIES[s[:3]]

    # Try first 2 characters
    if len(s) >= 2 and s[:2] in SURFACE_CATEGORIES:
        return SURFACE_CATEGORIES[s[:2]]

    # Try first character (for A, C, D, G, S, T, W)
    if len(s) >= 1 and s[0] in SURFACE_CATEGORIES:
        return SURFACE_CATEGORIES[s[0]]

    # Unidentified - return None
    return None


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
    unknown_surfaces: set[str] = set()

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

            # Surface - categorize into standard types
            surface_raw = row.get("surface", "").strip()
            surface_cat = categorize_surface(surface_raw)
            if surface_cat:
                runway["s"] = surface_cat
            # Track unidentified surfaces for stats
            if surface_raw and not surface_cat:
                unknown_surfaces.add(surface_raw.upper())

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

    if unknown_surfaces:
        print(f"\nUnidentified surfaces ({len(unknown_surfaces)}):")
        print(", ".join(sorted(unknown_surfaces)))


if __name__ == "__main__":
    main()
