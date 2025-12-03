import csv
import json
from pathlib import Path
from sys import argv

source = argv[1] if len(argv) > 1 else "airports.csv"
dest = argv[2] if len(argv) > 2 else source.replace(".csv", ".json")

INPUT_FILE = Path(source)
OUTPUT_FILE = Path(dest)

def main():
    airports = []

    with INPUT_FILE.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Use ICAO if available, otherwise fallback to ident
            icao = (row.get("icao_code") or "").strip()
            ident = (row.get("ident") or "").strip()

            code = icao or ident
            if not code:
                continue

            lat = row.get("latitude_deg")
            lon = row.get("longitude_deg")
            name = (row.get("name") or "").strip()
            elevation = row.get("elevation_ft")

            # Skip if essential fields are missing
            if not lat or not lon or not name:
                continue

            try:
                lat_f = float(lat)
                lon_f = float(lon)
                elev_f = int(float(elevation)) if elevation else None
            except ValueError:
                continue

            # Compact format: [ICAO, lat, lon, name, elevation_ft]
            airports.append([code, lat_f, lon_f, name, elev_f])

    # Compact dump (no spaces) with UTF-8
    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(
            airports,
            f,
            ensure_ascii=False,          # preserve accents and special chars
            separators=(",", ":")        # compact format
        )

    print(f"Wrote {len(airports)} airports to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
