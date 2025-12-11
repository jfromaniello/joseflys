"use client";

import { useState, useEffect } from "react";
import { SunIcon, MoonIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { MetarData, Runway, Notam, OpenMeteoData, TomorrowData } from "./types";
import { selectBestRunway, SelectedRunway } from "@/lib/runwayUtils";
import { WindRoseRunway } from "./WindRoseRunway";
import { CardAnchor } from "./CardAnchor";
import { calculatePA, calculateDA, calculateISATemp } from "@/lib/isaCalculations";
import { getSunPosition, formatSunTime, getTimeUntil, type SunPosition } from "@/lib/sun";
import { decode } from "@rovacc/notam-decoder";

// Icons
const WindIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" strokeLinecap="round" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" strokeLinecap="round" />
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" strokeLinecap="round" />
  </svg>
);

const VisibilityIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const PressureIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" strokeLinecap="round" />
  </svg>
);

const ThermometerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" />
  </svg>
);

const AltitudeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloudIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Parse NOTAMs to find closed runways
 */
function getClosedRunwaysFromNotams(notams: Notam[] | null): Set<string> {
  const closedRunways = new Set<string>();
  if (!notams) return closedRunways;

  const now = new Date();

  for (const notam of notams) {
    if (notam.cancelledOrExpired || notam.status === "Cancelled") continue;
    if (!notam.icaoMessage) continue;

    try {
      const decoded = decode(notam.icaoMessage);
      const code = decoded.code?.toUpperCase() || "";
      if (!code.startsWith("QMRLC") && !code.startsWith("QMRLT")) continue;

      const { dateBegin, dateEnd, permanent } = decoded.duration || {};
      if (!permanent) {
        if (dateBegin && now < new Date(dateBegin)) continue;
        if (dateEnd && now > new Date(dateEnd)) continue;
      }

      const text = decoded.text?.toUpperCase() || "";
      const runwayPattern = /(?:RWY|RUNWAY)\s+(\d{2}[LRC]?(?:\s*\/\s*\d{2}[LRC]?)?)/g;

      let match;
      while ((match = runwayPattern.exec(text)) !== null) {
        const runwayId = match[1].replace(/\s+/g, "");
        closedRunways.add(runwayId);
        if (runwayId.includes("/")) {
          const [end1, end2] = runwayId.split("/");
          closedRunways.add(end1);
          closedRunways.add(end2);
        }
      }
    } catch {
      continue;
    }
  }

  return closedRunways;
}

function isRunwayClosed(runway: Runway, closedRunways: Set<string>): boolean {
  if (runway.closed) return true;
  if (closedRunways.has(runway.id)) return true;
  for (const end of runway.ends) {
    if (closedRunways.has(end.id)) return true;
  }
  return false;
}

interface OverviewCardProps {
  metar: MetarData | null;
  runways: Runway[];
  notams: Notam[] | null;
  elevation: number | null;
  lat: number;
  lon: number;
  openMeteo: OpenMeteoData | null;
  tomorrow: TomorrowData | null;
}

export function OverviewCard({ metar, runways, notams, elevation, lat, lon, openMeteo, tomorrow }: OverviewCardProps) {
  const [sunPosition, setSunPosition] = useState<SunPosition | null>(null);
  const [now, setNow] = useState(new Date());

  // Calculate sun position
  useEffect(() => {
    const update = () => {
      const currentTime = new Date();
      setNow(currentTime);
      setSunPosition(getSunPosition(lat, lon, currentTime));
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [lat, lon]);

  // Get closed runways from NOTAMs
  const closedRunways = getClosedRunwaysFromNotams(notams);

  // Get best runway (excluding closed ones)
  const availableRunways = runways.filter(r => !isRunwayClosed(r, closedRunways));
  const bestRunway: SelectedRunway | null = metar && availableRunways.length > 0
    ? selectBestRunway(availableRunways, metar.wdir, metar.wspd)
    : null;

  // Calculate PA and DA
  const pressureAltitude = metar?.altim && elevation != null
    ? Math.round(calculatePA(elevation, metar.altim))
    : null;

  const densityAltitude = pressureAltitude != null && metar?.temp != null && elevation != null
    ? Math.round(calculateDA(pressureAltitude, metar.temp, calculateISATemp(elevation)))
    : null;

  // DA warning threshold: more than 1000ft above PA or above 5000ft absolute
  const daWarning = densityAltitude !== null && pressureAltitude !== null &&
    (densityAltitude - pressureAltitude > 1000 || densityAltitude > 5000);

  // Format wind
  const formatWind = () => {
    if (!metar) return "N/A";
    if (metar.wdir === null || metar.wspd === null) return "Calm";

    const dir = metar.wdir === 0 ? "VRB" : `${String(metar.wdir).padStart(3, "0")}°`;
    let wind = `${dir} / ${metar.wspd} KT`;
    if (metar.wgst) {
      wind += ` G${metar.wgst}`;
    }
    return wind;
  };

  // Format visibility - parse METAR visib string and show in KM and SM
  const formatVisibility = (): { km: string; sm: string } | null => {
    if (!metar?.visib) return null;

    const visib = metar.visib.trim();

    // Handle "P6SM" or "6+" (greater than 6 SM)
    if (visib === "P6SM" || visib === "6+") {
      return { km: ">10", sm: ">6" };
    }

    // Handle fractions like "1/2SM", "1 1/2SM"
    const fractionMatch = visib.match(/^(\d+)?\s*(\d+)\/(\d+)\s*SM$/i);
    if (fractionMatch) {
      const whole = fractionMatch[1] ? parseInt(fractionMatch[1]) : 0;
      const num = parseInt(fractionMatch[2]);
      const den = parseInt(fractionMatch[3]);
      const sm = whole + num / den;
      const km = sm * 1.60934;
      return {
        km: km < 1 ? km.toFixed(1) : Math.round(km).toString(),
        sm: sm < 1 ? sm.toFixed(2) : sm.toFixed(1)
      };
    }

    // Handle simple numbers like "10SM", "3SM"
    const simpleMatch = visib.match(/^(\d+(?:\.\d+)?)\s*SM$/i);
    if (simpleMatch) {
      const sm = parseFloat(simpleMatch[1]);
      const km = sm * 1.60934;
      return {
        km: km >= 10 ? Math.round(km).toString() : km.toFixed(1),
        sm: sm.toString()
      };
    }

    // Handle meters (e.g., "9999" for 10km+, or "5000" for 5km)
    const metersMatch = visib.match(/^(\d{4})$/);
    if (metersMatch) {
      const meters = parseInt(metersMatch[1]);
      if (meters >= 9999) {
        return { km: ">10", sm: ">6" };
      }
      const km = meters / 1000;
      const sm = km / 1.60934;
      return {
        km: km.toFixed(1),
        sm: sm.toFixed(1)
      };
    }

    // Fallback - just return the raw value
    return null;
  };

  // Flight category colors
  const getCatColor = (cat: string | null) => {
    switch (cat) {
      case "VFR": return "text-green-400 bg-green-400/10 border-green-400/30";
      case "MVFR": return "text-blue-400 bg-blue-400/10 border-blue-400/30";
      case "IFR": return "text-red-400 bg-red-400/10 border-red-400/30";
      case "LIFR": return "text-purple-400 bg-purple-400/10 border-purple-400/30";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/30";
    }
  };

  // Sun phase info
  const getPhaseInfo = () => {
    if (!sunPosition) return null;
    switch (sunPosition.phase) {
      case "day":
        return {
          icon: <SunIcon className="w-4 h-4" />,
          label: "Day",
          color: "text-yellow-400",
          bgColor: "bg-yellow-400/10",
        };
      case "civil-twilight":
        return {
          icon: <SunIcon className="w-4 h-4" />,
          label: "Twilight",
          color: "text-orange-400",
          bgColor: "bg-orange-400/10",
        };
      case "night":
        return {
          icon: <MoonIcon className="w-4 h-4" />,
          label: "Night",
          color: "text-indigo-400",
          bgColor: "bg-indigo-400/10",
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Overview</h2>
          <CardAnchor id="overview" />
        </div>
        {/* Flight Category Badge */}
        {metar?.fltCat && (
          <div className={`px-3 py-1 rounded-full border text-sm font-bold ${getCatColor(metar.fltCat)}`}>
            {metar.fltCat}
            {sunPosition && !sunPosition.isVfrLegal && (metar.fltCat === "VFR" || metar.fltCat === "MVFR") && (
              <span className="ml-1 text-xs opacity-75">(Night)</span>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row lg:gap-8 lg:items-stretch">
        {/* Left: Wind Rose + Recommended Runway */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {bestRunway && metar ? (
            <>
              <div className="text-center mb-2">
                <div className="text-xs text-emerald-400 uppercase tracking-wide">Recommended</div>
                <div className="text-3xl font-bold text-white">RWY {bestRunway.endId}</div>
                <div className="text-sm mt-1">
                  <span className={bestRunway.headwind >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {bestRunway.headwind >= 0 ? `+${bestRunway.headwind}` : bestRunway.headwind} kt HW
                  </span>
                  {bestRunway.crosswind > 0 && (
                    <span className="text-amber-400 ml-2">
                      {bestRunway.crosswind} kt XW {bestRunway.crosswindDirection}
                    </span>
                  )}
                </div>
              </div>
              <WindRoseRunway
                windDir={metar.wdir}
                windSpeed={metar.wspd}
                runway={bestRunway}
                size={220}
              />
            </>
          ) : (
            <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-500 text-sm">
              {!metar ? "No METAR data" : "No runway data"}
            </div>
          )}
        </div>

        {/* Right: Key parameters */}
        <div className="flex-1 mt-6 lg:mt-0 flex flex-col">
          <div className="grid grid-cols-2 gap-3 flex-1 auto-rows-fr">
            {/* Wind */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className="text-sky-400">
                <WindIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Wind</div>
                <div className="text-white font-medium text-sm">{formatWind()}</div>
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className="text-emerald-400">
                <VisibilityIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Visibility</div>
                <div className="text-white font-medium text-sm">
                  {(() => {
                    const vis = formatVisibility();
                    if (vis) {
                      return <>{vis.km} km <span className="text-slate-400">({vis.sm} SM)</span></>;
                    }
                    return metar?.visib || "N/A";
                  })()}
                </div>
              </div>
            </div>

            {/* QNH */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className="text-violet-400">
                <PressureIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">QNH</div>
                <div className="text-white font-medium text-sm">
                  {metar?.altim != null ? `${metar.altim} hPa` : "N/A"}
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className="text-amber-400">
                <ThermometerIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Temp / Dewpoint</div>
                <div className="text-white font-medium text-sm">
                  {metar?.temp != null ? `${metar.temp}°C` : "N/A"}
                  {metar?.dewp != null && <span className="text-slate-400"> / {metar.dewp}°C</span>}
                </div>
              </div>
            </div>

            {/* Cloud Base (from Tomorrow.io) */}
            {(tomorrow?.current?.cloudBase != null || tomorrow?.current?.cloudCeiling != null) && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
                <div className="text-slate-400">
                  <CloudIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Cloud Base</div>
                  <div className="text-white font-medium text-sm">
                    {(() => {
                      const base = tomorrow?.current?.cloudBase ?? tomorrow?.current?.cloudCeiling;
                      if (base == null) return "N/A";
                      const ft = Math.round(base * 3.28084);
                      return <>{ft.toLocaleString()} ft <span className="text-slate-400">({(base / 1000).toFixed(1)} km)</span></>;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Cloud Cover */}
            {(openMeteo?.current?.cloud_cover != null || tomorrow?.current?.cloudCover != null) && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
                <div className="text-slate-400">
                  <CloudIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Cloud Cover</div>
                  <div className="text-white font-medium text-sm">
                    {(() => {
                      const cover = openMeteo?.current?.cloud_cover ?? tomorrow?.current?.cloudCover;
                      if (cover == null) return "N/A";
                      return `${Math.round(cover)}%`;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Density Altitude */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${daWarning ? "bg-amber-400/10 border border-amber-400/30" : "bg-slate-900/30"}`}>
              <div className={daWarning ? "text-amber-400" : "text-orange-400"}>
                {daWarning ? <ExclamationTriangleIcon className="w-5 h-5" /> : <AltitudeIcon className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs text-slate-400">Density Alt</div>
                <div className={`font-medium text-sm ${daWarning ? "text-amber-400" : "text-white"}`}>
                  {densityAltitude !== null ? `${densityAltitude.toLocaleString()} ft` : "N/A"}
                </div>
                {densityAltitude !== null && pressureAltitude !== null && (
                  <div className="text-xs text-slate-500">
                    PA {pressureAltitude.toLocaleString()} ft
                    {daWarning && <span className="text-amber-400 ml-1">(+{(densityAltitude - pressureAltitude).toLocaleString()})</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Sun Status */}
            {phaseInfo && sunPosition && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
                <div className={phaseInfo.color}>
                  {phaseInfo.icon}
                </div>
                <div>
                  <div className="text-xs text-slate-400">{phaseInfo.label}</div>
                  <div className="text-white font-medium text-sm">
                    {sunPosition.isVfrLegal ? (
                      <span className="text-green-400">VFR OK</span>
                    ) : (
                      <span className="text-red-400">Night ops</span>
                    )}
                  </div>
                  {sunPosition.nextTransition && (
                    <div className="text-xs text-slate-500">
                      {sunPosition.nextTransition.label} in {getTimeUntil(sunPosition.nextTransition.time, now)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
