"use client";

import { useState } from "react";
import { AerodromeResult } from "@/app/components/AerodromeSearchInput";

interface WindyEmbedProps {
  aerodrome: AerodromeResult;
}

type WindyOverlay = "wind" | "rain" | "temp" | "clouds";

export function WindyEmbed({ aerodrome }: WindyEmbedProps) {
  const [overlay, setOverlay] = useState<WindyOverlay>("wind");

  const overlayOptions = [
    { key: "wind" as const, label: "Wind", icon: "💨" },
    { key: "rain" as const, label: "Rain", icon: "🌧" },
    { key: "temp" as const, label: "Temp", icon: "🌡" },
    { key: "clouds" as const, label: "Clouds", icon: "☁" },
  ];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-white">Windy Weather Map</h2>
        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
          {overlayOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setOverlay(opt.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                overlay === opt.key
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <span>{opt.icon}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <iframe
          key={overlay}
          width="100%"
          height="100%"
          src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=kt&zoom=12&overlay=${overlay}&product=ecmwf&level=surface&lat=${aerodrome.lat}&lon=${aerodrome.lon}&message=true`}
          frameBorder="0"
          title="Windy Weather Map"
        />
      </div>
      <p className="text-xs text-slate-500 mt-2 text-right">
        Powered by{" "}
        <a
          href="https://www.windy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300"
        >
          Windy.com
        </a>
      </p>
    </div>
  );
}
