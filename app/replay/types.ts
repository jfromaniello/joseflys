/**
 * Shared types and constants for the GPX 3D replay feature.
 *
 * These are split out from the client/globe components so both can depend on a
 * single source of truth without creating an import cycle.
 */

/** A single GPX track point, normalized for replay. */
export interface ReplayPoint {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lon: number;
  /** Elevation in meters (GPX standard). */
  ele: number;
  /** Absolute timestamp in milliseconds since epoch. */
  timeMs: number;
}

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
export type ViewMode = "free" | "cinematic" | "cockpit";

export const VIEW_MODES: ViewMode[] = ["free", "cinematic", "cockpit"];

export function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as string[]).includes(value);
}

/** Base map rendering style. */
export type MapStyle = "standard" | "photorealistic";

export const MAP_STYLES: MapStyle[] = ["standard", "photorealistic"];

export function isMapStyle(value: string): value is MapStyle {
  return (MAP_STYLES as string[]).includes(value);
}

/** Allowed playback speed multipliers. */
export const SPEED_OPTIONS = [1, 10, 50, 100] as const;

export type SpeedOption = (typeof SPEED_OPTIONS)[number];

export function isSpeedOption(value: number): value is SpeedOption {
  return (SPEED_OPTIONS as readonly number[]).includes(value);
}
