"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseFullscreenResult {
  isFullscreen: boolean;
  /** Attach to the element that should fill the screen. */
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  toggleFullscreen: () => Promise<void>;
}

/**
 * Manages fullscreen for a wrapper element. Prefers the native Fullscreen API
 * (incl. the WebKit-prefixed variant) and falls back to a CSS fixed-overlay
 * mode when the API is unavailable. In fallback mode, Escape exits and page
 * scrolling is locked.
 */
export function useFullscreen(): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const usedNativeFullscreenRef = useRef(false);

  // Sync state when the browser exits native fullscreen (e.g. via its own UI).
  useEffect(() => {
    const onChange = () => {
      if (!usedNativeFullscreenRef.current) return;
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const el = wrapperRef.current;
      const active = doc.fullscreenElement === el || doc.webkitFullscreenElement === el;
      setIsFullscreen(active);
      if (!active) usedNativeFullscreenRef.current = false;
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // CSS-fallback only: Escape exits.
  useEffect(() => {
    if (!isFullscreen || usedNativeFullscreenRef.current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // CSS-fallback only: lock page scroll while the overlay is shown.
  useEffect(() => {
    if (!isFullscreen || usedNativeFullscreenRef.current) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const el = wrapperRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void })
      | null;
    if (!el) return;
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };

    if (isFullscreen) {
      if (usedNativeFullscreenRef.current) {
        try {
          if (typeof doc.exitFullscreen === "function") await doc.exitFullscreen();
          else if (typeof doc.webkitExitFullscreen === "function") await doc.webkitExitFullscreen();
        } catch (err) {
          console.error("Exit fullscreen failed", err);
        }
      } else {
        setIsFullscreen(false);
      }
      return;
    }

    const request =
      typeof el.requestFullscreen === "function"
        ? el.requestFullscreen.bind(el)
        : typeof el.webkitRequestFullscreen === "function"
          ? el.webkitRequestFullscreen.bind(el)
          : null;

    if (!request) {
      setIsFullscreen(true);
      return;
    }

    try {
      usedNativeFullscreenRef.current = true;
      await request();
    } catch (err) {
      console.error("Request fullscreen failed", err);
      usedNativeFullscreenRef.current = false;
      setIsFullscreen(true);
    }
  }, [isFullscreen]);

  return { isFullscreen, wrapperRef, toggleFullscreen };
}
