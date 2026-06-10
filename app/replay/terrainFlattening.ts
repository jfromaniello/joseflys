/**
 * Local terrain flattening around aerodromes for the 3D replay globe.
 *
 * Cesium World Terrain is built from ~30 m DEMs whose vertical noise makes
 * runways look wavy from a low chase camera. CesiumJS has no API to edit
 * terrain locally (CesiumGS/cesium#8501), so this wraps the terrain provider
 * and rewrites the quantized-mesh tiles that intersect a disc around each
 * aerodrome: vertex heights blend toward the field elevation with a smoothstep
 * falloff (flat inside `innerRadiusM`, untouched beyond `outerRadiusM`).
 *
 * Reading a tile's vertices requires private `QuantizedMeshTerrainData` fields
 * (`_uValues`, `_heightValues`, ...). They have been stable for years, but a
 * Cesium upgrade could drop them: `readQuantizedMeshInternals` validates every
 * field and the wrapper falls back to the unmodified tile when anything is
 * missing, so the worst case is unflattened terrain, never a broken globe.
 * Bounding volumes for rewritten tiles are recomputed the same way Cesium's
 * own upsampling worker does (BoundingSphere.fromVertices + OBB.fromRectangle
 * + EllipsoidalOccluder horizon culling point).
 *
 * Like cameraMath, the Cesium module is passed as a parameter so this file can
 * be imported (and unit-tested) without pulling Cesium into the bundle eagerly.
 */

import type {
  BoundingSphere,
  Cartesian3,
  Credit,
  OrientedBoundingBox,
  QuantizedMeshTerrainData,
  Rectangle,
  Request,
  TerrainData,
  TerrainProvider,
} from "cesium";

/** An aerodrome to flatten around — the zone's target height is sampled from the terrain itself. */
export interface FlattenCenter {
  lat: number;
  lon: number;
  /** Longest runway length in feet, when known; sizes the flat disc. */
  runwayLengthFt?: number | null;
}

/** A disc of terrain pulled toward a fixed elevation. */
export interface FlattenZone {
  /** Center latitude in decimal degrees (aerodrome reference point). */
  lat: number;
  /** Center longitude in decimal degrees. */
  lon: number;
  /** Target height in meters above the ellipsoid (terrain height at the center). */
  heightM: number;
  /** Fully flat inside this radius (meters). */
  innerRadiusM: number;
  /** Untouched beyond this radius; smoothstep blend in between. */
  outerRadiusM: number;
}

/**
 * Flattening radii for an aerodrome: the inner disc covers the runway (when
 * the length is known) plus apron margin, and the blend ring extends far
 * enough that the transition into real terrain reads as a gentle slope.
 */
export function aerodromeFlattenRadii(runwayLengthFt?: number | null): {
  innerRadiusM: number;
  outerRadiusM: number;
} {
  const halfLengthM = ((runwayLengthFt ?? 0) * 0.3048) / 2;
  const innerRadiusM = Math.max(900, halfLengthM + 300);
  return { innerRadiusM, outerRadiusM: innerRadiusM + 1200 };
}

const EARTH_RADIUS_M = 6371000;
const MAX_SHORT = 32767;

/** Smoothstep weight: 1 inside the inner radius, 0 beyond the outer. */
function flattenWeight(distM: number, innerM: number, outerM: number): number {
  if (distM <= innerM) return 1;
  if (distM >= outerM) return 0;
  const t = (outerM - distM) / (outerM - innerM);
  return t * t * (3 - 2 * t);
}

/** Equirectangular distance (m) from a zone center — ample for ≤ few-km radii. */
function distanceToZoneM(latRad: number, lonRad: number, zone: FlattenZone): number {
  const zLat = (zone.lat * Math.PI) / 180;
  const zLon = (zone.lon * Math.PI) / 180;
  const x = (lonRad - zLon) * Math.cos(zLat) * EARTH_RADIUS_M;
  const y = (latRad - zLat) * EARTH_RADIUS_M;
  return Math.hypot(x, y);
}

/** Conservative geographic bounding box of a zone, in radians. */
function zoneBounds(zone: FlattenZone): { west: number; south: number; east: number; north: number } {
  const latRad = (zone.lat * Math.PI) / 180;
  const lonRad = (zone.lon * Math.PI) / 180;
  const dLat = zone.outerRadiusM / EARTH_RADIUS_M;
  const dLon = zone.outerRadiusM / (EARTH_RADIUS_M * Math.max(0.01, Math.cos(latRad)));
  return { west: lonRad - dLon, south: latRad - dLat, east: lonRad + dLon, north: latRad + dLat };
}

function rectangleIntersectsZone(rect: Rectangle, zone: FlattenZone): boolean {
  const b = zoneBounds(zone);
  return rect.west <= b.east && rect.east >= b.west && rect.south <= b.north && rect.north >= b.south;
}

/**
 * The private QuantizedMeshTerrainData layout this module depends on. Field
 * names match Cesium's constructor assignments (validated at runtime).
 */
interface QuantizedMeshInternals {
  uValues: Uint16Array;
  vValues: Uint16Array;
  heightValues: Uint16Array;
  indices: Uint16Array | Uint32Array;
  minimumHeight: number;
  maximumHeight: number;
  westIndices: number[];
  southIndices: number[];
  eastIndices: number[];
  northIndices: number[];
  westSkirtHeight: number;
  southSkirtHeight: number;
  eastSkirtHeight: number;
  northSkirtHeight: number;
  childTileMask: number;
  createdByUpsampling: boolean;
  encodedNormals?: Uint8Array;
  waterMask?: Uint8Array;
  credits?: Credit[];
}

/**
 * Reads the private vertex buffers off a tile, returning `null` if any
 * expected field is missing (e.g. after a Cesium upgrade changes internals).
 */
export function readQuantizedMeshInternals(data: QuantizedMeshTerrainData): QuantizedMeshInternals | null {
  const raw = data as unknown as Record<string, unknown>;
  const uValues = raw._uValues;
  const vValues = raw._vValues;
  const heightValues = raw._heightValues;
  const indices = raw._indices;
  if (!(uValues instanceof Uint16Array) || !(vValues instanceof Uint16Array)) return null;
  if (!(heightValues instanceof Uint16Array)) return null;
  if (!(indices instanceof Uint16Array) && !(indices instanceof Uint32Array)) return null;
  if (typeof raw._minimumHeight !== "number" || typeof raw._maximumHeight !== "number") return null;
  const edges = [raw._westIndices, raw._southIndices, raw._eastIndices, raw._northIndices];
  if (edges.some((e) => !Array.isArray(e) && !(e instanceof Uint16Array) && !(e instanceof Uint32Array))) {
    return null;
  }
  const skirts = [raw._westSkirtHeight, raw._southSkirtHeight, raw._eastSkirtHeight, raw._northSkirtHeight];
  if (skirts.some((s) => typeof s !== "number")) return null;
  if (typeof raw._childTileMask !== "number") return null;
  return {
    uValues,
    vValues,
    heightValues,
    indices,
    minimumHeight: raw._minimumHeight as number,
    maximumHeight: raw._maximumHeight as number,
    westIndices: Array.from(raw._westIndices as ArrayLike<number>),
    southIndices: Array.from(raw._southIndices as ArrayLike<number>),
    eastIndices: Array.from(raw._eastIndices as ArrayLike<number>),
    northIndices: Array.from(raw._northIndices as ArrayLike<number>),
    westSkirtHeight: raw._westSkirtHeight as number,
    southSkirtHeight: raw._southSkirtHeight as number,
    eastSkirtHeight: raw._eastSkirtHeight as number,
    northSkirtHeight: raw._northSkirtHeight as number,
    childTileMask: raw._childTileMask as number,
    createdByUpsampling: Boolean(raw._createdByUpsampling),
    encodedNormals: raw._encodedNormals instanceof Uint8Array ? raw._encodedNormals : undefined,
    waterMask: raw._waterMask instanceof Uint8Array ? raw._waterMask : undefined,
    credits: Array.isArray(raw._credits) ? (raw._credits as Credit[]) : undefined,
  };
}

/**
 * Rewrites a quantized-mesh tile, blending vertex heights toward each zone's
 * target elevation. Returns the original tile when nothing changes or when the
 * tile's internals can't be read.
 */
export function flattenQuantizedMeshTile(
  Cesium: typeof import("cesium"),
  data: QuantizedMeshTerrainData,
  rectangle: Rectangle,
  zones: FlattenZone[]
): QuantizedMeshTerrainData {
  const mesh = readQuantizedMeshInternals(data);
  if (!mesh) return data;

  const vertexCount = mesh.uValues.length;
  const origRange = mesh.maximumHeight - mesh.minimumHeight;
  const newHeights = new Float64Array(vertexCount);
  const lats = new Float64Array(vertexCount);
  const lons = new Float64Array(vertexCount);
  let changed = false;
  let newMin = Number.POSITIVE_INFINITY;
  let newMax = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < vertexCount; i++) {
    const lon = rectangle.west + ((rectangle.east - rectangle.west) * mesh.uValues[i]) / MAX_SHORT;
    const lat = rectangle.south + ((rectangle.north - rectangle.south) * mesh.vValues[i]) / MAX_SHORT;
    let height = mesh.minimumHeight + (origRange * mesh.heightValues[i]) / MAX_SHORT;

    for (const zone of zones) {
      const w = flattenWeight(distanceToZoneM(lat, lon, zone), zone.innerRadiusM, zone.outerRadiusM);
      if (w > 0) {
        height += (zone.heightM - height) * w;
        changed = true;
      }
    }

    lons[i] = lon;
    lats[i] = lat;
    newHeights[i] = height;
    if (height < newMin) newMin = height;
    if (height > newMax) newMax = height;
  }

  if (!changed) return data;

  // Requantize against the new height range and rebuild the bounding volumes
  // from the rewritten vertices — the same recipe as Cesium's upsampling worker.
  const newRange = newMax - newMin;
  const scale = newRange > 0 ? MAX_SHORT / newRange : 0;
  const quantizedVertices = new Uint16Array(vertexCount * 3);
  quantizedVertices.set(mesh.uValues, 0);
  quantizedVertices.set(mesh.vValues, vertexCount);
  const cartesianVertices = new Float64Array(vertexCount * 3);
  const carto = new Cesium.Cartographic();
  const scratch = new Cesium.Cartesian3();
  const ellipsoid = Cesium.Ellipsoid.WGS84;
  for (let i = 0; i < vertexCount; i++) {
    quantizedVertices[vertexCount * 2 + i] = Math.round((newHeights[i] - newMin) * scale);
    carto.longitude = lons[i];
    carto.latitude = lats[i];
    carto.height = newHeights[i];
    ellipsoid.cartographicToCartesian(carto, scratch);
    cartesianVertices[i * 3] = scratch.x;
    cartesianVertices[i * 3 + 1] = scratch.y;
    cartesianVertices[i * 3 + 2] = scratch.z;
  }

  const boundingSphere: BoundingSphere = Cesium.BoundingSphere.fromVertices(
    Array.from(cartesianVertices),
    Cesium.Cartesian3.ZERO,
    3
  );
  const orientedBoundingBox: OrientedBoundingBox = Cesium.OrientedBoundingBox.fromRectangle(
    rectangle,
    newMin,
    newMax,
    ellipsoid
  );
  // EllipsoidalOccluder is in Cesium's runtime exports but not its public types.
  const CesiumWithOccluder = Cesium as unknown as {
    EllipsoidalOccluder: new (ellipsoid: unknown) => {
      computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid: (
        directionToPoint: Cartesian3,
        vertices: Float64Array,
        stride: number,
        center: Cartesian3,
        minimumHeight: number
      ) => Cartesian3;
    };
  };
  const occluder = new CesiumWithOccluder.EllipsoidalOccluder(ellipsoid);
  const horizonOcclusionPoint = occluder.computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid(
    boundingSphere.center,
    cartesianVertices,
    3,
    boundingSphere.center,
    newMin
  );

  // Normals are passed through unchanged: lighting in the flattened disc keeps
  // a ghost of the old relief, which is far less visible than the bumps were.
  return new Cesium.QuantizedMeshTerrainData({
    quantizedVertices,
    indices: mesh.indices,
    minimumHeight: newMin,
    maximumHeight: newMax,
    boundingSphere,
    orientedBoundingBox,
    horizonOcclusionPoint,
    westIndices: mesh.westIndices,
    southIndices: mesh.southIndices,
    eastIndices: mesh.eastIndices,
    northIndices: mesh.northIndices,
    westSkirtHeight: mesh.westSkirtHeight,
    southSkirtHeight: mesh.southSkirtHeight,
    eastSkirtHeight: mesh.eastSkirtHeight,
    northSkirtHeight: mesh.northSkirtHeight,
    childTileMask: mesh.childTileMask,
    createdByUpsampling: mesh.createdByUpsampling,
    encodedNormals: mesh.encodedNormals,
    waterMask: mesh.waterMask,
    credits: mesh.credits,
  });
}

/**
 * Builds a flattening provider around `terrain` for the given aerodromes. The
 * target elevation of each disc is sampled from the terrain itself (so the
 * draped imagery sits exactly where the DEM says the field is), which keeps
 * this self-consistent even where the DEM and the GPS altitude disagree.
 * Returns the unwrapped terrain when there are no centers or sampling fails.
 */
export async function createAerodromeFlatteningProvider(
  Cesium: typeof import("cesium"),
  terrain: TerrainProvider,
  centers: FlattenCenter[]
): Promise<TerrainProvider> {
  if (centers.length === 0) return terrain;
  try {
    const cartos = centers.map((c) => Cesium.Cartographic.fromDegrees(c.lon, c.lat));
    const sampled = await Cesium.sampleTerrainMostDetailed(terrain, cartos);
    const zones: FlattenZone[] = [];
    for (let i = 0; i < centers.length; i++) {
      if (!Number.isFinite(sampled[i]?.height)) continue;
      zones.push({
        lat: centers[i].lat,
        lon: centers[i].lon,
        heightM: sampled[i].height,
        ...aerodromeFlattenRadii(centers[i].runwayLengthFt),
      });
    }
    return createFlatteningTerrainProvider(Cesium, terrain, zones);
  } catch (err) {
    console.error("Aerodrome terrain flattening unavailable", err);
    return terrain;
  }
}

/**
 * Wraps a terrain provider so tiles intersecting any zone are flattened on the
 * fly. Tiles elsewhere (the overwhelming majority) pass through untouched.
 */
export function createFlatteningTerrainProvider(
  Cesium: typeof import("cesium"),
  inner: TerrainProvider,
  zones: FlattenZone[]
): TerrainProvider {
  if (zones.length === 0) return inner;

  const provider = {
    get errorEvent() {
      return inner.errorEvent;
    },
    get credit() {
      return inner.credit;
    },
    get tilingScheme() {
      return inner.tilingScheme;
    },
    get hasWaterMask() {
      return inner.hasWaterMask;
    },
    get hasVertexNormals() {
      return inner.hasVertexNormals;
    },
    get availability() {
      return inner.availability;
    },
    getLevelMaximumGeometricError(level: number) {
      return inner.getLevelMaximumGeometricError(level);
    },
    getTileDataAvailable(x: number, y: number, level: number) {
      return inner.getTileDataAvailable(x, y, level);
    },
    loadTileDataAvailability(x: number, y: number, level: number) {
      return inner.loadTileDataAvailability(x, y, level);
    },
    requestTileGeometry(
      x: number,
      y: number,
      level: number,
      request?: Request
    ): Promise<TerrainData> | undefined {
      const promise = inner.requestTileGeometry(x, y, level, request);
      if (!promise) return promise;
      const rect = inner.tilingScheme.tileXYToRectangle(x, y, level);
      const active = zones.filter((z) => rectangleIntersectsZone(rect, z));
      if (active.length === 0) return promise;
      return Promise.resolve(promise).then((data) => {
        if (!(data instanceof Cesium.QuantizedMeshTerrainData)) return data;
        try {
          return flattenQuantizedMeshTile(Cesium, data, rect, active);
        } catch (err) {
          console.error("Terrain flattening failed; serving original tile", err);
          return data;
        }
      });
    },
  };

  return provider as TerrainProvider;
}
