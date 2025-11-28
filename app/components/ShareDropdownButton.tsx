"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ShareIcon,
  CheckIcon,
  LinkIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  MapIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import type { FlightPlan } from "@/lib/flightPlan";
import { generateShareUrl } from "@/lib/flightPlan";
import { SHARED_PLAN_TTL_DAYS } from "@/lib/redis";

interface ShareDropdownButtonProps {
  flightPlan: FlightPlan;
  /** Compact mode shows only icon, no text */
  compact?: boolean;
  /** Custom class for the button */
  className?: string;
}

type ShareStatus = "idle" | "loading" | "copied-long" | "copied-short" | "error";

interface PublishModalData {
  planUrl: string;
  mapUrl: string;
}

export function ShareDropdownButton({ flightPlan, compact = false, className }: ShareDropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [publishModal, setPublishModal] = useState<PublishModalData | null>(null);
  const [copiedField, setCopiedField] = useState<"plan" | "map" | null>(null);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // For portal - ensure we're on client
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handlePublish = async () => {
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

      // Show the publish modal instead of copying directly
      setPublishModal({
        planUrl: url,
        mapUrl: `${url}/map`,
      });
      setIsOpen(false);
      setStatus("idle");
    } catch (error) {
      console.error("Publish failed:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleCopyLink = async (url: string, field: "plan" | "map") => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleCloseModal = () => {
    setPublishModal(null);
    setCopiedField(null);
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
              onClick={handlePublish}
              disabled={status === "loading"}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <LinkIcon className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <div className="font-medium">Publish</div>
                <div className="text-xs text-slate-400">Short link, stored {SHARED_PLAN_TTL_DAYS} days</div>
              </div>
            </button>
            <button
              onClick={handleShareLongUrl}
              disabled={status === "loading"}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <DocumentDuplicateIcon className="w-5 h-5 text-blue-400" />
              <div className="text-left">
                <div className="font-medium">Share</div>
                <div className="text-xs text-slate-400">Long link, never expires</div>
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

      {/* Publish Modal - rendered in portal to escape stacking context */}
      {mounted && publishModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <CheckIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Published!</h3>
                  <p className="text-xs text-slate-400">Your flight plan is now available</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Plan Link */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Flight Plan Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publishModal.planUrl}
                    className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-white font-mono"
                  />
                  <button
                    onClick={() => handleCopyLink(publishModal.planUrl, "plan")}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedField === "plan" ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                    <span className="text-sm">{copiedField === "plan" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Map Link */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Direct Map Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publishModal.mapUrl}
                    className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-white font-mono"
                  />
                  <button
                    onClick={() => handleCopyLink(publishModal.mapUrl, "map")}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedField === "map" ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                    <span className="text-sm">{copiedField === "map" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start gap-3 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                <div className="p-1 bg-amber-500/20 rounded">
                  <MapIcon className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xs text-amber-200/80">
                  <p className="font-medium mb-1">Link expires in {SHARED_PLAN_TTL_DAYS} days</p>
                  <p className="text-amber-200/60">
                    The published link will be available for {SHARED_PLAN_TTL_DAYS} days.
                    After that, you&apos;ll need to publish again to generate a new link.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-slate-700 bg-slate-900/30">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
