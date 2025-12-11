import { TafData, TafForecast, CLOUD_COVER } from "./types";
import { CardAnchor } from "./CardAnchor";

interface TafCardProps {
  taf: TafData | null;
  tafSource: "direct" | "nearby" | null;
  tafDistance: number | null;
  loading: boolean;
}

// Format time from unix timestamp
function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

// Format date from unix timestamp
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

// Format wind
function formatWind(forecast: TafForecast): string | null {
  if (forecast.wdir === null && forecast.wspd === null) return null;
  if (forecast.wspd === 0) return "Calm";

  const dir = forecast.wdir === 0 ? "VRB" : `${String(forecast.wdir).padStart(3, "0")}°`;
  let wind = `${dir}/${forecast.wspd} KT`;
  if (forecast.wgst) {
    wind += ` G${forecast.wgst}`;
  }
  return wind;
}

// Format clouds
function formatClouds(forecast: TafForecast): string | null {
  if (!forecast.clouds || forecast.clouds.length === 0) return null;

  return forecast.clouds
    .map((cloud) => {
      const cover = CLOUD_COVER[cloud.cover] || cloud.cover;
      if (cloud.base === null) return cover;
      const base = cloud.base * 100; // API returns in hundreds of feet
      return `${cover} ${base.toLocaleString()} ft`;
    })
    .join(", ");
}

// Get change type color
function getChangeColor(change?: string): string {
  switch (change) {
    case "FM": return "text-sky-400 bg-sky-400/10 border-sky-400/30";
    case "BECMG": return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "TEMPO": return "text-purple-400 bg-purple-400/10 border-purple-400/30";
    case "PROB": return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    default: return "text-slate-400 bg-slate-400/10 border-slate-400/30";
  }
}

// Get change type label
function getChangeLabel(forecast: TafForecast): string {
  if (forecast.probability) {
    return `PROB${forecast.probability}`;
  }
  return forecast.fcstChange || "BASE";
}

// Check if forecast is current
function isCurrentPeriod(forecast: TafForecast): boolean {
  const now = Date.now() / 1000;
  return now >= forecast.timeFrom && now < forecast.timeTo;
}

export function TafCard({ taf, tafSource, tafDistance, loading }: TafCardProps) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">TAF Forecast</h2>
        <div className="text-slate-400 text-center py-8">Loading TAF data...</div>
      </div>
    );
  }

  if (!taf) {
    return null;
  }

  const validFrom = new Date(taf.validTimeFrom * 1000);
  const validTo = new Date(taf.validTimeTo * 1000);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">TAF Forecast</h2>
          <CardAnchor id="taf" />
        </div>
        <div className="text-xs text-slate-400">
          Valid: {formatDate(taf.validTimeFrom)} {formatTime(taf.validTimeFrom)} → {formatTime(taf.validTimeTo)}
        </div>
      </div>

      {/* Source info */}
      {tafSource === "nearby" && (
        <p className="text-xs text-amber-400 mb-4">
          TAF from nearby station: {taf.icaoId} ({tafDistance?.toFixed(0)} NM away)
        </p>
      )}

      {/* Raw TAF */}
      <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm text-slate-300 break-all mb-4">
        {taf.rawTAF}
      </div>

      {/* Decoded Forecast Periods */}
      <div className="space-y-2">
        <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-2">Forecast Periods</h3>

        {taf.fcsts.map((forecast, index) => {
          const isCurrent = isCurrentPeriod(forecast);

          return (
            <div
              key={index}
              className={`rounded-lg p-3 ${
                isCurrent
                  ? "bg-emerald-900/20 border border-emerald-700/30"
                  : "bg-slate-900/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getChangeColor(forecast.fcstChange)}`}>
                    {getChangeLabel(forecast)}
                  </span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded">
                      Current
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {formatTime(forecast.timeFrom)} → {formatTime(forecast.timeTo)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {/* Wind */}
                {formatWind(forecast) && (
                  <div>
                    <span className="text-slate-400">Wind:</span>
                    <span className="text-white ml-1">{formatWind(forecast)}</span>
                  </div>
                )}

                {/* Visibility */}
                {forecast.visib && (
                  <div>
                    <span className="text-slate-400">Vis:</span>
                    <span className="text-white ml-1">{forecast.visib}</span>
                  </div>
                )}

                {/* Weather */}
                {forecast.wxString && (
                  <div>
                    <span className="text-slate-400">Wx:</span>
                    <span className="text-white ml-1">{forecast.wxString}</span>
                  </div>
                )}

                {/* Clouds */}
                {formatClouds(forecast) && (
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-slate-400">Clouds:</span>
                    <span className="text-white ml-1">{formatClouds(forecast)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Issue time */}
      <div className="text-xs text-slate-500 text-right mt-4">
        Issued: {new Date(taf.issueTime).toLocaleString()}
      </div>
    </div>
  );
}
