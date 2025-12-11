"use client";

import { useState, useMemo } from "react";
import { decode, DecodedNotam } from "@rovacc/notam-decoder";
import { Notam } from "./types";
import { CardAnchor } from "./CardAnchor";

interface NotamCardProps {
  notams: Notam[];
  loading: boolean;
}

const PAGE_SIZE = 5;

// Get keyword color
function getKeywordColor(keyword: string): string {
  switch (keyword) {
    case "RWY":
      return "text-sky-400 bg-sky-400/10 border-sky-400/30";
    case "TWY":
      return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    case "APRON":
      return "text-indigo-400 bg-indigo-400/10 border-indigo-400/30";
    case "AD":
      return "text-purple-400 bg-purple-400/10 border-purple-400/30";
    case "NAV":
      return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "COM":
      return "text-green-400 bg-green-400/10 border-green-400/30";
    case "SVC":
      return "text-teal-400 bg-teal-400/10 border-teal-400/30";
    case "OBST":
      return "text-red-400 bg-red-400/10 border-red-400/30";
    case "AIRSPACE":
      return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    case "LTA":
      return "text-pink-400 bg-pink-400/10 border-pink-400/30";
    default:
      return "text-slate-400 bg-slate-400/10 border-slate-400/30";
  }
}

// Get scope color
function getScopeColor(scope: string): string {
  if (scope.includes("Airport")) return "text-sky-400";
  if (scope.includes("Enroute")) return "text-amber-400";
  if (scope.includes("Navigation")) return "text-purple-400";
  return "text-slate-400";
}

// Format date from NOTAM format
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format decoded date
function formatDecodedDate(date: Date | undefined): string {
  if (!date) return "";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Check if NOTAM is expired
function isExpired(notam: Notam): boolean {
  return notam.cancelledOrExpired || notam.status !== "Active";
}

// Try to decode ICAO message
function tryDecode(icaoMessage: string): DecodedNotam | null {
  if (!icaoMessage || icaoMessage.trim().length < 10) return null;
  try {
    const decoded = decode(icaoMessage);
    // Check if it was actually parsed (has meaningful data)
    if (decoded.metadata.parsedQ || decoded.metadata.parsedE) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

// Single NOTAM item component
function NotamItem({ notam }: { notam: Notam }) {
  const [expanded, setExpanded] = useState(false);

  const decoded = useMemo(
    () => tryDecode(notam.icaoMessage),
    [notam.icaoMessage]
  );

  const hasDecodedInfo = decoded && (decoded.title || decoded.scope || decoded.rules.length > 0);

  return (
    <div className="bg-slate-900/30 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded border ${getKeywordColor(
              notam.keyword
            )}`}
          >
            {notam.keyword || "OTHER"}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {notam.notamNumber}
          </span>
          {decoded?.scope && (
            <span className={`text-xs ${getScopeColor(decoded.scope)}`}>
              {decoded.scope}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {formatDate(notam.issueDate)}
        </span>
      </div>

      {/* Decoded Title */}
      {decoded?.title && (
        <div className="text-sm font-medium text-white mb-2">
          {decoded.title}
        </div>
      )}

      {/* Rules & Attention badges */}
      {decoded && (decoded.rules.length > 0 || decoded.attention.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {decoded.rules.map((rule) => (
            <span
              key={rule}
              className={`px-1.5 py-0.5 text-xs rounded ${
                rule === "IFR"
                  ? "bg-red-400/10 text-red-400"
                  : "bg-green-400/10 text-green-400"
              }`}
            >
              {rule}
            </span>
          ))}
          {decoded.attention.slice(0, 2).map((att) => (
            <span
              key={att}
              className="px-1.5 py-0.5 text-xs rounded bg-amber-400/10 text-amber-400"
            >
              {att}
            </span>
          ))}
        </div>
      )}

      {/* Position info */}
      {decoded?.position && (decoded.position.latitude || decoded.position.lowerLimit !== undefined) && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-2">
          {decoded.position.latitude && decoded.position.longitude && (
            <span>
              {decoded.position.latitude.toFixed(2)}°, {decoded.position.longitude.toFixed(2)}°
              {decoded.position.radius && ` (${decoded.position.radius} NM radius)`}
            </span>
          )}
          {(decoded.position.lowerLimit !== undefined || decoded.position.upperLimit !== undefined) && (
            <span>
              FL{decoded.position.lowerLimit ?? "SFC"} → FL{decoded.position.upperLimit ?? "UNL"}
            </span>
          )}
        </div>
      )}

      {/* Raw Message (collapsible if we have decoded info) */}
      {hasDecodedInfo ? (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-sky-400 hover:text-sky-300 mb-1 cursor-pointer"
          >
            {expanded ? "▼ Hide raw" : "▶ Show raw"}
          </button>
          {expanded && (
            <div className="text-xs text-slate-400 font-mono break-words whitespace-pre-wrap bg-slate-900/50 rounded p-2 mt-1">
              {notam.traditionalMessageFrom4thWord || notam.traditionalMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-300 font-mono break-words whitespace-pre-wrap">
          {notam.traditionalMessageFrom4thWord || notam.traditionalMessage}
        </div>
      )}

      {/* Validity */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        {decoded?.duration ? (
          <>
            <span>
              From: {formatDecodedDate(decoded.duration.dateBegin)}
            </span>
            {decoded.duration.dateEnd && (
              <span>
                To: {formatDecodedDate(decoded.duration.dateEnd)}
                {decoded.duration.estimated && " (EST)"}
              </span>
            )}
            {decoded.duration.permanent && (
              <span className="text-amber-400">PERM</span>
            )}
          </>
        ) : (
          <>
            <span>From: {formatDate(notam.startDate)}</span>
            {notam.endDate && <span>To: {formatDate(notam.endDate)}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export function NotamCard({ notams, loading }: NotamCardProps) {
  const [page, setPage] = useState(0);

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">NOTAMs</h2>
        <div className="text-slate-400 text-center py-8">Loading NOTAMs...</div>
      </div>
    );
  }

  if (!notams || notams.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">NOTAMs</h2>
        <div className="text-slate-400 text-center py-8">No NOTAMs found for this location</div>
      </div>
    );
  }

  // Filter out expired NOTAMs and sort by issue date (newest first)
  const activeNotams = notams
    .filter((n) => !isExpired(n))
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

  const totalPages = Math.ceil(activeNotams.length / PAGE_SIZE);
  const startIndex = page * PAGE_SIZE;
  const visibleNotams = activeNotams.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">NOTAMs</h2>
          <CardAnchor id="notam" />
        </div>
        <span className="text-xs text-slate-400">
          {activeNotams.length} active NOTAM{activeNotams.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* NOTAM List */}
      <div className="space-y-3">
        {visibleNotams.map((notam, index) => (
          <NotamItem key={notam.notamNumber || index} notam={notam} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
