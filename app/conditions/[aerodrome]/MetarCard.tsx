import { ArrowPathIcon, MoonIcon } from "@heroicons/react/24/outline";
import { CardAnchor } from "./CardAnchor";
import { MetarData, getFlightCatColor } from "./types";
import { calculatePA, calculateDA, calculateISATemp } from "@/lib/isaCalculations";

// Icons for METAR data display
const CategoryIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const WindIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" strokeLinecap="round" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" strokeLinecap="round" />
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2" strokeLinecap="round" />
  </svg>
);

const ThermometerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" />
  </svg>
);

const PressureIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" strokeLinecap="round" />
  </svg>
);

const AltitudeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface MetarCardProps {
  metar: MetarData | null;
  metarSource: "direct" | "nearby" | null;
  metarDistance: number | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  isVfrLegal?: boolean;
  elevation?: number | null;
}

export function MetarCard({
  metar,
  metarSource,
  metarDistance,
  loading,
  error,
  onRefresh,
  isVfrLegal = true,
  elevation,
}: MetarCardProps) {
  // Format wind
  const formatWind = () => {
    if (!metar) return null;
    if (metar.wdir === null || metar.wspd === null) return "Calm";

    const dir = metar.wdir === 0 ? "VRB" : `${String(metar.wdir).padStart(3, "0")}°`;
    let wind = `${dir} at ${metar.wspd} KT`;
    if (metar.wgst) {
      wind += ` gusting ${metar.wgst} KT`;
    }
    return wind;
  };

  // Calculate PA and DA from METAR
  const pressureAltitude = metar?.altim && elevation != null
    ? Math.round(calculatePA(elevation, metar.altim))
    : null;

  const densityAltitude = pressureAltitude != null && metar?.temp != null && elevation != null
    ? Math.round(calculateDA(pressureAltitude, metar.temp, calculateISATemp(elevation)))
    : null;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Current METAR</h2>
          <CardAnchor id="metar" />
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-sky-400 hover:text-sky-300 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-8">Loading METAR data...</div>
      ) : error ? (
        <div className="text-slate-400 text-center py-8">{error}</div>
      ) : metar ? (
        <div className="space-y-4">
          {/* Raw METAR */}
          <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm text-slate-300 break-all">
            {metar.rawOb}
          </div>

          {/* Source info */}
          {metarSource === "nearby" && (
            <p className="text-xs text-amber-400">
              METAR from nearby station: {metar.icaoId} ({metarDistance?.toFixed(0)} NM away)
            </p>
          )}

          {/* Decoded data */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Flight Category */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className={`${
                metar.fltCat === "VFR" ? "text-green-400" :
                metar.fltCat === "MVFR" ? "text-blue-400" :
                metar.fltCat === "IFR" ? "text-red-400" :
                metar.fltCat === "LIFR" ? "text-purple-400" : "text-slate-400"
              }`}>
                <CategoryIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Category</div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    metar.fltCat === "VFR" ? "text-green-400" :
                    metar.fltCat === "MVFR" ? "text-blue-400" :
                    metar.fltCat === "IFR" ? "text-red-400" :
                    metar.fltCat === "LIFR" ? "text-purple-400" : "text-white"
                  }`}>
                    {metar.fltCat || "N/A"}
                  </span>
                  {!isVfrLegal && (metar.fltCat === "VFR" || metar.fltCat === "MVFR") && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-400">
                      <MoonIcon className="w-3 h-3" />
                      Night
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Wind */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className="text-sky-400">
                <WindIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Wind</div>
                <div className="text-white font-medium">{formatWind()}</div>
              </div>
            </div>

            {/* Temperature */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className="text-amber-400">
                <ThermometerIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Temperature</div>
                <div className="text-white font-medium">
                  {metar.temp !== null ? `${metar.temp}°C` : "N/A"}
                </div>
                {metar.dewp !== null && (
                  <div className="text-xs text-slate-500">Dewpoint: {metar.dewp}°C</div>
                )}
              </div>
            </div>

            {/* QNH */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className="text-emerald-400">
                <PressureIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400">QNH</div>
                <div className="text-white font-medium">
                  {metar.altim !== null ? `${metar.altim} hPa` : "N/A"}
                </div>
                {metar.altim !== null && (
                  <div className="text-xs text-slate-500">
                    {(metar.altim * 0.02953).toFixed(2)} inHg
                  </div>
                )}
              </div>
            </div>

            {/* Pressure Altitude */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className="text-violet-400">
                <AltitudeIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Pressure Alt</div>
                <div className="text-white font-medium">
                  {pressureAltitude !== null ? `${pressureAltitude.toLocaleString()} ft` : "N/A"}
                </div>
                {elevation != null && (
                  <div className="text-xs text-slate-500">Field: {elevation.toLocaleString()} ft</div>
                )}
              </div>
            </div>

            {/* Density Altitude */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/30">
              <div className={
                densityAltitude !== null && densityAltitude > 8000
                  ? "text-red-400"
                  : densityAltitude !== null && densityAltitude > 6000
                  ? "text-amber-400"
                  : "text-orange-400"
              }>
                <AltitudeIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Density Alt</div>
                <div className={`font-medium ${
                  densityAltitude !== null && densityAltitude > 8000
                    ? "text-red-400"
                    : densityAltitude !== null && densityAltitude > 6000
                    ? "text-amber-400"
                    : "text-white"
                }`}>
                  {densityAltitude !== null ? `${densityAltitude.toLocaleString()} ft` : "N/A"}
                </div>
                {densityAltitude !== null && pressureAltitude !== null && (
                  <div className="text-xs text-slate-500">
                    {densityAltitude > pressureAltitude ? "+" : ""}{(densityAltitude - pressureAltitude).toLocaleString()} ft ISA dev
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visibility */}
          {metar.visib && (
            <div className="text-sm text-slate-400">
              <span className="text-slate-500">Visibility:</span> {metar.visib}
            </div>
          )}

          {/* Report time */}
          <div className="text-xs text-slate-500 text-right">
            Report time: {metar.reportTime}
          </div>
        </div>
      ) : (
        <div className="text-slate-400 text-center py-8">No METAR data available</div>
      )}
    </div>
  );
}
