/**
 * Traffic-pattern (circuit) analysis for a GPX replay.
 *
 * Given a track and the departure/arrival aerodrome (runway orientation, field
 * elevation, optional published turn side), this classifies each moment near
 * the field into a circuit leg — taxi, takeoff/upwind, crosswind, downwind,
 * base ("básica"), final, landing — and derives learning metrics: the runway in
 * use, the pattern direction (left/right) versus the published one, the pattern
 * altitude flown versus the standard, and each approach's glide angle, touchdown
 * point, and speed on final.
 *
 * All geometry is pure and works in TRUE headings. The caller is responsible for
 * resolving the aerodrome (ANAC for Argentina, the global dataset otherwise) and
 * normalizing it into {@link PatternAerodrome}.
 */

import { computeMotionHeadingAdaptive } from "./cameraMath";
import { computeVerticalSpeedFpm, findPointIndexByTime } from "./replayMetrics";
import type { ReplayPoint } from "./types";

const METERS_TO_FEET = 3.28084;
const STANDARD_PATTERN_ALTITUDE_FT_AGL = 1000;
/**
 * Typical light-aircraft downwind separation from the runway, in nautical miles
 * (ICAO standard distance unit). ~0.5–1 NM is the widely-cited international GA
 * pattern width (e.g. FAA AIM). Regional teaching varies — Argentine aeroclubs,
 * for instance, fly a tighter ~500 m (≈0.27 NM). [min, max] of "typical".
 */
const TYPICAL_DOWNWIND_SEPARATION_NM = [0.5, 1.0] as const;

/** Distance from the field within which we attempt to classify circuit legs. */
const PATTERN_RADIUS_M = 9260; // ~5 NM
/** AGL ceiling above which the aircraft is considered to have left the circuit. */
const PATTERN_CEILING_FT_AGL = 1800;
/** AGL at/below which the aircraft is treated as on the ground. */
const GROUND_AGL_FT = 35;
/** Lateral offset band (m) for an opposite-heading leg to count as downwind.
 * Below the floor the aircraft is over the runway centerline (taxi/overfly, not
 * a downwind); above the ceiling it's an en-route leg, not a circuit. */
const DOWNWIND_MIN_CROSS_M = 150;
const DOWNWIND_MAX_CROSS_M = 2500;

/** One landing direction of a runway. */
export interface PatternRunwayEnd {
  /** Threshold designator, e.g. "05" or "23". */
  id: string;
  /** Landing/takeoff heading in TRUE degrees [0, 360). */
  headingTrueDeg: number;
  /** Threshold latitude, if known (global dataset). Falls back to field center. */
  thresholdLat?: number | null;
  /** Threshold longitude, if known. */
  thresholdLon?: number | null;
}

/** A resolved aerodrome, normalized across data sources. */
export interface PatternAerodrome {
  source: "anac" | "global";
  code: string;
  name: string;
  /** Reference point (field center). */
  lat: number;
  lon: number;
  /** Field elevation in feet AMSL. */
  elevationFt: number;
  /** Runway ends (each landing direction). */
  runwayEnds: PatternRunwayEnd[];
  /** Runway length in feet, if known. */
  lengthFt?: number | null;
  /**
   * Compass direction (TRUE degrees) toward which the published circuit turns,
   * parsed from the AIP norms (e.g. "virajes al NW" → 315). Used to derive the
   * published pattern side. Null when unknown.
   */
  publishedTurnDirectionDeg?: number | null;
}

/** Circuit legs, in roughly chronological order around the pattern. */
export type CircuitPhase =
  | "taxi"
  | "takeoff"
  | "upwind"
  | "crosswind"
  | "downwind"
  | "base"
  | "final"
  | "landing"
  | "maneuvering";

/** A contiguous run of one phase. */
export interface CircuitSegment {
  phase: CircuitPhase;
  startMs: number;
  endMs: number;
  /** Index range into the source points (inclusive). */
  startIndex: number;
  endIndex: number;
  /** For downwind legs: this pass's median lateral separation (m). */
  separationM?: number | null;
  /** For downwind legs: this pass's median altitude (ft AGL). */
  altitudeFtAgl?: number | null;
}

/** A detected approach/landing and its quality metrics. */
export interface ApproachMetrics {
  /** Timestamp of the lowest point (touchdown or low pass). */
  timeMs: number;
  /** Glide angle on final in degrees (descent vs ground distance). */
  glideAngleDeg: number | null;
  /** Lowest AGL reached, in feet. */
  minAglFt: number;
  /** Along-runway distance from the threshold to the low point, in feet. */
  touchdownFromThresholdFt: number | null;
  /** Ground speed near the low point, in knots. */
  finalSpeedKt: number | null;
  /** Whether the aircraft actually reached the ground (vs a low/go-around). */
  touched: boolean;
}

/**
 * One landing/approach event, enriched with the circuit legs that preceded it.
 * A full traffic-pattern arrival has downwind/base/final; a straight-in or wide
 * descending arrival may have only a base/final (downwind metrics are then
 * null). Built around the approach, so every touch/low-pass is captured.
 */
export interface Landing {
  /** 1-based order in the flight. */
  index: number;
  /** Aerodrome of this landing (code + name). */
  aerodromeCode: string;
  aerodromeName: string;
  /** Where to seek to review this landing — start of the downwind, else base/final. */
  startMs: number;
  /** End of the approach/final (ms). */
  endMs: number;
  /** Time of the touch/low point (ms). */
  timeMs: number;
  /** Whether the aircraft reached the ground (vs a low pass). */
  touched: boolean;
  /** Median downwind separation from the centerline (m), null without a downwind. */
  separationM: number | null;
  /** Median downwind altitude (ft AGL), null without a downwind. */
  altitudeFtAgl: number | null;
  /** Median ground speed (kt) flown on each leg (null when the leg is absent). */
  speedsKt: { downwind: number | null; base: number | null; final: number | null };
}

export interface CircuitAnalysis {
  aerodrome: PatternAerodrome;
  /** The runway end in use, chosen from observed takeoff/landing tracks. */
  activeRunway: PatternRunwayEnd;
  /** Field elevation (ft AMSL) actually used for AGL — derived from the track. */
  fieldElevationFt: number;
  /** Pattern direction actually flown. */
  flownSide: "left" | "right" | null;
  /** Pattern direction published in the AIP (when known). */
  publishedSide: "left" | "right" | null;
  /** Median AGL (ft) flown on downwind, the de-facto pattern altitude. */
  patternAltitudeFtAgl: number | null;
  /** Standard pattern altitude for comparison (1000 ft AGL). */
  standardPatternAltitudeFtAgl: number;
  /** Median lateral distance (m) from the extended centerline on downwind. */
  downwindSeparationM: number | null;
  /** Typical downwind separation band [min, max] in NM, for comparison. */
  typicalDownwindSeparationNm: readonly [number, number];
  /** Chronological circuit legs (for timeline chips). */
  segments: CircuitSegment[];
  /** Landings at this aerodrome (approach + preceding circuit legs). */
  landings: Landing[];
  /** Detected approaches/landings. */
  approaches: ApproachMetrics[];
}

/** A merged leg segment tagged with the aerodrome it was flown at. */
export interface MergedSegment extends CircuitSegment {
  aerodromeCode: string;
}

/** Coarse, aerodrome-independent vertical phase of flight. */
export type FlightPhaseType = "taxi" | "climb" | "cruise" | "descent";

/** A contiguous run of one flight phase, with its vertical-profile metrics. */
export interface FlightPhase {
  type: FlightPhaseType;
  startMs: number;
  endMs: number;
  startIndex: number;
  endIndex: number;
  startAltFt: number;
  endAltFt: number;
  /** Mean vertical speed across the phase (fpm; signed). */
  avgVsFpm: number;
  /** Ground distance covered during the phase (NM). */
  distanceNm: number;
}

/** A notable point in the vertical profile. */
export type FlightMarkerType = "takeoff" | "toc" | "tod" | "landing";
export interface FlightMarker {
  type: FlightMarkerType;
  timeMs: number;
  altFt: number;
}

/** A whole flight's circuit analysis, merged across every aerodrome visited. */
export interface FlightCircuits {
  /** Per-aerodrome analyses (for runway/side/elevation lookups). */
  analyses: CircuitAnalysis[];
  /** Leg segments across all aerodromes, chronological, gaps filled en-route. */
  segments: MergedSegment[];
  /** All landings across aerodromes, chronological, re-indexed from 1. */
  landings: Landing[];
  /** Whole-flight vertical phases (taxi/climb/cruise/descent). */
  phases: FlightPhase[];
  /** Takeoff / top-of-climb / top-of-descent / landing markers. */
  markers: FlightMarker[];
}

const VS_WINDOW_MS = 20000;
const PHASE_VS_THRESHOLD_FPM = 200;
const TAXI_SPEED_KT = 30;
const MIN_PHASE_MS = 30000;

/** Vertical speed (fpm) smoothed over a ~40s window centered on point `i`. */
function smoothedVsFpm(points: ReplayPoint[], i: number): number {
  const t = points[i].timeMs;
  let a = i;
  let b = i;
  while (a > 0 && t - points[a].timeMs < VS_WINDOW_MS) a -= 1;
  while (b < points.length - 1 && points[b].timeMs - t < VS_WINDOW_MS) b += 1;
  const dtMin = (points[b].timeMs - points[a].timeMs) / 60000;
  if (dtMin <= 0) return 0;
  return ((points[b].ele - points[a].ele) * METERS_TO_FEET) / dtMin;
}

/** Ground speed (kt) from the segment at point `i`. */
function groundSpeedKtAt(points: ReplayPoint[], i: number): number {
  const j = Math.max(0, Math.min(i, points.length - 2));
  const dtH = (points[j + 1].timeMs - points[j].timeMs) / 3_600_000;
  if (dtH <= 0) return 0;
  return distanceMeters(points[j], points[j + 1]) / 1852 / dtH;
}

/**
 * Classifies the whole flight into coarse vertical phases (taxi / climb / cruise
 * / descent) from smoothed vertical speed and ground speed, then derives the
 * takeoff, top-of-climb, top-of-descent, and landing markers from the phase
 * transitions. Aerodrome-independent — it works on any track.
 */
export function detectFlightPhases(points: ReplayPoint[]): {
  phases: FlightPhase[];
  markers: FlightMarker[];
} {
  if (points.length < 10) return { phases: [], markers: [] };

  const cls: FlightPhaseType[] = points.map((_, i) => {
    if (groundSpeedKtAt(points, i) < TAXI_SPEED_KT) return "taxi";
    const vs = smoothedVsFpm(points, i);
    if (vs > PHASE_VS_THRESHOLD_FPM) return "climb";
    if (vs < -PHASE_VS_THRESHOLD_FPM) return "descent";
    return "cruise";
  });

  // Build runs, then fold runs shorter than MIN_PHASE_MS into a neighbor until
  // stable, so a brief blip doesn't fragment a phase.
  interface Run {
    type: FlightPhaseType;
    startIndex: number;
    endIndex: number;
  }
  const buildRuns = (labels: FlightPhaseType[]): Run[] => {
    const runs: Run[] = [];
    for (let i = 0; i < labels.length; i += 1) {
      const last = runs[runs.length - 1];
      if (last && last.type === labels[i]) last.endIndex = i;
      else runs.push({ type: labels[i], startIndex: i, endIndex: i });
    }
    return runs;
  };
  const dur = (r: Run) => points[r.endIndex].timeMs - points[r.startIndex].timeMs;

  const labels = cls.slice();
  for (;;) {
    const runs = buildRuns(labels);
    if (runs.length <= 1) break;
    let shortest = -1;
    for (let i = 0; i < runs.length; i += 1) {
      if (dur(runs[i]) < MIN_PHASE_MS && (shortest < 0 || dur(runs[i]) < dur(runs[shortest]))) {
        shortest = i;
      }
    }
    if (shortest < 0) break;
    const r = runs[shortest];
    const prev = runs[shortest - 1];
    const next = runs[shortest + 1];
    const into = !prev ? next : !next ? prev : dur(prev) >= dur(next) ? prev : next;
    for (let k = r.startIndex; k <= r.endIndex; k += 1) labels[k] = into.type;
  }

  const runs = buildRuns(labels);
  const phases: FlightPhase[] = runs.map((r) => {
    let distanceNm = 0;
    for (let k = r.startIndex + 1; k <= r.endIndex; k += 1) {
      distanceNm += distanceMeters(points[k - 1], points[k]) / 1852;
    }
    const startAltFt = points[r.startIndex].ele * METERS_TO_FEET;
    const endAltFt = points[r.endIndex].ele * METERS_TO_FEET;
    const minutes = (points[r.endIndex].timeMs - points[r.startIndex].timeMs) / 60000;
    return {
      type: r.type,
      startMs: points[r.startIndex].timeMs,
      endMs: points[r.endIndex].timeMs,
      startIndex: r.startIndex,
      endIndex: r.endIndex,
      startAltFt,
      endAltFt,
      avgVsFpm: minutes > 0 ? (endAltFt - startAltFt) / minutes : 0,
      distanceNm,
    };
  });

  // Markers from phase transitions.
  const markers: FlightMarker[] = [];
  const altAt = (idx: number) => points[idx].ele * METERS_TO_FEET;
  for (let i = 1; i < phases.length; i += 1) {
    const prev = phases[i - 1].type;
    const cur = phases[i].type;
    const at = phases[i].startMs;
    const alt = altAt(phases[i].startIndex);
    if (prev === "taxi" && (cur === "climb" || cur === "cruise")) {
      markers.push({ type: "takeoff", timeMs: at, altFt: alt });
    } else if (prev === "climb" && cur === "cruise") {
      markers.push({ type: "toc", timeMs: at, altFt: alt });
    } else if (prev === "cruise" && cur === "descent") {
      markers.push({ type: "tod", timeMs: at, altFt: alt });
    } else if ((prev === "descent" || prev === "cruise") && cur === "taxi") {
      markers.push({ type: "landing", timeMs: at, altFt: alt });
    }
  }

  return { phases, markers };
}

/**
 * Merges per-aerodrome analyses into one flight view. Meaningful legs (anything
 * but `maneuvering`) from each field — which fall in disjoint time windows since
 * the aircraft is near one field at a time — are unioned, sorted, and the gaps
 * between them filled with en-route `maneuvering`. Landings are concatenated and
 * re-indexed in time order.
 */
export function mergeFlightCircuits(
  analyses: CircuitAnalysis[],
  points: ReplayPoint[]
): FlightCircuits {
  const trackStartMs = points[0]?.timeMs ?? 0;
  const trackEndMs = points[points.length - 1]?.timeMs ?? 0;
  const tagged: MergedSegment[] = [];
  for (const a of analyses) {
    for (const s of a.segments) {
      if (s.phase !== "maneuvering") tagged.push({ ...s, aerodromeCode: a.aerodrome.code });
    }
  }
  tagged.sort((x, y) => x.startMs - y.startMs);

  const filler = (startMs: number, endMs: number): MergedSegment => ({
    phase: "maneuvering",
    startMs,
    endMs,
    startIndex: -1,
    endIndex: -1,
    aerodromeCode: "",
  });

  const segments: MergedSegment[] = [];
  let cursor = trackStartMs;
  for (const s of tagged) {
    if (s.startMs < cursor) continue; // drop the rare overlap between nearby fields
    if (s.startMs > cursor) segments.push(filler(cursor, s.startMs));
    segments.push(s);
    cursor = s.endMs;
  }
  if (cursor < trackEndMs) segments.push(filler(cursor, trackEndMs));

  const landings = analyses
    .flatMap((a) => a.landings)
    .sort((x, y) => x.timeMs - y.timeMs)
    .map((l, i) => ({ ...l, index: i + 1 }));

  const { phases, markers } = detectFlightPhases(points);

  return { analyses, segments, landings, phases, markers };
}

/** The circuit phase active at `timeMs`, or null if outside every segment. */
export function circuitPhaseAt(flight: FlightCircuits, timeMs: number): CircuitPhase | null {
  for (const seg of flight.segments) {
    if (timeMs >= seg.startMs && timeMs <= seg.endMs) return seg.phase;
  }
  return null;
}

/** Per-point features in the runway-relative frame. */
interface PointFeature {
  index: number;
  timeMs: number;
  distM: number;
  aglFt: number;
  /** Track over ground (TRUE degrees) or null when stationary. */
  trackDeg: number | null;
  vsFpm: number | null;
  /** Along-runway distance (m), positive toward the active heading. */
  along: number;
  /** Cross-track offset (m), positive to the RIGHT of the active heading. */
  cross: number;
}

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
const norm360 = (d: number) => ((d % 360) + 360) % 360;

/** Signed shortest difference b−a in degrees, within (−180, 180]. */
function angleDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

/** East/north offset in meters from `origin` to `p` (local tangent plane). */
function offsetMeters(
  origin: { lat: number; lon: number },
  p: { lat: number; lon: number }
): { east: number; north: number } {
  const R = 6371000;
  const lat0 = toRad(origin.lat);
  const east = toRad(p.lon - origin.lon) * Math.cos(lat0) * R;
  const north = toRad(p.lat - origin.lat) * R;
  return { east, north };
}

function distanceMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const { east, north } = offsetMeters(a, b);
  return Math.hypot(east, north);
}

/**
 * Picks the runway end in use from the tracks observed during low-altitude
 * operations (takeoff/landing): the end whose true heading best matches the
 * average operational track. Returns null if no usable runways.
 */
function selectActiveRunway(
  features: PointFeature[],
  aerodrome: PatternAerodrome
): PatternRunwayEnd | null {
  const ends = aerodrome.runwayEnds;
  if (ends.length === 0) return null;
  if (ends.length === 1) return ends[0];

  // Tracks while low and close to the field — the runway alignment moments.
  const opsTracks = features
    .filter((f) => f.aglFt < 500 && f.distM < 2500 && f.trackDeg !== null)
    .map((f) => f.trackDeg as number);

  if (opsTracks.length === 0) return ends[0];

  let best = ends[0];
  let bestScore = Infinity;
  for (const end of ends) {
    // Mean absolute alignment error of ops tracks to this landing heading.
    const score =
      opsTracks.reduce((sum, t) => sum + Math.abs(angleDelta(end.headingTrueDeg, t)), 0) /
      opsTracks.length;
    if (score < bestScore) {
      bestScore = score;
      best = end;
    }
  }
  return best;
}

/**
 * Field elevation (ft) for AGL. GPS altitude and the database elevation can use
 * different data — at some fields the database is off by 100 m, which would make
 * AGL negative. Since we only analyze fields the aircraft actually got low at,
 * the lowest GPS altitude within ~1.2 km of the field is the most reliable
 * ground reference; fall back to the database value when no point is close.
 */
function fieldElevationFt(points: ReplayPoint[], aerodrome: PatternAerodrome): number {
  let minEleM = Infinity;
  for (const p of points) {
    if (distanceMeters(aerodrome, p) < 1200 && p.ele < minEleM) minEleM = p.ele;
  }
  return Number.isFinite(minEleM) ? minEleM * METERS_TO_FEET : aerodrome.elevationFt;
}

/** Builds per-point features in the active runway's reference frame. */
function buildFeatures(
  points: ReplayPoint[],
  aerodrome: PatternAerodrome,
  headingTrueDeg: number,
  elevationFt: number
): PointFeature[] {
  const axisRad = toRad(headingTrueDeg);
  // Unit vectors in (east, north): along = landing direction, right = +90°.
  const alongE = Math.sin(axisRad);
  const alongN = Math.cos(axisRad);
  const rightE = Math.cos(axisRad);
  const rightN = -Math.sin(axisRad);

  const out: PointFeature[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const { east, north } = offsetMeters(aerodrome, p);
    out.push({
      index: i,
      timeMs: p.timeMs,
      distM: Math.hypot(east, north),
      aglFt: p.ele * METERS_TO_FEET - elevationFt,
      trackDeg: nullableTrack(points, p.timeMs),
      vsFpm: computeVerticalSpeedFpm(points, findPointIndexByTime(points, p.timeMs), p.timeMs),
      along: east * alongE + north * alongN,
      cross: east * rightE + north * rightN,
    });
  }
  return out;
}

function nullableTrack(points: ReplayPoint[], timeMs: number): number | null {
  const rad = computeMotionHeadingAdaptive(points, timeMs, 150, 30000);
  return rad === null ? null : norm360(toDeg(rad));
}

/**
 * Classifies a single point into a circuit phase relative to the active runway
 * heading `H` (true). `H` points in the landing direction.
 */
function classifyPoint(f: PointFeature, headingTrueDeg: number): CircuitPhase {
  if (f.distM > PATTERN_RADIUS_M || f.aglFt > PATTERN_CEILING_FT_AGL) {
    return "maneuvering";
  }
  if (f.aglFt <= GROUND_AGL_FT) {
    return f.distM < 1200 ? "taxi" : "maneuvering";
  }
  if (f.trackDeg === null) return "maneuvering";

  const rel = angleDelta(headingTrueDeg, f.trackDeg); // −180..180, 0 = aligned with landing
  const absRel = Math.abs(rel);
  const climbing = (f.vsFpm ?? 0) > 150;
  const descending = (f.vsFpm ?? 0) < -150;

  // Aligned with the landing direction.
  if (absRel < 45) {
    // Before the threshold and descending → final; past the field & climbing → upwind.
    if (descending && f.along < 0 && f.aglFt < PATTERN_CEILING_FT_AGL) return "final";
    if (f.aglFt < GROUND_AGL_FT * 4 && descending) return "final";
    return "upwind";
  }
  // Opposite the landing direction and within the runway's lateral corridor →
  // downwind. Over the centerline (too tight) or beyond the corridor it's not a
  // circuit downwind.
  if (absRel > 135) {
    const cross = Math.abs(f.cross);
    return cross >= DOWNWIND_MIN_CROSS_M && cross < DOWNWIND_MAX_CROSS_M
      ? "downwind"
      : "maneuvering";
  }
  // Perpendicular: crosswind (after departure, climbing) vs base (before final, descending).
  if (descending) return "base";
  if (climbing) return "crosswind";
  // Ambiguous perpendicular leg: use along-track position as the tiebreaker.
  return f.along > 0 ? "crosswind" : "base";
}

/** Builds the (possibly smoothed) phase array into contiguous segments. */
function buildSegments(features: PointFeature[], phases: CircuitPhase[]): CircuitSegment[] {
  const segs: CircuitSegment[] = [];
  for (let i = 0; i < features.length; i += 1) {
    const last = segs[segs.length - 1];
    if (last && last.phase === phases[i]) {
      last.endMs = features[i].timeMs;
      last.endIndex = features[i].index;
    } else {
      segs.push({
        phase: phases[i],
        startMs: features[i].timeMs,
        endMs: features[i].timeMs,
        startIndex: features[i].index,
        endIndex: features[i].index,
      });
    }
  }
  return segs;
}

/**
 * Merges the per-point phases into segments. Two cleanups suppress noise without
 * destroying real legs:
 *  - **Bridging**: a short run sandwiched between two runs of the *same* phase
 *    (e.g. a 14s "crosswind" blip splitting one downwind in two) is absorbed
 *    into that phase. Guarded by identical neighbors, so genuine short legs
 *    (a base between downwind and final) are never merged.
 *  - **Absorb**: a remaining too-short segment folds into the previous one.
 */
function segmentize(
  features: PointFeature[],
  phases: CircuitPhase[],
  minDurationMs: number,
  bridgeMs: number
): CircuitSegment[] {
  const smoothed = phases.slice();

  // Iteratively bridge X-[short Y]-X → X until stable (cleans isolated blips).
  for (;;) {
    const runs = buildSegments(features, smoothed);
    let changed = false;
    for (let i = 1; i < runs.length - 1; i += 1) {
      const mid = runs[i];
      if (
        runs[i - 1].phase === runs[i + 1].phase &&
        mid.phase !== runs[i - 1].phase &&
        mid.endMs - mid.startMs < bridgeMs
      ) {
        const target = runs[i - 1].phase;
        for (let k = mid.startIndex; k <= mid.endIndex; k += 1) smoothed[k] = target;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Absorb remaining too-short segments into the previous one.
  const merged: CircuitSegment[] = [];
  for (const seg of buildSegments(features, smoothed)) {
    const prev = merged[merged.length - 1];
    const short = seg.endMs - seg.startMs < minDurationMs;
    if (prev && (short || prev.phase === seg.phase)) {
      prev.endMs = seg.endMs;
      prev.endIndex = seg.endIndex;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

/**
 * Determines the turn direction flown around the circuit. Left traffic = left
 * (counterclockwise) turns = net negative heading change while maneuvering near
 * the field. Returns null if there isn't enough turning to tell.
 */
function detectFlownSide(features: PointFeature[]): "left" | "right" | null {
  const inPattern = features.filter(
    (f) => f.distM < PATTERN_RADIUS_M && f.aglFt > GROUND_AGL_FT && f.aglFt < PATTERN_CEILING_FT_AGL && f.trackDeg !== null
  );
  let net = 0;
  let total = 0;
  for (let i = 1; i < inPattern.length; i += 1) {
    const dt = inPattern[i].timeMs - inPattern[i - 1].timeMs;
    if (dt <= 0 || dt > 15000) continue; // skip gaps between separate circuits
    const d = angleDelta(inPattern[i - 1].trackDeg as number, inPattern[i].trackDeg as number);
    net += d;
    total += Math.abs(d);
  }
  if (total < 180) return null;
  return net < 0 ? "left" : "right";
}

/** Derives the published pattern side from the published turn direction. */
function publishedSideFrom(
  aerodrome: PatternAerodrome,
  headingTrueDeg: number
): "left" | "right" | null {
  const dir = aerodrome.publishedTurnDirectionDeg;
  if (dir == null) return null;
  // A turn direction to the left of the landing heading ⇒ left-hand circuit.
  return angleDelta(headingTrueDeg, dir) < 0 ? "left" : "right";
}

/** Median of a numeric array (returns null when empty). */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Finds approaches: local AGL minima near the field, each scored for glide
 * angle, touchdown position relative to the threshold, and final speed.
 */
function detectApproaches(
  points: ReplayPoint[],
  features: PointFeature[],
  aerodrome: PatternAerodrome,
  activeRunway: PatternRunwayEnd
): ApproachMetrics[] {
  const approaches: ApproachMetrics[] = [];

  // Candidate low points: AGL minima within 1.5 km of the field.
  for (let i = 1; i < features.length - 1; i += 1) {
    const f = features[i];
    if (f.distM > 1500) continue;
    if (f.aglFt > 150) continue;
    const isLocalMin =
      f.aglFt <= features[i - 1].aglFt && f.aglFt <= features[i + 1].aglFt;
    if (!isLocalMin) continue;

    // Must arrive from the air (descended from the pattern), not be taxiing or
    // a takeoff roll: require recent altitude and a flying ground speed.
    const finalSpeedKt = speedKtNear(points, f.index);
    if (finalSpeedKt == null || finalSpeedKt < 25) continue;
    let recentMaxAgl = 0;
    for (let k = i - 1; k >= 0 && f.timeMs - features[k].timeMs < 90000; k -= 1) {
      if (features[k].aglFt > recentMaxAgl) recentMaxAgl = features[k].aglFt;
    }
    if (recentMaxAgl < 300) continue;

    // De-dupe minima that are within 20s of the previous approach.
    if (approaches.length && f.timeMs - approaches[approaches.length - 1].timeMs < 20000) {
      continue;
    }

    // Glide angle: descent vs ground distance over the ~30s leading up to it.
    const startMs = f.timeMs - 30000;
    let s = i;
    while (s > 0 && features[s].timeMs > startMs && features[s].aglFt < PATTERN_CEILING_FT_AGL) {
      s -= 1;
    }
    const altLostFt = features[s].aglFt - f.aglFt;
    const groundM = distanceMeters(points[features[s].index], points[f.index]);
    const glideAngleDeg =
      groundM > 50 && altLostFt > 0
        ? toDeg(Math.atan2(altLostFt / METERS_TO_FEET, groundM))
        : null;

    // Touchdown position: along-runway distance from the threshold.
    const thresholdAlong = aerodrome.lengthFt
      ? -(aerodrome.lengthFt / METERS_TO_FEET) / 2
      : 0;
    const touchdownFromThresholdFt =
      aerodrome.lengthFt != null ? (f.along - thresholdAlong) * METERS_TO_FEET : null;

    approaches.push({
      timeMs: f.timeMs,
      glideAngleDeg,
      minAglFt: f.aglFt,
      touchdownFromThresholdFt,
      finalSpeedKt,
      touched: f.aglFt <= GROUND_AGL_FT,
    });
  }
  void activeRunway;
  return approaches;
}

/** Ground speed (kt) from the segment around `index`. */
function speedKtNear(points: ReplayPoint[], index: number): number | null {
  const i = Math.max(0, Math.min(index, points.length - 2));
  const a = points[i];
  const b = points[i + 1];
  const dtH = (b.timeMs - a.timeMs) / 3_600_000;
  if (dtH <= 0) return null;
  const distNm = (distanceMeters(a, b) / 1852);
  return distNm / dtH;
}

/** Median ground speed (kt) across the given point indices. */
function medianSpeedKt(points: ReplayPoint[], indices: number[]): number | null {
  const speeds = indices
    .map((i) => speedKtNear(points, i))
    .filter((s): s is number => s != null);
  return median(speeds);
}

/**
 * Builds one landing per detected approach, enriched with the circuit legs that
 * preceded it (downwind / base / final). For each approach we look back to the
 * last takeoff/taxi (the boundary of this attempt) and collect the downwind and
 * base legs flown since then. A straight-in arrival with no downwind leg still
 * yields a landing — separation/altitude are simply null.
 */
function buildLandings(
  segments: CircuitSegment[],
  features: PointFeature[],
  approaches: ApproachMetrics[],
  points: ReplayPoint[],
  aerodrome: PatternAerodrome
): Landing[] {
  const range = (seg: CircuitSegment): number[] => {
    const out: number[] = [];
    for (let k = seg.startIndex; k <= seg.endIndex; k += 1) out.push(k);
    return out;
  };

  const sorted = [...approaches].sort((a, b) => a.timeMs - b.timeMs);
  const landings: Landing[] = [];

  for (let n = 0; n < sorted.length; n += 1) {
    const ap = sorted[n];
    const prevMs = n > 0 ? sorted[n - 1].timeMs : -Infinity;

    // This attempt begins after the last takeoff/taxi before the approach.
    let legStartMs = prevMs;
    for (const seg of segments) {
      if (
        (seg.phase === "takeoff" || seg.phase === "taxi") &&
        seg.endMs <= ap.timeMs &&
        seg.endMs > legStartMs
      ) {
        legStartMs = seg.endMs;
      }
    }

    const dwIndices: number[] = [];
    const baseIndices: number[] = [];
    const finalIndices: number[] = [];
    let dwStartMs: number | null = null;
    let baseStartMs: number | null = null;
    let finalStartMs: number | null = null;

    for (const seg of segments) {
      if (seg.startMs < legStartMs || seg.startMs > ap.timeMs + 30000) continue;
      if (seg.phase === "downwind") {
        dwIndices.push(...range(seg));
        if (dwStartMs === null) dwStartMs = seg.startMs;
      } else if (seg.phase === "base") {
        baseIndices.push(...range(seg));
        if (baseStartMs === null) baseStartMs = seg.startMs;
      } else if (seg.phase === "final" || seg.phase === "landing") {
        finalIndices.push(...range(seg));
        if (finalStartMs === null) finalStartMs = seg.startMs;
      }
    }

    // Require an actual final-approach leg — excludes stray low points such as
    // a post-landing rollout or taxi that briefly looks like an approach.
    if (finalIndices.length === 0) continue;

    const dwCross = dwIndices.map((k) => Math.abs(features[k].cross));
    const dwAgl = dwIndices.map((k) => features[k].aglFt).filter((a) => a > GROUND_AGL_FT);

    landings.push({
      index: landings.length + 1,
      aerodromeCode: aerodrome.code,
      aerodromeName: aerodrome.name,
      startMs: dwStartMs ?? baseStartMs ?? finalStartMs ?? ap.timeMs,
      endMs: ap.timeMs,
      timeMs: ap.timeMs,
      touched: ap.touched,
      separationM: median(dwCross),
      altitudeFtAgl: median(dwAgl),
      speedsKt: {
        downwind: medianSpeedKt(points, dwIndices),
        base: medianSpeedKt(points, baseIndices),
        final: medianSpeedKt(points, finalIndices),
      },
    });
  }
  return landings;
}

/**
 * Analyzes the circuit flown at `aerodrome`. Returns null when the track never
 * comes near the field (no circuit to analyze) or the aerodrome has no runways.
 */
export function analyzeCircuit(
  points: ReplayPoint[],
  aerodrome: PatternAerodrome
): CircuitAnalysis | null {
  if (points.length < 10 || aerodrome.runwayEnds.length === 0) return null;

  // Ground reference derived from the track (robust to database elevation errors).
  const elevationFt = fieldElevationFt(points, aerodrome);

  // Quick reject: does the track ever get within the pattern radius and low?
  const comesClose = points.some(
    (p) =>
      distanceMeters(aerodrome, p) < PATTERN_RADIUS_M &&
      p.ele * METERS_TO_FEET - elevationFt < PATTERN_CEILING_FT_AGL
  );
  if (!comesClose) return null;

  // First pass with an arbitrary end just to gather ops tracks, then pick active.
  const provisional = buildFeatures(points, aerodrome, aerodrome.runwayEnds[0].headingTrueDeg, elevationFt);
  const activeRunway = selectActiveRunway(provisional, aerodrome) ?? aerodrome.runwayEnds[0];

  const features =
    activeRunway.headingTrueDeg === aerodrome.runwayEnds[0].headingTrueDeg
      ? provisional
      : buildFeatures(points, aerodrome, activeRunway.headingTrueDeg, elevationFt);

  const phases = features.map((f) => classifyPoint(f, activeRunway.headingTrueDeg));
  const segments = segmentize(features, phases, 8000, 22000);

  // Per-pass metrics for each downwind leg (so the readout reflects the pass the
  // playhead is on, not a flight-wide average).
  for (const seg of segments) {
    if (seg.phase !== "downwind") continue;
    const segFeatures = features.slice(seg.startIndex, seg.endIndex + 1);
    seg.separationM = median(segFeatures.map((f) => Math.abs(f.cross)));
    seg.altitudeFtAgl = median(
      segFeatures.map((f) => f.aglFt).filter((a) => a > GROUND_AGL_FT)
    );
  }

  const approaches = detectApproaches(points, features, aerodrome, activeRunway);
  const landings = buildLandings(segments, features, approaches, points, aerodrome);

  // Flight-wide figures come from the landings that actually flew a downwind.
  const sepValues = landings.map((l) => l.separationM).filter((v): v is number => v != null);
  const altValues = landings.map((l) => l.altitudeFtAgl).filter((v): v is number => v != null);

  return {
    aerodrome,
    activeRunway,
    fieldElevationFt: elevationFt,
    flownSide: detectFlownSide(features),
    publishedSide: publishedSideFrom(aerodrome, activeRunway.headingTrueDeg),
    patternAltitudeFtAgl: median(altValues),
    standardPatternAltitudeFtAgl: STANDARD_PATTERN_ALTITUDE_FT_AGL,
    downwindSeparationM: median(sepValues),
    typicalDownwindSeparationNm: TYPICAL_DOWNWIND_SEPARATION_NM,
    segments,
    landings,
    approaches,
  };
}
