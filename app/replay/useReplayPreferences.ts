"use client";

import { useEffect, useState } from "react";
import {
  isMapStyle,
  isRecordAspect,
  isRecordResolution,
  isViewMode,
  type MapStyle,
  type RecordAspect,
  type RecordResolution,
  type ViewMode,
} from "./types";
import { DEFAULT_CHASE_RANGE_M } from "./cameraMath";

const VIEW_MODE_KEY = "gpxReplay.viewMode";
const LEGACY_AUTO_CAMERA_KEY = "gpxReplay.autoCamera";
const MAP_STYLE_KEY = "gpxReplay.mapStyle";
const SHOW_TRACK_KEY = "gpxReplay.showTrack";
const SHOW_WALL_KEY = "gpxReplay.showWall";
const CHASE_DISTANCE_KEY = "gpxReplay.chaseDistance";
const SHOW_PFD_KEY = "gpxReplay.showPfd";
const RECORD_ASPECT_KEY = "gpxReplay.recordAspect";
const RECORD_RESOLUTION_KEY = "gpxReplay.recordResolution";

/**
 * View-mode state persisted to localStorage.
 *
 * A valid `view` URL param wins and suppresses the stored value so shared links
 * are honored; otherwise the last choice is restored (falling back to a legacy
 * `autoCamera` flag from older sessions). Persisted value is read in a mount
 * effect rather than a lazy initializer to stay SSR-safe (no hydration
 * mismatch, localStorage only touched on the client).
 */
export function usePersistedViewMode(urlParam: string | null): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(
    urlParam && isViewMode(urlParam) ? urlParam : "free"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (urlParam && isViewMode(urlParam)) return;
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    const legacy = window.localStorage.getItem(LEGACY_AUTO_CAMERA_KEY);
    const next: ViewMode | null =
      stored && isViewMode(stored) ? stored : legacy === "true" ? "cinematic" : null;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setViewMode(next);
  }, [urlParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  return [viewMode, setViewMode];
}

/**
 * Map-style state persisted to localStorage. The photorealistic style is only
 * restored when a Google Maps key is configured. Same SSR-safe mount-hydration
 * approach as {@link usePersistedViewMode}.
 */
export function usePersistedMapStyle(hasGoogleMapsKey: boolean): [MapStyle, (style: MapStyle) => void] {
  const [mapStyle, setMapStyle] = useState<MapStyle>("standard");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(MAP_STYLE_KEY);
    if (!stored || !isMapStyle(stored)) return;
    if (stored === "photorealistic" && !hasGoogleMapsKey) return;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMapStyle(stored);
  }, [hasGoogleMapsKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MAP_STYLE_KEY, mapStyle);
  }, [mapStyle]);

  return [mapStyle, setMapStyle];
}

/**
 * Whether the cyan track polyline is shown, persisted to localStorage (default
 * on). A `track` URL param ("1"/"0") wins and suppresses the stored value, so
 * shared links honor the sender's choice. Same SSR-safe mount-hydration
 * approach as {@link usePersistedViewMode}.
 */
export function usePersistedShowTrack(urlParam: string | null): [boolean, (value: boolean) => void] {
  const fromUrl = urlParam === "1" || urlParam === "true";
  const [showTrack, setShowTrack] = useState(urlParam === "1" || urlParam === "0" ? fromUrl : true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (urlParam === "1" || urlParam === "0") return; // URL wins
    const stored = window.localStorage.getItem(SHOW_TRACK_KEY);
    if (stored === null) return;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTrack(stored === "true");
  }, [urlParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOW_TRACK_KEY, String(showTrack));
  }, [showTrack]);

  return [showTrack, setShowTrack];
}

/**
 * Whether the translucent altitude wall is shown, persisted to localStorage
 * (default off). A `wall` URL param ("1"/"0") wins and suppresses the stored
 * value, so shared links honor the sender's choice. Same SSR-safe
 * mount-hydration approach as {@link usePersistedViewMode}.
 */
export function usePersistedShowWall(urlParam: string | null): [boolean, (value: boolean) => void] {
  const fromUrl = urlParam === "1" || urlParam === "true";
  const [showWall, setShowWall] = useState(urlParam === "1" || urlParam === "0" ? fromUrl : false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (urlParam === "1" || urlParam === "0") return; // URL wins
    const stored = window.localStorage.getItem(SHOW_WALL_KEY);
    if (stored === null) return;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowWall(stored === "true");
  }, [urlParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOW_WALL_KEY, String(showWall));
  }, [showWall]);

  return [showWall, setShowWall];
}

/**
 * Whether the glass-cockpit (PFD) overlay is shown in cockpit view, persisted
 * to localStorage (default on). Same SSR-safe mount-hydration approach as
 * {@link usePersistedViewMode}.
 */
export function usePersistedShowPfd(): [boolean, (value: boolean) => void] {
  const [showPfd, setShowPfd] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SHOW_PFD_KEY);
    if (stored === null) return;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowPfd(stored === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOW_PFD_KEY, String(showPfd));
  }, [showPfd]);

  return [showPfd, setShowPfd];
}

/**
 * Recording output aspect ratio, persisted to localStorage (default 16:9).
 * Same SSR-safe mount-hydration approach as {@link usePersistedViewMode}.
 */
export function usePersistedRecordAspect(): [RecordAspect, (value: RecordAspect) => void] {
  const [aspect, setAspect] = useState<RecordAspect>("16:9");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(RECORD_ASPECT_KEY);
    if (!stored || !isRecordAspect(stored)) return;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAspect(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RECORD_ASPECT_KEY, aspect);
  }, [aspect]);

  return [aspect, setAspect];
}

/**
 * Recording output resolution preset, persisted to localStorage (default
 * 1080p). Same SSR-safe mount-hydration approach as {@link usePersistedViewMode}.
 */
export function usePersistedRecordResolution(): [RecordResolution, (value: RecordResolution) => void] {
  const [resolution, setResolution] = useState<RecordResolution>("1080p");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(RECORD_RESOLUTION_KEY);
    if (!stored || !isRecordResolution(stored)) return;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolution(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RECORD_RESOLUTION_KEY, resolution);
  }, [resolution]);

  return [resolution, setResolution];
}

/** Bounds for the user-adjustable chase camera distance (metres behind). */
export const CHASE_DISTANCE_MIN = 150;
export const CHASE_DISTANCE_MAX = 1500;

function clampChaseDistance(value: number): number {
  return Math.max(CHASE_DISTANCE_MIN, Math.min(CHASE_DISTANCE_MAX, value));
}

/**
 * Chase camera distance (metres behind the aircraft), persisted to localStorage.
 * A valid `cd` URL param wins and suppresses the stored value (so shared links
 * are honored). Same SSR-safe mount-hydration approach as {@link usePersistedViewMode}.
 */
export function usePersistedChaseDistance(urlParam: number | null): [number, (value: number) => void] {
  const [distance, setDistance] = useState(
    urlParam !== null && Number.isFinite(urlParam) ? clampChaseDistance(urlParam) : DEFAULT_CHASE_RANGE_M
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (urlParam !== null && Number.isFinite(urlParam)) return;
    const stored = Number.parseInt(window.localStorage.getItem(CHASE_DISTANCE_KEY) ?? "", 10);
    if (!Number.isFinite(stored)) return;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDistance(clampChaseDistance(stored));
  }, [urlParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHASE_DISTANCE_KEY, String(distance));
  }, [distance]);

  return [distance, setDistance];
}
