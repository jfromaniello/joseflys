import { MapPinIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { AerodromeResult } from "@/app/components/AerodromeSearchInput";
import { Runway, SURFACE_NAMES, Notam } from "./types";
import { CardAnchor } from "./CardAnchor";
import { AerodromeDescription } from "./AerodromeDescription";
import { decode } from "@rovacc/notam-decoder";

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

/**
 * Parse NOTAMs to find closed or limited runways
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

function isRunwayEndClosed(endId: string, runwayId: string, closedRunways: Set<string>): boolean {
  return closedRunways.has(endId) || closedRunways.has(runwayId);
}

interface AerodromeInfoCardProps {
  aerodrome: AerodromeResult;
  runways: Runway[];
  notams: Notam[] | null;
  loadingRunways: boolean;
}

export function AerodromeInfoCard({ aerodrome, runways, notams, loadingRunways }: AerodromeInfoCardProps) {
  const closedRunways = getClosedRunwaysFromNotams(notams);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPinIcon className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <h2 className="text-lg font-semibold text-white">Aerodrome Info</h2>
          <CardAnchor id="aerodrome" />
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

      {/* Location Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm mb-6">
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

      {/* Runways */}
      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Runways</h3>

        {loadingRunways ? (
          <div className="text-slate-400 text-center py-4">Loading runway data...</div>
        ) : runways.length === 0 ? (
          <div className="text-slate-500 text-sm">No runway data available</div>
        ) : (
          <div className="space-y-3">
            {runways.map((runway) => {
              const isClosed = isRunwayClosed(runway, closedRunways);

              return (
                <div
                  key={runway.id}
                  className={`bg-slate-900/30 rounded-lg p-3 ${isClosed ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-lg font-bold ${isClosed ? "text-slate-500 line-through" : "text-white"}`}>
                      {runway.id}
                    </span>
                    {(() => {
                      const info = SURFACE_INFO[runway.surface];
                      if (info) {
                        const Icon = info.icon;
                        return (
                          <span className={`flex items-center gap-1.5 ${info.color}`}>
                            <Icon />
                            <span className="text-sm">{info.label}</span>
                          </span>
                        );
                      }
                      return (
                        <span className="text-sm text-slate-400">
                          {SURFACE_NAMES[runway.surface] || runway.surfaceName}
                        </span>
                      );
                    })()}
                    {runway.lighted && (
                      <span className="text-xs text-yellow-400">Lighted</span>
                    )}
                    {isClosed && (
                      <span className="px-1.5 py-0.5 text-xs bg-red-400/20 text-red-400 rounded font-medium">
                        Closed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-1">
                    <div>
                      <span className="text-slate-500">Length:</span>
                      <span className="text-white ml-1">{runway.length.toLocaleString()} ft</span>
                    </div>
                    <div>
                      {runway.ends[0] && (() => {
                        const end = runway.ends[0];
                        const endClosed = isRunwayEndClosed(end.id, runway.id, closedRunways);
                        return (
                          <>
                            <span className={endClosed ? "text-slate-600 line-through" : "text-slate-500"}>
                              RWY {end.id}:
                            </span>
                            <span className={`ml-1 ${endClosed ? "text-slate-600 line-through" : "text-white"}`}>
                              {end.heading !== null ? `${String(Math.round(end.heading)).padStart(3, "0")}°` : "N/A"}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div>
                      <span className="text-slate-500">Width:</span>
                      <span className="text-white ml-1">{runway.width} ft</span>
                    </div>
                    <div>
                      {runway.ends[1] && (() => {
                        const end = runway.ends[1];
                        const endClosed = isRunwayEndClosed(end.id, runway.id, closedRunways);
                        return (
                          <>
                            <span className={endClosed ? "text-slate-600 line-through" : "text-slate-500"}>
                              RWY {end.id}:
                            </span>
                            <span className={`ml-1 ${endClosed ? "text-slate-600 line-through" : "text-white"}`}>
                              {end.heading !== null ? `${String(Math.round(end.heading)).padStart(3, "0")}°` : "N/A"}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI-generated description */}
        <AerodromeDescription
          code={aerodrome.code}
          name={aerodrome.name}
          type={aerodrome.type}
          lat={aerodrome.lat}
          lon={aerodrome.lon}
          elevation={aerodrome.elevation}
          runways={runways}
        />
      </div>
    </div>
  );
}
