"use client";

import { useState, useEffect } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import {
  getSunPosition,
  formatSunTime,
  getTimeUntil,
  type SunPosition,
} from "@/lib/sun";
import { CardAnchor } from "./CardAnchor";

interface SunTimesCardProps {
  lat: number;
  lon: number;
}

export function SunTimesCard({ lat, lon }: SunTimesCardProps) {
  const [sunPosition, setSunPosition] = useState<SunPosition | null>(null);
  const [now, setNow] = useState(new Date());

  // Calculate sun position on mount and update every minute
  useEffect(() => {
    const update = () => {
      const currentTime = new Date();
      setNow(currentTime);
      setSunPosition(getSunPosition(lat, lon, currentTime));
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lat, lon]);

  if (!sunPosition) {
    return null;
  }

  const { times, phase, isVfrLegal, nextTransition } = sunPosition;

  // Determine icon and status colors
  const getPhaseInfo = () => {
    switch (phase) {
      case "day":
        return {
          icon: <SunIcon className="w-5 h-5 text-yellow-400" />,
          label: "Day",
          bgColor: "bg-yellow-400/10",
          borderColor: "border-yellow-400/30",
          textColor: "text-yellow-400",
        };
      case "civil-twilight":
        return {
          icon: <SunIcon className="w-5 h-5 text-orange-400" />,
          label: "Civil Twilight",
          bgColor: "bg-orange-400/10",
          borderColor: "border-orange-400/30",
          textColor: "text-orange-400",
        };
      case "night":
        return {
          icon: <MoonIcon className="w-5 h-5 text-indigo-400" />,
          label: "Night",
          bgColor: "bg-indigo-400/10",
          borderColor: "border-indigo-400/30",
          textColor: "text-indigo-400",
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Sun Times</h2>
          <CardAnchor id="sun" />
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full border ${phaseInfo.bgColor} ${phaseInfo.borderColor}`}
        >
          {phaseInfo.icon}
          <span className={`text-sm font-medium ${phaseInfo.textColor}`}>
            {phaseInfo.label}
          </span>
        </div>
      </div>

      {/* VFR Status */}
      <div className="mb-4">
        {isVfrLegal ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span className="text-green-400">VFR flight permitted (within civil twilight)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
            <span className="text-red-400">Night - VFR flight restrictions apply</span>
          </div>
        )}
      </div>

      {/* Sun Times Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-lg bg-slate-900/30">
          <div className="text-xs text-slate-400 mb-1">Civil Dawn</div>
          <div className="text-white font-medium font-mono">
            {formatSunTime(times.civilDawn)}
          </div>
          <div className="text-xs text-slate-500">VFR begins</div>
        </div>

        <div className="text-center p-3 rounded-lg bg-slate-900/30">
          <div className="text-xs text-slate-400 mb-1">Sunrise</div>
          <div className="text-yellow-400 font-medium font-mono">
            {formatSunTime(times.sunrise)}
          </div>
        </div>

        <div className="text-center p-3 rounded-lg bg-slate-900/30">
          <div className="text-xs text-slate-400 mb-1">Sunset</div>
          <div className="text-orange-400 font-medium font-mono">
            {formatSunTime(times.sunset)}
          </div>
        </div>

        <div className="text-center p-3 rounded-lg bg-slate-900/30">
          <div className="text-xs text-slate-400 mb-1">Civil Dusk</div>
          <div className="text-white font-medium font-mono">
            {formatSunTime(times.civilDusk)}
          </div>
          <div className="text-xs text-slate-500">VFR ends</div>
        </div>
      </div>

      {/* Next Transition */}
      {nextTransition && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {nextTransition.label} at {formatSunTime(nextTransition.time)}
            </span>
            <span className="text-slate-300 font-mono">
              in {getTimeUntil(nextTransition.time, now)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
