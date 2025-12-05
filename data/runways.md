# Runways Data Format

JSON file indexed by ICAO code. Each airport contains an array of runways.

## Source

OurAirports dataset: https://ourairports.com/data/

## Structure

```json
{
  "ICAO": [
    {
      "l": 10827,
      "w": 197,
      "s": "ASP",
      "lit": 1,
      "cls": 1,
      "le": { "id": "11", "lat": -34.819, "lon": -58.553, "elev": 62, "hdg": 102.3, "dt": 500 },
      "he": { "id": "29", "lat": -34.825, "lon": -58.518, "elev": 66, "hdg": 282.3 }
    }
  ]
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `l` | int | Length (ft) |
| `w` | int | Width (ft) |
| `s` | string | Surface type (see below) |
| `lit` | int | Lighted (1 = yes, omitted if no) |
| `cls` | int | Closed (1 = yes, omitted if no) |
| `le` | object | Low-end threshold |
| `he` | object | High-end threshold |

### Runway End Fields (le/he)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Runway identifier (e.g., "11", "29", "04L") |
| `lat` | float | Latitude (decimal degrees) |
| `lon` | float | Longitude (decimal degrees) |
| `elev` | int | Elevation (ft) |
| `hdg` | float | True heading (degrees) |
| `dt` | int | Displaced threshold (ft), omitted if 0 |

## Surface Categories

Standardized surface categories for takeoff performance calculations.

| Code | Name | Description | Ground Roll Factor | Obstacle Factor |
|------|------|-------------|-------------------|-----------------|
| PG | Pavement Good | Asphalt, concrete in good condition | 1.00 | 1.00 |
| PP | Pavement Poor | PSP, deteriorated pavement, metal mats | 1.05 | 1.03 |
| GG | Grass Good | Short, firm turf | 1.20 | 1.14 |
| GF | Grass Fair | Long grass, bumps, wet conditions | 1.38 | 1.28 |
| GV | Gravel | Gravel, stone, crushed rock | 1.28 | 1.18 |
| DT | Dirt | Earth, clay, soil, laterite | 1.25 | 1.15 |
| SD | Sand | Sand (severe performance penalty) | 1.60 | 1.30 |
| WT | Water | Water (NO-GO for wheeled aircraft) | ∞ | ∞ |
| null | Unknown | Unidentified surface | - | - |
