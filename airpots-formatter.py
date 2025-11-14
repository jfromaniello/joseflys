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
            # Elegimos ICAO si existe, si no usamos ident como fallback
            icao = (row.get("icao_code") or "").strip()
            ident = (row.get("ident") or "").strip()

            code = icao or ident
            if not code:
                continue

            lat = row.get("latitude_deg")
            lon = row.get("longitude_deg")
            name = (row.get("name") or "").strip()

            # Si falta algo esencial, lo skippeamos
            if not lat or not lon or not name:
                continue

            try:
                lat_f = float(lat)
                lon_f = float(lon)
            except ValueError:
                continue

            # Formato compacto: [ICAO, lat, lon, name]
            airports.append([code, lat_f, lon_f, name])

    # Dump compacto (sin espacios) y UTF-8
    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(
            airports,
            f,
            ensure_ascii=False,          # guardamos nombres con acentos/palomitas bien
            separators=(",", ":")        # formato bien compacto
        )

    print(f"Wrote {len(airports)} airports to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
