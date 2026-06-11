/**
 * Shared types and constants for the GPX 3D replay feature.
 *
 * These are split out from the client/globe components so both can depend on a
 * single source of truth without creating an import cycle.
 */

/**
 * A single track point, normalized for replay.
 *
 * The first four fields come from any source (GPX or Garmin CSV). The remaining
 * fields are optional rich telemetry only present in avionics logs (Garmin G3X
 * CSV); consumers must treat them as possibly `undefined` and fall back to
 * GPS-derived values when absent.
 */
export interface ReplayPoint {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lon: number;
  /** Elevation in meters (GPS altitude). */
  ele: number;
  /** Absolute timestamp in milliseconds since epoch. */
  timeMs: number;
  /** Recorded GPS ground speed in knots. */
  groundSpeedKt?: number;
  /** Indicated airspeed in knots. */
  iasKt?: number;
  /** True airspeed in knots. */
  tasKt?: number;
  /** Recorded vertical speed in feet per minute. */
  vsFpm?: number;
  /** Aircraft pitch in degrees (nose up positive). */
  pitchDeg?: number;
  /** Aircraft roll/bank in degrees (right wing down positive). */
  rollDeg?: number;
  /** Magnetic heading in degrees (where the nose points, not course). */
  headingMagDeg?: number;
  /** Body-frame lateral acceleration in G (slip/skid; 0 when coordinated). */
  latAccG?: number;
  /** Wind direction in degrees (direction the wind is coming from). */
  windDirDeg?: number;
  /** Wind speed in knots. */
  windSpeedKt?: number;
  /** Outside air temperature in degrees Celsius. */
  oatC?: number;
  /** Height above ground in feet (avionics-computed AGL). */
  aglFt?: number;
  /** Engine RPM. */
  rpm?: number;
  /** Engine manifold pressure in inches of mercury. */
  manifoldInHg?: number;
  /** Fuel flow in gallons per hour. */
  fuelFlowGph?: number;
  /** Fuel pressure in PSI. */
  fuelPressPsi?: number;
  /** Oil pressure in PSI. */
  oilPressPsi?: number;
  /** Oil temperature in degrees Fahrenheit. */
  oilTempF?: number;
  /** Coolant temperature in degrees Fahrenheit (e.g. Rotax engines). */
  coolantTempF?: number;
  /** Hottest exhaust gas temperature across cylinders, degrees Fahrenheit. */
  egtMaxF?: number;
  /** Hottest cylinder head temperature across cylinders, degrees Fahrenheit. */
  chtMaxF?: number;
  /** Electrical bus voltage. */
  volts?: number;
  /** Alternator amps. */
  amps?: number;
}

/** Source format a track was loaded from. */
export type TrackFormat = "gpx" | "garmin-csv";

/** A serializable camera pose used to share/restore the 3D view. */
export interface CameraPose {
  /** Longitude in decimal degrees. */
  lon: number;
  /** Latitude in decimal degrees. */
  lat: number;
  /** Camera height in meters. */
  alt: number;
  /** Heading in degrees. */
  hdg: number;
  /** Pitch in degrees. */
  pit: number;
}

/** Lifecycle of the DeviceOrientation permission used for cockpit head-tracking. */
export type OrientationStatus =
  | "unknown"
  | "unavailable"
  | "needs-permission"
  | "granted"
  | "denied";

/** Camera behavior selected by the user. */
export type ViewMode = "free" | "chase" | "cinematic" | "cockpit";

export const VIEW_MODES: ViewMode[] = ["free", "chase", "cinematic", "cockpit"];

/** View mode options with display labels, shared by the controls and record modal. */
export const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "chase", label: "Chase" },
  { value: "cinematic", label: "Cinematic" },
  { value: "cockpit", label: "Cockpit" },
];

export function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as string[]).includes(value);
}

/** Base map rendering style. */
export type MapStyle = "standard" | "photorealistic";

export const MAP_STYLES: MapStyle[] = ["standard", "photorealistic"];

export function isMapStyle(value: string): value is MapStyle {
  return (MAP_STYLES as string[]).includes(value);
}

/** Recording output aspect ratio ("screen" matches the live canvas size). */
export type RecordAspect = "16:9" | "9:16" | "screen";

export const RECORD_ASPECTS: RecordAspect[] = ["16:9", "9:16", "screen"];

export function isRecordAspect(value: string): value is RecordAspect {
  return (RECORD_ASPECTS as string[]).includes(value);
}

/** Recording output resolution preset (interpreted per aspect ratio). */
export type RecordResolution = "1080p" | "720p";

export const RECORD_RESOLUTIONS: RecordResolution[] = ["1080p", "720p"];

export function isRecordResolution(value: string): value is RecordResolution {
  return (RECORD_RESOLUTIONS as string[]).includes(value);
}

/** Output pixel dimensions for a recording preset; null means "match the live canvas". */
export function recordOutputSize(
  aspect: RecordAspect,
  resolution: RecordResolution
): { width: number; height: number } | null {
  if (aspect === "screen") return null;
  const long = resolution === "1080p" ? 1920 : 1280;
  const short = resolution === "1080p" ? 1080 : 720;
  return aspect === "16:9" ? { width: long, height: short } : { width: short, height: long };
}

/**
 * Logical (CSS-pixel) width the PFD scene is laid out at for fixed presets: a
 * typical desktop viewport for landscape, a phone-sized one for vertical —
 * mirroring how the live overlay would look on those devices. Using a constant
 * (instead of the live canvas size) keeps the overlay framing identical across
 * machines and across resolutions of the same aspect.
 */
export const PFD_LAYOUT_WIDTH: Record<"16:9" | "9:16", number> = { "16:9": 1280, "9:16": 420 };

/** Frame rates offered for the HUD-only overlay export (match the camera's). */
export const HUD_EXPORT_FPS_OPTIONS = [24, 25, 30, 60] as const;

export type HudExportFps = (typeof HUD_EXPORT_FPS_OPTIONS)[number];

/** Allowed playback speed multipliers. */
export const SPEED_OPTIONS = [1, 10, 50, 100] as const;

export type SpeedOption = (typeof SPEED_OPTIONS)[number];

export function isSpeedOption(value: number): value is SpeedOption {
  return (SPEED_OPTIONS as readonly number[]).includes(value);
}
