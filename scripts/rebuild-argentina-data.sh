#!/bin/bash
# Rebuild Argentina aerodromes dataset with correct province assignments
#
# This script:
# 1. Downloads GADM province boundaries (if not present)
# 2. Builds the base dataset from OurAirports + ANAC PDF
# 3. Fixes province assignments using real polygon geometries
#
# Usage: ./scripts/rebuild-argentina-data.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"
CACHE_DIR="$DATA_DIR/osm-cache"
GEOJSON_FILE="$CACHE_DIR/argentina-provinces.geojson"

echo "========================================"
echo "Rebuilding Argentina Aerodromes Dataset"
echo "========================================"

# Step 1: Download GADM province boundaries if not present
if [ ! -f "$GEOJSON_FILE" ]; then
  echo ""
  echo "[1/3] Downloading GADM province boundaries..."
  mkdir -p "$CACHE_DIR"
  curl -sL "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ARG_1.json.zip" -o /tmp/argentina-gadm.zip
  unzip -o /tmp/argentina-gadm.zip -d /tmp/
  mv /tmp/gadm41_ARG_1.json "$GEOJSON_FILE"
  rm /tmp/argentina-gadm.zip
  echo "  Downloaded to $GEOJSON_FILE"
else
  echo ""
  echo "[1/3] GADM province boundaries already present"
fi

# Step 2: Build base dataset
echo ""
echo "[2/3] Building base dataset from OurAirports + ANAC..."
npx tsx "$SCRIPT_DIR/build-argentina-dataset.ts"

# Step 3: Fix province assignments using real geometries
echo ""
echo "[3/3] Fixing province assignments with point-in-polygon..."
npx tsx "$SCRIPT_DIR/fix-provinces-from-coordinates.ts"

echo ""
echo "========================================"
echo "Done! Dataset rebuilt successfully."
echo "========================================"
