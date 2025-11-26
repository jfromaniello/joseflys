"use client";

import { useState, useRef, useEffect } from "react";
import {
  ShareIcon,
  CheckIcon,
  LinkIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import type { FlightPlan } from "@/lib/flightPlan";
import { generateShareUrl } from "@/lib/flightPlan";

interface ShareDropdownButtonProps {
  flightPlan: FlightPlan;
  /** Compact mode shows only icon, no text */
  compact?: boolean;
  /** Custom class for the button */
  className?: string;
}

type ShareStatus = "idle" | "loading" | "copied-long" | "copied-short" | "error";

export function ShareDropdownButton({ flightPlan, compact = false, className }: ShareDropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset status after showing success
  useEffect(() => {
    if (status === "copied-long" || status === "copied-short") {
      const timer = setTimeout(() => setStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleShareLongUrl = async () => {
    try {
      const shareUrl = generateShareUrl(flightPlan);

      if (navigator.share) {
        await navigator.share({
          title: `Flight Plan: ${flightPlan.name}`,
          text: `Check out this flight plan with ${flightPlan.legs.length} leg${flightPlan.legs.length !== 1 ? "s" : ""}`,
          url: shareUrl,
        });
        setIsOpen(false);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setStatus("copied-long");
        setTimeout(() => setIsOpen(false), 1500);
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleShareShortUrl = async () => {
    setStatus("loading");

    try {
      // Call API to create short link - send flight plan object directly
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flightPlan),
      });

      if (!response.ok) {
        throw new Error("Failed to create short link");
      }

      const data = await response.json();
      const url = data.shortUrl;
      setShortUrl(url);

      if (navigator.share) {
        await navigator.share({
          title: `Flight Plan: ${flightPlan.name}`,
          text: `Check out this flight plan with ${flightPlan.legs.length} leg${flightPlan.legs.length !== 1 ? "s" : ""}`,
          url,
        });
        setIsOpen(false);
        setStatus("idle");
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("copied-short");
        setTimeout(() => setIsOpen(false), 1500);
      }
    } catch (error) {
      console.error("Short link share failed:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const getButtonIcon = () => {
    const iconClass = compact ? "w-5 h-5" : "w-4 h-4";
    switch (status) {
      case "loading":
        return <div className={`${iconClass} border-2 border-white/30 border-t-white rounded-full animate-spin`} />;
      case "copied-long":
      case "copied-short":
        return <CheckIcon className={iconClass} />;
      default:
        return <ShareIcon className={iconClass} />;
    }
  };

  const getButtonText = () => {
    if (compact) return null;
    switch (status) {
      case "loading":
        return <span className="hidden sm:inline">Creating...</span>;
      case "copied-long":
      case "copied-short":
        return <span className="hidden sm:inline">Copied!</span>;
      case "error":
        return <span className="hidden sm:inline">Error</span>;
      default:
        return <span className="hidden sm:inline">Share</span>;
    }
  };

  const defaultClassName = compact
    ? "p-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors cursor-pointer"
    : "px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={className || defaultClassName}
        title="Share flight plan"
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <button
              onClick={handleShareShortUrl}
              disabled={status === "loading"}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <LinkIcon className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <div className="font-medium">Short Link</div>
                <div className="text-xs text-slate-400">Expires in 30 days</div>
              </div>
            </button>
            <button
              onClick={handleShareLongUrl}
              disabled={status === "loading"}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <DocumentDuplicateIcon className="w-5 h-5 text-blue-400" />
              <div className="text-left">
                <div className="font-medium">Direct Link</div>
                <div className="text-xs text-slate-400">Longer link, never expires.</div>
              </div>
            </button>
          </div>
          {shortUrl && status === "copied-short" && (
            <div className="px-3 py-2 bg-emerald-900/30 border-t border-slate-600">
              <p className="text-xs text-emerald-300 break-all">{shortUrl}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
