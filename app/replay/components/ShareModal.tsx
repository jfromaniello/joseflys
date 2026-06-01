"use client";

import { useEffect, useState } from "react";

interface ShareModalProps {
  /** The shareable URL to display and copy. */
  url: string;
  onClose: () => void;
}

/** Modal showing a generated share link with a copy-to-clipboard button. */
export function ShareModal({ url, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

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
      </div>
    </div>
  );
}
