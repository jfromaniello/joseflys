"use client";

import { useEffect, useState } from "react";
import { isMapStyle, isViewMode, type MapStyle, type ViewMode } from "./types";

const VIEW_MODE_KEY = "gpxReplay.viewMode";
const LEGACY_AUTO_CAMERA_KEY = "gpxReplay.autoCamera";
const MAP_STYLE_KEY = "gpxReplay.mapStyle";
const SHOW_TRACK_KEY = "gpxReplay.showTrack";

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
 * on). Same SSR-safe mount-hydration approach as {@link usePersistedViewMode}.
 */
export function usePersistedShowTrack(): [boolean, (value: boolean) => void] {
  const [showTrack, setShowTrack] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SHOW_TRACK_KEY);
    if (stored === null) return;
    // One-shot hydration from an external store on mount (see note above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTrack(stored === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHOW_TRACK_KEY, String(showTrack));
  }, [showTrack]);

  return [showTrack, setShowTrack];
}
