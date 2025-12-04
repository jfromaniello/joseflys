#!/usr/bin/env python3
"""
Add elevation data to argentina.json using Open Elevation API.
Elevations are converted from meters to feet.
"""

import json
import time
import urllib.request
import urllib.error

INPUT_FILE = "data/ad-lads/argentina.json"
BATCH_SIZE = 100  # API supports multiple locations per request
METERS_TO_FEET = 3.28084

def fetch_elevations(locations: list[tuple[float, float]]) -> list[int | None]:
    """Fetch elevations for a batch of locations."""
    if not locations:
        return []

    # Build query string: lat,lon|lat,lon|...
    loc_str = "|".join(f"{lat},{lon}" for lat, lon in locations)
    url = f"https://api.open-elevation.com/api/v1/lookup?locations={loc_str}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "elevation-fetcher/1.0"})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())

        elevations = []
        for result in data.get("results", []):
            elev_m = result.get("elevation")
            if elev_m is not None:
                elev_ft = round(elev_m * METERS_TO_FEET)
                elevations.append(elev_ft)
            else:
                elevations.append(None)
        return elevations
    except (urllib.error.URLError, json.JSONDecodeError, KeyError) as e:
        print(f"  Error fetching batch: {e}")
        return [None] * len(locations)

def main():
    # Load data
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = data["data"]
    total = len(records)
    print(f"Processing {total} records in batches of {BATCH_SIZE}...")

    # Process in batches
    for i in range(0, total, BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        locations = [(r["lat"], r["lon"]) for r in batch]

        print(f"  Batch {i // BATCH_SIZE + 1}/{(total + BATCH_SIZE - 1) // BATCH_SIZE}...", end=" ", flush=True)
        elevations = fetch_elevations(locations)

        # Assign elevations to records
        for j, elev in enumerate(elevations):
            records[i + j]["elevation"] = elev

        success = sum(1 for e in elevations if e is not None)
        print(f"{success}/{len(batch)} OK")

        # Rate limiting
        time.sleep(0.5)

    # Save updated data
    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Summary
    with_elev = sum(1 for r in records if r.get("elevation") is not None)
    print(f"\nDone! {with_elev}/{total} records have elevation data.")

if __name__ == "__main__":
    main()
