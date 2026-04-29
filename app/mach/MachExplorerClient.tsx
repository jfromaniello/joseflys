"use client";

import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { CalculatorPageHeader } from "../components/CalculatorPageHeader";
import { Footer } from "../components/Footer";
import { ShareButton } from "../components/ShareButton";
import { Tooltip } from "../components/Tooltip";
import {
  computeAirspeeds,
  type HoldMode,
} from "@/lib/machCalculations";
import { formatSpeed } from "@/lib/formatters";
import { MachChart } from "./MachChart";

const MAX_ALT_FT = 45000;
const MIN_DT = -30;
const MAX_DT = 30;

interface MachExplorerClientProps {
  initialMode: string;
  initialCas: string;
  initialMach: string;
  initialAlt: string;
  initialDt: string;
}

export function MachExplorerClient({
  initialMode,
  initialCas,
  initialMach,
  initialAlt,
  initialDt,
}: MachExplorerClientProps) {
  const [mode, setMode] = useState<HoldMode>(initialMode === "mach" ? "mach" : "cas");
  const [cas, setCas] = useState<string>(initialCas);
  const [mach, setMach] = useState<string>(initialMach);
  const [alt, setAlt] = useState<string>(initialAlt);
  const [dt, setDt] = useState<string>(initialDt);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (mode === "cas" && cas) params.set("cas", cas);
    if (mode === "mach" && mach) params.set("mach", mach);
    if (alt) params.set("alt", alt);
    if (dt) params.set("dt", dt);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [mode, cas, mach, alt, dt]);

  const altVal = parseFloat(alt);
  const dtVal = parseFloat(dt);
  const casVal = parseFloat(cas);
  const machVal = parseFloat(mach);

  const inputsValid =
    !isNaN(altVal) &&
    !isNaN(dtVal) &&
    altVal >= 0 &&
    altVal <= MAX_ALT_FT &&
    (mode === "cas" ? !isNaN(casVal) && casVal > 0 : !isNaN(machVal) && machVal > 0);

  const snap = useMemo(() => {
    if (!inputsValid) return null;
    return computeAirspeeds({
      altitudeFt: altVal,
      isaDevC: dtVal,
      hold: mode,
      casKt: mode === "cas" ? casVal : undefined,
      mach: mode === "mach" ? machVal : undefined,
    });
  }, [inputsValid, altVal, dtVal, mode, casVal, machVal]);

  return (
    <PageLayout currentPage="mach">
      <CalculatorPageHeader
        title="Mach Explorer"
        description="See how IAS, TAS and Mach relate to each other as you climb. Hold one constant and watch the others move."
      />

      <main className="w-full max-w-4xl">
        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl bg-slate-800/50 backdrop-blur-sm border border-gray-700">
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white">
              Speed at Altitude — Visualized
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.7 0.02 240)" }}>
              At high altitude, the airspeed indicator (IAS) and the Mach number
              tell different stories. Pick which one to hold steady, then move the
              altitude slider to see what the others do.
            </p>
          </div>

          {/* Hold-mode toggle */}
          <div className="mb-6">
            <div className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
              Hold Constant
            </div>
            <div className="inline-flex rounded-xl border-2 border-gray-600 bg-slate-900/50 p-1">
              <button
                onClick={() => setMode("cas")}
                className={`px-5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  mode === "cas" ? "bg-sky-500/30 text-white" : "text-gray-300 hover:text-white"
                }`}
              >
                IAS / CAS
              </button>
              <button
                onClick={() => setMode("mach")}
                className={`px-5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  mode === "mach" ? "bg-sky-500/30 text-white" : "text-gray-300 hover:text-white"
                }`}
              >
                Mach
              </button>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "oklch(0.65 0.15 230)" }}>
                Inputs
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-[10.5rem_12rem_2rem_10.5rem_12rem] gap-x-4 gap-y-4 lg:items-center">
                {/* Held value (CAS or Mach) */}
                <label className="flex items-center text-sm font-medium mb-2 lg:mb-0" style={{ color: "oklch(0.72 0.015 240)" }}>
                  {mode === "cas" ? "Calibrated Airspeed" : "Mach Number"}
                  <Tooltip
                    content={
                      mode === "cas"
                        ? "The speed shown on your airspeed indicator (corrected). Held constant — you'll see Mach and TAS change as you climb."
                        : "The Mach number you want to hold. CAS will drop with altitude while TAS rises."
                    }
                  />
                </label>
                <div className="relative">
                  {mode === "cas" ? (
                    <input
                      type="number"
                      value={cas}
                      onChange={(e) => setCas(e.target.value)}
                      min={0}
                      max={500}
                      step={5}
                      className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                      placeholder="250"
                    />
                  ) : (
                    <input
                      type="number"
                      value={mach}
                      onChange={(e) => setMach(e.target.value)}
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full px-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                      placeholder="0.78"
                    />
                  )}
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none" style={{ color: "oklch(0.55 0.02 240)" }}>
                    {mode === "cas" ? "KT" : "M"}
                  </span>
                </div>

                <div className="hidden lg:block"></div>

                {/* ISA Deviation */}
                <label className="flex items-center text-sm font-medium mb-2 lg:mb-0" style={{ color: "oklch(0.72 0.015 240)" }}>
                  ISA Deviation
                  <Tooltip content="Temperature deviation from ISA standard at this altitude. ISA+10 means 10°C warmer than standard. Affects TAS but NOT Mach (for fixed CAS)." />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={dt}
                    onChange={(e) => setDt(e.target.value)}
                    min={MIN_DT}
                    max={MAX_DT}
                    step={1}
                    className="w-full px-4 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-lg bg-slate-900/50 border-2 border-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-white text-right"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none" style={{ color: "oklch(0.55 0.02 240)" }}>
                    °C
                  </span>
                </div>
              </div>
            </div>

            {/* Altitude slider */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "oklch(0.72 0.015 240)" }}>
                  Altitude
                </label>
                <span className="text-lg font-semibold text-white tabular-nums">
                  {!isNaN(altVal)
                    ? `${formatSpeed(altVal)} ft  · FL${(altVal / 100).toFixed(0).padStart(3, "0")}`
                    : "—"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={MAX_ALT_FT}
                step={500}
                value={isNaN(altVal) ? 0 : altVal}
                onChange={(e) => setAlt(e.target.value)}
                className="w-full cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "oklch(0.5 0.02 240)" }}>
                <span>SL</span>
                <span>FL100</span>
                <span>FL200</span>
                <span>FL300</span>
                <span>FL400</span>
              </div>
            </div>
          </div>

          {/* Outputs */}
          {snap && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              <OutputCard
                label="IAS / CAS"
                value={formatSpeed(snap.cas)}
                unit="KT"
                color="oklch(0.78 0.16 200)"
                emphasized={mode === "cas"}
              />
              <OutputCard
                label="Mach"
                value={snap.mach.toFixed(3)}
                unit=""
                color="oklch(0.75 0.18 140)"
                emphasized={mode === "mach"}
              />
              <OutputCard
                label="TAS"
                value={formatSpeed(snap.tas)}
                unit="KT"
                color="oklch(0.7 0.18 230)"
              />
              <OutputCard
                label="OAT"
                value={snap.oatC.toFixed(1)}
                unit="°C"
                color="oklch(0.75 0.05 60)"
              />
              <OutputCard
                label="Speed of sound"
                value={formatSpeed(snap.speedOfSoundKt)}
                unit="KT"
                color="oklch(0.7 0.05 60)"
              />
              <OutputCard
                label="Density Alt"
                value={formatSpeed(snap.densityAltitudeFt)}
                unit="ft"
                color="oklch(0.7 0.05 60)"
              />
            </div>
          )}

          {/* Chart */}
          {snap && (
            <div className="rounded-xl bg-slate-900/40 p-3 sm:p-4 border border-gray-700">
              <MachChart
                altitudeFt={altVal}
                isaDevC={dtVal}
                hold={mode}
                casKt={snap.cas}
                mach={snap.mach}
                tasKt={snap.tas}
                maxAltFt={MAX_ALT_FT}
              />
            </div>
          )}

          {/* Educational note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/40 border border-gray-700">
            <h4 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: "oklch(0.65 0.15 230)" }}>
              What you&apos;re seeing
            </h4>
            <ul className="text-sm space-y-1.5" style={{ color: "oklch(0.75 0.02 240)" }}>
              <li>
                <strong className="text-white">Holding IAS constant:</strong> as you climb, air gets thinner, so for the same dynamic pressure you have to fly faster through the air → TAS rises, and so does Mach.
              </li>
              <li>
                <strong className="text-white">Holding Mach constant:</strong> as you climb, the speed of sound drops (colder air), so TAS climbs slowly while IAS — which only feels dynamic pressure — drops sharply.
              </li>
              <li>
                <strong className="text-white">ISA deviation</strong> changes only temperature: it shifts TAS (warmer air → faster sound) but leaves the IAS↔Mach relationship untouched, because that&apos;s a pressure-only conversion.
              </li>
            </ul>
          </div>

          {/* Share */}
          {snap && (
            <div className="mt-6 flex items-center justify-end gap-3">
              <ShareButton
                shareData={{
                  title: "Mach Explorer",
                  text: `${mode === "cas" ? `CAS ${cas} kt` : `M ${mach}`} @ FL${(altVal / 100).toFixed(0).padStart(3, "0")} ISA${dtVal >= 0 ? "+" : ""}${dt} → CAS ${formatSpeed(snap.cas)} kt · M ${snap.mach.toFixed(3)} · TAS ${formatSpeed(snap.tas)} kt`,
                }}
              />
            </div>
          )}
        </div>
      </main>

      <Footer description="Educational airspeed visualizer: IAS vs TAS vs Mach across altitudes." />
    </PageLayout>
  );
}

function OutputCard({
  label,
  value,
  unit,
  color,
  emphasized,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${emphasized ? "bg-slate-900/70 border-sky-500/50" : "bg-slate-900/40 border-gray-700"}`}
    >
      <div
        className="text-xs font-medium uppercase tracking-wide mb-1 min-h-[2rem] leading-4"
        style={{ color }}
      >
        {label}
      </div>
      <div className="text-xl font-bold text-white tabular-nums">
        {value}
        {unit && <span className="text-sm font-normal ml-1" style={{ color: "oklch(0.6 0.02 240)" }}>{unit}</span>}
      </div>
    </div>
  );
}
