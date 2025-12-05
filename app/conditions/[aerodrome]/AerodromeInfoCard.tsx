import { MapPinIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { AerodromeResult } from "@/app/components/AerodromeSearchInput";
import { Runway, MetarData, SURFACE_NAMES } from "./types";

// Surface icons
const PavedIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="6" width="18" height="12" rx="1" />
    <path d="M3 12h18M12 6v12" strokeDasharray="2 2" />
  </svg>
);

const GrassIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 20 C4 14 6 10 8 8 M8 20 C8 16 10 12 12 10 M12 20 C12 14 14 10 16 8 M16 20 C16 16 18 12 20 10" strokeLinecap="round" />
  </svg>
);

const GravelIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="6" cy="10" r="2" />
    <circle cx="12" cy="8" r="1.5" />
    <circle cx="18" cy="11" r="2" />
    <circle cx="8" cy="15" r="1.5" />
    <circle cx="14" cy="14" r="2" />
    <circle cx="17" cy="17" r="1" />
    <circle cx="5" cy="17" r="1" />
  </svg>
);

const DirtIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 18 C6 16 9 17 12 15 C15 13 18 14 21 12" />
    <path d="M3 14 C6 12 9 13 12 11 C15 9 18 10 21 8" />
    <path d="M3 10 C6 8 9 9 12 7 C15 5 18 6 21 4" strokeOpacity="0.5" />
  </svg>
);

const SandIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 16 Q6 14 10 16 T18 16 T22 16" />
    <path d="M2 12 Q6 10 10 12 T18 12 T22 12" />
    <path d="M2 8 Q6 6 10 8 T18 8 T22 8" strokeOpacity="0.5" />
  </svg>
);

const WaterIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 6 Q6 4 10 6 T18 6 T22 6" />
    <path d="M2 11 Q6 9 10 11 T18 11 T22 11" />
    <path d="M2 16 Q6 14 10 16 T18 16 T22 16" />
  </svg>
);

interface SurfaceInfo {
  icon: React.ComponentType;
  label: string;
  color: string;
  bgColor: string;
}

const SURFACE_INFO: Record<string, SurfaceInfo> = {
  PG: { icon: PavedIcon, label: "Paved", color: "text-slate-300", bgColor: "bg-slate-600/30" },
  PP: { icon: PavedIcon, label: "Paved (Poor)", color: "text-amber-400", bgColor: "bg-amber-400/10" },
  GG: { icon: GrassIcon, label: "Grass", color: "text-green-400", bgColor: "bg-green-400/10" },
  GF: { icon: GrassIcon, label: "Grass (Fair)", color: "text-lime-400", bgColor: "bg-lime-400/10" },
  GV: { icon: GravelIcon, label: "Gravel", color: "text-stone-400", bgColor: "bg-stone-400/10" },
  DT: { icon: DirtIcon, label: "Dirt", color: "text-amber-600", bgColor: "bg-amber-600/10" },
  SD: { icon: SandIcon, label: "Sand", color: "text-yellow-400", bgColor: "bg-yellow-400/10" },
  WT: { icon: WaterIcon, label: "Water", color: "text-blue-400", bgColor: "bg-blue-400/10" },
};

interface AerodromeInfoCardProps {
  aerodrome: AerodromeResult;
  runways: Runway[];
  metar: MetarData | null;
  loadingRunways: boolean;
}

export function AerodromeInfoCard({ aerodrome, runways, metar, loadingRunways }: AerodromeInfoCardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      {/* Location Info */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <MapPinIcon className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Aerodrome Info</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-slate-400">Latitude:</span>
                <span className="text-white ml-2">{aerodrome.lat.toFixed(4)}°</span>
              </div>
              <div>
                <span className="text-slate-400">Longitude:</span>
                <span className="text-white ml-2">{aerodrome.lon.toFixed(4)}°</span>
              </div>
              <div>
                <span className="text-slate-400">Elevation:</span>
                <span className="text-white ml-2">
                  {aerodrome.elevation !== null ? `${aerodrome.elevation} ft` : "Unknown"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Type:</span>
                <span className="text-white ml-2">
                  {aerodrome.type === "AD" ? "Aerodrome" : "Landing Area"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <a
          href={`https://www.google.com/maps?q=${aerodrome.lat},${aerodrome.lon}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 p-2 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
          title="Open in Google Maps"
        >
          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
        </a>
      </div>

      {/* Runways */}
      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Runways</h3>

        {loadingRunways ? (
          <div className="text-slate-400 text-center py-4">Loading runway data...</div>
        ) : runways.length === 0 ? (
          <div className="text-slate-500 text-sm">No runway data available</div>
        ) : (
          <div className="space-y-3">
            {runways.map((runway) => (
              <div
                key={runway.id}
                className="bg-slate-900/30 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{runway.id}</span>
                    {runway.lighted && (
                      <span className="px-1.5 py-0.5 text-xs bg-yellow-400/10 text-yellow-400 rounded">
                        Lighted
                      </span>
                    )}
                    {runway.closed && (
                      <span className="px-1.5 py-0.5 text-xs bg-red-400/10 text-red-400 rounded">
                        Closed
                      </span>
                    )}
                  </div>
                  {(() => {
                    const info = SURFACE_INFO[runway.surface];
                    if (info) {
                      const Icon = info.icon;
                      return (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${info.bgColor}`}>
                          <span className={info.color}><Icon /></span>
                          <span className={`text-sm font-medium ${info.color}`}>{info.label}</span>
                        </div>
                      );
                    }
                    return (
                      <span className="text-sm text-slate-400 px-3 py-1.5 bg-slate-700/30 rounded-lg">
                        {SURFACE_NAMES[runway.surface] || runway.surfaceName}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Length:</span>
                    <span className="text-white ml-1">{runway.length.toLocaleString()} ft</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Width:</span>
                    <span className="text-white ml-1">{runway.width} ft</span>
                  </div>
                  {runway.ends.map((end) => (
                    <div key={end.id}>
                      <span className="text-slate-400">RWY {end.id}:</span>
                      <span className="text-white ml-1">
                        {end.heading !== null ? `${String(Math.round(end.heading)).padStart(3, "0")}°` : "N/A"}
                      </span>
                      {end.elevation !== null && (
                        <span className="text-slate-500 ml-1 text-xs">({end.elevation} ft)</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Wind components if METAR available */}
                {metar && metar.wdir !== null && metar.wspd !== null && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <div className="flex flex-wrap gap-3 text-sm">
                      {runway.ends.map((end) => {
                        if (end.heading === null) return null;

                        const windAngle = ((metar.wdir! - end.heading + 360) % 360) * (Math.PI / 180);
                        const headwind = Math.round(metar.wspd! * Math.cos(windAngle));
                        const crosswind = Math.round(Math.abs(metar.wspd! * Math.sin(windAngle)));
                        const crossDir = Math.sin(windAngle) > 0 ? "R" : "L";

                        return (
                          <div key={end.id} className="flex items-center gap-1.5">
                            <span className="text-slate-400">{end.id}:</span>
                            <span className={headwind >= 0 ? "text-green-400" : "text-red-400"}>
                              {headwind >= 0 ? `+${headwind}` : headwind} HW
                            </span>
                            <span className="text-amber-400">
                              {crosswind}{crossDir} XW
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
