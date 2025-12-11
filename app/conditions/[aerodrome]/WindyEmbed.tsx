"use client";

import { useState, useRef } from "react";
import { AerodromeResult } from "@/app/components/AerodromeSearchInput";
import { CardAnchor } from "./CardAnchor";

interface WindyEmbedProps {
  aerodrome: AerodromeResult;
}

type WindyOverlay = "wind" | "rain" | "temp" | "clouds";

// Altitude levels supported by Windy (pressure levels in hPa with approximate altitudes)
const ALTITUDE_LEVELS = [
  { value: "surface", label: "Surface", altitude: "SFC" },
  { value: "100m", label: "100m", altitude: "330ft" },
  { value: "950h", label: "950 hPa", altitude: "~1,600ft" },
  { value: "925h", label: "925 hPa", altitude: "~2,500ft" },
  { value: "900h", label: "900 hPa", altitude: "~3,300ft" },
  { value: "850h", label: "850 hPa", altitude: "~5,000ft" },
  { value: "800h", label: "800 hPa", altitude: "~6,500ft" },
  { value: "700h", label: "700 hPa", altitude: "FL100" },
  { value: "600h", label: "600 hPa", altitude: "FL140" },
  { value: "500h", label: "500 hPa", altitude: "FL180" },
  { value: "400h", label: "400 hPa", altitude: "FL235" },
  { value: "300h", label: "300 hPa", altitude: "FL300" },
];

export function WindyEmbed({ aerodrome }: WindyEmbedProps) {
  const [overlay, setOverlay] = useState<WindyOverlay>("wind");
  const [levelIndex, setLevelIndex] = useState(0);
  const [pendingLevelIndex, setPendingLevelIndex] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overlayOptions = [
    { key: "wind" as const, label: "Wind", icon: "💨" },
    { key: "rain" as const, label: "Rain", icon: "🌧" },
    { key: "temp" as const, label: "Temp", icon: "🌡" },
    { key: "clouds" as const, label: "Clouds", icon: "☁" },
  ];

  const currentLevel = ALTITUDE_LEVELS[levelIndex];
  const displayLevel = pendingLevelIndex !== null ? ALTITUDE_LEVELS[pendingLevelIndex] : currentLevel;
  const showAltitudeSlider = overlay === "wind";

  // Debounce level changes to avoid too many iframe reloads while dragging
  const handleLevelChange = (index: number) => {
    setPendingLevelIndex(index);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setLevelIndex(index);
      setPendingLevelIndex(null);
    }, 300);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Windy Weather Map</h2>
          <CardAnchor id="windy" />
        </div>
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

      {/* Altitude Slider - only shown for wind overlay */}
      {showAltitudeSlider && (
        <div className="mb-4 bg-slate-900/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Altitude Level</span>
            <span className="text-sm font-medium text-white">
              {displayLevel.label}{" "}
              <span className="text-slate-400">({displayLevel.altitude})</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={ALTITUDE_LEVELS.length - 1}
            value={pendingLevelIndex ?? levelIndex}
            onChange={(e) => handleLevelChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>SFC</span>
            <span>FL300</span>
          </div>
        </div>
      )}

      <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <iframe
          key={`${overlay}-${currentLevel.value}`}
          width="100%"
          height="100%"
          src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=kt&zoom=10&overlay=${overlay}&product=ecmwf&level=${currentLevel.value}&lat=${aerodrome.lat}&lon=${aerodrome.lon}&message=true`}
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
