import { describe, it, expect } from "vitest";
import * as Cesium from "cesium";
import type { QuantizedMeshTerrainData, Rectangle, TerrainProvider } from "cesium";
import {
  aerodromeFlattenRadii,
  createFlatteningTerrainProvider,
  flattenQuantizedMeshTile,
  readQuantizedMeshInternals,
  type FlattenZone,
} from "../app/replay/terrainFlattening";

const GRID = 9; // 9×9 vertices over the tile
const MAX_SHORT = 32767;

/** Bumpy synthetic heights in [500, 520], varying per vertex. */
function bumpyHeight(index: number): number {
  return 500 + (index % 5) * 5;
}

/** Builds a real QuantizedMeshTerrainData over `rect` with bumpy heights. */
function makeTile(rect: Rectangle, childTileMask = 5): QuantizedMeshTerrainData {
  const count = GRID * GRID;
  const u = new Uint16Array(count);
  const v = new Uint16Array(count);
  const h = new Uint16Array(count);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < count; i++) {
    const height = bumpyHeight(i);
    min = Math.min(min, height);
    max = Math.max(max, height);
  }
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const i = row * GRID + col;
      u[i] = Math.round((col / (GRID - 1)) * MAX_SHORT);
      v[i] = Math.round((row / (GRID - 1)) * MAX_SHORT);
      h[i] = Math.round(((bumpyHeight(i) - min) / (max - min)) * MAX_SHORT);
    }
  }
  const quantizedVertices = new Uint16Array(count * 3);
  quantizedVertices.set(u, 0);
  quantizedVertices.set(v, count);
  quantizedVertices.set(h, count * 2);

  const west: number[] = [];
  const south: number[] = [];
  const east: number[] = [];
  const north: number[] = [];
  for (let i = 0; i < GRID; i++) {
    west.push(i * GRID);
    east.push(i * GRID + GRID - 1);
    south.push(i);
    north.push((GRID - 1) * GRID + i);
  }

  const obb = Cesium.OrientedBoundingBox.fromRectangle(rect, min, max, Cesium.Ellipsoid.WGS84);
  return new Cesium.QuantizedMeshTerrainData({
    quantizedVertices,
    indices: Cesium.TerrainProvider.getRegularGridIndices(GRID, GRID),
    minimumHeight: min,
    maximumHeight: max,
    boundingSphere: Cesium.BoundingSphere.fromOrientedBoundingBox(obb),
    orientedBoundingBox: obb,
    horizonOcclusionPoint: new Cesium.Cartesian3(0.1, 0.1, 0.1),
    westIndices: west,
    southIndices: south,
    eastIndices: east,
    northIndices: north,
    westSkirtHeight: 10,
    southSkirtHeight: 10,
    eastSkirtHeight: 10,
    northSkirtHeight: 10,
    childTileMask,
  });
}

/** Dequantizes the heights of a tile back to meters. */
function decodeHeights(data: QuantizedMeshTerrainData): number[] {
  const mesh = readQuantizedMeshInternals(data);
  if (!mesh) throw new Error("unreadable mesh");
  const range = mesh.maximumHeight - mesh.minimumHeight;
  return Array.from(mesh.heightValues, (q) => mesh.minimumHeight + (range * q) / MAX_SHORT);
}

// ~2.2 km square tile centered on the "aerodrome".
const RECT = Cesium.Rectangle.fromDegrees(-64.21, -31.41, -64.19, -31.39);
const CENTER = { lat: -31.4, lon: -64.2 };
const ZONE: FlattenZone = { ...CENTER, heightM: 480, innerRadiusM: 400, outerRadiusM: 900 };

describe("readQuantizedMeshInternals (Cesium version canary)", () => {
  it("reads every private field this feature depends on", () => {
    const mesh = readQuantizedMeshInternals(makeTile(RECT));
    expect(mesh).not.toBeNull();
    expect(mesh!.uValues.length).toBe(GRID * GRID);
    expect(mesh!.heightValues.length).toBe(GRID * GRID);
    expect(mesh!.childTileMask).toBe(5);
    expect(mesh!.westIndices.length).toBe(GRID);
  });
});

describe("flattenQuantizedMeshTile", () => {
  const flattened = flattenQuantizedMeshTile(Cesium, makeTile(RECT), RECT, [ZONE]);
  const heights = decodeHeights(flattened);
  const original = decodeHeights(makeTile(RECT));
  const centerIdx = Math.floor((GRID * GRID) / 2); // grid center ≈ zone center

  it("pins vertices inside the inner radius to the target height", () => {
    expect(heights[centerIdx]).toBeCloseTo(ZONE.heightM, 2);
  });

  it("leaves vertices beyond the outer radius untouched", () => {
    // Corners are ~1.5 km from the center, beyond the 900 m outer radius.
    for (const corner of [0, GRID - 1, GRID * (GRID - 1), GRID * GRID - 1]) {
      expect(heights[corner]).toBeCloseTo(original[corner], 2);
    }
  });

  it("blends smoothly in the falloff ring", () => {
    // One step from center (~275 m... within inner) and the ring at ~550 m.
    const ringIdx = centerIdx + 2; // two columns east ≈ 550 m: inside the blend
    expect(heights[ringIdx]).toBeGreaterThan(ZONE.heightM);
    expect(heights[ringIdx]).toBeLessThan(original[ringIdx]);
  });

  it("preserves the child tile mask, indices and skirts", () => {
    const before = readQuantizedMeshInternals(makeTile(RECT))!;
    const after = readQuantizedMeshInternals(flattened)!;
    expect(after.childTileMask).toBe(before.childTileMask);
    expect(Array.from(after.indices)).toEqual(Array.from(before.indices));
    expect(after.westSkirtHeight).toBe(before.westSkirtHeight);
    expect(after.westIndices).toEqual(before.westIndices);
  });

  it("keeps min/max consistent with the rewritten vertices", () => {
    const mesh = readQuantizedMeshInternals(flattened)!;
    expect(mesh.minimumHeight).toBeLessThanOrEqual(Math.min(...heights) + 0.01);
    expect(mesh.maximumHeight).toBeGreaterThanOrEqual(Math.max(...heights) - 0.01);
    expect(mesh.minimumHeight).toBeCloseTo(ZONE.heightM, 1);
  });

  it("returns the original tile when no zone touches it", () => {
    const tile = makeTile(RECT);
    const farZone: FlattenZone = { lat: 10, lon: 10, heightM: 0, innerRadiusM: 400, outerRadiusM: 900 };
    expect(flattenQuantizedMeshTile(Cesium, tile, RECT, [farZone])).toBe(tile);
  });
});

describe("createFlatteningTerrainProvider", () => {
  function makeFakeProvider(tileForRect: (rect: Rectangle) => QuantizedMeshTerrainData): TerrainProvider {
    const tilingScheme = new Cesium.GeographicTilingScheme();
    return {
      errorEvent: new Cesium.Event(),
      credit: undefined,
      tilingScheme,
      hasWaterMask: false,
      hasVertexNormals: false,
      availability: undefined,
      getLevelMaximumGeometricError: () => 10,
      getTileDataAvailable: () => true,
      loadTileDataAvailability: () => undefined,
      requestTileGeometry: (x: number, y: number, level: number) =>
        Promise.resolve(tileForRect(tilingScheme.tileXYToRectangle(x, y, level))),
    } as unknown as TerrainProvider;
  }

  it("returns the inner provider unwrapped when there are no zones", () => {
    const inner = makeFakeProvider((rect) => makeTile(rect));
    expect(createFlatteningTerrainProvider(Cesium, inner, [])).toBe(inner);
  });

  it("flattens tiles that intersect a zone and passes others through", async () => {
    const tiles = new Map<string, QuantizedMeshTerrainData>();
    const inner = makeFakeProvider((rect) => {
      const tile = makeTile(rect);
      tiles.set(`${rect.west},${rect.south}`, tile);
      return tile;
    });
    const provider = createFlatteningTerrainProvider(Cesium, inner, [ZONE]);

    const level = 12;
    const scheme = inner.tilingScheme;
    const hit = scheme.positionToTileXY(Cesium.Cartographic.fromDegrees(CENTER.lon, CENTER.lat), level)!;
    const hitData = (await provider.requestTileGeometry(hit.x, hit.y, level))!;
    const hitRect = scheme.tileXYToRectangle(hit.x, hit.y, level);
    expect(hitData).not.toBe(tiles.get(`${hitRect.west},${hitRect.south}`));
    const flattenedHeights = decodeHeights(hitData as QuantizedMeshTerrainData);
    expect(Math.min(...flattenedHeights)).toBeCloseTo(ZONE.heightM, 1);

    // A tile on the other side of the planet passes through by identity.
    const miss = scheme.positionToTileXY(Cesium.Cartographic.fromDegrees(120, 40), level)!;
    const missData = await provider.requestTileGeometry(miss.x, miss.y, level);
    const missRect = scheme.tileXYToRectangle(miss.x, miss.y, level);
    expect(missData).toBe(tiles.get(`${missRect.west},${missRect.south}`));
  });
});

describe("aerodromeFlattenRadii", () => {
  it("uses a floor for unknown runway lengths", () => {
    expect(aerodromeFlattenRadii(null)).toEqual({ innerRadiusM: 900, outerRadiusM: 2100 });
    expect(aerodromeFlattenRadii(undefined)).toEqual({ innerRadiusM: 900, outerRadiusM: 2100 });
  });

  it("grows the disc to cover long runways", () => {
    // 10,000 ft ≈ 3,048 m → half-length 1,524 m + 300 m margin.
    const { innerRadiusM, outerRadiusM } = aerodromeFlattenRadii(10000);
    expect(innerRadiusM).toBeCloseTo(1824, 0);
    expect(outerRadiusM).toBeCloseTo(3024, 0);
  });
});
