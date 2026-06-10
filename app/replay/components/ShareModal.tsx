"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ShareStatus } from "../shareReplay";

interface ShareModalProps {
  /** Uploads the track (optionally anonymized) and returns the share URL. */
  createUrl: (anonymize: boolean) => Promise<string>;
  /**
   * Aircraft registration found in the track, if any. When present the modal
   * offers to strip it before upload and waits for an explicit "Create link"
   * so the identified blob is never stored unless the user chooses to.
   */
  aircraftIdent?: string;
  onClose: () => void;
}

/**
 * Modal that creates and shows a share link. GPX tracks (nothing identifying)
 * upload immediately on open; Garmin logs carrying a registration first offer
 * an anonymize toggle (off by default) and upload on confirmation.
 */
export function ShareModal({ createUrl, aircraftIdent, onClose }: ShareModalProps) {
  const offerAnonymize = Boolean(aircraftIdent);
  const [anonymize, setAnonymize] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(
    async (anon: boolean) => {
      setStatus("loading");
      setUrl("");
      try {
        const link = await createUrl(anon);
        setUrl(link);
        setStatus("idle");
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
        } catch {
          // clipboard may fail (permissions, insecure context) — user can copy manually
        }
      } catch {
        setStatus("error");
      }
    },
    [createUrl]
  );

  // Nothing to anonymize: create the link right away, like a one-click share.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (offerAnonymize || autoStartedRef.current) return;
    autoStartedRef.current = true;
    // One-shot upload on open; the network round-trip dominates, so the
    // immediate "loading" state set here can't cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void generate(false);
  }, [offerAnonymize, generate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // ignore — input is still selectable
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share replay"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Share this replay</h3>
            <p className="text-xs mt-1" style={{ color: "oklch(0.7 0.02 240)" }}>
              Anyone with the link can view the track at the current position, view mode, and camera angle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-8 w-8 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {offerAnonymize ? (
          <label className="mb-4 flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={anonymize}
              onChange={(e) => {
                setAnonymize(e.target.checked);
                // The choice changes what gets uploaded; require a fresh create.
                setUrl("");
                setStatus("idle");
              }}
              className="mt-0.5 h-4 w-4 accent-cyan-500 cursor-pointer"
            />
            <span className="text-sm text-slate-200">
              Remove aircraft identification
              <span className="block text-xs mt-0.5" style={{ color: "oklch(0.7 0.02 240)" }}>
                Strips the registration ({aircraftIdent}) and device serial number from the shared
                log. When off, anyone with the link can see them.
              </span>
            </span>
          </label>
        ) : null}

        {status === "error" ? (
          <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            Failed to create the link. Please try again.
          </div>
        ) : null}

        {url ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-100 font-mono outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                copied ? "bg-emerald-600 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void generate(anonymize)}
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating link…
              </>
            ) : (
              "Create link"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
