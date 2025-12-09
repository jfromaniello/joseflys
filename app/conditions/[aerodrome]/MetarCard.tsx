import { ArrowPathIcon, MoonIcon } from "@heroicons/react/24/outline";
import { MetarData, Runway, getFlightCatColor } from "./types";
import { selectBestRunway } from "@/lib/runwayUtils";

interface MetarCardProps {
  metar: MetarData | null;
  metarSource: "direct" | "nearby" | null;
  metarDistance: number | null;
  runways: Runway[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  isVfrLegal?: boolean;
}

export function MetarCard({
  metar,
  metarSource,
  metarDistance,
  runways,
  loading,
  error,
  onRefresh,
  isVfrLegal = true,
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

  // Get best runway based on wind
  const bestRunway = metar && runways.length > 0
    ? selectBestRunway(runways, metar.wdir, metar.wspd)
    : null;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Current METAR</h2>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Flight Category */}
            <div className="text-center p-3 rounded-lg bg-slate-900/30">
              <div className="text-xs text-slate-400 mb-1">Category</div>
              <div className="flex flex-col items-center gap-1">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getFlightCatColor(metar.fltCat)}`}>
                  {metar.fltCat || "N/A"}
                </div>
                {!isVfrLegal && (metar.fltCat === "VFR" || metar.fltCat === "MVFR") && (
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <MoonIcon className="w-3 h-3" />
                    <span>Night</span>
                  </div>
                )}
              </div>
            </div>

            {/* Wind */}
            <div className="text-center p-3 rounded-lg bg-slate-900/30">
              <div className="text-xs text-slate-400 mb-1">Wind</div>
              <div className="text-white font-medium">{formatWind()}</div>
            </div>

            {/* Temperature */}
            <div className="text-center p-3 rounded-lg bg-slate-900/30">
              <div className="text-xs text-slate-400 mb-1">Temperature</div>
              <div className="text-white font-medium">
                {metar.temp !== null ? `${metar.temp}°C` : "N/A"}
              </div>
              {metar.dewp !== null && (
                <div className="text-xs text-slate-500">Dewpoint: {metar.dewp}°C</div>
              )}
            </div>

            {/* QNH */}
            <div className="text-center p-3 rounded-lg bg-slate-900/30">
              <div className="text-xs text-slate-400 mb-1">QNH</div>
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

          {/* Visibility */}
          {metar.visib && (
            <div className="text-sm text-slate-400">
              <span className="text-slate-500">Visibility:</span> {metar.visib}
            </div>
          )}

          {/* Recommended Runway */}
          {bestRunway && (
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <div className="text-xs text-emerald-400 uppercase tracking-wide">Recommended Runway</div>
                    <div className="text-2xl font-bold text-white">RWY {bestRunway.endId}</div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-emerald-400">
                    {bestRunway.headwind >= 0 ? (
                      <span>+{bestRunway.headwind} kt headwind</span>
                    ) : (
                      <span className="text-red-400">{bestRunway.headwind} kt tailwind</span>
                    )}
                  </div>
                  {bestRunway.crosswind > 0 && (
                    <div className="text-amber-400">
                      {bestRunway.crosswind} kt crosswind {bestRunway.crosswindDirection}
                    </div>
                  )}
                </div>
              </div>
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
