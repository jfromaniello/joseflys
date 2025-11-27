"use client";

type MapMode = "utm" | "mercator";

interface MapControlsProps {
  mapMode: MapMode;
  setMapMode: (mode: MapMode) => void;
  showAerodromes: boolean;
  setShowAerodromes: (show: boolean) => void;
  aerodromesLoading: boolean;
  aerodromes: { type: string }[];
  printScale: number;
  setPrintScale: (scale: number) => void;
  tickIntervalNM: number;
  setTickIntervalNM: (interval: number) => void;
  timeTickIntervalMin: number;
  setTimeTickIntervalMin: (interval: number) => void;
  showDistanceLabels: boolean;
  setShowDistanceLabels: (show: boolean) => void;
  showTimeLabels: boolean;
  setShowTimeLabels: (show: boolean) => void;
}

export function MapControls({
  mapMode,
  setMapMode,
  showAerodromes,
  setShowAerodromes,
  aerodromesLoading,
  aerodromes,
  printScale,
  setPrintScale,
  tickIntervalNM,
  setTickIntervalNM,
  timeTickIntervalMin,
  setTimeTickIntervalMin,
  showDistanceLabels,
  setShowDistanceLabels,
  showTimeLabels,
  setShowTimeLabels,
}: MapControlsProps) {
  return (
    <div className="mb-6 print:hidden">
      {/* Grid: 2 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Row 1: Projection | AD/LAD */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <span className="text-sm font-medium text-white">Projection</span>
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-0.5">
            <button
              onClick={() => setMapMode("utm")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                mapMode === "utm"
                  ? "bg-sky-500/20 text-sky-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              UTM
            </button>
            <button
              onClick={() => setMapMode("mercator")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                mapMode === "mercator"
                  ? "bg-sky-500/20 text-sky-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Mercator
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">AD / LAD</span>
            {aerodromesLoading && (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
            {!aerodromesLoading && showAerodromes && aerodromes.length > 0 && (
              <span className="text-xs text-gray-500">
                ({aerodromes.filter(a => a.type === 'AD').length}/{aerodromes.filter(a => a.type === 'LAD').length})
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAerodromes(!showAerodromes)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
              showAerodromes ? "bg-sky-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                showAerodromes ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Row 2 (UTM only): Distance Ticks | Time Ticks */}
        {mapMode === "utm" && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">Distance Ticks</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDistanceLabels}
                  onChange={(e) => setShowDistanceLabels(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-600 bg-slate-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-gray-500">Labels</span>
              </label>
            </div>
            <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-0.5">
              {[10, 50, 100].map((nm) => (
                <button
                  key={nm}
                  onClick={() => setTickIntervalNM(nm)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                    tickIntervalNM === nm
                      ? "bg-sky-500/20 text-sky-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  {nm}NM
                </button>
              ))}
            </div>
          </div>
        )}

        {mapMode === "utm" && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">Time Ticks</span>
              {timeTickIntervalMin > 0 && (
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTimeLabels}
                    onChange={(e) => setShowTimeLabels(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-gray-500">Labels</span>
                </label>
              )}
            </div>
            <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-0.5">
              <button
                onClick={() => setTimeTickIntervalMin(0)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  timeTickIntervalMin === 0
                    ? "bg-sky-500/20 text-sky-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Off
              </button>
              {[10, 15, 20, 30].map((min) => (
                <button
                  key={min}
                  onClick={() => setTimeTickIntervalMin(min)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                    timeTickIntervalMin === min
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 3 (UTM only): Scale */}
        {mapMode === "utm" && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-gray-700">
            <span className="text-sm font-medium text-white">Print Scale</span>
            <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-0.5">
              <button
                onClick={() => setPrintScale(500000)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  printScale === 500000
                    ? "bg-sky-500/20 text-sky-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                1:500K
              </button>
              <button
                onClick={() => setPrintScale(1000000)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  printScale === 1000000
                    ? "bg-sky-500/20 text-sky-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                1:1M
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
