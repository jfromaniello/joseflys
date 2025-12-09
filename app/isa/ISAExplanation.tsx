"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Customized,
} from "recharts";

// Type for axis scale info from Recharts
interface AxisInfo {
  scale?: (v: number) => number;
}

// Generate data for Density Altitude chart (like FAA Figure 8)
function generateDensityAltitudeData() {
  const data = [];
  for (let oat = -18; oat <= 43; oat += 1) {
    const point: Record<string, number> = { oat };
    for (let pa = 0; pa <= 14000; pa += 1000) {
      const isaTemp = 15 - 1.98 * (pa / 1000);
      const da = pa + 118.8 * (oat - isaTemp);
      point[`pa${pa}`] = Math.round(da);
    }
    data.push(point);
  }
  return data;
}

// Generate ISA Standard Temperature line data
function generateISALine() {
  const data = [];
  for (let da = 0; da <= 15000; da += 500) {
    const isaTemp = 15 - 1.98 * (da / 1000);
    // Round to 1 decimal to avoid floating point issues
    data.push({ oat: Math.round(isaTemp * 10) / 10, da });
  }
  return data;
}

// Altimeter setting to PA conversion factor table
const PA_CONVERSION_TABLE = [
  { inHg: 28.0, factor: 1824 },
  { inHg: 28.1, factor: 1727 },
  { inHg: 28.2, factor: 1630 },
  { inHg: 28.3, factor: 1533 },
  { inHg: 28.4, factor: 1436 },
  { inHg: 28.5, factor: 1340 },
  { inHg: 28.6, factor: 1244 },
  { inHg: 28.7, factor: 1148 },
  { inHg: 28.8, factor: 1053 },
  { inHg: 28.9, factor: 957 },
  { inHg: 29.0, factor: 863 },
  { inHg: 29.1, factor: 768 },
  { inHg: 29.2, factor: 673 },
  { inHg: 29.3, factor: 579 },
  { inHg: 29.4, factor: 485 },
  { inHg: 29.5, factor: 392 },
  { inHg: 29.6, factor: 298 },
  { inHg: 29.7, factor: 205 },
  { inHg: 29.8, factor: 112 },
  { inHg: 29.9, factor: 20 },
  { inHg: 29.92, factor: 0 },
  { inHg: 30.0, factor: -73 },
  { inHg: 30.1, factor: -165 },
  { inHg: 30.2, factor: -257 },
  { inHg: 30.3, factor: -348 },
  { inHg: 30.4, factor: -440 },
  { inHg: 30.5, factor: -531 },
];

interface ISAExplanationProps {
  elevVal: number;
  qnhVal: number;
  qnhFormat: "inHg" | "hPa";
  tempVal: number;
  isaTemp: number;
  pa: number;
  da: number | null;
  hasTemp: boolean;
}

export function ISAExplanation({
  elevVal,
  qnhVal,
  qnhFormat,
  tempVal,
  isaTemp,
  pa,
  da,
  hasTemp,
}: ISAExplanationProps) {
  const daChartData = useMemo(() => generateDensityAltitudeData(), []);
  const isaLineData = useMemo(() => generateISALine(), []);

  return (
    <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-gray-700 space-y-4">
      {/* Quick Approximations Section */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: "oklch(0.75 0.1 60)" }}>
          Quick Approximations (Rules of Thumb)
        </h4>

        {/* ISA Temperature */}
        <div className="mb-4">
          <h5 className="text-xs font-semibold mb-2" style={{ color: "oklch(0.8 0.1 230)" }}>
            1. ISA Temperature
          </h5>
          <p className="text-xs mb-2" style={{ color: "oklch(0.65 0.02 240)" }}>
            Standard temperature decreases ~2°C per 1,000 ft from 15°C at sea level.
          </p>
          <div className="font-mono text-xs p-2 rounded bg-slate-800/50" style={{ color: "oklch(0.75 0.05 180)" }}>
            ISA Temp = 15 - (1.98 × Elevation ÷ 1000)
          </div>
          <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
            → 15 - (1.98 × {elevVal.toFixed(0)} ÷ 1000) = <strong style={{ color: "white" }}>{isaTemp.toFixed(1)}°C</strong>
          </p>
        </div>

        {/* Pressure Altitude (Quick) */}
        <div className="mb-4">
          <h5 className="text-xs font-semibold mb-2" style={{ color: "oklch(0.8 0.1 230)" }}>
            2. Pressure Altitude (Approximation)
          </h5>
          <p className="text-xs mb-2" style={{ color: "oklch(0.65 0.02 240)" }}>
            {qnhFormat === "inHg" ? (
              <>Quick approximation: ~1,000 ft per inHg difference from 29.92.</>
            ) : (
              <>Quick approximation: ~27 ft per hPa difference from 1013.25.</>
            )}
          </p>
          <div className="font-mono text-xs p-2 rounded bg-slate-800/50" style={{ color: "oklch(0.75 0.05 180)" }}>
            {qnhFormat === "inHg" ? (
              <>PA ≈ Elevation + (29.92 - QNH) × 1000</>
            ) : (
              <>PA ≈ Elevation + (1013.25 - QNH) × 27</>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
            {qnhFormat === "inHg" ? (
              <>→ {elevVal.toFixed(0)} + (29.92 - {qnhVal.toFixed(2)}) × 1000 ≈ {(elevVal + (29.92 - qnhVal) * 1000).toFixed(0)} ft</>
            ) : (
              <>→ {elevVal.toFixed(0)} + (1013.25 - {qnhVal.toFixed(2)}) × 27 ≈ {(elevVal + (1013.25 - qnhVal) * 27).toFixed(0)} ft</>
            )}
          </p>
        </div>

        {/* Density Altitude */}
        {da !== null && (
          <div>
            <h5 className="text-xs font-semibold mb-2" style={{ color: "oklch(0.8 0.1 230)" }}>
              3. Density Altitude
            </h5>
            <p className="text-xs mb-2" style={{ color: "oklch(0.65 0.02 240)" }}>
              Adjusts PA for temperature deviation from ISA (~120 ft per °C).
            </p>
            <div className="font-mono text-xs p-2 rounded bg-slate-800/50" style={{ color: "oklch(0.75 0.05 180)" }}>
              DA = PA + 118.8 × (OAT - ISA Temp)
            </div>
            <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
              → {pa.toFixed(0)} + 118.8 × ({tempVal.toFixed(1)} - {isaTemp.toFixed(1)}) = <strong style={{ color: "white" }}>{da.toFixed(0)} ft</strong>
            </p>
          </div>
        )}
      </div>

      {/* Density Altitude Chart (like FAA Figure 8) */}
      <div className="pt-4 border-t border-gray-700">
        <h4 className="text-sm font-semibold mb-3" style={{ color: "oklch(0.8 0.1 230)" }}>
          Density Altitude Chart
        </h4>
        <p className="text-xs mb-3" style={{ color: "oklch(0.65 0.02 240)" }}>
          Diagonal lines show Pressure Altitude. The red line is ISA standard temperature.
          {pa >= 0 && pa <= 15000 && (
            <>
              {" "}<strong style={{ color: "#22c55e" }}>Green point (PA)</strong> = {pa?.toFixed(0)} ft on ISA line.
            </>
          )}
          {da !== null && hasTemp && da >= 0 && da <= 15000 && tempVal >= -18 && tempVal <= 43 && (
            <>
              {" "}<strong style={{ color: "#f59e0b" }}>Orange point (DA)</strong> = {da.toFixed(0)} ft at OAT {Math.round(tempVal)}°C.
            </>
          )}
          {da !== null && hasTemp && (da < 0 || da > 15000) && (
            <>
              {" "}<span style={{ color: "oklch(0.7 0.15 30)" }}>DA ({da.toFixed(0)} ft) outside chart range.</span>
            </>
          )}
        </p>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Chart */}
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={288} minWidth={250}>
              <ComposedChart
                data={daChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
              >
                <XAxis
                  dataKey="oat"
                  type="number"
                  domain={[-18, 43]}
                  tick={{ fontSize: 9, fill: "oklch(0.6 0.02 240)" }}
                  tickFormatter={(value) => `${value}°`}
                  label={{
                    value: "Outside Air Temperature (°C)",
                    position: "bottom",
                    offset: 10,
                    style: { fontSize: 9, fill: "oklch(0.55 0.02 240)" },
                  }}
                />
                <YAxis
                  type="number"
                  domain={[0, 15000]}
                  allowDataOverflow={true}
                  tick={{ fontSize: 9, fill: "oklch(0.6 0.02 240)" }}
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
                  label={{
                    value: "Density Altitude (ft)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    style: { fontSize: 9, fill: "oklch(0.55 0.02 240)" },
                  }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.2 0.02 240)",
                    border: "1px solid oklch(0.4 0.02 240)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    padding: "8px",
                  }}
                  labelStyle={{ color: "white", fontWeight: "bold", marginBottom: "4px" }}
                  labelFormatter={(label) => `OAT: ${typeof label === 'number' ? label.toFixed(0) : label}°C`}
                  formatter={(value: number, name: string) => {
                    if (name === "da") return [`${value.toLocaleString()} ft`, "ISA Std Temp"];
                    const paValue = name.replace("pa", "");
                    return [`${value.toLocaleString()} ft`, `PA ${paValue} ft`];
                  }}
                />
                {/* PA lines from 0 (S.L.) to 14000 */}
                {[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000].map((paVal) => (
                  <Line
                    key={paVal}
                    type="monotone"
                    dataKey={`pa${paVal}`}
                    stroke="oklch(0.5 0.05 240)"
                    strokeWidth={1}
                    dot={false}
                    name={`pa${paVal}`}
                  />
                ))}
                {/* ISA Standard Temperature line (red) */}
                <Line
                  data={isaLineData}
                  type="monotone"
                  dataKey="da"
                  stroke="oklch(0.65 0.2 25)"
                  strokeWidth={2}
                  dot={false}
                  name="da"
                />
                {/* PA point - always show on ISA line (green) */}
                {pa >= 0 && pa <= 15000 && (() => {
                  const isaTempForPA = 15 - 1.98 * (pa / 1000);
                  if (isaTempForPA < -18 || isaTempForPA > 43) return null;
                  return (
                    <>
                      <ReferenceLine y={pa} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={2} />
                      <Customized
                        component={(props: unknown) => {
                          const p = props as { xAxisMap?: Record<string | number, AxisInfo>; yAxisMap?: Record<string | number, AxisInfo> };
                          const xAxis = p.xAxisMap?.[0] || (p.xAxisMap && Object.values(p.xAxisMap)[0]);
                          const yAxis = p.yAxisMap?.[0] || (p.yAxisMap && Object.values(p.yAxisMap)[0]);
                          if (!xAxis?.scale || !yAxis?.scale) return null;
                          const cx = xAxis.scale(isaTempForPA);
                          const cy = yAxis.scale(pa);
                          if (typeof cx !== 'number' || typeof cy !== 'number' || isNaN(cx) || isNaN(cy)) return null;
                          return (
                            <g>
                              <circle cx={cx} cy={cy} r={10} fill="#22c55e" stroke="#000" strokeWidth={2} />
                              <text x={cx + 14} y={cy + 4} fontSize={10} fill="#22c55e">PA</text>
                            </g>
                          );
                        }}
                      />
                    </>
                  );
                })()}

                {/* DA point - show when we have OAT (orange) */}
                {da !== null && hasTemp && !isNaN(tempVal) && da >= 0 && da <= 15000 && tempVal >= -18 && tempVal <= 43 && (
                  <>
                    <ReferenceLine x={tempVal} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} />
                    <ReferenceLine y={da} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} />
                    <Customized
                      component={(props: unknown) => {
                        const p = props as { xAxisMap?: Record<string | number, AxisInfo>; yAxisMap?: Record<string | number, AxisInfo> };
                        const xAxis = p.xAxisMap?.[0] || (p.xAxisMap && Object.values(p.xAxisMap)[0]);
                        const yAxis = p.yAxisMap?.[0] || (p.yAxisMap && Object.values(p.yAxisMap)[0]);
                        if (!xAxis?.scale || !yAxis?.scale) return null;
                        const cx = xAxis.scale(tempVal);
                        const cy = yAxis.scale(da!);
                        if (typeof cx !== 'number' || typeof cy !== 'number' || isNaN(cx) || isNaN(cy)) return null;
                        return (
                          <g>
                            <circle cx={cx} cy={cy} r={10} fill="#f59e0b" stroke="#000" strokeWidth={2} />
                            <text x={cx + 14} y={cy + 4} fontSize={10} fill="#f59e0b">DA</text>
                          </g>
                        );
                      }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* PA Conversion Table */}
          <div className="lg:w-44 shrink-0">
            <p className="text-xs font-semibold mb-2 text-center" style={{ color: "oklch(0.7 0.02 240)" }}>
              Altimeter → PA Factor
            </p>
            <div className="max-h-64 overflow-y-auto text-xs border border-gray-700 rounded">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-800">
                  <tr>
                    <th className="px-2 py-1 text-left" style={{ color: "oklch(0.6 0.02 240)" }}>inHg</th>
                    <th className="px-2 py-1 text-right" style={{ color: "oklch(0.6 0.02 240)" }}>Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {PA_CONVERSION_TABLE.map((row) => {
                    const isNearCurrent = qnhFormat === "inHg" && Math.abs(row.inHg - qnhVal) < 0.05;
                    return (
                      <tr
                        key={row.inHg}
                        className={isNearCurrent ? "bg-sky-500/20" : ""}
                      >
                        <td className="px-2 py-0.5" style={{ color: isNearCurrent ? "white" : "oklch(0.65 0.02 240)" }}>
                          {row.inHg.toFixed(row.inHg === 29.92 ? 2 : 1)}
                        </td>
                        <td className="px-2 py-0.5 text-right font-mono" style={{ color: isNearCurrent ? "white" : "oklch(0.65 0.02 240)" }}>
                          {row.factor >= 0 ? "+" : ""}{row.factor}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: "oklch(0.5 0.02 240)" }}>
              PA = Elev + Factor
            </p>
          </div>
        </div>
      </div>

      {/* Actual ISA Barometric Formula Section */}
      <div className="pt-4 border-t border-gray-700">
        <h4 className="text-sm font-semibold mb-3" style={{ color: "oklch(0.75 0.15 130)" }}>
          Exact ISA Barometric Formula (Used by this Calculator)
        </h4>
        <p className="text-xs mb-3" style={{ color: "oklch(0.65 0.02 240)" }}>
          This calculator uses the full International Standard Atmosphere (ISA) barometric formula,
          which is more accurate than the linear approximations above, especially at extreme pressure differences.
        </p>

        {/* Constants */}
        <div className="mb-4">
          <h5 className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.1 230)" }}>
            ISA Constants
          </h5>
          <div className="font-mono text-xs p-3 rounded bg-slate-800/50 space-y-1" style={{ color: "oklch(0.7 0.05 180)" }}>
            <div>T₀ = 288.15 K <span style={{ color: "oklch(0.5 0.02 240)" }}>(15°C at sea level)</span></div>
            <div>P₀ = 101325 Pa <span style={{ color: "oklch(0.5 0.02 240)" }}>(1013.25 hPa at sea level)</span></div>
            <div>L = 0.0065 K/m <span style={{ color: "oklch(0.5 0.02 240)" }}>(temperature lapse rate)</span></div>
            <div>g₀ = 9.80665 m/s² <span style={{ color: "oklch(0.5 0.02 240)" }}>(standard gravity)</span></div>
            <div>R = 287.05287 J/(kg·K) <span style={{ color: "oklch(0.5 0.02 240)" }}>(gas constant for air)</span></div>
          </div>
        </div>

        {/* Pressure Altitude Formula */}
        <div className="mb-4">
          <h5 className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.1 230)" }}>
            Pressure Altitude Calculation
          </h5>
          <p className="text-xs mb-2" style={{ color: "oklch(0.55 0.02 240)" }}>
            Step 1: Calculate actual pressure at indicated altitude using barometric formula:
          </p>
          <div className="font-mono text-xs p-2 rounded bg-slate-800/50 mb-2" style={{ color: "oklch(0.75 0.05 180)" }}>
            P = QNH × (1 - L × h / T₀)^(g₀ / (R × L))
          </div>
          <p className="text-xs mb-2" style={{ color: "oklch(0.55 0.02 240)" }}>
            Step 2: Find altitude in ISA where pressure equals actual (invert the formula):
          </p>
          <div className="font-mono text-xs p-2 rounded bg-slate-800/50" style={{ color: "oklch(0.75 0.05 180)" }}>
            PA = (T₀ / L) × (1 - (P / P₀)^(1 / exp))
          </div>
          <p className="text-xs mt-2" style={{ color: "oklch(0.55 0.02 240)" }}>
            Where exp = g₀ / (R × L) ≈ 5.2559
          </p>
          <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
            → Result: <strong style={{ color: "white" }}>{pa.toFixed(0)} ft</strong>
            <span className="ml-2" style={{ color: "oklch(0.5 0.02 240)" }}>
              (vs. ~{qnhFormat === "inHg"
                ? (elevVal + (29.92 - qnhVal) * 1000).toFixed(0)
                : (elevVal + (1013.25 - qnhVal) * 27).toFixed(0)} ft linear approx.)
            </span>
          </p>
        </div>

        {/* Density Altitude Formula */}
        {da !== null && (
          <div>
            <h5 className="text-xs font-semibold mb-2" style={{ color: "oklch(0.7 0.1 230)" }}>
              Density Altitude Calculation
            </h5>
            <p className="text-xs mb-2" style={{ color: "oklch(0.55 0.02 240)" }}>
              DA is calculated using the temperature deviation from ISA:
            </p>
            <div className="font-mono text-xs p-2 rounded bg-slate-800/50" style={{ color: "oklch(0.75 0.05 180)" }}>
              DA = PA + 118.8 × (OAT - ISA_Temp)
            </div>
            <p className="text-xs mt-2" style={{ color: "oklch(0.6 0.02 240)" }}>
              → {pa.toFixed(0)} + 118.8 × ({tempVal.toFixed(1)} - {isaTemp.toFixed(1)}) = <strong style={{ color: "white" }}>{da.toFixed(0)} ft</strong>
            </p>
          </div>
        )}
      </div>

      <p className="text-xs pt-2 border-t border-gray-700" style={{ color: "oklch(0.5 0.02 240)" }}>
        The linear approximations are quick rules of thumb. This calculator uses the full ISA barometric equation for accuracy,
        which can differ by 50-100+ ft from approximations at extreme pressure conditions.
      </p>
    </div>
  );
}
